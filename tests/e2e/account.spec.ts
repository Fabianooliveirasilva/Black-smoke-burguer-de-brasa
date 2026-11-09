import { expect, test } from "../support/pw";

/** Item 9 do checklist: perfil editável e histórico de pedidos na área do cliente. */
test("cliente edita os dados do perfil e vê o próprio pedido no histórico", async ({ page }) => {
  const email = `perfil.${Date.now()}@test.local`;
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Perfil Original");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("Senha#Perfil2026");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL(/\/conta/);
  await expect(page.getByText("Nenhum pedido ainda.")).toBeVisible();

  const dados = page.getByRole("region", { name: "Dados" });
  await dados.getByLabel("Nome").fill("Perfil Editado");
  await dados.getByLabel("Celular").fill("11987654321");
  await dados.getByRole("button", { name: "Salvar dados" }).click();
  await expect(page.getByRole("status")).toHaveText("Dados salvos.");
  // Persistence check in a second tab of the same session: proves the server stored it, and avoids
  // racing the router.refresh() that saving triggers (Firefox aborts a navigation started mid-refresh).
  const fresh = await page.context().newPage();
  await fresh.goto("/conta");
  const freshDados = fresh.getByRole("region", { name: "Dados" });
  await expect(freshDados.getByLabel("Nome")).toHaveValue("Perfil Editado");
  await expect(freshDados.getByLabel("Celular")).toHaveValue(/98765.?4321/);
  await fresh.close();

  // pedido feito logado aparece no histórico e leva ao acompanhamento
  await page.goto("/cardapio/smoke-classic");
  await page.getByTestId("add-to-cart").click();
  await page.goto("/carrinho");
  await page.getByText("Retirar", { exact: true }).click();
  await page.getByTestId("go-checkout").click();
  await page.getByLabel("Nome").fill("Perfil Editado");
  await page.getByLabel("Celular").fill("11987654321");
  await page.getByTestId("place-order").click();
  await page.waitForURL(/\/pedido\//);
  const tracking = page.url();

  await page.goto("/conta");
  const historico = page.getByRole("region", { name: "Seus pedidos" });
  const item = historico.getByRole("link").filter({ hasText: "Smoke Classic" });
  await expect(item).toHaveCount(1);
  await expect(item).toContainText("Pedido recebido");
  await expect(item).toContainText("R$ 38,90");
  await item.click();
  await expect(page).toHaveURL(tracking);
});
