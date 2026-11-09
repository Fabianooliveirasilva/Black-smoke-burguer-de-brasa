"""
Sessões de teste exploratório assistido (Session-Based Test Management).

Cada sessão tem um charter ("Explorar <alvo> com <recursos> para descobrir <informação>").
O script executa as sondagens da sessão, tira screenshots e registra cada observação em
docs/qa/exploratory/session-log.json — o testador revisa o log e as imagens e classifica
os achados em docs/qa/EXPLORATORY-TESTING.md.

Uso:  python3 tests/exploratory/explore.py [BASE_URL] [sessões...]
      python3 tests/exploratory/explore.py http://localhost:3000 S1 S3
Requer: servidor rodando (pnpm dev ou build standalone) e banco semeado (pnpm db:seed).
Atenção: cria pedidos, cupons e usuários no banco apontado pelo servidor — não use em produção.
"""
import json, re, sys, time, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].startswith("http") else "http://localhost:3000"
ONLY = [a for a in sys.argv[1:] if not a.startswith("http")]
OUT = Path("docs/qa/exploratory/screenshots"); OUT.mkdir(parents=True, exist_ok=True)
LOG = Path("docs/qa/exploratory/session-log.json")
ADMIN = ("admin@blacksmoke.dev", "BlackSmoke#2026")
RUN = str(int(time.time()))[-6:]

log = json.loads(LOG.read_text()) if LOG.exists() and ONLY else {}

def note(session, step, observed, shot=None, flag=None):
    """flag: None = conforme | 'BUG' | 'MELHORIA' | 'DÚVIDA'"""
    log.setdefault(session, []).append({"step": step, "observed": observed, "screenshot": shot, "flag": flag})
    print(f"[{session}] {'['+flag+'] ' if flag else ''}{step}: {observed}")

def shot(page, name, full=False):
    path = OUT / f"{name}.png"; page.screenshot(path=str(path), full_page=full); return path.name

_ip = [0]
def new_page(browser, **kw):
    # IP distinto por contexto: com TRUST_PROXY=true isola os rate limits entre sessões (como na suíte E2E)
    _ip[0] += 1; kw.setdefault("extra_http_headers", {"X-Forwarded-For": f"10.77.{int(RUN) % 250}.{_ip[0]}"})
    ctx = browser.new_context(viewport=kw.pop("viewport", {"width": 1366, "height": 860}), locale="pt-BR", timezone_id="America/Sao_Paulo", **kw)
    ctx.set_default_timeout(20_000); ctx.set_default_navigation_timeout(60_000)
    page = ctx.new_page()
    page.errors = []
    page.on("console", lambda m: page.errors.append(m.text[:300]) if m.type == "error" else None)
    page.on("pageerror", lambda e: page.errors.append(f"pageerror {e}"[:300]))
    page.on("dialog", lambda d: (page.errors.append(f"DIALOG {d.message}"), d.dismiss()))
    return ctx, page

def go(page, path):
    r = page.goto(BASE + path); page.wait_for_load_state("networkidle"); return r

def login(page, email, pwd, nxt="/conta"):
    go(page, f"/entrar?next={nxt}")
    page.get_by_label("E-mail").fill(email); page.get_by_label("Senha").fill(pwd)
    page.get_by_role("button", name="Entrar").click()

def form_errors(page):
    app = [t.strip() for t in page.locator("[role=alert], [id$=-error]").all_inner_texts() if t.strip()]
    native = page.evaluate("() => [...document.querySelectorAll(':invalid')].filter(e => e.tagName !== 'FORM' && e.tagName !== 'FIELDSET').map(e => `${e.labels?.[0]?.innerText || e.name}: [nativo] ${e.validationMessage}`)")
    return " | ".join(app + native)[:300]

def fill_dt(page, label, iso):
    """Preenche input de data respeitando o tipo (date | datetime-local)."""
    loc = page.get_by_label(label); t = loc.get_attribute("type")
    loc.fill(iso[:10] if t == "date" else iso if iso else "")

def add_to_cart(page, slug):
    go(page, f"/cardapio/{slug}"); page.get_by_test_id("add-to-cart").click(); page.wait_for_timeout(400)

def fill_checkout(page, name="Cliente Exploratório", phone="11987651234"):
    page.get_by_label("Nome").fill(name); page.get_by_label("Celular").fill(phone)
    page.get_by_label("CEP").fill("05416001"); page.get_by_label("Bairro").select_option("Vila Madalena")
    page.get_by_label("Rua").fill("Rua Harmonia"); page.get_by_label("Número").fill("321")

def cart_with_zone(page, slug="smoke-classic"):
    add_to_cart(page, slug); go(page, "/carrinho")
    page.get_by_label("Região de entrega").select_option(index=1)


