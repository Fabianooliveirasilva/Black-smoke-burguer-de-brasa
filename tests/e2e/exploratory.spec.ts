/**
 * Regressão derivada dos testes exploratórios assistidos (docs/qa/EXPLORATORY-TESTING.md).
 * Cada teste referencia a sessão (S1–S8) onde o comportamento foi observado.
 *
 * Defeitos conhecidos usam `test.fail()` com o ID do bug: o teste descreve o comportamento
 * CORRETO e hoje falha de propósito. Quando o bug for corrigido, o Playwright acusa
 * "expected to fail but passed" — aí basta remover o `test.fail()`.
 */
import path from "node:path";
import type { Page, TestInfo } from "@playwright/test";
import { adminPage, expect, gotoReady, test } from "../support/pw";

const SEARCH = "Buscar: bacon, picles, shake…";

/** Screenshot de evidência: anexado ao relatório HTML e salvo em docs/qa/automated/screenshots. */
async function evidence(page: Page, info: TestInfo, name: string) {
  const suffix = info.project.name === "e2e-desktop" ? "" : `-${info.project.name.replace("e2e-", "")}`;
  const file = path.resolve("docs/qa/automated/screenshots", `${name}${suffix}.png`);
  await page.screenshot({ path: file, fullPage: false, animations: "disabled" });
  await info.attach(name, { path: file, contentType: "image/png" });
}

async function addToCart(page: Page, slug: string) {
  await gotoReady(page, `/cardapio/${slug}`);
  const badge = page.getByTestId("cart-count");
  const before = (await badge.count()) ? Number(await badge.textContent()) : 0;
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toHaveText(String(before + 1));
}

const money = (s: string) => Number(s.replace(/[^\d,]/g, "").replace(",", "."));

