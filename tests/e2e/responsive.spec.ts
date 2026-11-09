import path from "node:path";
import { expect, test } from "../support/pw";

/** Item 5 do checklist (§15): tablet e telas grandes, além do notebook (1366) e do celular (mobile.spec). */
const VIEWPORTS = [
  { name: "tablet-retrato", width: 768, height: 1024 },
  { name: "tablet-paisagem", width: 1024, height: 768 },
  { name: "desktop-fullhd", width: 1920, height: 1080 },
  { name: "desktop-2k", width: 2560, height: 1440 },
];
const PAGES = ["/", "/cardapio", "/cardapio/brasa-bacon", "/carrinho", "/checkout", "/entrar"];

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} ${vp.width}×${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("sem rolagem horizontal, conteúdo com largura contida e navegação alcançável", async ({ page }, info) => {
      await page.goto("/cardapio/brasa-bacon");
      await page.getByTestId("add-to-cart").click(); // carrinho e checkout com conteúdo real
      for (const p of PAGES) {
        await page.goto(p);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${p} transborda ${overflow}px`).toBeLessThanOrEqual(0);
        // em telas grandes o texto não pode esticar de borda a borda (legibilidade)
        const widest = await page.locator("main p").evaluateAll((ps) => Math.max(0, ...ps.map((e) => e.getBoundingClientRect().width)));
        expect(widest, `${p}: parágrafo com ${widest}px`).toBeLessThanOrEqual(1400);
      }

      await page.goto("/");
      const burger = page.getByRole("button", { name: "Abrir menu" });
      if (await burger.isVisible()) {
        await burger.click();
        await page.getByRole("navigation", { name: "Menu" }).getByRole("link", { name: "Cardápio" }).click();
      } else {
        await page.getByRole("banner").getByRole("link", { name: "Cardápio", exact: true }).click();
      }
      await expect(page).toHaveURL(/\/cardapio$/);
      await page.getByTestId("menu-item").first().waitFor(); // the menu streams in after the shell
      // a partir de 768 px o cardápio usa duas colunas
      const xs = await page.getByTestId("menu-item").evaluateAll((els) => new Set(els.slice(0, 4).map((e) => Math.round(e.getBoundingClientRect().left))).size);
      expect(xs).toBe(2);

      for (const p of ["/", "/cardapio"]) {
        await page.goto(p);
        await page.waitForLoadState("networkidle");
        const file = path.resolve("docs/qa/automated/screenshots", `responsivo-${vp.name}${p === "/" ? "-home" : "-cardapio"}.png`);
        await page.screenshot({ path: file, animations: "disabled" });
        await info.attach(path.basename(file), { path: file, contentType: "image/png" });
      }
    });
  });
}