# ───────────────────────── S1 · Catálogo e busca ─────────────────────────
def s1(b):
    S = "S1"; ctx, page = new_page(b)
    go(page, "/cardapio"); search = page.get_by_placeholder("Buscar: bacon, picles, shake…")
    total = page.get_by_test_id("menu-item").count(); note(S, "Itens no cardápio sem filtro", f"{total} itens")

    for term in ["BACON", "hortela", "hortelã", "  bacon  ", "xyzxyz", "<img src=x onerror=alert(1)>", "%", "'; DROP TABLE"]:
        search.fill(term); page.wait_for_timeout(500)
        n = page.get_by_test_id("menu-item").count(); note(S, f"Busca {term!r}", f"{n} resultado(s)")
        if term == "xyzxyz": note(S, "Estado vazio da busca", page.locator("main").inner_text()[-200:].replace("\n", " "), shot(page, "s1_busca_vazia"))
        if term.startswith("<img"): note(S, "Busca com HTML", "nenhum alert/dialog executado" if not any("DIALOG" in e for e in page.errors) else "XSS executado!", shot(page, "s1_busca_xss"), None if not any("DIALOG" in e for e in page.errors) else "BUG")
    acc = [page.get_by_test_id("menu-item").count()]
    search.fill("hortela"); page.wait_for_timeout(400); a = page.get_by_test_id("menu-item").count()
    search.fill("hortelã"); page.wait_for_timeout(400); c = page.get_by_test_id("menu-item").count()
    note(S, "Busca insensível a acento", f"'hortela'={a} · 'hortelã'={c}", flag=None if a == c else "MELHORIA")
    search.fill("")

    page.get_by_role("button", name="Bebidas").click(); page.wait_for_timeout(400)
    note(S, "Filtro Bebidas", f"{page.get_by_test_id('menu-item').count()} itens; URL={page.url}", shot(page, "s1_filtro_bebidas"))
    search.fill("bacon"); page.wait_for_timeout(400)
    note(S, "Filtro Bebidas + busca 'bacon' (combinação sem interseção)", f"{page.get_by_test_id('menu-item').count()} itens", shot(page, "s1_filtro_combinado"))
    page.reload(); page.wait_for_load_state("networkidle")
    note(S, "Reload mantém filtros?", f"URL={page.url} · busca='{search.input_value()}' · itens={page.get_by_test_id('menu-item').count()}",
         flag=None if "q=" in page.url or search.input_value() else "MELHORIA")
    go(page, "/cardapio")

    sel = page.locator("select").first; opts = sel.locator("option").all_inner_texts(); note(S, "Opções de ordenação", " | ".join(opts))
    def section_prices():
        out = []
        for sec in page.locator("main section").all():
            pr = [float(re.sub(r"[^\d,]", "", t).replace(",", ".")) for t in sec.get_by_test_id("menu-item").locator("text=/R\\$/").all_inner_texts()]
            if pr: out.append(pr)
        return out
    for label, rev in [("Menor preço", False), ("Maior preço", True)]:
        sel.select_option(label=label); page.wait_for_timeout(400); secs = section_prices()
        within = all(x == sorted(x, reverse=rev) for x in secs); flat = [v for x in secs for v in x]
        note(S, f"Ordenação '{label}'", f"ordenado dentro de cada categoria={within} · ordenado globalmente={flat == sorted(flat, reverse=rev)}",
             flag=None if within else "BUG")
    note(S, "Ordenar por preço em 'Tudo' mantém agrupamento por categoria", "bebida de R$ 12,90 aparece depois de burger de R$ 33,90 — esperado pelo cliente?", flag="DÚVIDA")
    shot(page, "s1_ordenacao", full=True)

    r = go(page, "/cardapio/produto-que-nao-existe"); robots = page.locator("meta[name=robots]").evaluate_all("els => els.map(e => e.content)")
    note(S, "Slug inexistente", f"HTTP {r.status} · título='{page.title()}' · meta robots={robots}", shot(page, "s1_produto_404"), None if r.status == 404 and len(robots) <= 1 else "BUG")
    r = go(page, "/pagina-que-nao-existe"); note(S, "Rota inexistente — <title>", page.title(), flag="MELHORIA" if "Burger de brasa" in page.title() else None)
    note(S, "Erros de console na sessão", page.errors or "nenhum"); ctx.close()


