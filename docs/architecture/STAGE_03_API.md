# Núcleo financeiro — Etapa 03

Todas as rotas exigem sessão. Prefixo `/api/v1`; mutações também exigem Origin e CSRF da Etapa 02. Strings decimais canônicas em JSON; nunca números monetários. IDs UUID gerados no backend. Modelo lógico original preservado; LedgerEvent unifica armazenamento de transações e proventos, separados por controllers/rotas e validação de tipo.

## Catálogo

GET/POST `/assets`, PATCH `/assets/:id`. Criação: `{ticker,name,assetClass,source}`; classes STOCK/FII/ETF/BDR, mercado B3 e moeda BRL fixos. Patch completo `{ticker,name,active,source}`, somente criador. Catálogo compartilhado por todos, sem informação patrimonial. Até 1000 entradas na consulta do MVP. Aliases antigos reservados, ID imutável, revisões em AssetChange. Nomes e fonte são declarações do cadastrante, sem certificação externa; nenhum ISIN/fundamento inventado.

## Histórico por carteira

GET/POST `/portfolios/:p/transactions` e `/portfolios/:p/income`.
PATCH `/:id` para correção completa; POST `/:id/cancel` para cancelamento lógico; GET `/:id/revisions` para auditoria (primeiras 100 revisões, cronológicas).

Criação: `{assetId,kind,date,quantity,unitPrice,fees,gross,withholding,note,requestKey}`. Todos os valores são strings. Transações aceitam BUY/SELL e gross/withholding devem ser `"0"`: bruto e total são calculados no servidor. Proventos aceitam DIVIDEND/JCP/OTHER, quantity/unitPrice/fees devem ser `"0"`, gross/withholding são valores efetivamente informados. OTHER requer observação documental. O bruto derivado não é fonte da verdade persistida de uma compra/venda: é sempre quantity × unitPrice. Atualizações exigem ainda `version` atual e `reason`, preservando requestKey original. Cancelamento: `{version,reason}`. Conflitos de versão/key retornam 409. Repetição idêntica da criação retorna o mesmo registro; key com conteúdo diferente é rejeitada.

GET filtros: `page` (25 itens), `assetId`, `kind`, `from`, `to`, `cancelled=true` para incluir cancelados. Ordem data/sequence crescente; resposta `{data:{items,nextPage}}`. Sem exclusão física. IDs privados em carteira de terceiro ou recurso de outra carteira retornam 404. Carteira arquivada não aceita mutações. Edição ou cancelamento que invalidaria venda posterior retorna 400 e reverte tudo. Revisões com antes/depois são privadas e append-only (triggers contra UPDATE/DELETE).

## Posições e limitações

GET `/portfolios/:p/positions`: `{data:{status,items,quoteStatus}}`; itens com assetId, quantity, cost, averagePrice, realized e income em strings de 12 casas. Posições zeradas permanecem para preservar realizado/proventos. Sem cotação: marketValue/unrealized null, quoteStatus UNAVAILABLE.

POST `/portfolios/:p/positions/limitation`: `{incomplete,reason}`. Registrar presença de evento societário não suportado suprime todas as posições e retorna INCOMPLETE_HISTORY. Resolver exige conciliação externa e motivo auditado; o sistema não aplica split/amortização automaticamente.

## Concorrência e reprocessamento

Lock da linha da carteira dentro da transação, seguido de atualização e replay de todos os eventos ativos antes do commit. Quantidade negativa em qualquer data invalida a gravação inteira, incluindo revisão. Sem snapshots acumulados ou preços externos. Limite de 10.000 eventos ativos, nunca truncados silenciosamente. SQL adiciona constraints de formas/tipos/valores, FKs e índices por carteira/data/ativo. Arquivos de migration anteriores não foram alterados.

Veja [CALCULATION_RULES](../finance/CALCULATION_RULES.md). Sem integração com corretoras, cotações ou execução financeira. Eventos societários, impostos, short, FX, renda fixa complexa, importação e indicadores de mercado não suportados nesta etapa.
