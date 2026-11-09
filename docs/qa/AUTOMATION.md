# Automação Playwright derivada da exploração

Spec: [`tests/e2e/exploratory.spec.ts`](../../tests/e2e/exploratory.spec.ts) · projeto `e2e-desktop`
(Chromium 1366×860) · roda contra o build de produção na porta 3100, com o banco `blacksmoke_test`
recriado a cada execução (mesma infraestrutura da suíte existente, ver [QA-STRATEGY](../QA-STRATEGY.md)).

## Critério: o que virou teste

Só entraram comportamentos **observados na exploração e ainda não cobertos** pela suíte. A suíte já
testava auth, IDOR, CSRF, rate limit, headers, a jornada completa, Pix, upload, a11y e mobile. Cada
teste cita a sessão de origem (S1–S8) em [EXPLORATORY-TESTING.md](EXPLORATORY-TESTING.md).

**Defeitos conhecidos** são escritos com o comportamento **correto** e marcados com
`test.fail()` + ID do bug. Hoje eles "passam falhando", o que mantém o CI verde. Quando alguém corrigir
o bug, o Playwright avisa *"expected to fail, but passed"*, e aí é só remover o `test.fail()`, que
passa a proteger contra regressão.

## Casos

| # | Teste | Sessão | Verifica | Evidência |
|---|---|---|---|---|
| 1 | busca ignora caixa, acento e espaços; HTML não é executado; estado vazio oferece limpar filtros | S1 | `BACON` = `  bacon  `; `hortela` = `hortelã`; `<img onerror>` não abre diálogo; "Limpar filtros" restaura a lista | [s1-busca-vazia-html](automated/screenshots/s1-busca-vazia-html.png) |
| 2 | categoria + busca sem interseção mostra estado vazio | S1 | "Bebidas" + "bacon" → "0 produtos encontrados" | — |
| 3 | ordenar por preço ordena dentro de cada categoria | S1 | asc/desc por seção; documenta a D-01 (se o cliente decidir por ordenação global, este teste muda) | — |
| 4 | **BUG-03** produto inexistente responde 404 e um único robots noindex | S1 | ✅ corrigido; regressão ativa | [bug03-produto-inexistente](automated/screenshots/bug03-produto-inexistente.png) |
| 5 | quantidade fica entre 1 e 20, observação limitada a 200 caracteres | S2 | "−" desabilitado em 1; "+" trava em 20 (R$ 778,00); `textarea` corta em 200 | [s2-quantidade-maxima](automated/screenshots/s2-quantidade-maxima.png) |
| 6 | observação com HTML é exibida como texto no carrinho e o carrinho sobrevive ao reload | S2 | `<b>` aparece literal e não vira elemento | — |
| 7 | preço adulterado no localStorage não altera o valor cobrado | S3 | `basePriceCents: 1` → subtotal continua R$ 12,90 | [s3-localstorage-adulterado](automated/screenshots/s3-localstorage-adulterado.png) |
| 8 | cupom abaixo do mínimo fica pendente, vale ao atingir o mínimo e cai ao ficar abaixo | S3 | `  smoke10 ` normalizado; −R$ 10,00 com subtotal ≥ R$ 80; some ao remover itens | [s3-cupom-aplicado](automated/screenshots/s3-cupom-aplicado.png) |
| 9 | retirada: pedido mínimo bloqueia checkout e o formulário não pede endereço | S4 | botão desabilitado com "Pedido mínimo de R$ 30,00."; checkout sem "Rua" | [s4-retirada-minimo](automated/screenshots/s4-retirada-minimo.png) |
| 10 | duplo clique em confirmar gera um único pedido; cliente cancela pelo acompanhamento | S4 | exatamente um `POST /api/orders` (201); máscara do celular; nome com `<script>` sem execução; `confirm()` → "Cancelado" | [s4-pedido-cancelado](automated/screenshots/s4-pedido-cancelado.png) |
| 11 | **BUG-03** token de acompanhamento inexistente responde 404 | S4 | ✅ corrigido; regressão ativa | — |
| 12 | formulários do admin rejeitam dados inválidos com mensagem do servidor | S6 | preço −10 e 99.999.999, slug `../../etc/passwd`, cupom 150 %, fim < início, código duplicado; nada é criado | [s6-produto-invalido](automated/screenshots/s6-produto-invalido.png), [s6-cupom-duplicado](automated/screenshots/s6-cupom-duplicado.png) |
| 13 | **BUG-01/02** dashboard usa plural e porcentagem pt-BR | S6 | ✅ corrigidos; card e `aria-label` do gráfico sem "1 pedidos", porcentagem com vírgula | [bug02-dashboard](automated/screenshots/bug02-dashboard.png) |

**BUG-01** ("1 pedidos"): a regra de plural é coberta por teste unitário (`plural(0|1|2|1500)` em
`tests/unit/misc.test.ts`), porque "exatamente 1 pedido em 30 dias" não é um estado estável no banco
de teste compartilhado. O E2E garante que nenhum texto do dashboard mostra "1 pedidos".

**BUG-04** (gráfico diário no fuso errado): coberto por teste de **integração**
[`tests/integration/dashboard.test.ts`](../../tests/integration/dashboard.test.ts), com pedido fixado às
22:30 BRT. Foi validado nos dois sentidos: falha com a query antiga e passa com a corrigida.

## Resultado (2026-11-08)

Antes da correção: 13/13, sendo 10 verdes + 3 falhas esperadas (`test.fail` para BUG-02 e BUG-03 ×2).

Depois da correção dos bugs (`test.fail` removidos; `access.spec.ts` passou a exigir 404):

```
pnpm test               55 passed   (+3 testes de format/route-guards)
pnpm test:integration   18 passed   (+1 BUG-04)
pnpm test:e2e           61 passed (1.4m)   ← api + e2e-desktop + e2e-mobile + visual, todos verdes
pnpm lint / typecheck   ok
```

## Screenshots e relatório

- Cada teste chama `evidence(page, info, nome)`, que salva em
  [`docs/qa/automated/screenshots/`](automated/screenshots/) **e** anexa ao relatório HTML
  (`pnpm exec playwright show-report`).
- Falhas inesperadas geram screenshot, trace e `error-context.md` em `test-results/`
  (`screenshot: "only-on-failure"`, `trace: "retain-on-failure"` em `playwright.config.ts`).
- Depois de regenerar screenshots: `node scripts/compress-qa-screenshots.mjs` (20 MB → 6 MB).

## Como rodar

```bash
pnpm db:start                     # outro terminal
pnpm build                        # a suíte roda contra o build de produção
pnpm exec playwright test tests/e2e/exploratory.spec.ts --project=e2e-desktop
pnpm test:e2e                     # tudo
pnpm exec playwright show-report  # relatório HTML com as evidências anexadas
```