# ───────────────────── S2 · Produto e personalização ─────────────────────
def s2(b):
    S = "S2"; ctx, page = new_page(b)
    go(page, "/cardapio/smoke-classic"); shot(page, "s2_produto", full=True)
    dec = page.get_by_role("button", name="Diminuir Quantidade"); inc = page.get_by_role("button", name="Aumentar Quantidade")
    note(S, "Quantidade mínima: botão '−' em 1", "desabilitado" if dec.is_disabled() else "habilitado", flag=None if dec.is_disabled() else "DÚVIDA")
    for _ in range(40):
        if inc.is_disabled(): break
        inc.click()
    qty = page.locator("[aria-live], output").filter(has_text=re.compile(r"^\d+$")).first
    note(S, "Quantidade máxima após 40 cliques em '+'", f"'+' desabilitado={inc.is_disabled()} · botão={page.get_by_test_id('add-to-cart').inner_text().replace(chr(10), ' ')}", shot(page, "s2_qtd_maxima"))
    extra = page.get_by_role("button", name=re.compile(r"^Aumentar (?!Quantidade)")).first
    name = extra.get_attribute("aria-label"); clicks = 0
    while not extra.is_disabled() and clicks < 20: extra.click(); clicks += 1
    note(S, f"Limite de adicional ({name})", f"travou após {clicks} cliques")
    notes = page.locator("textarea"); notes.fill("x" * 300)
    note(S, "Observação com 300 caracteres", f"aceitou {len(notes.input_value())} (maxlength={notes.get_attribute('maxlength')})")
    notes.fill("<b>sem cebola</b> 🍔"); page.get_by_test_id("add-to-cart").click(); page.wait_for_timeout(500)
    note(S, "Adicionar ao carrinho", page.get_by_test_id("cart-count").inner_text() + " item(ns) no badge", shot(page, "s2_adicionado"))
    page.reload(); page.wait_for_load_state("networkidle")
    note(S, "Carrinho persiste após reload", page.get_by_test_id("cart-count").inner_text() if page.get_by_test_id("cart-count").count() else "PERDIDO",
         flag=None if page.get_by_test_id("cart-count").count() else "BUG")
    go(page, "/carrinho"); note(S, "Observação com HTML/emoji exibida no carrinho", page.get_by_test_id("cart-line").first.inner_text().replace("\n", " · ")[:200], shot(page, "s2_carrinho_obs"))
    note(S, "Erros de console", page.errors or "nenhum"); ctx.close()


# ───────────────────── S3 · Carrinho, cupom e manipulação ─────────────────────
def s3(b):
    S = "S3"; ctx, page = new_page(b)
    add_to_cart(page, "limonada-siciliana"); go(page, "/carrinho")
    coupon = page.get_by_label("Cupom de desconto"); apply = page.get_by_role("button", name="Aplicar")
    coupon.fill("SMOKE10"); apply.click(); page.wait_for_timeout(800)
    note(S, "Cupom SMOKE10 com subtotal abaixo do mínimo (R$ 80)", page.get_by_test_id("coupon-error").inner_text() if page.get_by_test_id("coupon-error").count() else "aplicado?!", shot(page, "s3_cupom_minimo"))
    note(S, "Cupom inválido permanece 'aplicado' com botão Remover (campo some)", page.get_by_test_id("coupon-error").inner_text().replace("\n", " "), flag="DÚVIDA")
    page.get_by_test_id("coupon-error").get_by_role("button", name="Remover").click(); page.wait_for_timeout(300)
    coupon.fill("  smoke10  "); apply.click(); page.wait_for_timeout(800)
    note(S, "Cupom minúsculo com espaços", page.get_by_test_id("coupon-error").inner_text() if page.get_by_test_id("coupon-error").count() else "aceito")

    add_to_cart(page, "noir-double"); add_to_cart(page, "noir-double"); go(page, "/carrinho"); page.wait_for_timeout(1000)
    note(S, "Cupom pendente revalidado ao atingir o mínimo", f"desconto={page.get_by_test_id('discount').inner_text() if page.get_by_test_id('discount').count() else '—'} · erro={page.get_by_test_id('coupon-error').count() > 0}", shot(page, "s3_cupom_revalidado"))
    if page.get_by_label("Cupom de desconto").count():
        page.get_by_label("Cupom de desconto").fill("SMOKE10"); page.get_by_role("button", name="Aplicar").click(); page.wait_for_timeout(800)
    d = page.get_by_test_id("discount"); note(S, "SMOKE10 com subtotal ≥ R$ 80", f"subtotal={page.get_by_test_id('subtotal').inner_text()} desconto={d.inner_text() if d.count() else '—'}", shot(page, "s3_cupom_aplicado"))
    page.get_by_role("button", name="Remover Noir Double").click(); page.wait_for_timeout(1200)
    d = page.get_by_test_id("discount"); err = page.get_by_test_id("coupon-error")
    note(S, "Remover itens até ficar abaixo do mínimo com cupom aplicado",
         f"subtotal={page.get_by_test_id('subtotal').inner_text()} · desconto={d.inner_text() if d.count() else 'removido'} · msg={err.inner_text() if err.count() else '—'}",
         shot(page, "s3_cupom_abaixo_minimo"), flag="BUG" if d.count() and "R$" in d.inner_text() and not err.count() else None)

    # Manipulação do carrinho no localStorage: preço adulterado não pode valer no servidor
    key = page.evaluate("() => Object.keys(localStorage).find(k => /cart/i.test(k))")
    raw = page.evaluate(f"() => localStorage.getItem({json.dumps(key)})")
    note(S, "Estrutura do carrinho no localStorage", f"chave={key} · {raw[:220] if raw else None}")
    if raw:
        tampered = re.sub(r'("(?:unitPriceCents|priceCents|basePriceCents|price)"\s*:\s*)\d+', r"\g<1>1", raw)
        page.evaluate(f"() => localStorage.setItem({json.dumps(key)}, {json.dumps(tampered)})"); page.reload(); page.wait_for_load_state("networkidle"); page.wait_for_timeout(1200)
        note(S, "Preço adulterado para 1 centavo no localStorage", f"preço adulterado={'sim' if tampered != raw else 'campo de preço não existe no cliente'} · subtotal exibido={page.get_by_test_id('subtotal').inner_text()}",
             shot(page, "s3_localstorage_adulterado"))
    note(S, "Erros de console", page.errors or "nenhum"); ctx.close()


