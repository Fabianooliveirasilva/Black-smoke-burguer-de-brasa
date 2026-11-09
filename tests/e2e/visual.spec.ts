import { expect, test } from "../support/pw";

// Visual regression baselines (Chromium/Linux). Update intentionally with:
//   pnpm test:e2e --project=e2e-desktop tests/e2e/visual.spec.ts --update-snapshots
test.use({ reducedMotion: "reduce" });

test("home hero", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot("home-hero.png", { mask: [page.getByTestId("store-status")] });
});

test("product page", async ({ page }) => {
  await page.goto("/cardapio/double-smash");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot("product.png");
});

test("cart ticket", async ({ page }) => {
  await page.goto("/cardapio/noir-double");
  await page.getByTestId("add-to-cart").click();
  await page.goto("/carrinho");
  await expect(page.getByTestId("subtotal")).toHaveText("R$ 54,90");
  await expect(page.getByRole("complementary", { name: "Resumo do pedido" })).toHaveScreenshot("cart-ticket.png");
});
