import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { PaymentStatus } from "@/generated/prisma/enums";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

/**
 * Mercado Pago integration over plain HTTPS (no SDK).
 * - Pix: POST /v1/payments (returns QR code)
 * - Card: Checkout Pro preference (redirect to init_point)
 * - Webhook: x-signature HMAC check + authoritative GET /v1/payments/:id
 */

export class PaymentGatewayError extends Error {}

const WEBHOOK_TOLERANCE_MS = 10 * 60 * 1000;

async function mp<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const { MP_ACCESS_TOKEN, MP_API_BASE_URL } = env();
  if (!MP_ACCESS_TOKEN) throw new PaymentGatewayError("Pagamento online não configurado.");
  const res = await fetch(`${MP_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
    },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("[mercadopago] request failed", path, res.status);
    throw new PaymentGatewayError("Não foi possível comunicar com o Mercado Pago.");
  }
  return (await res.json()) as T;
}

function notificationUrl() {
  const site = env().NEXT_PUBLIC_SITE_URL;
  // Mercado Pago only delivers to public HTTPS endpoints.
  return site.startsWith("https://") ? `${site}/api/webhooks/mercadopago` : undefined;
}

interface OrderForPayment {
  id: string;
  number: number;
  trackingToken: string;
  totalCents: number;
  customerName: string;
  customerEmail: string | null;
}

export async function startOnlinePayment(order: OrderForPayment, method: "PIX" | "CARD_ONLINE") {
  const idempotencyKey = randomUUID();
  const amount = order.totalCents / 100;
  const description = `Black Smoke Burger — pedido #${order.number}`;

  if (method === "PIX") {
    if (!order.customerEmail) throw new PaymentGatewayError("E-mail obrigatório para pagamento via Pix.");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const pay = await mp<{
      id: number;
      status: string;
      point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } };
    }>("/v1/payments", {
      method: "POST",
      idempotencyKey,
      body: JSON.stringify({
        transaction_amount: amount,
        description,
        payment_method_id: "pix",
        external_reference: order.id,
        notification_url: notificationUrl(),
        date_of_expiration: expiresAt.toISOString(),
        payer: { email: order.customerEmail, first_name: order.customerName.split(" ")[0] },
      }),
    });
    const tx = pay.point_of_interaction?.transaction_data;
    return prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "mercadopago",
        method,
        idempotencyKey,
        amountCents: order.totalCents,
        providerPaymentId: String(pay.id),
        providerStatus: pay.status,
        pixQrCode: tx?.qr_code ?? null,
        pixQrCodeBase64: tx?.qr_code_base64 ?? null,
        checkoutUrl: tx?.ticket_url ?? null,
        expiresAt,
      },
    });
  }

  const back = `${env().NEXT_PUBLIC_SITE_URL}/pedido/${order.trackingToken}`;
  const pref = await mp<{ id: string; init_point: string; sandbox_init_point?: string }>("/checkout/preferences", {
    method: "POST",
    idempotencyKey,
    body: JSON.stringify({
      items: [{ id: order.id, title: description, quantity: 1, unit_price: amount, currency_id: "BRL" }],
      external_reference: order.id,
      notification_url: notificationUrl(),
      back_urls: { success: back, failure: back, pending: back },
      auto_return: "approved",
      payment_methods: { excluded_payment_types: [{ id: "ticket" }], installments: 1 },
      payer: order.customerEmail ? { email: order.customerEmail } : undefined,
    }),
  });
  const useSandbox = env().MP_ACCESS_TOKEN?.startsWith("TEST-");
  return prisma.payment.create({
    data: {
      orderId: order.id,
      provider: "mercadopago",
      method,
      idempotencyKey,
      amountCents: order.totalCents,
      checkoutUrl: (useSandbox && pref.sandbox_init_point) || pref.init_point,
    },
  });
}

// ───────────────────────────── Webhook ─────────────────────────────