# ─────────────────────── S4 · Checkout e acompanhamento ───────────────────────
def s4(b):
    S = "S4"; ctx, page = new_page(b)
    cart_with_zone(page); page.get_by_test_id("go-checkout").click(); page.wait_for_url("**/checkout"); page.wait_for_load_state("networkidle")
    page.get_by_test_id("place-order").click(); page.wait_for_timeout(500)
    note(S, "Enviar checkout vazio", " | ".join(t for t in page.locator("[role=alert], [id$=-error], .text-sangue, p[class*=error]").all_inner_texts() if t.strip())[:300] or "sem mensagens?", shot(page, "s4_checkout_vazio", full=True))
    focused = page.evaluate("() => document.activeElement && (document.activeElement.labels?.[0]?.innerText || document.activeElement.name)")
    note(S, "Foco após erro de validação", f"foco em: {focused}", flag=None if focused else "MELHORIA")
    page.get_by_label("Celular").fill("123"); page.get_by_label("CEP").fill("000"); page.get_by_label("Nome").fill("A")
    page.get_by_test_id("place-order").click(); page.wait_for_timeout(500)
    note(S, "Celular '123', CEP '000', nome 'A'", form_errors(page), shot(page, "s4_checkout_invalido"))
    page.get_by_label("Celular").fill("11aa98765bb1234"); note(S, "Celular com letras", f"valor ficou {page.get_by_label('Celular').input_value()!r}")

    fill_checkout(page, name='<script>alert("x")</script> Ana')
    # Entrega × retirada é escolhida no carrinho (rádio "Entrega"/"Retirar")
    _, pk = new_page(b); add_to_cart(pk, "fritas-da-casa"); go(pk, "/carrinho")
    pk.get_by_text("Retirar", exact=True).click(); pk.wait_for_timeout(500)
    note(S, "Retirada com subtotal R$ 18,90 (< mínimo R$ 30)", pk.get_by_text(re.compile("Pedido mínimo")).first.inner_text() + f" · checkout habilitado={pk.get_by_test_id('go-checkout').is_enabled() if pk.get_by_test_id('go-checkout').count() else False}", shot(pk, "s4_retirada_minimo"), flag="DÚVIDA")
    add_to_cart(pk, "smoke-classic"); go(pk, "/carrinho"); pk.get_by_text("Retirar", exact=True).click(); pk.wait_for_timeout(500)
    note(S, "Carrinho: escolher 'Retirar'", f"taxa={pk.get_by_test_id('delivery-fee').inner_text() if pk.get_by_test_id('delivery-fee').count() else '—'} · total={pk.get_by_test_id('total').inner_text()}", shot(pk, "s4_retirada_carrinho"))
    pk.get_by_test_id("go-checkout").click(); pk.wait_for_url("**/checkout"); pk.wait_for_load_state("networkidle")
    note(S, "Checkout de retirada pede endereço?", f"campo Rua presente={pk.get_by_label('Rua').count() > 0}", shot(pk, "s4_retirada_checkout", full=True), flag="BUG" if pk.get_by_label("Rua").count() else None)
    pk.context.close()

    # Duplo clique no envio: deve gerar apenas um pedido
    orders = []
    page.on("response", lambda r: orders.append(r.status) if r.url.endswith("/api/orders") and r.request.method == "POST" else None)
    page.get_by_test_id("place-order").dblclick(); page.wait_for_url(re.compile(r"/pedido/"), timeout=60_000); page.get_by_test_id("order-status").wait_for()
    note(S, "Duplo clique em 'Fazer pedido'", f"POST /api/orders enviados: {len(orders)} ({orders})", shot(page, "s4_pedido_criado", full=True), flag=None if len(orders) == 1 else "BUG")
    note(S, "Nome com <script> na comanda", "renderizado como texto, sem execução" if not any("DIALOG" in e for e in page.errors) else "XSS!", flag=None if not any("DIALOG" in e for e in page.errors) else "BUG")
    track = page.url
    cancel = page.get_by_test_id("cancel-order")
    if cancel.count():
        # cancelamento usa confirm() nativo — aceitar só aqui
        page.evaluate("() => { window.confirm = (m) => { console.info('confirm: ' + m); return true; } }")
        cancel.click(); page.wait_for_timeout(300)
        confirm = page.get_by_role("button", name=re.compile("Cancelar pedido|Confirmar", re.I))
        if confirm.count() > 0: confirm.last.click()
        page.wait_for_timeout(1500)
        note(S, "Cliente cancela pedido recebido", page.get_by_test_id("order-status").inner_text(), shot(page, "s4_pedido_cancelado"))
    page.go_back(); page.wait_for_load_state("networkidle"); note(S, "Voltar do navegador após pedido", f"URL={page.url} · badge={page.get_by_test_id('cart-count').count()}")

    r = go(page, "/pedido/" + "A" * 43); note(S, "Token de acompanhamento inválido", f"HTTP {r.status} · h1={page.locator('h1').all_inner_texts()} (UI de 404, status 200 — mesmo defeito do S1)", shot(page, "s4_token_invalido"), None if r.status == 404 else "BUG")
    r = go(page, "/pedido/1"); leak = page.get_by_test_id("order-status").count() > 0
    note(S, "Acompanhamento por ID sequencial (IDOR)", f"HTTP {r.status} · dados de pedido expostos={leak}", flag="BUG" if leak else None)
    note(S, "Erros de console", page.errors or "nenhum"); ctx.close()
    return track


