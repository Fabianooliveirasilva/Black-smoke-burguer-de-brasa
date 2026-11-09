# Segurança

Referências: OWASP Top 10:2025, OWASP API Security Top 10, ASVS 5.0 (skill `owasp-security`).
Cada controle abaixo tem teste automatizado indicado entre colchetes.

## Controles implementados

| # | Risco | Controle | Onde | Teste |
|---|---|---|---|---|
| 1 | SQL Injection | Prisma (consultas parametrizadas); única SQL manual usa template tag `$queryRaw` com parâmetros; IDs validados por regex | `server/*`, `schemas/common.ts` | [unit schemas] |
| 2 | XSS | React escapa todo texto; único `dangerouslySetInnerHTML` é JSON-LD com `<` escapado; CSP `script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`; imagens de produto só de caminhos locais | `next.config.ts`, `restaurant-jsonld.tsx` | [unit schemas: URL externa/`javascript:` rejeitada] |
| 3 | CSRF | Cookies `SameSite=Lax`; rotas mutáveis rejeitam `Sec-Fetch-Site: cross-site` e `Origin` diferente do site; Better Auth valida `trustedOrigins` | `lib/http.ts` | [api: CSRF 403] |
| 4 | Broken Access Control | Verificação no servidor em **cada** rota (`route({ auth })`) e **cada** página admin (`requireAdmin()`); `proxy.ts` é só otimização | `lib/http.ts`, `lib/session.ts` | [api: 10 endpoints admin → 401 anônimo / 403 cliente; e2e: cliente em /admin] |
| 5 | IDOR | Endereços sempre filtrados por `userId` (404 para recurso alheio); acompanhamento por token aleatório de 192 bits, nunca por ID/número | `api/me/*`, `server/orders.ts` | [api: IDOR endereços e histórico] |
| 6 | Brute force | Better Auth rate limit em banco: 5 logins/min por IP, 5 cadastros/5 min | `lib/auth.ts` | [api: 429 no 6º/7º login] |
| 7 | Credential stuffing | Mesmo rate limit + mensagem genérica ("E-mail ou senha incorretos") sem revelar se o e-mail existe; senha mínima de 10 caracteres | `auth-form.tsx` | [e2e: erro genérico] |
| 8 | Session hijacking | Sessões em banco (revogáveis), cookie `HttpOnly` + `SameSite=Lax` + `Secure` quando HTTPS, expiração de 7 dias com renovação diária | `lib/auth.ts` | [api: atributos do cookie] |
| 9 | Mass assignment | Zod remove campos desconhecidos; `role` com `input: false` no Better Auth; PATCH com `.strict()` + `readPatch` (só aplica chaves enviadas) | `schemas/*`, `lib/http.ts` | [unit: preço/role ignorados; api: role no cadastro, PATCH de `deletedAt` → 422] |
| 10 | Rate limiting | Limites por IP por rota (pedidos 8/10 min, cotação 60/min, rastreio 120/min, upload 30/min…) com `Retry-After` | `lib/rate-limit.ts` | [unit; api: 9º pedido → 429] |
| 11 | Exposição de dados | Visão pública do pedido sem telefone, e-mail, IDs internos ou observações; erros padronizados sem stack trace; `Cache-Control: no-store` em `/api/*` | `server/orders.ts`, `lib/http.ts` | [integration; api: envelope de erro] |
| 12 | Manipulação de preços | Cliente envia só IDs e escolhas; servidor recalcula tudo do banco (produto, adicionais, máximo por adicional, ingredientes removíveis, cupom, taxa, mínimo, horário) | `server/pricing.ts`, `server/orders.ts` | [unit 30+ casos; api: totais injetados ignorados] |
| 13 | Webhooks falsificados | HMAC-SHA256 do manifesto `id;request-id;ts` com comparação em tempo constante, janela de 10 min, idempotência por `x-request-id`, **consulta ao Mercado Pago** antes de mudar estado, confere `external_reference` e valor | `server/payments/mercadopago.ts` | [unit assinatura; integration; api + e2e com mock] |
| 14 | Upload malicioso | Só admin; limite 5 MB e 40 MP; decodificação real com sharp (SVG/HTML/poliglota rejeitados), re-encode WebP sem metadados, nome aleatório; servido com nome validado por regex, `nosniff` e CSP `sandbox` | `server/uploads.ts`, `app/media/[file]` | [api: PNG aceito, SVG/HTML → 415, path traversal → 404] |
| — | Open redirect | `?next=` aceita só caminhos relativos do próprio site | `lib/safe-next.ts` | [unit; e2e] |
| — | Clickjacking / headers | CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP; HSTS e `upgrade-insecure-requests` quando o site é HTTPS; `X-Powered-By` removido | `next.config.ts` | [api: headers] |
| — | Segredos | `.env*` no `.gitignore` (exceto `.env.example`); validação de env com Zod; produção recusa o segredo de desenvolvimento; testes usam credenciais falsas | `lib/env.ts` | — |
| — | Vazamento por formulário | Formulários de login/checkout com `method="post"` e botão habilitado só após hidratação (envio nativo nunca põe senha/PII na URL) | `auth-form.tsx`, `checkout-form.tsx` | — |
| — | Privacidade | Mapa (OpenStreetMap) só carrega após clique — nenhuma requisição de terceiros por padrão | `map-facade.tsx` | — |

## Dependências

`pnpm audit --prod`: **nenhuma vulnerabilidade conhecida** (2026-11-08). `pnpm audit` completo: 1 moderada em `minimatch` (ReDoS), apenas em ferramentas de lint de desenvolvimento, sem entrada controlada por usuário. O CI falha em vulnerabilidades altas/críticas de produção.

## Riscos residuais

| Risco | Situação | Recomendação |
|---|---|---|
| Rate limit da aplicação em memória | Correto para 1 instância; com várias instâncias cada uma conta separado | Redis/Upstash ao escalar horizontalmente (o do Better Auth já é em banco) |
| IP do cliente | Só confia em `X-Forwarded-For` com `TRUST_PROXY=true`; sem proxy confiável os limites viram globais por rota | Rodar atrás de proxy reverso que sobrescreve o cabeçalho |
| CSP com `'unsafe-inline'` em scripts | Necessário para os scripts inline do Next sem nonce (nonce forçaria renderização dinâmica e mataria o PPR) | Avaliar `experimental.sri` quando estável |
| Uploads em disco local | Volume Docker `uploads`; sem antivírus | Object storage (S3/R2) em produção multi-instância |
| Estorno automático | Ao cancelar pedido pago, o estorno é solicitado ao MP; se falhar, fica logado para ação manual | Alerta/observabilidade para falhas de estorno |
| Enumeração de cupons | `/api/cart/quote` revela se um código existe (60 req/min por IP) | Aceitável para cupons promocionais públicos |
| Verificação de e-mail / 2FA admin | Não habilitados | Ativar `requireEmailVerification` com provedor de e-mail e plugin `twoFactor` para admins |
| Integração Mercado Pago real | Testada contra mock fiel à API; não validada com credenciais sandbox reais | Validar com conta sandbox antes do go-live (ver README) |
