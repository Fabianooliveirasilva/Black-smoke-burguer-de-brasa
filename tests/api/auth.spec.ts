import { BASE_URL, adminApi, apiAs, expect, signUpCustomer, test, uniqueIp } from "../support/pw";

const adminEndpoints = [
  ["GET", "/api/admin/dashboard"],
  ["GET", "/api/admin/products"],
  ["POST", "/api/admin/products"],
  ["PATCH", "/api/admin/products/x"],
  ["DELETE", "/api/admin/products/x"],
  ["GET", "/api/admin/orders"],
  ["PATCH", "/api/admin/orders/x"],
  ["GET", "/api/admin/coupons"],
  ["PUT", "/api/admin/settings"],
  ["POST", "/api/admin/uploads"],
] as const;

test.describe("authentication & authorization", () => {
  test("anonymous requests to admin endpoints get 401", async ({ request }) => {
    for (const [method, url] of adminEndpoints) {
      const res = await request.fetch(url, { method, data: method === "GET" ? undefined : {} });
      expect(res.status(), `${method} ${url}`).toBe(401);
    }
  });

  test("customers get 403 on admin endpoints and cannot self-assign a role", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } });
    const email = `hacker.${Date.now()}@test.local`;
    const res = await ctx.post("/api/auth/sign-up/email", { data: { name: "H", email, password: "Senha#Forte123", role: "admin" }, headers: { Origin: BASE_URL } });
    expect([200, 400]).toContain(res.status());
    if (res.status() === 200) {
      expect((await (await ctx.get("/api/me")).json()).role).toBe("customer");
      for (const [method, url] of adminEndpoints) expect((await ctx.fetch(url, { method, data: method === "GET" ? undefined : {} })).status(), url).toBe(403);
    }
    const { ctx: customer } = await signUpCustomer(playwright);
    expect((await customer.get("/api/admin/orders")).status()).toBe(403);
    expect((await customer.patch("/api/me", { data: { name: "X", role: "admin" } })).status()).toBe(422);
  });

  test("login uses a generic error and is rate limited (brute force)", async ({ playwright }) => {
    const ctx = await apiAs(playwright);
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await ctx.post("/api/auth/sign-in/email", { data: { email: "admin@test.local", password: `errada${i}` }, headers: { Origin: BASE_URL } });
      statuses.push(r.status());
    }
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
    expect(statuses).toContain(429);
  });

  test("session cookie is HttpOnly and SameSite=Lax", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } });
    const res = await ctx.post("/api/auth/sign-in/email", { data: { email: "admin@test.local", password: "Admin#Test2026!" }, headers: { Origin: BASE_URL } });
    const cookie = res.headersArray().find((h) => h.name.toLowerCase() === "set-cookie" && h.value.includes("session_token"));
    expect(cookie?.value).toMatch(/HttpOnly/i);
    expect(cookie?.value).toMatch(/SameSite=Lax/i);
  });

  test("admins can reach admin endpoints", async ({ playwright }) => {
    const admin = await adminApi(playwright);
    const res = await admin.get("/api/admin/dashboard");
    expect(res.status()).toBe(200);
    expect(await res.json()).toHaveProperty("revenueCents");
  });
});

test.describe("customer data isolation (IDOR)", () => {
  test("a customer cannot read, edit or delete another customer's address", async ({ playwright }) => {
    const a = await signUpCustomer(playwright);
    const b = await signUpCustomer(playwright);
    const created = await a.ctx.post("/api/me/addresses", { data: { label: "Casa", street: "Rua A", number: "1", neighborhood: "Pinheiros", city: "São Paulo", cep: "05405-000" } });
    expect(created.status()).toBe(201);
    const { id } = await created.json();

    expect((await b.ctx.patch(`/api/me/addresses/${id}`, { data: { label: "Roubado" } })).status()).toBe(404);
    expect((await b.ctx.delete(`/api/me/addresses/${id}`)).status()).toBe(404);
    expect((await (await b.ctx.get("/api/me/addresses")).json()).addresses).toHaveLength(0);

    const patched = await a.ctx.patch(`/api/me/addresses/${id}`, { data: { label: "Trabalho" } });
    expect((await patched.json()).label).toBe("Trabalho");
    expect((await a.ctx.delete(`/api/me/addresses/${id}`)).status()).toBe(204);
  });

  test("order history only lists the customer's own orders", async ({ playwright }) => {
    const a = await signUpCustomer(playwright);
    const b = await signUpCustomer(playwright);
    const menu = await (await a.ctx.get("/api/menu")).json();
    const pid = menu.categories[0].products[0].id;
    const res = await a.ctx.post("/api/orders", { data: { fulfillment: "PICKUP", customer: { name: "Ana Teste", phone: "11911112222" }, items: [{ productId: pid, quantity: 1 }], paymentMethod: "CASH" } });
    expect(res.status(), await res.text()).toBe(201);
    expect((await (await a.ctx.get("/api/me/orders")).json()).orders).toHaveLength(1);
    expect((await (await b.ctx.get("/api/me/orders")).json()).orders).toHaveLength(0);
  });
});
