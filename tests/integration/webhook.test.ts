import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createOrder } from "@/server/orders";
import { handlePaymentWebhook } from "@/server/payments/mercadopago";
import { deliveryInput } from "../support/fixtures";

const SECRET = "whsec_integration";
function signed(dataId: string, requestId: string) {
  const ts = String(Math.floor(Date.now() / 1000));
  const v1 = createHmac("sha256", SECRET).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
  return { type: "payment", dataId, requestId, signatureHeader: `ts=${ts},v1=${v1}` };
}
function mockPayment(body: object) {
  const f = vi.fn(async () => Response.json(body));
  vi.stubGlobal("fetch", f);
  return f;
}

afterEach(() => vi.unstubAllGlobals());

describe("Mercado Pago webhook", () => {
  it("rejects forged notifications without touching the API", async () => {
    const f = mockPayment({});
    const out = await handlePaymentWebhook({ type: "payment", dataId: "1", requestId: "r", signatureHeader: "ts=1,v1=" + "a".repeat(64) });
    expect(out).toBe("invalid_signature");
    expect(f).not.toHaveBeenCalled();
  });

  it("confirms payment only after fetching it from the API, idempotently", async () => {
    const { order } = await createOrder(await deliveryInput(), null);
    const f = mockPayment({ id: 777001, status: "approved", external_reference: order.id, transaction_amount: order.totalCents / 100 });
    const n = signed("777001", "req-777001");
    expect(await handlePaymentWebhook(n)).toBe("processed");
    expect(f).toHaveBeenCalledWith("http://mp.mock/v1/payments/777001", expect.anything());
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PAID");
    expect(await handlePaymentWebhook(n)).toBe("duplicate");
    expect(await prisma.payment.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("refuses to mark paid when the amount does not match the order", async () => {
    const { order } = await createOrder(await deliveryInput(), null);
    mockPayment({ id: 777002, status: "approved", external_reference: order.id, transaction_amount: 0.01 });
    expect(await handlePaymentWebhook(signed("777002", "req-777002"))).toBe("amount_mismatch");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PENDING");
  });

  it("ignores payments for unknown orders and non-payment topics", async () => {
    mockPayment({ id: 777003, status: "approved", external_reference: "nope", transaction_amount: 10 });
    expect(await handlePaymentWebhook(signed("777003", "req-777003"))).toBe("unknown_order");
    expect(await handlePaymentWebhook({ ...signed("1", "x"), type: "merchant_order" })).toBe("ignored");
  });
});
