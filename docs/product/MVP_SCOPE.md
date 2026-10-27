# Escopo MVP / matriz de requisitos
| ID | Funcionalidade | Prioridade | Aceite |
|---|---|---|---|
| RF-01 | Login e sessão seguros | P0 | Sem sessão não acessa dados privados |
| RF-02 | Múltiplas carteiras | P0 | Cada carteira pertence a usuário autenticado |
| RF-03 | Catálogo de ativos | P0 | Ticker e tipo; dados desconhecidos não inventados |
| RF-04 | Registrar compras e vendas históricas | P0 | Transações internas, nenhuma ordem externa |
| RF-05 | Posição e custo médio | P0 | Conforme casos financeiros testados |
| RF-06 | Proventos recebidos | P0 | Separados de compras e depósitos |
| RF-07 | Dashboard de custo/posição/resultado | P0 | Diferenciar valorização de aporte |
| RF-08 | Histórico filtrável | P0 | Ordenação e rastreabilidade |
| RF-09 | Importar CSV | P1 | Prévia, validação e deduplicação |
| RF-10 | Consultar cotação autorizada | P1 | Data/fonte e stale flag visíveis |
| RF-11 | Evolução patrimonial | P1 | Fluxos apartados, metodologia explícita |
| RF-12 | Exportar dados | P1 | Exportação por carteira autorizada |
| RF-13 | Configurações e exclusão | P1 | Procedimento seguro auditado |

## Não incluído
IA, recomendações, envio de ordens, integração financeira com permissão de escrita, corretagem, pagamentos SaaS, impostos completos, sincronização automática com B3, dados garantidos em tempo real.

## Perfis e autorização
`OWNER`: proprietário e único papel ativo do MVP. `portfolio_members` é extensão futura, nunca presumir colaboração ativa.
