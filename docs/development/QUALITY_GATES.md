# Quality Gates / Definition of Done
- Requisito ligado ao PRD e critério de aceite claro.
- Código com lint, typecheck e testes relevantes passando.
- Casos do núcleo financeiro aprovados; sem JS float para dinheiro.
- Autorização por carteira verificada em teste negativo.
- Nenhuma integração com permissão de escrita financeira.
- Mensagens de falha, empty state e loading implementados.
- Logs sem segredos; migrations reversíveis ou recuperação validada.
- Documentação e ADR atualizados se a decisão mudou.
- Relatório de diff, comando/testes, riscos e limites.
- **Sem commits/push automáticos**.

## Bloqueantes de release
Fórmulas inconsistentes, acesso entre tenants, perda de registros, importação duplicada, cotação sem timestamp, capacidade de execução financeira, segredo exposto ou falha grave conhecida.
