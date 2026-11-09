# Banco de dados

PostgreSQL 17 · Prisma 7 (`prisma/schema.prisma`, client gerado em `src/generated/prisma`, driver `@prisma/adapter-pg`).

## Convenções

- **Dinheiro:** sempre `Int` em centavos (`priceCents`, `totalCents`…). Nunca float.
- **Datas:** `createdAt`/`updatedAt` em todas as entidades de negócio; armazenadas em UTC, exibidas em `America/Sao_Paulo`.
- **IDs:** `cuid()` nas entidades da aplicação; string gerada pelo Better Auth nas tabelas de autenticação.
- **Snapshots:** itens de pedido guardam nome, preço base, preço unitário, adicionais e ingredientes removidos **como eram no momento da compra**. Editar ou excluir um produto não altera pedidos passados.
- **Exclusão lógica:** `Product.deletedAt` (o slug é renomeado para liberar a URL). Cupons, zonas e categorias já usados são **desativados** em vez de apagados.

## Entidades

| Tabela | Papel | Pontos-chave |
|---|---|---|
| `user` | Clientes e administradores (Better Auth) | `role` enum `customer`/`admin`, `email` único, `phone` |
| `session`, `account`, `verification` | Sessões em banco, credenciais (hash scrypt em `account.password`) | `session.token` único; cascade ao apagar usuário |
| `rateLimit` | Contadores do rate limit do Better Auth | `key` único |
| `Address` | Endereços salvos do cliente | sempre consultado com `userId` (anti-IDOR); índice `userId` |
| `Category` | Categorias do cardápio | `slug` único, `sortOrder`, `active` |
| `Product` | Produtos | `slug` único, `priceCents`, `isAvailable`, `isPopular`, `allowsDoneness`, `deletedAt`; índice `(categoryId, deletedAt)` |
| `ProductIngredient` | Ingredientes (removíveis ou não) | cascade com produto |
| `ProductOption` | Adicionais pagos | `priceCents`, `maxQuantity`, `active` |
| `Order` | Pedido | `number` sequencial (exibição), `trackingToken` único (192 bits, URL pública), snapshot do endereço, valores, `status`, `paymentStatus`; índices `(status, createdAt)`, `(userId, createdAt)`, `createdAt` |
| `OrderItem` / `OrderItemOption` | Linhas e adicionais | snapshot de nomes e preços; `onDelete: Restrict` para o produto |
| `OrderStatusEvent` | Histórico de status | quem mudou (`actorId`), quando, observação |
| `Payment` | Tentativas de pagamento | `providerPaymentId` único, `idempotencyKey` único, QR Pix, URL de checkout |
| `WebhookEvent` | Idempotência de webhooks | único `(provider, eventKey)` |
| `Coupon` | Cupons | `code` único, `PERCENT`/`FIXED`, `minOrderCents`, `maxUses`, `usesCount`, janela `startsAt`/`expiresAt` |
| `CouponUsage` | Uso de cupom por pedido | `orderId` único |
| `DeliveryZone` | Regiões de entrega | lista de bairros, taxa, tempo estimado |
| `StoreSettings` | Configuração única (`id = 1`) | dados da loja, horários (JSON), pausa de pedidos, mínimo, preparo |

## Integridade e concorrência

- Criação de pedido em **uma transação**: incremento de cupom, pedido, itens, adicionais, evento inicial e `CouponUsage`.
- **Limite de cupom sem corrida:** `UPDATE coupon SET usesCount = usesCount + 1 WHERE id = ? AND (maxUses IS NULL OR usesCount < maxUses)` (via `updateMany` + referência de coluna). Teste de integração dispara 6 pedidos simultâneos para um cupom de 2 usos: exatamente 2 passam.
- **Status com concorrência otimista:** `updateMany WHERE id = ? AND status = <anterior>`; se outro operador mudou antes, retorna 409.
- Cancelamento devolve o uso do cupom (remove `CouponUsage`, decrementa `usesCount`) na mesma transação.

## Migrations e seed

```bash
pnpm db:start        # PostgreSQL 17 local sem Docker (porta 5433, dados em .pgdata/)
pnpm db:migrate      # cria/aplica migrations em desenvolvimento
pnpm db:deploy       # aplica migrations versionadas (produção/CI)
pnpm db:seed         # cardápio, loja, zonas, cupons e admin (idempotente)
```

O seed nunca sobrescreve produtos já existentes (preserva edições do admin). Em produção exige `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` (mín. 12 caracteres); em desenvolvimento cria `admin@blacksmoke.dev` / `BlackSmoke#2026`.
