"""Reconhecimento (skill webapp-testing): screenshot + inventário de elementos + console por página."""
import json, sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
OUT = "docs/qa/exploratory/screenshots"
PAGES = ["/", "/cardapio", "/carrinho", "/checkout", "/entrar", "/cadastro", "/conta", "/admin", "/pagina-que-nao-existe"]

report = {}
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={"width": 1366, "height": 860}, locale="pt-BR")
    page = ctx.new_page()
    logs = []
    page.on("console", lambda m: logs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))
    for path in PAGES:
        logs.clear()
        r = page.goto(BASE + path, timeout=120_000)
        page.wait_for_load_state("networkidle", timeout=120_000)
        name = "recon" + (path.replace("/", "_") or "_home")
        if path == "/": name = "recon_home"
        page.screenshot(path=f"{OUT}/{name}.png", full_page=True)
        report[path] = {
            "status": r.status if r else None, "final_url": page.url, "title": page.title(),
            "h1": page.locator("h1").all_inner_texts(),
            "buttons": [t.strip() for t in page.get_by_role("button").all_inner_texts() if t.strip()][:25],
            "links": len(page.get_by_role("link").all()),
            "inputs": [ (i.get_attribute("name") or i.get_attribute("aria-label") or i.get_attribute("type")) for i in page.locator("input,select,textarea").all()],
            "console": list(logs),
        }
    b.close()
print(json.dumps(report, ensure_ascii=False, indent=1))
