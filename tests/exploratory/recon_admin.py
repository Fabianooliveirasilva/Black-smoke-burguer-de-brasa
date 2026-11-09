"""Reconhecimento das áreas autenticadas e da página de produto."""
import json
from playwright.sync_api import sync_playwright
BASE = "http://localhost:3000"
OUT = "docs/qa/exploratory/screenshots"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_context(viewport={"width": 1366, "height": 860}, locale="pt-BR").new_page()
    page.goto(BASE + "/cardapio/smoke-classic"); page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{OUT}/recon_produto.png", full_page=True)
    print("PRODUTO buttons:", [t.strip() for t in page.get_by_role("button").all_inner_texts()][:40])
    print("PRODUTO inputs:", [(i.get_attribute("name"), i.get_attribute("type"), i.get_attribute("maxlength")) for i in page.locator("input,textarea,select").all()])
    page.goto(BASE + "/entrar?next=/admin"); page.wait_for_load_state("networkidle")
    page.get_by_label("E-mail").fill("admin@blacksmoke.dev"); page.get_by_label("Senha").fill("BlackSmoke#2026")
    page.get_by_role("button", name="Entrar").click(); import re; page.wait_for_url(re.compile(r"://[^/]+/admin$"), timeout=60000)
    for path in ["/admin", "/admin/pedidos", "/admin/produtos", "/admin/produtos/novo", "/admin/cupons", "/admin/loja"]:
        r = page.goto(BASE + path, timeout=120000); page.wait_for_load_state("networkidle", timeout=120000)
        page.screenshot(path=f"{OUT}/recon{path.replace('/', '_')}.png", full_page=True)
        print(path, r.status, page.url, json.dumps({
            "h1": page.locator("h1").all_inner_texts(),
            "buttons": [t.strip() for t in page.get_by_role("button").all_inner_texts() if t.strip()][:30],
            "labels": [t.strip() for t in page.locator("label").all_inner_texts()][:40],
            "links": [t.strip() for t in page.locator("main a").all_inner_texts()][:20],
        }, ensure_ascii=False))
    b.close()
