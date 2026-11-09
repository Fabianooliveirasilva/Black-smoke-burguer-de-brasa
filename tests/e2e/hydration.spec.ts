import type { Page } from "@playwright/test";
import { expect, test } from "../support/pw";

/**
 * Typing before React hydrates (slow phone, 4G). The page's JS is delayed so the window is
 * deterministic instead of a race. Runs on every browser project: BUG-05 only reproduced on
 * WebKit, BUG-06 only on Chromium.
 */
async function delayScripts(page: Page, ms = 2000) {
  await page.route("**/_next/static/chunks/**", async (route) => {
    await new Promise((r) => setTimeout(r, ms));
    await route.continue();
  });
}

test("BUG-05: observação digitada antes da hidratação chega ao carrinho", async ({ page }) => {
  await delayScripts(page);
  await page.goto("/cardapio/smoke-classic", { waitUntil: "domcontentloaded" });
  await page.locator("textarea").fill("sem cebola, molho à parte"); // React ainda não está no ar
  await page.locator('form[data-hydrated="true"]').waitFor({ state: "attached" });
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  await page.unrouteAll();
  await page.goto("/carrinho");
  await expect(page.getByTestId("cart-line")).toContainText("sem cebola, molho à parte");
});

test("BUG-05: busca digitada antes da hidratação filtra e vai para a URL", async ({ page }) => {
  await delayScripts(page);
  await page.goto("/cardapio", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Buscar: bacon, picles, shake…").fill("hortelã");
  await page.locator('[data-hydrated="true"]').first().waitFor({ state: "attached" });
  await expect(page.getByTestId("menu-item")).toHaveCount(1);
  await expect(page).toHaveURL(/q=hortel/);
});

test("BUG-06: formulário pré-preenchido da conta só aceita digitação depois de hidratar", async ({ page, browser }) => {
  const email = `hidrata.${Date.now()}.${test.info().project.name}@test.local`;
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Nome Antigo");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("Senha#Hidrata2026");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL(/\/conta/);

  // Fresh context = empty HTTP cache (the chunks are cached from /cadastro, which would skip the delay)
  // with the same session cookie.
  const { baseURL, extraHTTPHeaders } = test.info().project.use;
  const ctx = await browser.newContext({ baseURL, extraHTTPHeaders, storageState: await page.context().storageState() });
  const slow = await ctx.newPage();
  await delayScripts(slow);
  await slow.goto("/conta", { waitUntil: "domcontentloaded" });
  const nome = slow.getByRole("region", { name: "Dados" }).getByLabel("Nome");
  // Server HTML: the field is still empty (react-hook-form fills defaults on hydration) — typing here
  // used to produce "Nome AntigoNome Novo". Now it is locked until React is in charge.
  await expect(nome).toBeDisabled({ timeout: 1_000 });
  await expect(nome).toBeEnabled({ timeout: 15_000 });
  await expect(nome).toHaveValue("Nome Antigo");
  await nome.fill("Nome Novo");
  await expect(nome).toHaveValue("Nome Novo");
  await ctx.close();
});