# ─────────────────────── S5 · Autenticação e acesso ───────────────────────
def s5(b):
    S = "S5"; ctx, page = new_page(b)
    go(page, "/cadastro"); page.get_by_role("button", name="Criar conta").click(); page.wait_for_timeout(400)
    note(S, "Cadastro vazio", " | ".join(t for t in page.locator("[role=alert], [id$=-error]").all_inner_texts() if t.strip()), shot(page, "s5_cadastro_vazio"))
    page.get_by_label("Nome").fill("Teste"); page.get_by_label("E-mail").fill("nao-e-email"); page.get_by_label("Senha").fill("123")
    page.get_by_role("button", name="Criar conta").click(); page.wait_for_timeout(500)
    note(S, "E-mail inválido + senha '123'", " | ".join(t for t in page.locator("[role=alert], [id$=-error]").all_inner_texts() if t.strip()), shot(page, "s5_cadastro_invalido"))
    page.get_by_label("E-mail").fill(ADMIN[0]); page.get_by_label("Senha").fill("SenhaForte#2026x"); page.get_by_role("button", name="Criar conta").click(); page.wait_for_timeout(2500)
    note(S, "Cadastro com e-mail já existente", page.locator("main").inner_text()[:250].replace("\n", " "), shot(page, "s5_cadastro_duplicado"))

    email = f"explora{RUN}@test.local"
    page.get_by_label("E-mail").fill(email); page.get_by_role("button", name="Criar conta").click(); page.wait_for_timeout(4000); page.wait_for_load_state("networkidle")
    note(S, "Cadastro válido", f"URL={page.url}", shot(page, "s5_cadastro_ok"))
    r = go(page, "/admin"); note(S, "Cliente comum acessa /admin", f"HTTP {r.status} · URL={page.url}", shot(page, "s5_cliente_admin"), None if "/admin" not in page.url or r.status in (403, 404) else "BUG")
    api = page.request.get(BASE + "/api/admin/orders"); note(S, "Cliente comum chama GET /api/admin/orders", f"HTTP {api.status}", flag=None if api.status in (401, 403) else "BUG")
    ctx.close()

    ctx, page = new_page(b)
    login(page, ADMIN[0], "senha-errada"); page.wait_for_timeout(2500)
    msg = page.locator("[role=alert]").all_inner_texts(); note(S, "Login com senha errada", " | ".join(msg) or page.locator("main").inner_text()[:200], shot(page, "s5_login_errado"))
    login(page, "naoexiste@test.local", "qualquer"); page.wait_for_timeout(2500)
    msg2 = page.locator("[role=alert]").all_inner_texts(); note(S, "Login com e-mail inexistente (enumeração)", f"mesma mensagem={msg == msg2} ({' | '.join(msg2)})", flag=None if msg == msg2 else "BUG")
    statuses = []
    for i in range(12):
        r = page.request.post(BASE + "/api/auth/sign-in/email", data={"email": ADMIN[0], "password": f"errada{i}"}, headers={"Origin": BASE})
        statuses.append(r.status)
    note(S, "12 tentativas de login seguidas (força bruta)", str(statuses), flag=None if 429 in statuses else "BUG")
    r = page.request.get(BASE + "/api/admin/orders"); note(S, "Anônimo chama GET /api/admin/orders", f"HTTP {r.status}", flag=None if r.status == 401 else "BUG")
    ctx.close()


