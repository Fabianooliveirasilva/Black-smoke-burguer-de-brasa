import "server-only";
import { randomBytes } from "node:crypto";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import { onlinePaymentsEnabled } from "@/lib/env";
import { HttpError, notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import type { CreateOrderInput } from "@/schemas/order";
import { loadPricingProducts } from "./catalog";
import { isOpenAt, type OpeningWindow } from "./hours";
import { canTransition, customerCanCancel } from "./order-status";
import { PaymentGatewayError, refundPayment, startOnlinePayment } from "./payments/mercadopago";
import { computeTotals, couponMessages, evaluateCoupon, priceCart } from "./pricing";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export const newTrackingToken = () => randomBytes(24).toString("base64url");

/** Creates an order. Every monetary value is computed here from database state. */
export async function createOrder(input: CreateOrderInput, userId: string | null, now = new Date()) {
  const settings = await prisma.storeSettings.findUniqueOrThrow({ where: { id: 1 } });
  if (settings.ordersPaused) throw new HttpError(409, "STORE_PAUSED", "Pedidos pausados no momento.");
  if (!isOpenAt(now, settings.openingHours as unknown as OpeningWindow[])) {
    throw new HttpError(409, "STORE_CLOSED", "Estamos fechados agora. Confira nossos horários.");
  }
  if (input.fulfillment === "DELIVERY" && !settings.deliveryEnabled) throw new HttpError(422, "DELIVERY_DISABLED", "Entrega indisponível no momento.");
  if (input.fulfillment === "PICKUP" && !settings.pickupEnabled) throw new HttpError(422, "PICKUP_DISABLED", "Retirada indisponível no momento.");

  const online = input.paymentMethod === "PIX" || input.paymentMethod === "CARD_ONLINE";
  if (online && !onlinePaymentsEnabled()) throw new HttpError(422, "PAYMENT_METHOD_UNAVAILABLE", "Forma de pagamento indisponível.");
  if (input.paymentMethod === "PIX" && !input.customer.email) throw new HttpError(422, "EMAIL_REQUIRED", "Informe um e-mail para pagar com Pix.");

  const products = await loadPricingProducts(input.items.map((i) => i.productId));
  const lines = priceCart(
    products,
    input.items.map((i) => ({ ...i, doneness: i.doneness ?? null })),
  );

  let deliveryFeeCents = 0;
  let zoneId: string | null = null;
  if (input.fulfillment === "DELIVERY") {
    const zone = await prisma.deliveryZone.findFirst({ where: { id: input.deliveryZoneId, active: true } });
    if (!zone) throw new HttpError(422, "ZONE_INVALID", "Região de entrega inválida.");
    const hood = normalize(input.address.neighborhood);
    if (!zone.neighborhoods.some((n) => normalize(n) === hood)) {
      throw new HttpError(422, "NEIGHBORHOOD_NOT_SERVED", "Ainda não entregamos neste bairro.");
    }
    deliveryFeeCents = zone.feeCents;
    zoneId = zone.id;
  }

  const pre = computeTotals({ lines, deliveryFeeCents, discountCents: 0 });
  if (pre.subtotalCents < settings.minOrderCents) {
    throw new HttpError(422, "BELOW_MINIMUM_ORDER", "O pedido não atinge o valor mínimo.");
  }

  let coupon: Awaited<ReturnType<typeof prisma.coupon.findUnique>> = null;
  let discountCents = 0;
  if (input.couponCode) {
    coupon = await prisma.coupon.findUnique({ where: { code: input.couponCode } });
    if (!coupon) throw new HttpError(422, "COUPON_INVALID", couponMessages.INACTIVE);
    const r = evaluateCoupon(coupon, pre.subtotalCents, now);
    if (!r.ok) throw new HttpError(422, `COUPON_${r.reason}`, couponMessages[r.reason]);
    discountCents = r.discountCents;
  }
  const totals = computeTotals({ lines, deliveryFeeCents, discountCents });

  if (input.paymentMethod === "CASH" && input.changeForCents && input.changeForCents < totals.totalCents) {
    throw new HttpError(422, "INVALID_CHANGE", "O valor para troco deve ser maior que o total.");
  }

  const address =
    input.fulfillment === "DELIVERY"
      ? {
          street: input.address.street,
          addressNumber: input.address.number,
          complement: input.address.complement,
          neighborhood: input.address.neighborhood,
          city: input.address.city,
          cep: input.address.cep,
          reference: input.address.reference,
        }
      : {};

  const order = await prisma.$transaction(async (tx) => {
    if (coupon) {
      // Atomic, race-free usage increment: fails if the limit was hit concurrently.
      const claimed = await tx.coupon.updateMany({
        where: {
          id: coupon.id,
          active: true,
          OR: [{ maxUses: null }, { usesCount: { lt: tx.coupon.fields.maxUses } }],
        },
        data: { usesCount: { increment: 1 } },
      });
      if (claimed.count === 0) throw new HttpError(409, "COUPON_EXHAUSTED", couponMessages.EXHAUSTED);
    }
    const created = await tx.order.create({
      data: {
        trackingToken: newTrackingToken(),
        userId,
        customerName: input.customer.name,
        customerPhone: input.customer.phone,
        customerEmail: input.customer.email,
        fulfillment: input.fulfillment,
        ...address,
        deliveryZoneId: zoneId,
        paymentMethod: input.paymentMethod,
        changeForCents: input.paymentMethod === "CASH" ? (input.changeForCents ?? null) : null,
        ...totals,
        couponId: coupon?.id ?? null,
        notes: input.notes,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            productName: l.productName,
            basePriceCents: l.basePriceCents,
            unitPriceCents: l.unitPriceCents,
            quantity: l.quantity,
            lineTotalCents: l.lineTotalCents,
            doneness: l.doneness,
            removedIngredients: l.removedIngredients,
            notes: l.notes,
            options: { create: l.options.map((o) => ({ optionId: o.optionId, name: o.name, priceCents: o.priceCents, quantity: o.quantity })) },
          })),
        },
        events: { create: { status: "RECEIVED" } },
      },
    });
    if (coupon) {
      await tx.couponUsage.create({ data: { couponId: coupon.id, orderId: created.id, customerPhone: input.customer.phone } });
    }
    return created;
  });

  let paymentError: string | null = null;
  if (online) {
    try {
      await startOnlinePayment(order, input.paymentMethod as "PIX" | "CARD_ONLINE");
    } catch (err) {
      paymentError = err instanceof PaymentGatewayError ? err.message : "Falha ao iniciar o pagamento.";
      if (!(err instanceof PaymentGatewayError)) console.error("[orders] payment start failed", err);
    }
  }
  return { order, paymentError };
}

