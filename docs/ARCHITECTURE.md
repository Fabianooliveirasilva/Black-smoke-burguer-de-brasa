# Arquitetura — Black Smoke Burger

## 1. Identidade visual

**Conceito:** hamburgueria de brasa. Carne moída na casa, prensada na chapa de ferro e finalizada
na grelha com fumaça de lenha. O mundo visual vem do próprio ofício: carvão, chama, ferro e o
papel kraft que embrulha o pedido.

| Token | Hex | Papel |
|---|---|---|
| `carvao` | `#15110E` | Fundo base (preto quente, não neutro) |
| `fuligem` | `#221C18` | Superfícies elevadas, cards de formulário |
| `osso` | `#F2EBDD` | Texto principal |
| `fumaca` | `#A39788` | Texto secundário (contraste AA sobre carvão) |
| `brasa` | `#FF6B2C` | Ação primária, foco, estado ativo |
| `kraft` | `#D9C3A0` | Superfície "papel" — comanda (carrinho, acompanhamento, cupom) |
| `sangue` | `#8E2B1C` | Selos, alertas, indisponível |

**Tipografia:** *Big Shoulders Display* (condensada, de letreiro industrial; títulos e preços em
destaque) + *Schibsted Grotesk* (texto, formulários, números tabulares). Duas famílias, papéis
claramente distintos, carregadas via `next/font` (self-hosted, sem layout shift).

**Elemento-assinatura:** a **comanda de cozinha**. Carrinho, cupom e acompanhamento do pedido são
renderizados como um ticket de papel kraft com borda serrilhada, número do pedido grande e
itens em linhas — o objeto real que circula numa hamburgueria. Todo o resto fica sóbrio.

**Movimento:** um único momento orquestrado na abertura do hero (título sobe de uma máscara, foto
assenta de 1.06→1), em CSS puro. Fora isso, só movimento em resposta ao usuário (badge do carrinho,
menu mobile, confirmação de item, etapa atual do pedido). `prefers-reduced-motion` desliga tudo.

**Layout:** alinhado à esquerda, grade editorial assimétrica; fotografia sangrando a borda.
Numeração aparece apenas onde há sequência real (processo de preparo, etapas do pedido).

## 2. Stack e justificativas

| Camada | Escolha | Motivo |
|---|---|---|
| Web | Next.js 16.4 (App Router, Cache Components), React 19, TypeScript strict | SSR/streaming, Route Handlers para a API REST no mesmo deploy. |
| Estilo | Tailwind CSS 4 com tokens próprios (`@theme`) | Sem kit de componentes pronto — visual autoral. |
| Motion | CSS (keyframes + `prefers-reduced-motion`) | Framer Motion foi usado no início e **removido**: ~50 KB de JS de hidratação para quatro microanimações que o CSS resolve. Medido no Lighthouse (TBT). |
| Formulários | React Hook Form + Zod (schemas compartilhados client/server) | Uma única fonte de validação. |
| Estado do carrinho | Zustand + `persist` (localStorage) | Carrinho funciona sem login; o servidor recalcula tudo. |
| Dados | PostgreSQL 17 + Prisma 7 (`@prisma/adapter-pg`) | Migrations versionadas, tipos gerados. |
| Auth | Better Auth 1.7 (e-mail/senha, sessões em banco, rate limit em banco) | Maduro, sessões revogáveis, cookies HttpOnly. |
| Pagamento | Mercado Pago (Pix via `/v1/payments`, cartão via Checkout Pro) por `fetch` | Sem SDK: superfície menor; webhook com HMAC + consulta à API. |
| Testes | Vitest (unit/integração), Playwright (API + E2E + a11y com axe) | |
| Infra | Dockerfile multi-stage (`output: standalone`), Compose com Postgres, GitHub Actions | |
| Dev sem Docker | `embedded-postgres` (binários reais do PostgreSQL 17) — `pnpm db:start` | A máquina de desenvolvimento não tem Docker. |

## 3. Estrutura

```
src/
  proxy.ts              redirecionamento otimista para /admin e /conta
  app/
    (store)/            páginas públicas: home, cardapio, carrinho, checkout, pedido, conta, entrar
    admin/              painel (layout próprio, exige role=admin)
    api/                REST: menu, orders, coupons, me/*, admin/*, webhooks/mercadopago, auth/[...all]
    media/[file]/       serve imagens enviadas pelo admin (nome validado, nosniff)
  components/           ui/ (primitivos), layout/, menu/, cart/, admin/
  lib/                  env, prisma, auth, money, http (wrapper de rotas), rate-limit, utils
  server/               regras de negócio (sem dependência de HTTP):
    pricing.ts          cálculo puro de itens, cupom, taxa e total (100% unit-tested)
    hours.ts            horário de funcionamento (America/Sao_Paulo)
    orders.ts           criação transacional, transições de status, cancelamento
    coupons.ts, catalog.ts, settings.ts, dashboard.ts, payments/mercadopago.ts, uploads.ts
  schemas/              Zod: entrada da API e formulários
prisma/                 schema, migrations, seed
tests/                  unit/, integration/ (Vitest + Postgres real), api/ e e2e/ (Playwright)
```

