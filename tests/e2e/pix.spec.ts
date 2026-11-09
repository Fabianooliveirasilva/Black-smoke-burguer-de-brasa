import { createHmac } from "node:crypto";
import { MP_MOCK, WEBHOOK_SECRET, expect, test } from "../support/pw";

test("Pix order shows the QR code and flips to paid only after a signed webhook", async ({ page, request }) => {
  await page.goto("/cardapio/double-smash");
  await page.getByTestId("add-to-cart").click();
  await page.goto("/carrinho");
  await page.getByText("Retirar", { exact: true }).click();
  await page.getByTestId("go-checkout").click();
  await page.getByLabel("Nome").fill("Pedro Pix");
  await page.getByLabel("Celular").fill("11911223344");
  await page.getByText("Pix", { exact: true }).click();
  await page.getByTestId("place-order").click();
  await expect(page.getByText("Para Pix, informe um e-mail")).toBeVisible();
  await page.getByLabel("E-mail").fill("pedro@test.local");
  await page.getByTestId("place-order").click();

  await page.waitForURL(/\/pedido\//);
  await expect(page.getByRole("img", { name: "QR Code Pix" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copiar código Pix" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Comanda do pedido" })).toContainText("Aguardando");

  const pay = (await (await request.get(`${MP_MOCK}/__control/payments`)).json()).at(-1);
  await request.post(`${MP_MOCK}/__control/payments/${pay.id}`, { data: { status: "approved" } });
  const ts = String(Math.floor(Date.now() / 1000));
  const reqId = `e2e-${pay.id}`;
  const v1 = createHmac("sha256", WEBHOOK_SECRET).update(`id:${pay.id};request-id:${reqId};ts:${ts};`).digest("hex");
  const res = await request.post(`/api/webhooks/mercadopago?type=payment&data.id=${pay.id}`, { data: {}, headers: { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": reqId } });
  expect((await res.json()).outcome).toBe("processed");

  await page.reload();
  await expect(page.getByRole("region", { name: "Comanda do pedido" })).toContainText("Pago");
  await expect(page.getByRole("img", { name: "QR Code Pix" })).toHaveCount(0);
});
