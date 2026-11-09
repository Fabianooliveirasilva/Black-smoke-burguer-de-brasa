import { BASE_URL, expect, signUpCustomer, test, uniqueIp } from "../support/pw";

test("anonymous visitors are sent to login from /admin and /conta", async ({ page }) => {
  await page.goto("/admin/pedidos");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fadmin%2Fpedidos/);
  await page.goto("/conta");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fconta/);
});

test("logged-in customers cannot open the admin panel", async ({ browser, playwright }) => {
  const { email, password } = await signUpCustomer(playwright);
  const context = await browser.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } });
  const page = await context.newPage();
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/conta");
  await expect(page.getByRole("heading", { name: "Minha conta" })).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(`${BASE_URL}/`);
  await context.close();
});

test("wrong password shows a generic error and open redirects are neutralised", async ({ page }) => {
  await page.goto("/entrar?next=https://evil.example");
  await page.getByLabel("E-mail").fill("admin@test.local");
  await page.getByLabel("Senha").fill("senha-errada");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByTestId("auth-error")).toHaveText("E-mail ou senha incorretos.");
  await expect(page.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/cadastro?next=%2Fconta");
});

// With Partial Prerendering the shell streams first, so Next serves streamed 404s with
// status 200 + <meta name="robots" content="noindex"> (documented framework behaviour).
test("unknown tracking tokens and products render the not-found page and are noindex", async ({ page }) => {
  for (const url of ["/pedido/naoexiste1234567890abcdef", "/cardapio/produto-que-nao-existe"]) {
    const res = await page.goto(url);
    expect(res?.status(), url).toBe(404); // real 404 from the Proxy, not a streamed "soft 404"
    await expect(page.getByRole("heading", { name: "Saiu da chapa" })).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  }
});

// Crawlers (htmlLimitedBots) must get the product's metadata in <head>, not streamed into <body>.
test("crawlers get the product page metadata in <head>", async ({ request }) => {
  const res = await request.get("/cardapio/smoke-classic", {
    headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
  });
  const html = await res.text();
  const head = html.slice(0, html.indexOf("</head>"));
  expect(head).toMatch(/<meta name="description" content="[^"]{50,}"/);
  expect(head).toContain('rel="canonical"');
  expect(head).toContain("<title>Smoke Classic");
});
