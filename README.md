# Black Smoke Burger

Site de delivery de hamburgueria: cardápio com busca e personalização, carrinho, checkout
(entrega ou retirada), pagamento Pix/cartão via Mercado Pago ou na entrega, acompanhamento do
pedido em tempo real e painel administrativo (pedidos, produtos, categorias, cupons, horários e
zonas de entrega).

**Stack:** Next.js 16.4 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL 17 ·
Prisma 7 · Better Auth · Zod · Vitest · Playwright.

## Requisitos

- Node.js 22+
- pnpm 10 (`corepack enable`)
- PostgreSQL 17 — **ou** nada: `pnpm db:start` sobe um Postgres embarcado (sem Docker)

## Rodando localmente

```bash
pnpm install
cp .env.example .env          # valores de dev já funcionam
pnpm db:start                 # terminal separado: Postgres em localhost:5433 (dados em .pgdata/)
pnpm db:migrate               # aplica migrations
pnpm db:seed                  # cardápio de exemplo + usuário admin
pnpm dev                      # http://localhost:3000
```

Admin de desenvolvimento: `admin@blacksmoke.dev` / `BlackSmoke#2026` → `/admin`.

Sem `MP_ACCESS_TOKEN`, o checkout oferece apenas pagamento na entrega/retirada. Para testar Pix e
cartão, use um token de sandbox do Mercado Pago (`TEST-...`) e configure o webhook
`https://<seu-dominio>/api/webhooks/mercadopago` com a assinatura secreta em `MP_WEBHOOK_SECRET`.

## Scripts

| Comando | O que faz |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` / `pnpm start` | Build de produção (standalone) e execução |
| `pnpm lint` / `pnpm typecheck` | ESLint e TypeScript |
| `pnpm test` | Testes unitários (Vitest) |
| `pnpm test:integration` | Integração com Postgres real (banco `blacksmoke_test`) |
| `pnpm test:e2e` | API + E2E + acessibilidade + visual (Playwright; rode `pnpm build` antes) |
| `pnpm test:coverage` | Cobertura |
| `pnpm db:start` | Postgres embarcado na porta 5433 |
| `pnpm db:migrate` / `pnpm db:deploy` | Migrations (dev / produção) |
| `pnpm db:seed` | Dados iniciais |
| `pnpm images:optimize` | Otimiza imagens de `public/` |
| `python3 tests/exploratory/explore.py` | Sessões exploratórias assistidas (ver docs/qa) |

## Deploy com Docker

```bash
cp .env.example .env
# preencha: POSTGRES_PASSWORD, BETTER_AUTH_SECRET (openssl rand -base64 48),
#           NEXT_PUBLIC_SITE_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD (≥ 12 caracteres)
docker compose up -d --build
```

O Compose sobe o Postgres, roda migrations e seed uma vez (serviço `migrate`) e inicia o app na
porta 3000 como usuário não-root. Uploads ficam no volume `uploads`; o banco, no volume `pgdata`.
Coloque um proxy reverso com HTTPS na frente (`TRUST_PROXY=true` já é o padrão no Compose).

## CI

`.github/workflows/ci.yml` roda em push para `main` e em PRs: lint, typecheck, testes unitários,
`pnpm audit`; depois integração, build, Playwright contra o build de produção e build da imagem Docker.

## Documentação

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — identidade visual, stack, estrutura, fluxos e API REST
- [docs/DATABASE.md](docs/DATABASE.md) — modelo de dados
- [docs/SECURITY.md](docs/SECURITY.md) — controles de segurança
- [docs/QA-STRATEGY.md](docs/QA-STRATEGY.md) — estratégia de testes, resultados e Lighthouse
- [docs/qa/EXPLORATORY-TESTING.md](docs/qa/EXPLORATORY-TESTING.md) — testes exploratórios assistidos: sessões, bugs, melhorias e screenshots
- [docs/qa/AUTOMATION.md](docs/qa/AUTOMATION.md) — automação Playwright derivada da exploração
- [PROJECT-STATUS.md](PROJECT-STATUS.md) — andamento do projeto
