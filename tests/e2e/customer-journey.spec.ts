import { adminPage, expect, test } from "../support/pw";


test("customer orders a customized burger, applies a coupon, checks out and tracks it", async ({ page, browser }) => {
  // 1. Home → menu
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Fumaça");
  await page.getByRole("link", { name: "Ver cardápio" }).first().click();
  await expect(page).toHaveURL(/\/cardapio$/);

  // 2. Search filters the menu
  await page.getByPlaceholder("Buscar: bacon, picles, shake…").fill("curado");
  await expect(page.getByTestId("menu-item")).toHaveCount(1);
  await page.getByTestId("menu-item").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Brasa Bacon");

  // 3. Customize: doneness, extra, removal, quantity
  await page.getByText("Mal passado", { exact: true }).click();
  await page.getByRole("button", { name: "Aumentar Bacon defumado na casa" }).click();
  await page.getByText("Barbecue de café", { exact: true }).click();
  await page.getByRole("button", { name: "Aumentar Quantidade" }).click();
  await expect(page.getByTestId("add-to-cart")).toContainText("R$ 107,60"); // (46,90 + 6,90) × 2
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByText("2× Brasa Bacon no seu pedido.")).toBeVisible();
  await expect(page.getByTestId("cart-count")).toHaveText("2");

  // 4. Cart: update quantity, coupon, zone
  await page.goto("/carrinho");
  const line = page.getByTestId("cart-line");
  await expect(line).toContainText("Ponto: mal passado");
  await expect(line).toContainText("Sem barbecue de café");
  await line.getByRole("button", { name: /Aumentar Quantidade/ }).click();
  await expect(page.getByTestId("subtotal")).toHaveText("R$ 161,40");

  await page.getByLabel("Cupom de desconto").fill("primeirabrasa");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByTestId("discount")).toHaveText("− R$ 24,21");

  await page.getByLabel("Região de entrega").selectOption({ label: "Pinheiros e Vila Madalena — R$ 6,90 · ~35 min" });
  await expect(page.getByTestId("delivery-fee")).toHaveText("R$ 6,90");
  await expect(page.getByTestId("total")).toHaveText("R$ 144,09");

  // 5. Checkout with validation errors first
  await page.getByTestId("go-checkout").click();
  await page.getByTestId("place-order").click();
  await expect(page.getByText("Informe seu nome")).toBeVisible();

  await page.getByLabel("Nome").fill("Marina Alves");
  await page.getByLabel("Celular").fill("11987651234");
  await expect(page.getByLabel("Celular")).toHaveValue("(11) 98765-1234");
  await page.getByLabel("CEP").fill("05416001");
  await page.getByLabel("Bairro").selectOption("Vila Madalena");
  await page.getByLabel("Rua").fill("Rua Harmonia");
  await page.getByLabel("Número").fill("321");
  await page.getByText("Dinheiro", { exact: true }).click();
  await page.getByLabel("Troco para quanto? (opcional)").fill("200,00");
  await page.getByTestId("place-order").click();

  // 6. Tracking
  await page.waitForURL(/\/pedido\//);
  await expect(page.getByTestId("order-status")).toHaveText("Pedido recebido");
  const ticket = page.getByRole("region", { name: "Comanda do pedido" });
  await expect(ticket).toContainText("3× Brasa Bacon");
  await expect(ticket).toContainText("R$ 144,09");
  await expect(ticket).toContainText("troco para R$ 200,00");
  await expect(page.getByTestId("cart-count")).toHaveCount(0);
  const trackingUrl = page.url();

  // 7. Kitchen advances the order in the admin panel; customer sees it
  const { page: admin, context } = await adminPage(browser);
  await admin.goto("/admin/pedidos");
  await admin.getByTestId("admin-order-row").filter({ hasText: "Marina Alves" }).getByRole("link").click();
  await expect(admin.getByRole("heading", { level: 1 })).toContainText("Pedido #");
  await admin.getByTestId("status-PREPARING").click();
  await expect(admin.getByTestId("status-ASSEMBLING")).toBeVisible();
  await context.close();

  await page.goto(trackingUrl);
  await expect(page.getByTestId("order-status")).toHaveText("Em preparação");
  await expect(page.getByTestId("cancel-order")).toHaveCount(0);
});

test("unavailable coupon and empty states are explained", async ({ page }) => {
  await page.goto("/carrinho");
  await expect(page.getByText("Seu pedido está vazio")).toBeVisible();
  await page.goto("/cardapio/onion-rings");
  await page.getByTestId("add-to-cart").click();
  await page.goto("/carrinho");
  await page.getByLabel("Cupom de desconto").fill("NAOEXISTE");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByTestId("coupon-error")).toContainText("Cupom inválido");
  await page.getByRole("button", { name: "Remover Onion Rings" }).click();
  await expect(page.getByText("Seu pedido está vazio")).toBeVisible();
});
