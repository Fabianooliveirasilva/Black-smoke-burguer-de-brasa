# Estratégia e relatório de QA

> Testes exploratórios assistidos e a automação derivada deles: [qa/EXPLORATORY-TESTING.md](qa/EXPLORATORY-TESTING.md) · [qa/AUTOMATION.md](qa/AUTOMATION.md).

## Pirâmide

| Nível | Ferramenta | Onde | O que prova |
|---|---|---|---|
| Unitário | Vitest | `tests/unit` | Regras puras: preço de item, adicionais e limites, ingredientes removíveis, ponto da carne, cupons (todas as rejeições, arredondamento, teto), totais, horários (fuso SP, virada da meia-noite), máquina de status, schemas (mass assignment, IDs maliciosos, URLs de imagem), assinatura HMAC do webhook, rate limit, open redirect, dinheiro |
| Integração | Vitest + PostgreSQL real | `tests/integration` | Criação de pedido com snapshot completo, bairro fora da zona, loja fechada/pausada, produto indisponível, pedido mínimo, **corrida de cupom** (6 pedidos simultâneos / limite 2), Pix com `X-Idempotency-Key`, falha do gateway sem "pagamento falso", ciclo de status, devolução de cupom no cancelamento, visão pública sem dados sensíveis, webhook (forjado, aprovado, duplicado, valor divergente, pedido desconhecido), cotação com erros por linha |
| API | Playwright `request` contra o build de produção | `tests/api` | GET/POST/PUT/PATCH/DELETE, 401/403 em 10 endpoints admin, papel não autoatribuível, brute force (429), atributos do cookie, IDOR, CSRF, rate limit de pedidos, envelope de erro, JSON inválido, CRUD de produtos/cupons, PATCH parcial não reseta campos, transições inválidas (409), validação de horários, uploads (PNG aceito; SVG/HTML 415; path traversal 404), headers de segurança, webhook assinado ponta a ponta |
| E2E | Playwright (Chromium desktop 1366×860 e Pixel 7) | `tests/e2e` | Jornada completa (home → busca → personalização → carrinho → quantidade → cupom → região → checkout com validação → pedido → acompanhamento → admin avança status → cliente vê), Pix com QR e confirmação só após webhook, admin cria produto com upload e ele aparece no cardápio, indisponibilidade bloqueia compra, criação de cupom, pausa de pedidos bloqueia checkout, bloqueios de acesso, 404 |
| Acessibilidade | axe-core + testes de teclado | `tests/e2e/a11y.spec.ts` | Zero violações sérias/críticas WCAG 2.1 AA em 5 páginas; skip link; personalização só com teclado; `prefers-reduced-motion` |
| Exploratório | SBTM com skill `webapp-testing` (Python Playwright) + Playwright MCP | `tests/exploratory`, `docs/qa` | 8 sessões com charter, 114 observações, 4 bugs (corrigidos), 7 melhorias, 3 dúvidas de produto; regressão em `tests/e2e/exploratory.spec.ts` (13 testes) |
| Responsividade | Playwright mobile | `tests/e2e/mobile.spec.ts` | Sem overflow horizontal em 6 páginas a 412 px; menu mobile (Esc fecha); barra fixa do carrinho; alvos de toque ≥ 36 px |
| Regressão visual | `toHaveScreenshot` (tolerância 2%) | `tests/e2e/visual.spec.ts` | Hero, página de produto e comanda do carrinho |
| Performance/SEO | Lighthouse 12 (mobile, simulado) | manual | Ver resultados abaixo |

Ambiente de teste isolado: banco `blacksmoke_test` truncado e semeado a cada execução (loja "sempre aberta" para não depender do relógio), IP único por teste (`X-Forwarded-For` com `TRUST_PROXY=true`) para isolar rate limits, e um **mock HTTP do Mercado Pago** (`tests/support/mp-mock.ts`) — nenhuma credencial real.

## Resultados (2026-11-08, build de produção)