const publicOrderSelect = {
  number: true,
  trackingToken: true,
  status: true,
  fulfillment: true,
  customerName: true,
  neighborhood: true,
  street: true,
  addressNumber: true,
  paymentMethod: true,
  paymentStatus: true,
  subtotalCents: true,
  discountCents: true,
  deliveryFeeCents: true,
  totalCents: true,
  changeForCents: true,
  cancelReason: true,
  createdAt: true,
  updatedAt: true,
  deliveryZone: { select: { etaMinutes: true } },
  coupon: { select: { code: true } },
  items: {
    select: {
      productName: true,
      quantity: true,
      unitPriceCents: true,
      lineTotalCents: true,
      doneness: true,
      removedIngredients: true,
      notes: true,
      options: { select: { name: true, quantity: true } },
    },
  },
  events: { orderBy: { createdAt: "asc" }, select: { status: true, createdAt: true } },
  payments: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { method: true, status: true, pixQrCode: true, pixQrCodeBase64: true, checkoutUrl: true, expiresAt: true },
  },
} satisfies Prisma.OrderSelect;

/** Public tracking view: excludes phone, e-mail, internal IDs and notes about other customers. */
export async function getOrderByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  return prisma.order.findUnique({ where: { trackingToken: token }, select: publicOrderSelect });
}
export type PublicOrder = NonNullable<Awaited<ReturnType<typeof getOrderByToken>>>;

