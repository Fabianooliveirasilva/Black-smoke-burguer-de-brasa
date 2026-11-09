import { createHmac } from "node:crypto";
import { BASE_URL, MP_MOCK, WEBHOOK_SECRET, expect, orderPayload, test, uniqueIp } from "../support/pw";

test.describe("public API", () => {
  test("GET /api/menu exposes the catalog without internal fields", async ({ request }) => {
    const res = await request.get("/api/menu");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("no-store");
    const body = await res.json();
    expect(body.categories.map((c: { slug: string }) => c.slug)).toEqual(["burgers", "combos", "acompanhamentos", "bebidas"]);
    const product = body.categories[0].products[0];
    expect(product).toHaveProperty("priceCents");
    expect(product).not.toHaveProperty("deletedAt");
    expect(product).not.toHaveProperty("categoryId");
  });

  test("POST /api/orders recomputes prices and ignores client-sent totals", async ({ request }) => {
    const payload = await orderPayload(request, { totalCents: 1, subtotalCents: 1, status: "DELIVERED", paymentStatus: "PAID" });
    (payload.items[0] as Record<string, unknown>).unitPriceCents = 1;
    const res = await request.post("/api/orders", { data: payload });
    expect(res.status(), await res.text()).toBe(201);
    const order = await res.json();
    expect(order.totalCents).toBe(3890);

    const track = await request.get(`/api/orders/track/${order.trackingToken}`);
    expect(track.status()).toBe(200);
    const view = await track.json();
    expect(view).toMatchObject({ status: "RECEIVED", paymentStatus: "PENDING", totalCents: 3890, canCancel: true });
    expect(JSON.stringify(view)).not.toContain("11987654321");
  });

  test("validation errors use the standard error envelope without stack traces", async ({ request }) => {
    const res = await request.post("/api/orders", { data: { fulfillment: "DELIVERY", items: [] } });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(body.error.details)).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/at \w+ \(|node_modules/);

    const bad = await request.post("/api/orders", { data: Buffer.from("{not json"), headers: { "Content-Type": "application/json" } });
    expect(bad.status(), await bad.text()).toBe(400);
    expect((await bad.json()).error.code).toBe("INVALID_JSON");
  });

  test("unknown tracking tokens return 404 and customers can cancel their own received order", async ({ request }) => {
    expect((await request.get("/api/orders/track/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")).status()).toBe(404);
    const { trackingToken } = await (await request.post("/api/orders", { data: await orderPayload(request) })).json();
    const res = await request.post(`/api/orders/track/${trackingToken}/cancel`);
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe("CANCELED");
    const again = await request.post(`/api/orders/track/${trackingToken}/cancel`);
    expect(again.status()).toBe(409);
  });

  test("POST /api/cart/quote validates coupons server-side", async ({ request }) => {
    const p = await orderPayload(request);
    const res = await request.post("/api/cart/quote", { data: { items: p.items, couponCode: "smoke10" } });
    const q = await res.json();
    expect(q.couponError).toMatch(/valor mínimo/);
    const ok = await (await request.post("/api/cart/quote", { data: { items: [{ ...p.items[0], quantity: 3 }], couponCode: "SMOKE10" } })).json();
    expect(ok).toMatchObject({ subtotalCents: 11670, discountCents: 1000, totalCents: 10670 });
  });

  test("cross-site browser requests are rejected (CSRF)", async ({ request }) => {
    const res = await request.post("/api/orders", { data: await orderPayload(request), headers: { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" } });
    expect(res.status()).toBe(403);
    expect((await res.json()).error.code).toBe("CSRF");
  });

  test("order creation is rate limited per client", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } });
    const payload = await orderPayload(ctx);
    const statuses: number[] = [];
    for (let i = 0; i < 9; i++) statuses.push((await ctx.post("/api/orders", { data: payload })).status());
    expect(statuses.slice(0, 8).every((s) => s === 201)).toBe(true);
    expect(statuses[8]).toBe(429);
  });

  test("security headers are present", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-powered-by"]).toBeUndefined();
  });
});

test.describe("Mercado Pago webhook", () => {
  const sign = (id: string, req: string) => {
    const ts = String(Math.floor(Date.now() / 1000));
    return `ts=${ts},v1=${createHmac("sha256", WEBHOOK_SECRET).update(`id:${id};request-id:${req};ts:${ts};`).digest("hex")}`;
  };

  test("forged notifications are rejected; signed ones confirm a Pix payment", async ({ request }) => {
    const forged = await request.post("/api/webhooks/mercadopago?type=payment&data.id=123", { data: { type: "payment", data: { id: "123" } }, headers: { "x-signature": "ts=1,v1=" + "0".repeat(64), "x-request-id": "r1" } });
    expect(forged.status()).toBe(401);

    const order = await (await request.post("/api/orders", { data: await orderPayload(request, { paymentMethod: "PIX" }) })).json();
    expect(order.paymentError).toBeNull();
    const payments = await (await request.get(`${MP_MOCK}/__control/payments`)).json();
    const pay = payments.at(-1);
    await request.post(`${MP_MOCK}/__control/payments/${pay.id}`, { data: { status: "approved" } });

    const reqId = `req-${pay.id}`;
    const ok = await request.post(`/api/webhooks/mercadopago?type=payment&data.id=${pay.id}`, { data: { type: "payment", data: { id: String(pay.id) } }, headers: { "x-signature": sign(String(pay.id), reqId), "x-request-id": reqId } });
    expect(await ok.json()).toEqual({ received: true, outcome: "processed" });
    const replay = await request.post(`/api/webhooks/mercadopago?type=payment&data.id=${pay.id}`, { data: {}, headers: { "x-signature": sign(String(pay.id), reqId), "x-request-id": reqId } });
    expect((await replay.json()).outcome).toBe("duplicate");

    const view = await (await request.get(`/api/orders/track/${order.trackingToken}`)).json();
    expect(view.paymentStatus).toBe("PAID");
    expect(view.canCancel).toBe(false);
  });
});