export function verifyWebhookSignature(input: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string;
  secret: string;
  now?: number;
}): boolean {
  const { signatureHeader, requestId, dataId, secret } = input;
  if (!signatureHeader || !requestId || !dataId) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1 || !/^\d+$/.test(ts) || !/^[a-f0-9]{64}$/i.test(v1)) return false;
  const tsMs = ts.length > 11 ? Number(ts) : Number(ts) * 1000;
  if (Math.abs((input.now ?? Date.now()) - tsMs) > WEBHOOK_TOLERANCE_MS) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest();
  const given = Buffer.from(v1, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function mapProviderStatus(status: string): PaymentStatus {
  switch (status) {
    case "approved":
      return "PAID";
    case "rejected":
    case "cancelled":
      return "FAILED";
    case "refunded":
    case "charged_back":
      return "REFUNDED";
    default:
      return "PENDING";
  }
}

interface MpPayment {
  id: number;
  status: string;
  external_reference: string | null;
  transaction_amount: number;
  payment_method_id?: string;
}

export type WebhookOutcome = "ignored" | "duplicate" | "invalid_signature" | "unknown_order" | "amount_mismatch" | "processed";

export async function handlePaymentWebhook(input: {
  type: string | null;
  dataId: string | null;
  signatureHeader: string | null;
  requestId: string | null;
}): Promise<WebhookOutcome> {
  const secret = env().MP_WEBHOOK_SECRET;
  if (!secret || !env().MP_ACCESS_TOKEN) return "ignored";
  if (input.type !== "payment" || !input.dataId || !/^\d{1,20}$/.test(input.dataId)) return "ignored";
  if (!verifyWebhookSignature({ ...input, dataId: input.dataId, secret })) return "invalid_signature";

  // Idempotency: the same delivery (x-request-id) is processed once.
  const inserted = await prisma.webhookEvent.createMany({
    data: [{ provider: "mercadopago", eventKey: `${input.requestId}:${input.dataId}` }],
    skipDuplicates: true,
  });
  if (inserted.count === 0) return "duplicate";

  // Never trust the notification body: fetch the authoritative state.
  const pay = await mp<MpPayment>(`/v1/payments/${input.dataId}`);
  const order = pay.external_reference
    ? await prisma.order.findUnique({ where: { id: pay.external_reference } })
    : null;
  if (!order) return "unknown_order";

  const amountCents = Math.round(pay.transaction_amount * 100);
  const status = mapProviderStatus(pay.status);
  if (status === "PAID" && amountCents !== order.totalCents) {
    console.error("[mercadopago] amount mismatch", { order: order.id, amountCents, expected: order.totalCents });
    return "amount_mismatch";
  }

  const providerPaymentId = String(pay.id);
  await prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({ where: { providerPaymentId } });
    if (existing) {
      await tx.payment.update({ where: { id: existing.id }, data: { status, providerStatus: pay.status } });
    } else {
      // Checkout Pro: the preference row exists without a provider id yet.
      const pending = await tx.payment.findFirst({
        where: { orderId: order.id, providerPaymentId: null, method: "CARD_ONLINE" },
        orderBy: { createdAt: "desc" },
      });
      if (pending) {
        await tx.payment.update({ where: { id: pending.id }, data: { providerPaymentId, status, providerStatus: pay.status } });
      } else {
        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: "mercadopago",
            method: order.paymentMethod,
            idempotencyKey: `webhook-${providerPaymentId}`,
            amountCents,
            providerPaymentId,
            providerStatus: pay.status,
            status,
          },
        });
      }
    }
    // Order payment state: PAID is sticky unless the provider reports a refund.
    if (status === "PAID" || status === "REFUNDED" || (status === "FAILED" && order.paymentStatus !== "PAID")) {
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: status } });
    }
  });
  return "processed";
}

export async function refundPayment(providerPaymentId: string) {
  await mp(`/v1/payments/${providerPaymentId}/refunds`, { method: "POST", idempotencyKey: randomUUID(), body: "{}" });
}
