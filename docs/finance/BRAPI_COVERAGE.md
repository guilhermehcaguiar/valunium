# Cobertura real brapi — 28/10/2026

Sondagem individual autenticada, sem persistir/publicar preços. Token preservado e nunca exibido. Referência documental: [v2 quote](https://brapi.dev/docs/acoes/cotacao) e [cobertura](https://brapi.dev/docs/tickers/cobertura). Não é garantia de disponibilidade futura nem autorização de redistribuição.

Consulta concluída em 2026-10-28T17:58:03.453Z. 14 identidades/classe confirmadas antes de pedir preço; 14 respostas de cotação HTTP 200 com BRL/preço positivo/horário efetivo válido. Foram 30 chamadas sequenciais totais: 14 metadados + 12 cotações na primeira passagem e 2 metadados + 2 cotações de FII na investigação complementar. Nenhum retry, lote de preços ou chamada a endpoint pago. O modo operacional da instalação não foi ativado.

| Candidato | Classe confirmada | Identificação HTTP | Cotação HTTP | Preço válido | Horário efetivo UTC | Plano observado | Resultado |
|---|---|---|---|---|---|---|---|
| PETR4 | STOCK | 200 | 200 | Sim | 2026-10-28T17:55:30.000Z | Sandbox gratuito documentado; sem header de cota | PASS |
| VALE3 | STOCK | 200 | 200 | Sim | 2026-10-28T17:55:30.000Z | Sandbox gratuito documentado; sem header de cota | PASS |
| ITUB4 | STOCK | 200 | 200 | Sim | 2026-10-28T17:55:30.000Z | Sandbox gratuito documentado; sem header de cota | PASS |
| BBAS3 | STOCK | 200 | 200 | Sim | 2026-10-28T17:55:30.000Z | Limite 15.000 observado | PASS |
| ABEV3 | STOCK | 200 | 200 | Sim | 2026-10-28T17:55:30.000Z | Limite 15.000 observado | PASS |
| CMIG4 | STOCK | 200 | 200 | Sim | 2026-10-28T17:56:30.000Z | Limite 15.000 observado | PASS |
| HGLG11 | FII | 200 | 200 | Sim | 2026-10-28T17:57:30.000Z | Limite 15.000 observado | PASS |
| MXRF11 | FII | 200 | 200 | Sim | 2026-10-28T17:56:30.000Z | Limite 15.000 observado | PASS |
| BOVA11 | ETF | 200 | 200 | Sim | 2026-10-28T17:55:30.000Z | Limite 15.000 observado | PASS |
| IVVB11 | ETF | 200 | 200 | Sim | 2026-10-28T17:55:30.000Z | Limite 15.000 observado | PASS |
| NASD11 | ETF | 200 | 200 | Sim | 2026-10-28T17:56:30.000Z | Limite 15.000 observado | PASS |
| AAPL34 | BDR | 200 | 200 | Sim | 2026-10-28T17:54:30.000Z | Limite 15.000 observado | PASS |
| MSFT34 | BDR | 200 | 200 | Sim | 2026-10-28T17:55:30.000Z | Limite 15.000 observado | PASS |
| GOGL34 | BDR | 200 | 200 | Sim | 2026-10-28T17:55:30.000Z | Limite 15.000 observado | PASS |

Endpoint de identidade/cobertura: GET /api/v2/tickers/coverage?symbols=TICKER. Endpoint de cotação de todos os candidatos: GET /api/v2/stocks/quote?symbols=TICKER. Authorization Bearer só no backend/sondagem local. Um ticker por chamada; nenhuma requisição concorrente. Os retornos BBAS3/ABEV3/CMIG4, fora do sandbox público documentado, comprovam acesso autenticado; HTTP 200 de PETR4 isoladamente não provaria token válido.

A cota RateLimit-Limit=15000 observada nos ativos autenticados é compatível com o plano Gratuito; não entramos no painel da conta para alterar ou contratar plano. Não houve 403/429 nesta sondagem. Nenhum candidato foi classificado UNSUPPORTED_ON_FREE_PLAN: não houve evidência disso. Fora desta amostra, cobertura/plano são UNVERIFIED até validação; 403 deve ser acesso negado, não ticker inexistente.

Particularidade FII: recommendedEndpoints.quote estava ausente no catálogo, embora availableData.quote=true e identidade/classe fossem válidas. A primeira passagem interrompeu esses dois preços. Após conferir que a documentação oficial v2 quote inclui FIIs, duas consultas controladas ao mesmo endpoint v2 retornaram 200. Não foi usado /api/quote legado nem endpoints /api/v2/fii/* de indicadores/dividendos do plano Pro. Não supomos que todo código terminado em 11 seja FII.

Não há snapshot numérico de preço nestes arquivos. Este documento contém somente identificação, resultados de validação, códigos HTTP e horários. Falhas de rede, eventos societários/renome ou mudança de plano podem alterar cobertura; a aplicação segue validando símbolo/currency/changed/shape a cada cotação.

O comando pnpm market:probe só consulta com --live e sanitiza sua saída. Não repita a sondagem completa apenas para conferir configuração: ela consome cota. Essa auditoria é uso diagnóstico individual e não preenche a tabela MarketQuote nem publica um feed.
