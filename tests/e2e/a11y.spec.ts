import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "../support/pw";

for (const path of ["/", "/cardapio", "/cardapio/smoke-classic", "/carrinho", "/entrar"]) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).exclude("iframe").analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
  });
}

test("keyboard users can skip to content and customize a product without a mouse", async ({ page }) => {
  await page.goto("/cardapio/smoke-classic");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeFocused();
  await page.getByRole("button", { name: "Aumentar Cheddar inglês" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("group", { name: "Cheddar inglês" }).locator("output")).toHaveText("1");
  await page.getByTestId("add-to-cart").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("cart-count")).toHaveText("1");
});

test("reduced motion users get a static hero", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", baseURL: "http://localhost:3100" });
  const page = await ctx.newPage();
  await page.goto("/");
  const anim = await page.locator(".hero-line > span").first().evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe("none");
  await ctx.close();
});