# ───────────────────────────── S6 · Admin ─────────────────────────────
def s6(b, track=None):
    S = "S6"; ctx, page = new_page(b)
    login(page, *ADMIN, nxt="/admin"); page.wait_for_url(re.compile(r"://[^/]+/admin$"), timeout=60_000); page.wait_for_load_state("networkidle")
    txt = page.locator("main").inner_text()
    note(S, "Dashboard — textos", " · ".join(l for l in txt.split("\n") if re.search(r"pedidos?$|cancelados|Ticket", l))[:250], shot(page, "s6_dashboard", full=True))
    if re.search(r"\b1 pedidos\b", txt): note(S, "Pluralização no dashboard", "'1 pedidos' exibido", flag="BUG")
    if re.search(r"\d\.\d%", txt): note(S, "Formato de porcentagem", f"{re.search(r'[0-9.]+% cancelados', txt).group(0)} — separador decimal '.' em pt-BR", flag="BUG")

    go(page, "/admin/pedidos"); shot(page, "s6_pedidos", full=True)
    page.get_by_label("Busca").fill("Ana"); page.get_by_role("button", name="Filtrar").click(); page.wait_for_load_state("networkidle")
    note(S, "Filtro de pedidos por nome", f"{page.get_by_test_id('admin-order-row').count()} linha(s)")
    page.get_by_label("De").fill("2026-12-31"); page.get_by_label("Até").fill("2026-01-01"); page.get_by_role("button", name="Filtrar").click(); page.wait_for_load_state("networkidle")
    note(S, "Filtro com data inicial > final", f"{page.get_by_test_id('admin-order-row').count()} linha(s) · msg={page.locator('[role=alert]').all_inner_texts()}", shot(page, "s6_filtro_datas_invertidas"), flag="MELHORIA" if not page.locator("[role=alert]").count() else None)

    go(page, "/admin/produtos/novo"); page.get_by_role("button", name="Criar produto").click(); page.wait_for_timeout(600)
    note(S, "Criar produto vazio", form_errors(page), shot(page, "s6_produto_vazio", full=True))
    page.get_by_label("Nome").fill(f"Teste Exploratório {RUN}"); page.get_by_label("Descrição").fill("Produto criado em teste exploratório."); page.get_by_label("Slug (URL)").fill(f"teste-exploratorio-{RUN}"); page.get_by_label("Preço (R$)").fill("-10")
    page.get_by_role("button", name="Criar produto").click(); page.wait_for_timeout(800)
    note(S, "Preço negativo", form_errors(page) or f"URL={page.url}", shot(page, "s6_produto_preco_negativo"), flag=None if "/novo" in page.url else "BUG")
    page.get_by_label("Preço (R$)").fill("99999999"); page.get_by_role("button", name="Criar produto").click(); page.wait_for_timeout(800)
    note(S, "Preço R$ 99.999.999", form_errors(page) or f"URL={page.url}")
    page.get_by_label("Slug (URL)").fill("../../etc/passwd"); page.get_by_label("Preço (R$)").fill("10"); page.get_by_role("button", name="Criar produto").click(); page.wait_for_timeout(800)
    note(S, "Slug com path traversal", form_errors(page) or f"URL={page.url}", flag=None if "/novo" in page.url else "BUG")

    go(page, "/admin/cupons")
    page.get_by_label("Código").fill(f"EXP{RUN}"); page.get_by_label("Descrição").fill("Cupom exploratório"); page.get_by_label("Percentual (%)").fill("150"); page.get_by_role("button", name="Criar cupom").click(); page.wait_for_timeout(800)
    note(S, "Cupom percentual de 150%", form_errors(page) or "aceito?", shot(page, "s6_cupom_150"), flag=None if form_errors(page) else "BUG")
    page.get_by_label("Percentual (%)").fill("10"); fill_dt(page, "Início", "2026-12-31T10:00"); fill_dt(page, "Fim", "2026-01-01T10:00")
    page.get_by_role("button", name="Criar cupom").click(); page.wait_for_timeout(800)
    errs = form_errors(page); created = page.get_by_text(f"EXP{RUN}").count() > 0
    note(S, "Cupom com fim antes do início", f"{errs or 'sem erro'} · cupom criado={created}", shot(page, "s6_cupom_datas"), flag="BUG" if created else None)
    page.get_by_label("Código").fill("SMOKE10"); fill_dt(page, "Início", ""); fill_dt(page, "Fim", ""); page.get_by_role("button", name="Criar cupom").click(); page.wait_for_timeout(800)
    note(S, "Cupom com código duplicado", form_errors(page) or "aceito?")

    go(page, "/admin/loja"); shot(page, "s6_loja", full=True); note(S, "Console em /admin/loja (dev mostrava '1 Issue')", page.errors or "nenhum erro no build de produção")
    pause = page.get_by_label("Pausar novos pedidos"); pause.check(); page.get_by_role("button", name="Salvar configurações").click(); page.wait_for_timeout(1500)
    _, cust = new_page(b); cart_with_zone(cust, "fritas-da-casa"); go(cust, "/checkout")
    body = cust.locator("main").inner_text(); m = re.search(r"[^\n]*(pausad|não estamos|fechad)[^\n]*", body, re.I)
    po = cust.get_by_test_id("place-order")
    note(S, "Loja pausada — cliente no checkout", f"aviso={m.group(0) if m else 'nenhum'} · botão de pedido habilitado={po.is_enabled() if po.count() else 'ausente'}", shot(cust, "s6_loja_pausada_checkout", full=True),
         flag=None if m or (po.count() and not po.is_enabled()) else "BUG")
    go(cust, "/"); note(S, "Loja pausada — home avisa?", "sim" if re.search(r"pausad|não estamos|fechad", cust.locator("body").inner_text(), re.I) else "nenhum aviso na home", shot(cust, "s6_loja_pausada_home"),
                       flag=None if re.search(r"pausad|não estamos", cust.locator("body").inner_text(), re.I) else "MELHORIA")
    cust.context.close()
    go(page, "/admin/loja"); page.get_by_label("Pausar novos pedidos").uncheck(); page.get_by_role("button", name="Salvar configurações").click(); page.wait_for_timeout(1500)
    note(S, "Loja reaberta (limpeza)", "pausa desmarcada")
    note(S, "Erros de console", page.errors or "nenhum"); ctx.close()


