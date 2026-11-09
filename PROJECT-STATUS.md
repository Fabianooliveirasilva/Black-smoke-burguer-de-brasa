# PROJECT STATUS — Black Smoke Burger

**Fase atual:** 9 — Entrega (pendências de validação em ambiente real)

## Concluído
- Fase 1: pesquisa de Skills (`docs/SKILLS-RESEARCH.md`), identidade e arquitetura (`docs/ARCHITECTURE.md`).
- Fase 2: Next 16.4 + Prisma 7 + Better Auth; Postgres embarcado (`pnpm db:start`); migration `init`; seed.
- Fase 3: design system (tokens em `globals.css`, Big Shoulders + Schibsted Grotesk, comanda kraft).
- Fase 4: home, cardápio (busca/filtros/ordenação), produto (personalização), carrinho, checkout, acompanhamento, login/cadastro/conta.
- Fase 5: API REST (menu, quote, orders, track/cancel/pay, me/*, webhook MP), regras financeiras no servidor.
- Fase 6: admin (dashboard, pedidos, produtos+upload, categorias, cupons, loja/horários/zonas).
- Fase 7: Dockerfile multi-stage, Docker Compose, GitHub Actions CI.
- Fase 8: QA — Vitest unit + integração (69), Playwright API/E2E/a11y/mobile/visual (48), Lighthouse; docs DATABASE, SECURITY, QA-STRATEGY.
- README.
- QA exploratório assistido (8 sessões, `docs/qa/EXPLORATORY-TESTING.md`) + 13 testes Playwright derivados; suíte Playwright 61/61.
- BUG-01/02/03/04 corrigidos (plural, porcentagem pt-BR, 404 real via Proxy, fuso do gráfico diário); unit 55, integração 18, Playwright 61 — tudo verde.
- Playwright MCP configurado (`.mcp.json`) e skill `webapp-testing` instalada.
- Lint, `tsc` e testes unitários limpos (verificado em 2026-11-08).

## Pendente
- Decidir as dúvidas D-01/D-02 com o cliente e priorizar as melhorias M-02…M-07 (`docs/qa/EXPLORATORY-TESTING.md` §4 e §5).
- Primeiro commit e push; confirmar que o CI passa no GitHub (nunca rodou — a máquina não tem Docker).
- Lighthouse em hardware dedicado / Lighthouse CI (performance mobile medida 78–92 numa máquina sobrecarregada; meta 90).
- Testar Mercado Pago com token sandbox real e webhook público.

## Problemas identificados
- Máquina sem Docker → Postgres via `embedded-postgres`; Docker Compose/CI não validados localmente.
- Pouca RAM livre: builds lentos e medições de performance instáveis.
