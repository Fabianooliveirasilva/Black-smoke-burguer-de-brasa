import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/http";
import { cancelByCustomer, createOrder, getOrderByToken, updateOrderStatus } from "@/server/orders";
import { alwaysOpenHours } from "../../prisma/seed-data";
import { catalog, deliveryInput } from "../support/fixtures";

const code = (p: Promise<unknown>) => p.then(() => "OK", (e) => (e instanceof HttpError ? e.code : (e as { code?: string }).code ?? String(e)));

afterEach(async () => {
  vi.unstubAllGlobals();
  await prisma.storeSettings.update({ where: { id: 1 }, data: { openingHours: alwaysOpenHours, ordersPaused: false } });
});

describe("createOrder", () => {
  it("prices everything from the database and persists a full snapshot", async () => {
    const { smoke, zone } = await catalog();
    const bacon = smoke.options.find((o) => o.name.startsWith("Bacon"))!;
    const { order } = await createOrder(await deliveryInput({ couponCode: "PRIMEIRABRASA" }), null);

    const subtotal = (smoke.priceCents + bacon.priceCents) * 2;
    const discount = Math.floor((subtotal * 15) / 100);
    expect(order).toMatchObject({ subtotalCents: subtotal, discountCents: discount, deliveryFeeCents: zone.feeCents, totalCents: subtotal - discount + zone.feeCents, status: "RECEIVED" });
    expect(order.trackingToken).toMatch(/^[A-Za-z0-9_-]{32}$/);

    const saved = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: { include: { options: true } }, events: true, couponUsage: true } });
    expect(saved.items[0]).toMatchObject({ productName: "Smoke Classic", unitPriceCents: smoke.priceCents + bacon.priceCents, doneness: "RARE", removedIngredients: ["Cheddar inglês"] });
    expect(saved.items[0].options[0]).toMatchObject({ name: bacon.name, priceCents: bacon.priceCents });
    expect(saved.events.map((e) => e.status)).toEqual(["RECEIVED"]);
    expect(saved.couponUsage).not.toBeNull();
  });

  it("rejects neighborhoods outside the chosen zone", async () => {
    const input = await deliveryInput();
    if (input.fulfillment === "DELIVERY") input.address.neighborhood = "Moema";
    expect(await code(createOrder(input, null))).toBe("NEIGHBORHOOD_NOT_SERVED");
  });

  it("rejects orders while closed or paused", async () => {
    await prisma.storeSettings.update({ where: { id: 1 }, data: { openingHours: [] } });
    expect(await code(createOrder(await deliveryInput(), null))).toBe("STORE_CLOSED");
    await prisma.storeSettings.update({ where: { id: 1 }, data: { openingHours: alwaysOpenHours, ordersPaused: true } });
    expect(await code(createOrder(await deliveryInput(), null))).toBe("STORE_PAUSED");
  });

  it("rejects unavailable products and orders below the minimum", async () => {
    const { smoke, fries } = await catalog();
    await prisma.product.update({ where: { id: smoke.id }, data: { isAvailable: false } });
    expect(await code(createOrder(await deliveryInput(), null))).toBe("PRODUCT_UNAVAILABLE");
    await prisma.product.update({ where: { id: smoke.id }, data: { isAvailable: true } });

    const small = await deliveryInput({ items: [{ productId: fries.id, quantity: 1, options: [], removedIngredientIds: [], doneness: null, notes: null }] });
    expect(await code(createOrder(small, null))).toBe("BELOW_MINIMUM_ORDER");
  });

  it("never lets concurrent orders exceed a coupon's usage limit", async () => {
    await prisma.coupon.create({ data: { code: "RACE2", description: "race", type: "FIXED", value: 500, maxUses: 2 } });
    const input = await deliveryInput({ couponCode: "RACE2" });
    const results = await Promise.all(Array.from({ length: 6 }, () => code(createOrder(input, null))));
    expect(results.filter((r) => r === "OK")).toHaveLength(2);
    expect(results.filter((r) => r === "OK").length + results.filter((r) => r.startsWith("COUPON_EXHAUSTED")).length).toBe(6);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { code: "RACE2" } })).usesCount).toBe(2);
  });

  it("creates a Pix payment through the gateway with an idempotency key", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ id: 9001, status: "pending", point_of_interaction: { transaction_data: { qr_code: "000201PIX", qr_code_base64: "aGVsbG8=" } } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { order, paymentError } = await createOrder(await deliveryInput({ paymentMethod: "PIX" }), null);
    expect(paymentError).toBeNull();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://mp.mock/v1/payments");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ transaction_amount: order.totalCents / 100, payment_method_id: "pix", external_reference: order.id });
    expect((init.headers as Record<string, string>)["X-Idempotency-Key"]).toBeTruthy();
    const pay = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
    expect(pay).toMatchObject({ providerPaymentId: "9001", pixQrCode: "000201PIX", status: "PENDING" });
  });

  it("keeps the order and reports a gateway failure instead of faking payment", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));
    const { order, paymentError } = await createOrder(await deliveryInput({ paymentMethod: "PIX" }), null);
    expect(paymentError).toMatch(/Mercado Pago/);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PENDING");
  });
});

describe("order lifecycle", () => {
  it("walks the state machine, marks cash orders paid on delivery and rejects skips", async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "admin" } });
    const { order } = await createOrder(await deliveryInput(), null);
    expect(await code(updateOrderStatus(order.id, "DELIVERED", admin.id))).toBe("INVALID_TRANSITION");
    for (const s of ["PREPARING", "ASSEMBLING", "OUT_FOR_DELIVERY", "DELIVERED"] as const) await updateOrderStatus(order.id, s, admin.id);
    const done = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { events: true } });
    expect(done).toMatchObject({ status: "DELIVERED", paymentStatus: "PAID" });
    expect(done.events).toHaveLength(5);
  });

  it("releases the coupon when an order is canceled", async () => {
    await prisma.coupon.create({ data: { code: "ONCE", description: "once", type: "FIXED", value: 500, maxUses: 1 } });
    const { order } = await createOrder(await deliveryInput({ couponCode: "ONCE" }), null);
    await cancelByCustomer(order.trackingToken);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { code: "ONCE" } })).usesCount).toBe(0);
    expect(await prisma.couponUsage.count({ where: { orderId: order.id } })).toBe(0);
    expect(await code(createOrder(await deliveryInput({ couponCode: "ONCE" }), null))).toBe("OK");
  });

  it("blocks customer cancellation once the kitchen has started", async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "admin" } });
    const { order } = await createOrder(await deliveryInput(), null);
    await updateOrderStatus(order.id, "PREPARING", admin.id);
    expect(await code(cancelByCustomer(order.trackingToken))).toBe("CANNOT_CANCEL");
  });

  it("public tracking view never exposes phone, e-mail or internal ids", async () => {
    const { order } = await createOrder(await deliveryInput(), null);
    const view = await getOrderByToken(order.trackingToken);
    const json = JSON.stringify(view);
    expect(json).not.toContain("11912345678");
    expect(json).not.toContain("cliente@test.local");
    expect(json).not.toContain(order.id);
    expect(await getOrderByToken("short")).toBeNull();
  });
});
