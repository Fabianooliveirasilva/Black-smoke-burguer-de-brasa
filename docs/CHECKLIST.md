# Checklist final — critérios de aceitação (§18 do prompt)

Data: 2026-11-08 · Commit avaliado: ver o histórico do `main` · Cada linha aponta a evidência, não
apenas a afirmação. "✅" exige evidência executada; "⚠️" indica entrega parcial com o motivo.

| # | Critério | Status | Evidência |
|---|---|---|---|
| 1 | Identidade visual implementada | ✅ | Tokens e tipografia em [ARCHITECTURE.md §1](ARCHITECTURE.md); regressão visual com `toHaveScreenshot` (`tests/e2e/visual.spec.ts`); screenshots em [`qa/automated/screenshots/responsivo-*`](qa/automated/screenshots/) |
| 2 | Página inicial completa | ✅ | Header, logo, nav, hero com vídeo, CTAs, populares, processo, ingredientes, vídeo, promoções, depoimentos, localização, horários, footer ([recon_home](qa/exploratory/screenshots/recon_home.png)); jornada E2E começa na home |
| 3 | Cardápio funcional | ✅ | Categorias, busca (sem acento/caixa), filtros, ordenação global (D-01), ingredientes nos cards, estado na URL — `exploratory.spec.ts` S1 |
| 4 | Produtos integrados ao banco | ✅ | Catálogo vem do Postgres via Prisma (`src/server/catalog.ts`); admin cria produto com upload e ele aparece no cardápio (`tests/e2e/admin.spec.ts`) |
| 5 | Carrinho correto | ✅ | Adicionar, remover, quantidade, editar personalização, cupom, taxa, total recalculado no servidor; adulteração de preço ignorada — `customer-journey.spec.ts`, `exploratory.spec.ts` S3 |
| 6 | Checkout funcional | ✅ | Entrega e retirada, validação por campo, troco, pagamento na entrega; Pix via mock de Mercado Pago com confirmação só por webhook assinado (`pix.spec.ts`) |
| 7 | Pedidos persistidos | ✅ | Transação com snapshot de itens (`tests/integration/orders.test.ts`); pedido real criado no smoke do Docker Compose |
| 8 | Autenticação implementada | ✅ | Better Auth, sessões em banco, cookie HttpOnly/SameSite, brute force 429 (`tests/api/auth.spec.ts`) |
| 9 | Painel administrativo funcional | ✅ | Dashboard, pedidos (filtros, status), produtos, categorias, cupons, loja, zonas — `admin.spec.ts`, `exploratory.spec.ts` S6 |
| 10 | Permissões protegidas | ✅ | 401/403 em todos os endpoints admin, IDOR, papel não autoatribuível (`tests/api/auth.spec.ts`), checagem em cada página e rota ([SECURITY.md](SECURITY.md)) |
| 11 | API validada | ✅ | Zod em toda entrada, envelope de erro sem stack trace, JSON malformado 400, CSRF 403 — `tests/api/*.spec.ts` (21 testes) e sessão S8 da exploração |
| 12 | Documentação completa | ✅ | README, ARCHITECTURE, DATABASE, SECURITY, QA-STRATEGY, SKILLS-RESEARCH, qa/EXPLORATORY-TESTING, qa/AUTOMATION, este checklist, PROJECT-STATUS |
| 13 | Testes automatizados implementados | ✅ | Vitest 55 unit + 18 integração; Playwright 145 em 6 projetos (Chromium, Firefox, WebKit, Pixel 7, iPhone 14, API) |
| 14 | Testes críticos passando | ✅ local · ⏳ CI | Local: unit 55/55, integração 18/18, Playwright 145 (todos os projetos verdes na última execução local). No CI: job de testes em execução — [Actions](https://github.com/Fabianooliveirasilva/Black-smoke-burguer-de-brasa/actions) |
| 15 | CI configurado | ✅ | 4 jobs em [`.github/workflows/ci.yml`](../.github/workflows/ci.yml): qualidade ✅ e Docker Compose ✅ confirmados no GitHub; E2E e Lighthouse em execução — [Actions](https://github.com/Fabianooliveirasilva/Black-smoke-burguer-de-brasa/actions) |
| 16 | Compila em produção | ✅ | `pnpm build` (standalone) local e no CI; imagem Docker multi-stage construída e **stack de produção validada no CI** (`docker compose up` + `scripts/compose-smoke.sh`: migrations, seed, login admin, pedido, upload no volume como não-root, 404 real) |
| 17 | Responsividade validada | ✅ | 412 px (Pixel 7), iPhone 14, tablet 768/1024, 1366, 1920, 2560 — `mobile.spec.ts`, `responsive.spec.ts`; alvos de toque ≥ 28 px |
| 18 | Sem vulnerabilidades críticas conhecidas sem tratamento | ✅ | `pnpm audit --prod --audit-level=high` no CI; revisão OWASP em [SECURITY.md](SECURITY.md); 6 bugs encontrados em QA, todos corrigidos e com teste |

## Metas de Lighthouse (§14)

Medição movida para o CI (hardware do GitHub, mediana de 3 execuções mobile por página) no job **Lighthouse**; as notas saem como anotações e no resumo do job em [Actions](https://github.com/Fabianooliveirasilva/Black-smoke-burguer-de-brasa/actions). Acessibilidade e boas práticas < 95 **falham** o CI; performance e SEO < meta geram aviso. Resultado a ser registrado aqui após a primeira execução completa.

## O que depende de recursos externos

| Item | Por que não fecha aqui | Como fechar |
|---|---|---|
| Mercado Pago em sandbox real | Exige conta e token `TEST-...` do cliente, e um webhook acessível pela internet | Preencher `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET`, publicar (ou usar um túnel), cadastrar `https://<domínio>/api/webhooks/mercadopago` no painel do MP e fazer um Pix de teste. O fluxo já é coberto ponta a ponta contra um mock fiel da API (`tests/support/mp-mock.ts`) |
| Dados reais da hamburgueria | A marca é fictícia; depoimentos e cardápio do seed são de demonstração | Substituir `QUOTES` em `src/components/home/sections.tsx`, os dados de `prisma/seed-data.ts` (cardápio, loja, zonas, cupons) e as fotos em `public/images`. Depois disso, cadastrar pelo admin |
| Playwright MCP ativo | Só carrega numa sessão nova do Claude Code | Reiniciar o Claude Code no projeto e aprovar o servidor `playwright` de `.mcp.json` |
