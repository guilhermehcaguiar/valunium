# Importação e cotações
## CSV
- Escolher portfolio de destino antes da prévia.
- Capturar proveniência de arquivo, mapeamento de colunas, timezone, moeda e corretora **como texto informativo**.
- Validar tipos, datas, sinais, ativos e taxas; rejeitar linhas ambíguas.
- Preview com erros, advertências, totais e possibilidade de cancelar.
- `ImportBatch` + fingerprints por linha; transação atômica ou parcial explícita, nunca silenciosa.
- Não armazenar arquivos brutos por tempo indefinido; retenção configurável.
- Exportação em formato aberto, sem prometer compatibilidade fiscal.

## Preços de mercado
- Interface somente leitura `QuoteProvider.getLatest(assetIds)` / `getHistorical(assetId, range)`.
- Provedor precisa ter licença compatível com uso e redistribuição em SaaS.
- Persistir `provider`, `currency`, `asOf`, `receivedAt`, `adjustmentType`.
- Sinalizar cotação ausente/antiga; nunca mascarar como realtime.
- Não utilizar scraping contra termos de serviço nem atribuir cobertura total fictícia.

## Futuro B3/Rico
Conexões apenas mediante autorização, escopos de leitura e contrato aplicável. Não solicitar senha da corretora nem implementar trade.