export async function cancelByCustomer(token: string) {
  const order = await prisma.order.findUnique({ where: { trackingToken: token } });
  if (!order) throw notFound("Pedido");
  if (!customerCanCancel(order.status, order.paymentStatus)) {
    throw new HttpError(409, "CANNOT_CANCEL", "Este pedido já está em preparo e não pode mais ser cancelado.");
  }
  await applyStatus(order.id, order.status, "CANCELED", { note: "Cancelado pelo cliente", actorId: null });
}

export async function retryPayment(token: string) {
  const order = await prisma.order.findUnique({ where: { trackingToken: token } });
  if (!order) throw notFound("Pedido");
  if (order.paymentMethod !== "PIX" && order.paymentMethod !== "CARD_ONLINE") throw new HttpError(409, "NOT_ONLINE", "Pedido sem pagamento online.");
  if (order.status !== "RECEIVED" || order.paymentStatus === "PAID") throw new HttpError(409, "PAYMENT_NOT_RETRYABLE", "Pagamento não pode ser refeito.");
  try {
    await startOnlinePayment(order, order.paymentMethod);
  } catch (err) {
    if (err instanceof PaymentGatewayError) throw new HttpError(502, "PAYMENT_GATEWAY", err.message);
    throw err;
  }
}

/** Admin status change with state-machine + optimistic concurrency check. */
export async function updateOrderStatus(orderId: string, to: OrderStatus, actorId: string, note?: string | null) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) throw notFound("Pedido");
  if (!canTransition(order.status, to, order.fulfillment)) {
    throw new HttpError(409, "INVALID_TRANSITION", `Não é possível mudar de ${order.status} para ${to}.`);
  }
  await applyStatus(order.id, order.status, to, { note: note ?? null, actorId });

  if (to === "CANCELED" && order.paymentStatus === "PAID") {
    const paid = order.payments.find((p) => p.status === "PAID" && p.providerPaymentId);
    if (paid?.providerPaymentId) {
      try {
        await refundPayment(paid.providerPaymentId);
        await prisma.$transaction([
          prisma.payment.update({ where: { id: paid.id }, data: { status: "REFUNDED" } }),
          prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "REFUNDED" } }),
        ]);
      } catch (err) {
        console.error("[orders] refund failed — manual action required", order.id, err);
      }
    }
  }
  return prisma.order.findUniqueOrThrow({ where: { id: orderId } });
}

async function applyStatus(
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
  meta: { note: string | null; actorId: string | null },
) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    const data: Prisma.OrderUpdateManyMutationInput = { status: to };
    if (to === "CANCELED") data.cancelReason = meta.note ?? "Cancelado";
    const onDelivery = order.paymentMethod === "CASH" || order.paymentMethod === "CARD_ON_DELIVERY";
    if (to === "DELIVERED" && onDelivery) data.paymentStatus = "PAID";

    const res = await tx.order.updateMany({ where: { id: orderId, status: from }, data });
    if (res.count === 0) throw new HttpError(409, "STALE_STATUS", "O pedido foi atualizado por outra pessoa. Recarregue.");
    await tx.orderStatusEvent.create({ data: { orderId, status: to, note: meta.note, actorId: meta.actorId } });

    if (to === "CANCELED" && order.couponId) {
      // Release the coupon so a canceled order does not consume a use.
      const usage = await tx.couponUsage.findUnique({ where: { orderId } });
      if (usage) {
        await tx.couponUsage.delete({ where: { id: usage.id } });
        await tx.coupon.update({ where: { id: order.couponId }, data: { usesCount: { decrement: 1 } } });
      }
    }
  });
}
