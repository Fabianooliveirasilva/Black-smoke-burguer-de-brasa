import path from "node:path";
import { adminPage, expect, test } from "../support/pw";

test("admin creates a product with an uploaded photo, toggles availability and creates a coupon", async ({ browser, page }) => {
  const { page: admin, context } = await adminPage(browser);
  await expect(admin.getByRole("heading", { name: "Painel" })).toBeVisible();

  await admin.getByRole("link", { name: "Produtos", exact: true }).click();
  await admin.getByRole("link", { name: "Novo produto" }).click();
  const name = `Smash Teste ${Date.now() % 100000}`;
  await admin.getByRole("textbox", { name: "Nome", exact: true }).fill(name);
  await admin.getByRole("textbox", { name: "Chamada curta", exact: true }).fill("Criado pelo teste E2E.");
  await admin.getByRole("textbox", { name: "Descrição", exact: true }).fill("Burger criado no teste automatizado.");
  await admin.getByRole("textbox", { name: "Preço (R$)", exact: true }).fill("31,50");
  await admin.locator('input[type="file"]').setInputFiles(path.resolve("public/images/products/onion-smash.jpg"));
  await expect(admin.getByRole("textbox", { name: "ou caminho da imagem", exact: true })).toHaveValue(/^\/media\/[a-f0-9]{32}\.webp$/);
  await admin.getByRole("button", { name: "Ingrediente" }).click();
  await admin.getByRole("textbox", { name: "Ingrediente 1", exact: true }).fill("Cebola roxa");
  await admin.getByRole("button", { name: "Criar produto" }).click();
  await admin.waitForURL("**/admin/produtos");

  const row = admin.getByTestId("admin-product-row").filter({ hasText: name });
  await expect(row).toContainText("R$ 31,50");

  await page.goto("/cardapio");
  await page.getByPlaceholder("Buscar: bacon, picles, shake…").fill(name);
  await page.getByTestId("menu-item").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByTestId("add-to-cart")).toBeEnabled();

  await row.getByRole("switch", { name: `${name} disponível` }).click();
  await expect(row.getByRole("switch", { name: `${name} disponível` })).toHaveAttribute("aria-checked", "false");
  await page.reload();
  await expect(page.getByTestId("add-to-cart")).toBeDisabled();
  await expect(page.getByTestId("add-to-cart")).toContainText("Esgotado hoje");

  await admin.getByRole("link", { name: "Cupons" }).click();
  await admin.getByRole("textbox", { name: "Código", exact: true }).fill("E2EFIXO");
  await admin.getByRole("textbox", { name: "Descrição", exact: true }).fill("R$ 5 de teste");
  await admin.getByRole("combobox", { name: "Tipo" }).selectOption("FIXED");
  await admin.getByRole("textbox", { name: "Valor (R$)", exact: true }).fill("5,00");
  await admin.getByRole("button", { name: "Criar cupom" }).click();
  await expect(admin.getByTestId("coupon-row").filter({ hasText: "E2EFIXO" })).toContainText("R$ 5,00");
  await context.close();
});

test("admin can pause orders and the storefront blocks checkout", async ({ browser, page }) => {
  const { page: admin, context } = await adminPage(browser);
  await admin.goto("/admin/loja");
  await admin.getByRole("checkbox", { name: "Pausar novos pedidos" }).check();
  await admin.getByRole("button", { name: "Salvar configurações" }).click();
  await expect(admin.getByRole("status")).toHaveText("Configurações salvas.");

  await page.goto("/cardapio/fritas-da-casa");
  await page.getByTestId("add-to-cart").click();
  await page.goto("/carrinho");
  await expect(page.getByText("Pedidos pausados no momento.").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Continuar para o checkout|Escolha a região/ })).toBeDisabled();

  await admin.getByRole("checkbox", { name: "Pausar novos pedidos" }).uncheck();
  await admin.getByRole("button", { name: "Salvar configurações" }).click();
  await expect(admin.getByRole("status")).toHaveText("Configurações salvas.");
  await context.close();
});