# ─────────────────── S7 · Mobile, teclado e acessibilidade ───────────────────
def s7(b):
    S = "S7"; ctx, page = new_page(b, viewport={"width": 412, "height": 915}, is_mobile=True, has_touch=True, device_scale_factor=2)
    for path in ["/", "/cardapio", "/cardapio/brasa-bacon", "/carrinho", "/checkout", "/entrar"]:
        go(page, path); w = page.evaluate("() => document.documentElement.scrollWidth")
        note(S, f"Overflow horizontal {path}", f"scrollWidth={w}px (viewport 412)", shot(page, 's7_mobile' + (path.replace('/', '_') if path != '/' else '_home')), None if w <= 412 else "BUG")
    go(page, "/"); menu = page.get_by_role("button", name=re.compile("menu", re.I)).first
    if menu.count(): menu.click(); page.wait_for_timeout(400); note(S, "Menu mobile aberto", "ok", shot(page, "s7_menu_aberto")); page.keyboard.press("Escape")
    add_to_cart(page, "smoke-classic"); go(page, "/cardapio")
    note(S, "Barra fixa do carrinho no mobile", page.get_by_role("link", name=re.compile("Ver pedido|carrinho", re.I)).last.inner_text().replace("\n", " ")[:80], shot(page, "s7_barra_carrinho"))
    small = page.evaluate("""() => [...document.querySelectorAll('a,button,input,select')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && (r.height < 24 || r.width < 24) }).map(e => (e.getAttribute('aria-label') || e.innerText || e.name || e.tagName).trim().slice(0,30))""")
    note(S, "Alvos de toque < 24 px (WCAG 2.5.8) em /cardapio", small or "nenhum", flag="MELHORIA" if small else None)
    ctx.close()

    ctx, page = new_page(b); go(page, "/")
    seq = []
    for _ in range(6):
        page.keyboard.press("Tab"); seq.append(page.evaluate("() => (document.activeElement.innerText || document.activeElement.getAttribute('aria-label') || '').trim().slice(0,30)"))
    note(S, "Ordem de Tab na home (6 primeiros)", " → ".join(seq), shot(page, "s7_foco_teclado"))
    page.emulate_media(reduced_motion="reduce"); go(page, "/")
    anim = page.evaluate("() => document.getAnimations().filter(a => a.playState === 'running').length")
    note(S, "prefers-reduced-motion", f"{anim} animações rodando", flag=None if anim == 0 else "MELHORIA")
    ctx.close()