| Suíte | Resultado |
|---|---|
| `pnpm lint` | 0 erros, 0 avisos |
| `pnpm typecheck` | OK |
| Vitest unit + integração | **73/73** (55 unit + 18 integração) |
| Playwright API + E2E desktop + mobile + visual | **61/61** (48 + 13 da exploração) |
| Cobertura Vitest (`src/server`, `src/lib`, `src/schemas`) | 52% linhas — rotas, wrapper HTTP e serviços admin são exercitados pelos testes Playwright, que não entram nessa métrica |
| `pnpm audit --prod` | 0 vulnerabilidades |

### Lighthouse (mobile, mediana de 3 execuções)

| Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| `/` | 84 | 100 | 100 | 100 | 2,9 s | 0 |
| `/cardapio` | 83–92 | 100 | 100 | 100 | 2,3 s | 0 |
| `/cardapio/smoke-classic` | 82 | 100 | 100 | 92 | 3,5 s | 0 |
| `/carrinho` | 78 | 100 | 100 | 63* | 3,2 s | 0,155 → corrigido depois |

\* `/carrinho` é `noindex` de propósito (não deve ser indexado).

**Leitura honesta:** acessibilidade e boas práticas atingem a meta (100). SEO atinge 100 nas páginas indexáveis, exceto produto (92): o Next 16 envia metadados por streaming para navegadores, e o Lighthouse 12 se identifica como navegador. Verificado com `curl` que Googlebot, WhatsApp, Facebook e Telegram recebem `<title>`, `description` e `canonical` no `<head>` (`htmlLimitedBots`). **Performance ficou abaixo de 90**: as medições rodaram numa máquina com 5,5 GB de RAM, swap ativo e load average entre 7 e 15 (servidor + Postgres + Chrome); o mesmo build oscilou de 60 a 89 na home entre execuções. Otimizações aplicadas a partir dos diagnósticos: mapa com carregamento sob demanda (−300 KB de JS de terceiros), remoção do Framer Motion (−~50 KB), animação do hero sem opacidade na imagem LCP, skeletons com o formato final (CLS 0,24 → 0). **Pendente:** medir em hardware dedicado ou Lighthouse CI antes de declarar a meta de 90 atingida.

## Defeitos encontrados e corrigidos pelos testes

| Defeito | Detectado por | Correção |
|---|---|---|
| Login 500 (`e is not a function`) | API | Proxy preguiçoso do Better Auth sem armadilha `has` (`"handler" in auth`) |
| Rotas GET executadas no build, podendo virar 500 estático | build | `connection()` no wrapper de rotas |
| Páginas admin pré-renderizáveis sem checagem própria | build | `requireAdmin()` em cada página |
| CSP `upgrade-insecure-requests` quebrava JS em HTTP local | E2E | Diretivas HTTPS apenas quando o site é HTTPS |
| Login redirecionava de volta ao `/entrar` (prefetch em cache) | E2E | Navegação completa após mudança de sessão |
| `canonical: "/"` herdado por todas as páginas | Lighthouse | Canonical por página |
| Gráfico com 1 dia de dados ocupava a largura toda | revisão visual | Série de 14 dias com zeros |
| CTAs do hero abaixo da dobra em notebook | regressão visual | Título limitado pela altura da viewport |
| Contraste de itens indisponíveis (opacity) | Lighthouse | Indicação textual + imagem em escala de cinza |
| Alvo de toque "Voltar ao cardápio" < 36 px | mobile | `min-h-11` |
| "1 pedidos" no dashboard (BUG-01) | exploratório | helper `plural()` |
| "0.0% cancelados" (BUG-02) | exploratório | `Intl.NumberFormat` percent pt-BR |
| Produto/pedido inexistente com HTTP 200 e robots contraditório (BUG-03) | exploratório | checagem de existência no Proxy → 404 real; `noindex` no 404 |
| Pedidos das 21h–24h no dia seguinte do gráfico (BUG-04) | revisão de evidência | `AT TIME ZONE 'UTC'` antes de converter para SP; teste de integração às 22:30 |

## Como rodar

```bash
pnpm db:start                 # em outro terminal (Postgres local na 5433)
pnpm test                     # unit
pnpm test:integration         # integração (banco blacksmoke_test)
pnpm build && pnpm test:e2e   # API + E2E + visual contra o build de produção
pnpm test:coverage
```

Atualizar referências visuais intencionalmente: `pnpm test:e2e --project=e2e-desktop tests/e2e/visual.spec.ts --update-snapshots`.