test.describe("S1 · catálogo e busca", () => {
  test("busca ignora caixa, acento e espaços; HTML não é executado; estado vazio oferece limpar filtros", async ({ page }, info) => {
    const dialogs: string[] = [];
    page.on("dialog", (d) => (dialogs.push(d.message()), d.dismiss()));
    await gotoReady(page, "/cardapio");
    const search = page.getByPlaceholder(SEARCH);
    const items = page.getByTestId("menu-item");
    const total = await items.count();

    await search.fill("BACON");
    const bacon = await items.count();
    expect(bacon).toBeGreaterThan(0);
    await search.fill("  bacon  ");
    await expect(items).toHaveCount(bacon);

    await search.fill("hortela");
    const semAcento = await items.count();
    await search.fill("hortelã");
    await expect(items).toHaveCount(semAcento);
    expect(semAcento).toBeGreaterThan(0);

    await search.fill("<img src=x onerror=alert(1)>");
    await expect(items).toHaveCount(0);
    await expect(page.getByText("Tente outro ingrediente ou limpe os filtros.")).toBeVisible();
    await evidence(page, info, "s1-busca-vazia-html");
    expect(dialogs).toEqual([]);

    await page.getByRole("button", { name: "Limpar filtros" }).click();
    await expect(items).toHaveCount(total);
  });

  test("categoria + busca sem interseção mostra estado vazio", async ({ page }) => {
    await gotoReady(page, "/cardapio");
    await page.getByRole("button", { name: "Bebidas" }).click();
    await page.getByPlaceholder(SEARCH).fill("bacon");
    await expect(page.getByTestId("menu-item")).toHaveCount(0);
    await expect(page.getByText(/0 produtos encontrados/)).toBeVisible();
  });

  test("D-01: em 'Tudo', ordenar por preço gera uma lista única; numa categoria, ordena dentro dela", async ({ page }, info) => {
    await gotoReady(page, "/cardapio");
    const total = await page.getByTestId("menu-item").count();
    const prices = async () => (await page.getByTestId("menu-item").getByText(/^R\$/).allInnerTexts()).map(money);
    for (const [label, dir] of [["Menor preço", 1], ["Maior preço", -1]] as const) {
      await page.locator("select").first().selectOption({ label });
      await expect(page.locator("main section")).toHaveCount(1);
      await expect(page.getByTestId("menu-item")).toHaveCount(total);
      const all = await prices();
      expect(all).toEqual([...all].sort((a, b) => (a - b) * dir));
    }
    await page.locator("select").first().selectOption({ label: "Menor preço" });
    await expect(page.getByRole("heading", { name: "Menor preço primeiro" })).toBeVisible();
    expect((await prices())[0]).toBe(12.9); // a limonada vem antes de qualquer burger
    await evidence(page, info, "d01-ordenacao-global");

    await page.getByRole("button", { name: "Burgers" }).click();
    const burgers = await prices();
    expect(burgers).toEqual([...burgers].sort((a, b) => a - b));
    expect(burgers[0]).toBeGreaterThan(30);
  });

  test("M-02: busca, categoria, filtros e ordenação ficam na URL e sobrevivem ao reload", async ({ page }) => {
    await gotoReady(page, "/cardapio");
    await page.getByRole("button", { name: "Burgers" }).click();
    await page.getByPlaceholder(SEARCH).fill("bacon");
    await page.getByRole("button", { name: "Mais pedidos" }).click();
    await page.locator("select").first().selectOption({ label: "Maior preço" });
    await expect(page).toHaveURL(/q=bacon/);
    const url = new URL(page.url());
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: "bacon", cat: "burgers", pop: "1", ordem: "price-desc" });
    const count = await page.getByTestId("menu-item").count();

    await page.reload();
    await expect(page.getByPlaceholder(SEARCH)).toHaveValue("bacon");
    await expect(page.getByRole("button", { name: "Burgers" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Mais pedidos" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("select").first()).toHaveValue("price-desc");
    await expect(page.getByTestId("menu-item")).toHaveCount(count);

    // link compartilhado com valores inválidos cai no padrão, sem erro
    await gotoReady(page, "/cardapio?cat=inexistente&ordem=hack");
    await expect(page.getByRole("button", { name: "Tudo" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("select").first()).toHaveValue("relevance");
  });

  test("item 8: cards do cardápio mostram os ingredientes", async ({ page }) => {
    await gotoReady(page, "/cardapio");
    const card = page.getByTestId("menu-item").filter({ has: page.getByRole("heading", { name: "Brasa Bacon", exact: true }) });
    await expect(card.getByTestId("menu-item-ingredients")).toContainText(/bacon/i);
    await card.click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Brasa Bacon");
  });

  test("BUG-03 (corrigido): produto inexistente responde 404 e um único robots noindex", async ({ page }, info) => {
    const res = await page.goto("/cardapio/produto-que-nao-existe");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await evidence(page, info, "bug03-produto-inexistente");
    const robots = await page.locator('meta[name="robots"]').evaluateAll((m) => m.map((e) => e.getAttribute("content")));
    expect(robots.some((r) => r?.includes("index, follow"))).toBe(false);
    expect(res?.status()).toBe(404);
  });
});

test.describe("S2 · produto e personalização", () => {
  test("quantidade fica entre 1 e 20, observação limitada a 200 caracteres", async ({ page }, info) => {
    await page.goto("/cardapio/smoke-classic");
    const dec = page.getByRole("button", { name: "Diminuir Quantidade" });
    const inc = page.getByRole("button", { name: "Aumentar Quantidade" });
    await expect(dec).toBeDisabled();
    for (let i = 0; i < 25 && (await inc.isEnabled()); i++) await inc.click();
    await expect(inc).toBeDisabled();
    await expect(page.getByTestId("add-to-cart")).toContainText("R$ 778,00"); // 20 × 38,90
    await page.locator("textarea").fill("x".repeat(300));
    await expect(page.locator("textarea")).toHaveValue("x".repeat(200));
    await evidence(page, info, "s2-quantidade-maxima");
  });

  test("observação com HTML é exibida como texto no carrinho e o carrinho sobrevive ao reload", async ({ page }) => {
    // Digita logo após o goto, possivelmente antes da hidratação: no WebKit isso perdia a observação (BUG-05).
    await page.goto("/cardapio/smoke-classic");
    await page.locator("textarea").fill("<b>sem cebola</b>");
    await page.getByTestId("add-to-cart").click();
    await page.reload();
    await expect(page.getByTestId("cart-count")).toHaveText("1");
    await page.goto("/carrinho");
    await expect(page.getByTestId("cart-line")).toContainText("<b>sem cebola</b>");
    await expect(page.getByTestId("cart-line").locator("b")).toHaveCount(0);
  });
});

test.describe("S3 · carrinho e cupom", () => {
  test("preço adulterado no localStorage não altera o valor cobrado", async ({ page }, info) => {
    await addToCart(page, "limonada-siciliana");
    await page.evaluate(() => {
      const raw = localStorage.getItem("bsb-cart-v1")!;
      localStorage.setItem("bsb-cart-v1", raw.replace(/"basePriceCents":\d+/g, '"basePriceCents":1'));
    });
    await page.goto("/carrinho");
    await expect(page.getByTestId("subtotal")).toHaveText("R$ 12,90");
    await evidence(page, info, "s3-localstorage-adulterado");
  });

  test("cupom abaixo do mínimo fica pendente, vale ao atingir o mínimo e cai ao ficar abaixo", async ({ page }, info) => {
    await addToCart(page, "limonada-siciliana");
    await page.goto("/carrinho");
    await page.getByLabel("Cupom de desconto").fill("  smoke10 ");
    await page.getByRole("button", { name: "Aplicar" }).click();
    await expect(page.getByTestId("coupon-error")).toContainText("não atinge o valor mínimo");
    await expect(page.getByTestId("discount")).toHaveCount(0);

    await addToCart(page, "noir-double");
    await addToCart(page, "noir-double");
    await page.goto("/carrinho");
    await expect(page.getByTestId("discount")).toHaveText("− R$ 10,00");
    await evidence(page, info, "s3-cupom-aplicado");

    await page.getByRole("button", { name: "Remover Noir Double" }).click();
    await expect(page.getByTestId("discount")).toHaveCount(0);
    await expect(page.getByTestId("coupon-error")).toContainText("não atinge o valor mínimo");
  });
});

test.describe("S4 · checkout e acompanhamento", () => {
  test("D-02: pedido mínimo vale só para entrega; retirada abaixo do mínimo vai ao checkout sem endereço", async ({ page }, info) => {
    await addToCart(page, "fritas-da-casa"); // R$ 18,90 < mínimo de R$ 30
    await page.goto("/carrinho");
    await page.getByLabel("Região de entrega").selectOption({ index: 1 });
    await expect(page.getByText("Pedido mínimo para entrega: R$ 30,00. Na retirada não há mínimo.")).toBeVisible();
    await expect(page.getByTestId("go-checkout")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Continuar para o checkout" })).toBeDisabled();
    await evidence(page, info, "d02-entrega-abaixo-minimo");

    await page.getByText("Retirar", { exact: true }).click();
    await expect(page.getByText(/Pedido mínimo/)).toHaveCount(0);
    await evidence(page, info, "d02-retirada-sem-minimo");
    await page.getByTestId("go-checkout").click();
    await page.waitForURL("**/checkout");
    await expect(page.getByLabel("Nome")).toBeVisible();
    await expect(page.getByLabel("Rua")).toHaveCount(0);
    await page.getByLabel("Nome").fill("Retirada Rápida");
    await page.getByLabel("Celular").fill("11987651234");
    await page.getByTestId("place-order").click();
    await page.waitForURL(/\/pedido\//);
    await expect(page.getByRole("region", { name: "Comanda do pedido" })).toContainText("R$ 18,90");
  });

  test("duplo clique em confirmar gera um único pedido; cliente cancela pelo diálogo próprio (M-07)", async ({ page }, info) => {
    const dialogs: string[] = [];
    page.on("dialog", (d) => (dialogs.push(d.message()), d.dismiss())); // nenhum diálogo nativo deve abrir
    await addToCart(page, "smoke-classic");
    await page.goto("/carrinho");
    await page.getByLabel("Região de entrega").selectOption({ index: 1 });
    await page.getByTestId("go-checkout").click();
    await page.getByLabel("Nome").fill('<script>alert("x")</script> Ana');
    await page.getByLabel("Celular").fill("11aa98765bb1234");
    await expect(page.getByLabel("Celular")).toHaveValue("(11) 98765-1234");
    await page.getByLabel("CEP").fill("05416001");
    await page.getByLabel("Bairro").selectOption("Vila Madalena");
    await page.getByLabel("Rua").fill("Rua Harmonia");
    await page.getByLabel("Número").fill("321");

    const posts: number[] = [];
    page.on("response", (r) => {
      if (r.request().method() === "POST" && new URL(r.url()).pathname === "/api/orders") posts.push(r.status());
    });
    await page.getByTestId("place-order").dblclick();
    await page.waitForURL(/\/pedido\//);
    await expect(page.getByTestId("order-status")).toHaveText("Pedido recebido");
    expect(posts).toEqual([201]);
    expect(dialogs).toEqual([]); // nome com <script> não executou nada

    const dialog = page.getByTestId("confirm-dialog");
    await page.getByTestId("cancel-order").click();
    await expect(dialog.getByRole("heading", { name: "Cancelar este pedido?" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Manter pedido" })).toBeFocused(); // padrão seguro
    await evidence(page, info, "m07-dialogo-cancelamento");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("order-status")).toHaveText("Pedido recebido");

    await page.getByTestId("cancel-order").click();
    await dialog.getByRole("button", { name: "Cancelar pedido" }).click();
    await expect(page.getByTestId("order-status")).toHaveText(/cancelado/i);
    expect(dialogs).toEqual([]);
    await evidence(page, info, "s4-pedido-cancelado");
  });

  test("M-05: nome com 1 caractere tem mensagem própria", async ({ page }) => {
    await addToCart(page, "smoke-classic");
    await page.goto("/carrinho");
    await page.getByText("Retirar", { exact: true }).click();
    await page.getByTestId("go-checkout").click();
    await page.getByTestId("place-order").click();
    await expect(page.getByText("Informe seu nome")).toBeVisible();
    await page.getByLabel("Nome").fill("A");
    await page.getByTestId("place-order").click();
    await expect(page.getByText("Nome muito curto")).toBeVisible();
    await expect(page.getByText("Informe seu nome")).toHaveCount(0);
  });

  test("BUG-03 (corrigido): token de acompanhamento inexistente responde 404", async ({ page }) => {
    const res = await page.goto(`/pedido/${"A".repeat(32)}`);
    await expect(page.getByTestId("order-status")).toHaveCount(0);
    expect(res?.status()).toBe(404);
  });
});

test.describe("S6 · admin", () => {
  test("formulários do admin rejeitam dados inválidos com mensagem do servidor", async ({ browser }, info) => {
    const { page: admin, context } = await adminPage(browser);
    const run = Date.now() % 100000;

    await admin.goto("/admin/produtos/novo");
    await admin.getByRole("textbox", { name: "Nome", exact: true }).fill(`Exploratório ${run}`);
    await admin.getByRole("textbox", { name: "Descrição", exact: true }).fill("Produto de teste.");
    await admin.getByRole("textbox", { name: "Slug (URL)", exact: true }).fill(`exploratorio-${run}`);
    const price = admin.getByRole("textbox", { name: "Preço (R$)", exact: true });
    const create = admin.getByRole("button", { name: "Criar produto" });

    await price.fill("-10");
    await create.click();
    await expect(admin.getByText("Preço inválido.")).toBeVisible();

    await price.fill("99999999");
    await create.click();
    await expect(admin.getByText(/priceCents|Preço/).first()).toBeVisible();
    await expect(admin).toHaveURL(/\/novo$/);

    await price.fill("10");
    await admin.getByRole("textbox", { name: "Slug (URL)", exact: true }).fill("../../etc/passwd");
    await create.click();
    await expect(admin.getByText(/letras minúsculas, números e hífens/).last()).toBeVisible();
    await expect(admin).toHaveURL(/\/novo$/);
    await evidence(admin, info, "s6-produto-invalido");

    await admin.goto("/admin/cupons");
    await admin.getByRole("textbox", { name: "Código", exact: true }).fill(`EXP${run}`);
    await admin.getByRole("textbox", { name: "Descrição", exact: true }).fill("Cupom exploratório");
    await admin.getByLabel("Percentual (%)").fill("150");
    await admin.getByRole("button", { name: "Criar cupom" }).click();
    await expect(admin.getByText("Percentual deve ser 1–100")).toBeVisible();

    await admin.getByLabel("Percentual (%)").fill("10");
    await admin.getByLabel("Início").fill("2026-12-31");
    await admin.getByLabel("Fim").fill("2026-01-01");
    await admin.getByRole("button", { name: "Criar cupom" }).click();
    await expect(admin.getByText("Fim deve ser após o início")).toBeVisible();

    await admin.getByLabel("Início").fill("");
    await admin.getByLabel("Fim").fill("");
    await admin.getByRole("textbox", { name: "Código", exact: true }).fill("SMOKE10");
    await admin.getByRole("button", { name: "Criar cupom" }).click();
    await expect(admin.getByText("Já existe um registro com esses dados.")).toBeVisible();
    await expect(admin.getByText(`EXP${run}`)).toHaveCount(0);
    await evidence(admin, info, "s6-cupom-duplicado");
    await context.close();
  });

  test("BUG-01/02 (corrigidos): dashboard usa plural e porcentagem pt-BR", async ({ browser }, info) => {
    const { page: admin, context } = await adminPage(browser);
    await evidence(admin, info, "bug02-dashboard");
    await expect(admin.getByText(/% cancelados/)).toHaveText(/^\d+(,\d)?% cancelados$/);
    // Card "Faturamento · 30 dias" e rótulos do gráfico: nunca "1 pedidos"
    await expect(admin.getByText(/^\d[\d.]* pedidos?$/).first()).toBeVisible();
    await expect(admin.getByText(/^1 pedidos$/)).toHaveCount(0);
    const barLabels = await admin.getByRole("button", { name: /pedidos?$/ }).evaluateAll((b) => b.map((e) => e.getAttribute("aria-label") ?? ""));
    expect(barLabels.filter((l) => /\b1 pedidos$/.test(l))).toEqual([]);
    await context.close();
  });
});

test.describe("melhorias do admin", () => {
  test("M-03: validação nativa dos formulários do admin fala português", async ({ browser }, info) => {
    const { page: admin, context } = await adminPage(browser);
    await admin.goto("/admin/produtos/novo");
    await admin.getByRole("button", { name: "Criar produto" }).click();
    const name = admin.getByRole("textbox", { name: "Nome", exact: true });
    await expect.poll(() => name.evaluate((e: HTMLInputElement) => e.validationMessage)).toBe("Preencha este campo.");
    await evidence(admin, info, "m03-validacao-pt");
    // a mensagem customizada some ao digitar (senão o campo ficaria inválido para sempre)
    await name.fill("Algo");
    expect(await name.evaluate((e: HTMLInputElement) => e.validity.valid)).toBe(true);
    await context.close();
  });

  test("M-04: filtro com data inicial posterior à final explica o motivo", async ({ browser }, info) => {
    const { page: admin, context } = await adminPage(browser);
    await admin.goto("/admin/pedidos?from=2026-12-31&to=2026-01-01");
    await expect(admin.getByTestId("date-range-error")).toContainText('A data "De" é posterior à data "Até"');
    await evidence(admin, info, "m04-datas-invertidas");
    await admin.goto("/admin/pedidos");
    await expect(admin.getByTestId("date-range-error")).toHaveCount(0);
    await expect(admin.getByText(/^\d+ pedidos?$/)).toBeVisible();
    await context.close();
  });

  test("M-07: exclusão no admin usa diálogo próprio; Voltar não exclui", async ({ browser }) => {
    const { page: admin, context } = await adminPage(browser);
    const nativeDialogs: string[] = [];
    admin.on("dialog", (d) => (nativeDialogs.push(d.message()), d.dismiss()));
    const name = `Categoria Dialogo ${Date.now() % 100000}`;
    await admin.goto("/admin/produtos");
    await admin.getByLabel("Nova categoria").fill(name);
    await admin.getByRole("button", { name: "Adicionar" }).first().click();
    const row = admin.locator("li, tr").filter({ hasText: name }).last();
    await expect(row).toBeVisible();

    const dialog = admin.getByTestId("confirm-dialog");
    await row.getByRole("button", { name: "Excluir" }).click();
    await expect(dialog.getByRole("heading", { name: `Excluir ${name}?` })).toBeVisible();
    await dialog.getByRole("button", { name: "Voltar" }).click();
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Excluir" }).click();
    await dialog.getByRole("button", { name: "Excluir categoria" }).click();
    await expect(admin.getByText(name)).toHaveCount(0);
    expect(nativeDialogs).toEqual([]);
    await context.close();
  });
});
