# ADR-0002: Proibição permanente de execução financeira
**Status:** irrevogável sem mudança explícita de requisito pelo proprietário — o requisito atual declara **NUNCA** executar ações financeiras.
## Decisão
Todas integrações financeiras externas são estritamente read-only. Formulários que citam compra/venda salvam apenas histórico no banco Valunium. Nenhum provider, endpoint ou job pode criar ordens, transferências ou pagamentos.
## Critérios
Auditoria de scopes de conectores; testes de ausência de chamadas transacionais; revisão obrigatória de PR.
## Referência
`docs/security/FINANCIAL_READ_ONLY_POLICY.md`.
