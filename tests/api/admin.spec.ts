import sharp from "sharp";
import { adminApi, expect, orderPayload, test } from "../support/pw";

test.describe("admin API", () => {
  test("product CRUD with partial updates that do not reset other fields", async ({ playwright }) => {
    const admin = await adminApi(playwright);
    const cats = (await (await admin.get("/api/admin/categories")).json()).items;
    const body = {
      name: "Teste Brasa", slug: `teste-brasa-${Date.now()}`, description: "Burger de teste", priceCents: 2990, imageUrl: "/images/products/jardim.jpg",
      categoryId: cats[0].id, isPopular: true, ingredients: [{ name: "Picles", removable: true }], options: [{ name: "Bacon", priceCents: 500, maxQuantity: 2 }],
    };
    const created = await admin.post("/api/admin/products", { data: body });
    expect(created.status()).toBe(201);
    const p = await created.json();
    expect(p).toMatchObject({ name: "Teste Brasa", priceCents: 2990, isPopular: true });

    const patched = await (await admin.patch(`/api/admin/products/${p.id}`, { data: { priceCents: 3190 } })).json();
    expect(patched).toMatchObject({ priceCents: 3190, isPopular: true, isAvailable: true });
    expect(patched.options).toHaveLength(1);

    expect((await admin.patch(`/api/admin/products/${p.id}`, { data: { priceCents: -5 } })).status()).toBe(422);
    expect((await admin.patch(`/api/admin/products/${p.id}`, { data: { deletedAt: null } })).status()).toBe(422);
    expect((await admin.post("/api/admin/products", { data: { ...body } })).status()).toBe(409);

    const menu = await (await admin.get("/api/menu")).json();
    expect(JSON.stringify(menu)).toContain(body.slug);
    expect((await admin.delete(`/api/admin/products/${p.id}`)).status()).toBe(204);
    expect((await admin.get(`/api/admin/products/${p.id}`)).status()).toBe(404);
    expect(JSON.stringify(await (await admin.get("/api/menu")).json())).not.toContain(body.slug);
  });

  test("coupon CRUD and validation", async ({ playwright }) => {
    const admin = await adminApi(playwright);
    expect((await admin.post("/api/admin/coupons", { data: { code: "BAD", description: "x", type: "PERCENT", value: 150 } })).status()).toBe(422);
    const c = await (await admin.post("/api/admin/coupons", { data: { code: "api20", description: "20%", type: "PERCENT", value: 20, maxUses: 5 } })).json();
    expect(c.code).toBe("API20");
    expect((await (await admin.patch(`/api/admin/coupons/${c.id}`, { data: { active: false } })).json()).active).toBe(false);
    expect((await admin.delete(`/api/admin/coupons/${c.id}`)).status()).toBe(204);
  });

  test("order status follows the state machine", async ({ playwright, request }) => {
    const admin = await adminApi(playwright);
    const { trackingToken } = await (await request.post("/api/orders", { data: await orderPayload(request) })).json();
    const list = await (await admin.get("/api/admin/orders?status=RECEIVED")).json();
    const id = list.orders[0].id;
    expect((await admin.patch(`/api/admin/orders/${id}`, { data: { status: "DELIVERED" } })).status()).toBe(409);
    const ok = await admin.patch(`/api/admin/orders/${id}`, { data: { status: "PREPARING" } });
    expect((await ok.json()).status).toBe("PREPARING");
    expect((await (await request.get(`/api/orders/track/${trackingToken}`)).json()).status).toBeDefined();
    expect((await admin.get("/api/admin/orders?status=NOPE")).status()).toBe(422);
    expect((await admin.get("/api/admin/orders?from=2020-01-01&to=2020-01-02")).ok()).toBe(true);
  });

  test("settings validation rejects malformed hours", async ({ playwright }) => {
    const admin = await adminApi(playwright);
    const s = await (await admin.get("/api/admin/settings")).json();
    const { id: _id, updatedAt: _u, ...settings } = s;
    expect((await admin.put("/api/admin/settings", { data: { ...settings, openingHours: [{ day: 9, open: "25:00", close: "x" }] } })).status()).toBe(422);
    expect((await admin.put("/api/admin/settings", { data: { ...settings, prepTimeMinutes: 30 } })).status()).toBe(200);
  });

  test("uploads accept real images only and are served safely", async ({ playwright }) => {
    const admin = await adminApi(playwright);
    const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#ff6b2c" } }).png().toBuffer();
    const ok = await admin.post("/api/admin/uploads", { multipart: { file: { name: "burger.png", mimeType: "image/png", buffer: png } } });
    expect(ok.status()).toBe(201);
    const { url } = await ok.json();
    expect(url).toMatch(/^\/media\/[a-f0-9]{32}\.webp$/);
    const served = await admin.get(url);
    expect(served.headers()["content-type"]).toBe("image/webp");
    expect(served.headers()["x-content-type-options"]).toBe("nosniff");

    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect((await admin.post("/api/admin/uploads", { multipart: { file: { name: "x.png", mimeType: "image/png", buffer: svg } } })).status()).toBe(415);
    const html = Buffer.from("<html><script>alert(1)</script></html>");
    expect((await admin.post("/api/admin/uploads", { multipart: { file: { name: "x.jpg", mimeType: "image/jpeg", buffer: html } } })).status()).toBe(415);
    expect((await admin.get("/media/..%2F..%2F.env")).status()).toBe(404);
  });
});