## 4. Fluxos críticos

**Pedido.** O cliente envia apenas IDs e escolhas (`productId`, `optionIds`, `removedIngredientIds`,
quantidade, zona, cupom, forma de pagamento). O servidor carrega produtos/opções do banco, rejeita
indisponíveis, calcula subtotal → desconto → taxa de entrega → total em centavos, valida horário e
pedido mínimo (**só para entrega**: o mínimo cobre o custo do frete; retirada não tem mínimo, decisão D-02), e grava tudo numa transação: pedido, itens com *snapshot* de nome/preço, evento de
status inicial e uso do cupom com incremento atômico condicional (`usesCount < maxUses`).

**Acompanhamento.** Cada pedido tem `trackingToken` aleatório de 32 bytes (base64url). A URL pública
é `/pedido/<token>`; não há rota por ID sequencial, evitando IDOR por enumeração. O cliente logado
também vê o histórico em `/conta`.

**Status.** Máquina de estados no servidor:
`RECEIVED → PREPARING → ASSEMBLING → OUT_FOR_DELIVERY | READY_FOR_PICKUP → DELIVERED`;
`CANCELED` a partir de RECEIVED/PREPARING (cliente só em RECEIVED e com pagamento não confirmado).

**Pagamento online.** `POST /api/orders` cria o pedido; para Pix/cartão online o servidor cria o
pagamento no Mercado Pago com `X-Idempotency-Key` e `external_reference = order.id`. O webhook valida
`x-signature` (HMAC-SHA256 do manifesto `id;request-id;ts`), rejeita timestamps antigos, registra o
evento em `WebhookEvent` (único → idempotente) e **consulta o pagamento na API** antes de mudar
qualquer estado; confere `external_reference` e valor. Sem `MP_ACCESS_TOKEN`, as formas online ficam
ocultas e só "pagamento na entrega/retirada" é oferecido — nada é simulado como pago.

**Cache.** Cardápio, cupons ativos e configurações da loja usam `'use cache'` + `cacheTag('menu'|'promotions'|'store')`,
sempre chamados após `connection()` (nunca no build — o build não precisa de banco). Mutações do admin
chamam `revalidateTag(tag, { expire: 0 })`. Páginas usam Partial Prerendering: shell estático + dados em streaming.

**Hidratação.** Controles renderizados no servidor aceitam digitação antes do React assumir. Duas
regras evitam perder o que o cliente digitou (BUG-05/06 em `docs/qa/EXPLORATORY-TESTING.md`): campos
de texto controlados que aparecem no HTML inicial usam `useAdoptTypedValue` (adota o valor do DOM ao
hidratar), e formulários com valores pré-preenchidos ficam dentro de `HydrationGate` (desabilitados
até hidratar). Formulários que dependem de `localStorage` (carrinho, checkout) só renderizam após o mount.

**Autorização em camadas.** `proxy.ts` faz só o redirecionamento otimista (cookie ausente). A verificação
real acontece em cada página (`requireAdmin()`/`requireUser()`) e em cada rota (`route({ auth })`). O layout
do admin também verifica, mas não é a única barreira: no RSC, layout e página renderizam como segmentos
independentes.

## 5. API REST

Todas as rotas passam por `lib/http.ts`: valida corpo/consulta com Zod, aplica autenticação/role,
rate limit, verificação de `Origin` em métodos mutáveis e devolve erros no formato
`{ "error": { "code", "message", "details?" } }` sem stack trace.

| Método | Rota | Acesso |
|---|---|---|
| GET | `/api/menu` | público |
| POST | `/api/cart/quote` | público, rate limit — cotação do carrinho no servidor (preços, cupom, taxa) |
| POST | `/api/orders` | público (guest) ou logado, rate limit |
| GET | `/api/orders/track/:token` | quem tem o token |
| POST | `/api/orders/track/:token/cancel` | quem tem o token |
| GET | `/api/me/orders` | cliente |
| GET/POST | `/api/me/addresses`, PATCH/DELETE `/api/me/addresses/:id` | cliente (dono) |
| POST | `/api/webhooks/mercadopago` | assinatura HMAC |
| GET | `/api/admin/dashboard` | admin |
| GET/POST | `/api/admin/products`, GET/PATCH/DELETE `/api/admin/products/:id` | admin |
| GET/POST | `/api/admin/categories`, PATCH/DELETE `/api/admin/categories/:id` | admin |
| GET | `/api/admin/orders`, GET/PATCH `/api/admin/orders/:id` | admin |
| GET/POST | `/api/admin/coupons`, PATCH/DELETE `/api/admin/coupons/:id` | admin |
| GET/PUT | `/api/admin/settings` | admin |
| GET/POST | `/api/admin/delivery-zones`, PATCH/DELETE `/api/admin/delivery-zones/:id` | admin |
| POST | `/api/admin/uploads` | admin |
| * | `/api/auth/*` | Better Auth |