# ───────────────────── S8 · API: contrato e manipulação ─────────────────────
def s8(b):
    S = "S8"; ctx, page = new_page(b); rq = page.request
    menu = rq.get(BASE + "/api/menu").json()
    note(S, "GET /api/menu", f"chaves={list(menu.keys()) if isinstance(menu, dict) else type(menu).__name__}")
    prods = [p for c in (menu.get("categories") or []) for p in c.get("products", [])] if isinstance(menu, dict) else []
    smoke = next((p for p in prods if p.get("slug") == "smoke-classic"), prods[0] if prods else None)
    add_to_cart(page, "smoke-classic"); go(page, "/carrinho")
    zones = [{"id": v} for v in page.get_by_label("Região de entrega").locator("option").evaluate_all("o => o.map(x => x.value).filter(Boolean)")]
    if not smoke or not zones:
        note(S, "Catálogo via API", f"não encontrei produto/zonas no payload: {json.dumps(menu)[:300]}", flag="DÚVIDA"); ctx.close(); return
    def order(**over):
        body = {"fulfillment": "DELIVERY", "deliveryZoneId": zones[0]["id"],
                "address": {"street": "Rua Harmonia", "number": "1", "complement": None, "neighborhood": "Vila Madalena", "city": "São Paulo", "cep": "05416001", "reference": None},
                "customer": {"name": "API Exploratória", "phone": "11987651234"},
                "items": [{"productId": smoke["id"], "quantity": 1, "options": [], "removedIngredientIds": [], "doneness": None, "notes": None}],
                "paymentMethod": "CASH", "changeForCents": None, "couponCode": None, "notes": None}
        for k, v in over.items():
            if k == "item": body["items"][0].update(v)
            else: body[k] = v
        return rq.post(BASE + "/api/orders", data=body, headers={"Origin": BASE, "X-Forwarded-For": f"10.9.{RUN[-2:]}.{len(log.get(S, []))}"})
    for label, over, ok in [
        ("quantidade 0", {"item": {"quantity": 0}}, 400), ("quantidade -1", {"item": {"quantity": -1}}, 400),
        ("quantidade 1000", {"item": {"quantity": 1000}}, 400), ("quantidade 1.5", {"item": {"quantity": 1.5}}, 400),
        ("productId inexistente", {"item": {"productId": "nao-existe"}}, 400), ("lista de itens vazia", {"items": []}, 400),
        ("campo extra totalCents=1", {"totalCents": 1}, 201), ("cupom inexistente", {"couponCode": "NAOEXISTE"}, 400),
        ("troco menor que o total", {"changeForCents": 100}, 400),
    ]:
        r = order(**over); body = r.text()[:180]
        good = r.status == ok or (ok == 400 and r.status in (400, 404, 409, 422))
        if label.startswith("campo extra") and r.status == 201: good = r.json().get("totalCents", r.json().get("order", {}).get("totalCents", 0)) != 1 if r.headers.get("content-type", "").startswith("application/json") else True
        note(S, f"POST /api/orders · {label}", f"HTTP {r.status} · {body}", flag=None if good else "BUG")
    r = rq.post(BASE + "/api/orders", data=b"{not json", headers={"Origin": BASE, "Content-Type": "application/json"})
    note(S, "POST /api/orders com JSON malformado", f"HTTP {r.status} · {r.text()[:150]}", flag=None if r.status == 400 else "BUG")
    r = rq.post(BASE + "/api/orders", data={}, headers={"Origin": "https://evil.example"})
    note(S, "POST /api/orders com Origin de outro site", f"HTTP {r.status}", flag=None if r.status == 403 else "BUG")
    r = rq.post(BASE + "/api/webhooks/mercadopago", data={"type": "payment", "data": {"id": "1"}})
    out = r.json().get("outcome") if r.ok else None
    note(S, "Webhook sem assinatura", f"HTTP {r.status} · outcome={out} (MP não configurado neste ambiente → ignorado; assinatura coberta por tests/integration/webhook.test.ts)", flag=None if r.status in (400, 401, 403) or out == "ignored" else "BUG")
    r = rq.get(BASE + "/media/..%2F..%2F.env"); note(S, "Path traversal em /media", f"HTTP {r.status}", flag=None if r.status in (400, 404) else "BUG")
    r = rq.get(BASE + "/"); h = r.headers
    note(S, "Headers de segurança na home", " · ".join(f"{k}={'✓' if k in h else '✗'}" for k in ["content-security-policy", "x-content-type-options", "referrer-policy", "x-frame-options", "permissions-policy"]))
    note(S, "Header X-Powered-By", h.get("x-powered-by", "ausente"), flag="MELHORIA" if "x-powered-by" in h else None)
    ctx.close()


SESSIONS = {"S1": s1, "S2": s2, "S3": s3, "S4": s4, "S5": s5, "S6": s6, "S7": s7, "S8": s8}
if __name__ == "__main__":
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        for key, fn in SESSIONS.items():
            if ONLY and key not in ONLY: continue
            log[key] = []; t0 = time.time()
            try: fn(b)
            except Exception as e:
                note(key, "SESSÃO INTERROMPIDA", f"{type(e).__name__}: {str(e).splitlines()[0][:300]}", flag="DÚVIDA"); traceback.print_exc(limit=2)
            note(key, "duração", f"{time.time() - t0:.0f}s")
            LOG.write_text(json.dumps(log, ensure_ascii=False, indent=1))
        b.close()
