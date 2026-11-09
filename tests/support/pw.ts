import { randomInt } from "node:crypto";
import { expect, test as base, type APIRequest, type APIRequestContext, type Browser } from "@playwright/test";
import { ADMIN } from "./test-env";

type PW = { request: APIRequest };

export const BASE_URL = "http://localhost:3100";
export const WEBHOOK_SECRET = "whsec_e2e";
export const MP_MOCK = "http://localhost:3199";

/** Distinct client IP per test so per-IP rate limits never couple tests together. */
export const uniqueIp = () => `10.${randomInt(1, 254)}.${randomInt(1, 254)}.${randomInt(1, 254)}`;

export const test = base.extend<object>({
  extraHTTPHeaders: async ({}, use) => use({ "x-forwarded-for": uniqueIp() }),
});
export { expect };

export async function apiAs(playwright: PW, creds?: { email: string; password: string }): Promise<APIRequestContext> {
  const ctx = await playwright.request.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } });
  if (creds) {
    const res = await ctx.post("/api/auth/sign-in/email", { data: creds, headers: { Origin: BASE_URL } });
    expect(res.status(), await res.text()).toBe(200);
  }
  return ctx;
}

export const adminApi = (pw: PW) => apiAs(pw, ADMIN);

export async function signUpCustomer(pw: PW) {
  const email = `cliente.${Date.now()}.${randomInt(1e6)}@test.local`;
  const password = "Senha#Cliente1";
  const ctx = await pw.request.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } });
  const res = await ctx.post("/api/auth/sign-up/email", { data: { name: "Cliente E2E", email, password }, headers: { Origin: BASE_URL } });
  expect(res.status(), await res.text()).toBe(200);
  return { ctx, email, password };
}

export async function adminPage(browser: Browser) {
  const context = await browser.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } });
  const page = await context.newPage();
  await page.goto("/entrar?next=/admin");
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await page.getByLabel("Senha").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => u.pathname === "/admin");
  await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();
  return { context, page };
}

/** Builds a valid order payload from the live menu. */
export async function orderPayload(api: APIRequestContext, over: Record<string, unknown> = {}) {
  const menu = await (await api.get("/api/menu")).json();
  const smoke = menu.categories.flatMap((c: { products: unknown[] }) => c.products).find((p: { slug: string }) => p.slug === "smoke-classic");
  return {
    fulfillment: "PICKUP",
    customer: { name: "Cliente API", phone: "11987654321", email: "api@test.local" },
    items: [{ productId: smoke.id, quantity: 1, options: [], removedIngredientIds: [] }],
    paymentMethod: "CASH",
    ...over,
  };
}

/**
 * Navigates and waits until the page's interactive island reports `data-hydrated="true"`.
 * Server-rendered controls exist before React attaches; acting on them earlier races hydration
 * (counts read from SSR markup, cart badge not yet rendered). Tests that deliberately type
 * BEFORE hydration (BUG-05) must use plain page.goto().
 */
export async function gotoReady(page: import("@playwright/test").Page, url: string) {
  const res = await page.goto(url);
  await page.locator('[data-hydrated="true"]').first().waitFor({ state: "attached" });
  return res;
}
