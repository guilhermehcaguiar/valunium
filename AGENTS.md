# Valunium — AGENTS.md

Regras permanentes para qualquer agente trabalhando neste repositório.

1. **FINANCIAL_READ_ONLY_POLICY é absoluta e permanente.** O Valunium só permite consulta, consolidação, análise, cenários simulados e registro interno de eventos externos já realizados. Nunca implementar ordens de compra/venda, transações com corretoras, saques, transferências, resgates, pagamento, execução ou rebalanceamento automático. Integrações externas somente leitura e sem escopos transacionais.
2. **Git é responsabilidade humana.** Não realizar `git commit`, `git push`, `git reset`, rebase destrutivo ou publicação remota. Pode inspecionar `git status`, `git diff` e sugerir mensagem de commit.
3. **Sem Docker. Sem Prettier. Sem outro formatador automático.** Desenvolvimento nativo em Linux/Omarchy (Arch), Node.js, pnpm, PostgreSQL local; produção futura com PostgreSQL gerenciado. Preservar ESLint 9, TypeScript strict e testes.
4. **Primeiro open source, SaaS só futuramente.** GNU AGPLv3 (`AGPL-3.0-only`) para o código. Contribuições sob licença do projeto; não exigir cessão integral de copyright/CLA no momento. Marca Valunium e logo têm política de marca separada; não alegar registro no INPI. Não criar monetização, billing, deployment ou cloud sem solicitação.
5. **Multiusuário com isolamento obrigatório.** Autenticação e autorização sempre no backend; cada usuário acessa somente suas carteiras. Jamais registrar ou publicar dados reais, segredos, tokens, credenciais ou extratos.
6. **Cálculos financeiros determinísticos e precisos.** Nunca usar float para dinheiro. Preferir Decimal com escala explícita; não confundir aporte com rendimento. Testar dados sintéticos e casos-limite.
7. **Respeitar escopo por etapa.** Etapa 01 = fundação técnica; Etapa 02 = autenticação, usuários, carteiras e preparo público; Etapa 03 = lançamentos históricos/cálculos; Etapa 04 = dashboard financeiro. Não avançar automaticamente.
8. **Identidade Obsidian + Gold.** Logo Aureus A1 Clássico (V em medalhão circular e louros) aprovada como direção visual, porém o arquivo vetorial final ainda não está pronto. Não inventar logo final.
9. **Prompts são fornecidos somente no chat.** Não criar `docs/agents/` nem arquivos de prompt dentro do repositório.
10. **Relatório verificável.** Informar arquivos alterados, comandos executados, status PASS/FAIL/BLOCKED, problemas, riscos e mensagem sugerida de commit. Nunca declarar testes não executados como aprovados.

## Leitura recomendada
`docs/security/FINANCIAL_READ_ONLY_POLICY.md` → `docs/product/PRD.md` → `docs/architecture/ARCHITECTURE.md` → `docs/decisions/ADR-0004-OPEN-SOURCE-AND-INFRA.md` → `docs/design/DESIGN_SYSTEM.md` → `docs/development/BOOTSTRAP.md`.
