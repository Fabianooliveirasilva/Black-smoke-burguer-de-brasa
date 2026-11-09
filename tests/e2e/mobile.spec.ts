import { expect, test } from "../support/pw";

for (const path of ["/", "/cardapio", "/cardapio/brasa-bacon", "/carrinho", "/checkout", "/entrar"]) {
  test(`no horizontal overflow on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("mobile navigation and sticky cart bar", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  const nav = page.getByRole("navigation", { name: "Menu" });
  await expect(nav).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(nav).toBeHidden();

  await page.getByRole("button", { name: "Abrir menu" }).click();
  await nav.getByRole("link", { name: "Cardápio" }).click();
  await expect(page).toHaveURL(/\/cardapio$/);

  await page.goto("/cardapio/shake-cookies");
  await page.getByTestId("add-to-cart").click();
  await page.goto("/cardapio");
  const bar = page.getByRole("link", { name: /Ver pedido · 1 item/ });
  await expect(bar).toBeVisible();
  const box = await bar.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await bar.click();
  await expect(page).toHaveURL(/\/carrinho$/);
});

test("touch targets on the product page are at least 36px", async ({ page }) => {
  await page.goto("/cardapio/smoke-classic");
  const small = await page.locator("main button, main a").evaluateAll((els) =>
    els.filter((e) => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 36).map((e) => e.textContent?.trim() || e.getAttribute("aria-label")),
  );
  expect(small).toEqual([]);
});

test("M-06: links do rodapé têm alvo de toque de pelo menos 24 px (WCAG 2.5.8) sem colidir", async ({ page }) => {
  await page.goto("/cardapio");
  const boxes = await page.getByRole("navigation", { name: "Rodapé" }).getByRole("link").evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ top: r.top, height: r.height })));
  expect(boxes.length).toBeGreaterThanOrEqual(4);
  for (const b of boxes) expect(b.height).toBeGreaterThanOrEqual(28);
  for (let i = 1; i < boxes.length; i++) expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].top + boxes[i - 1].height - 0.5);
});
