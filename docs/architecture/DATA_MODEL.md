# Modelo de dados lógico
## Entidades
- `User`: identidade interna referenciada pelo provedor de auth.
- `Portfolio`: `ownerId`, moeda-base, nome, datas e estado.
- `Asset`: instrumento global identificável; símbolo pode mudar.
- `AssetIdentifier`: ticker/ISIN com validade temporal para evitar ambiguidade.
- `Transaction`: evento financeiro **informativo** com tradeDate, quantity, unitPrice, fees e fonte.
- `IncomeEvent`: distribuição declarada/recebida, data e valor.
- `Price`: preço, moeda, fonte, instante, indicador de ajuste.
- `ImportBatch`: hash, escopo de carteira, status e relatório.
- `AuditLog`: ator, ação, objeto e timestamps sem dados sensíveis excessivos.

## Integridade
- Identificadores UUID; timestamps UTC; datas de operação como calendário na praça aplicável.
- Numeric/Decimal (38, 12) para valores, precisão especificada por moeda/instrumento; não usar float.
- Quantidade sempre positiva no lançamento; tipo define sinal.
- Rejeitar venda que deixe posição negativa no modelo spot sem operação short explícita (fora do MVP).
- Chaves estrangeiras, índices por `(portfolioId, tradeDate)` e `(assetId, asOf)`.
- Linhas de eventos não são sobrescritas silenciosamente: anulação/correção com trilha de auditoria (detalhar no sprint).

## Status
`docs/architecture/schema.conceptual.prisma` preserva o rascunho original e não é migrado. `infra/prisma/schema.prisma` contém metadados da fundação e identidade/sessões/carteiras da Etapa 02. A migration aditiva inclui unicidade de e-mail normalizado, índice parcial de carteira principal e constraints de lifecycle/moeda. A integridade de ledger/eventos financeiros permanece para a Etapa 03.
