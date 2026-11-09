# PROJECT STATUS — Black Smoke Burger

**Fase atual:** 10 — Entrega (checklist em [docs/CHECKLIST.md](docs/CHECKLIST.md))

## Concluído
- Fases 1–9: pesquisa de Skills, arquitetura, fundação, design system, loja, API, admin, segurança, QA, otimização.
- QA exploratório assistido (8 sessões) + rodada cross-browser; 6 bugs encontrados e corrigidos (BUG-01…06).
- Decisões D-01 (ordenação global) e D-02 (mínimo só para entrega) implementadas; melhorias M-01…M-07 aplicadas.
- Ingredientes nos cards; perfil e histórico do cliente cobertos por E2E.
- CI com 4 jobs: qualidade, testes (Chromium/Firefox/WebKit), Lighthouse, Docker Compose + smoke test.
- Código no GitHub: https://github.com/Fabianooliveirasilva/Black-smoke-burguer-de-brasa

## Testes executados (2026-11-08)
| Suíte | Resultado |
|---|---|
| Lint / typecheck | OK |
| Vitest unit | 55/55 |
| Vitest integração (Postgres real) | 18/18 |
| Playwright (api, Chromium desktop, Pixel 7, Firefox, WebKit, iPhone 14) | 145 testes, verdes localmente |
| CI no GitHub (09/11) | 4/4 jobs verdes: qualidade, testes (3 navegadores), Lighthouse, Docker Compose |
| Lighthouse CI (mobile) | a11y e boas práticas 100 em todas; home perf 89 (aviso); SEO do produto 92 → corrigido |

## Pendente
- Confirmar no próximo CI o SEO da página de produto (correção do streaming de metadados).
- Mercado Pago com token sandbox real e webhook público (depende de conta do cliente).
- Trocar dados de demonstração (depoimentos, cardápio, fotos) pelos reais antes de publicar.
- Ativar o Playwright MCP (reiniciar o Claude Code e aprovar `.mcp.json`).

## Problemas identificados
- Máquina de desenvolvimento sem Docker e com pouca RAM: Docker e Lighthouse validados no CI.

## Próxima tarefa
- Push e conferir o SEO ≥ 95 do produto no CI; depois, só as pendências externas (Mercado Pago, dados reais).
