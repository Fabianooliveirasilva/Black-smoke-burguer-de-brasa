# Pesquisa de Skills (Claude Code)

Data: 2026-11-08. Todas as Skills foram baixadas por `git clone --sparse`, lidas e auditadas
(nenhum arquivo executável, nenhum hook, nenhum script de instalação) antes de serem copiadas
para `.claude/skills/`.

## Repositórios avaliados

| Repositório | Último commit | Licença | Observação |
|---|---|---|---|
| [anthropics/skills](https://github.com/anthropics/skills) | 2026-11-06 | Apache-2.0 (por skill) | Oficial. 19 skills; relevantes: `frontend-design`, `webapp-testing`. |
| [obra/superpowers](https://github.com/obra/superpowers) | — (687 commits) | MIT | Metodologia completa (TDD, debugging, planos, subagentes). |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | 2026-10-27 | MIT | `react-best-practices`, `web-design-guidelines`, `composition-patterns`. |
| [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) | — | Apache-2.0 | CLI Rust que controla Chrome via CDP; baixa Chrome for Testing. |
| [anthropics/claude-code](https://github.com/anthropics/claude-code) | — | — | Já fornece `/security-review` e `/code-review` nativos. |
| [agamm/claude-code-owasp](https://github.com/agamm/claude-code-owasp) | 2026-11-03 | MIT | OWASP Top 10:2025 + ASVS 5.0, referências carregadas sob demanda. |

## Selecionadas (instaladas em `.claude/skills/`)

| Skill | Área | Por quê | Custo de contexto |
|---|---|---|---|
| `frontend-design` (Anthropic) | UI/UX | Processo em duas passadas (plano de tokens → revisão contra o brief → build → crítica) e lista explícita de "tells" de layout gerado por IA — exatamente o que o brief proíbe. | ~2,3k tokens, só quando ativada. |
| `web-design-guidelines` (Vercel) | UX/A11y | Auditoria de 100+ regras (foco, formulários, toque, motion, dark mode). Usada na Fase 9. Busca as regras atualizadas sob demanda. | ~300 tokens + regras (~4k) na auditoria. |
| `react-best-practices` (Vercel) | Frontend/Perf | 72 regras Next.js/React priorizadas por impacto (waterfalls, bundle, RSC). Arquivos individuais lidos só quando o tema surge. | ~1,8k índice; regras ~300 tokens cada. |
| `owasp-security` (agamm) | Segurança | Workflow de revisão em 5 passos + checklist Top 10:2025/ASVS; referências fatiadas por seção. Usada na Fase 7. | ~3,5k índice; referências por seção. |

`AGENTS.md` (versão compilada de 300 KB do `react-best-practices`) foi removido para não ser lido acidentalmente.

## Descartadas

| Skill | Motivo |
|---|---|
| `superpowers` (completo) | Hook `SessionStart` injeta bootstrap em toda sessão, fluxo de subagentes com revisão dupla por tarefa — alto consumo de tokens; os princípios úteis (TDD, verificação antes de concluir, debugging por causa raiz) já estão no brief e foram adotados como prática. |
| `agent-browser` | Exige binário Rust + download de Chrome separado; o Playwright (já necessário para E2E) cobre screenshots e inspeção. |
| `composition-patterns`, `react-view-transitions` | Úteis, mas sobrepostos ao `react-best-practices`; o escopo de componentes do projeto não justifica. |
| `deploy-to-vercel`, `vercel-optimize` | Deploy alvo é Docker; dependem de conta Vercel. |
| Registros comunitários (claudskills.com, claudemarketplaces) | Procedência não verificável; muitos itens sem manutenção. |

## Adicionadas na fase de QA exploratório (2026-11-08)

| Skill / ferramenta | Por quê |
|---|---|
| `webapp-testing` (Anthropic, Apache-2.0) | Antes descartada como redundante com `@playwright/test`. Para **exploração** ela encaixa: scripts Python descartáveis, padrão *reconnaissance-then-action*, sem precisar de asserções. A automação continua em TypeScript. |
| Playwright MCP (`@playwright/mcp@0.0.84`, `.mcp.json`) | Navegador como ferramentas do agente (snapshot de acessibilidade, clique, screenshot) para exploração interativa nas próximas rodadas. |

## Ferramentas nativas usadas no lugar de Skills

- `/security-review` e `/code-review` (Claude Code) — revisão do diff na Fase 7.
- Playwright Test — E2E, responsividade e screenshots para crítica visual.
- `npm audit` / `pnpm audit` — dependências.

## Como usar

- As Skills ficam versionadas em `.claude/skills/` e são descobertas automaticamente pelo Claude Code ao abrir o projeto.
- Design: acionar `frontend-design` antes de criar páginas novas.
- Auditoria de UI: "review my UI" → `web-design-guidelines`.
- Performance React: `react-best-practices` (ler só a regra relevante em `rules/`).
- Segurança: "security review" → `owasp-security`.
