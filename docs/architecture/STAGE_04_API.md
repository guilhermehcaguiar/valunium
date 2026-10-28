# Dashboard de leitura — Etapa 04

`GET /api/v1/dashboard?portfolioId=<uuid>&from=YYYY-MM-DD&to=YYYY-MM-DD`.

Sessão exigida, resposta `{data}` e Cache-Control no-store. `portfolioId` opcional seleciona uma carteira própria; terceiro/inexistente retorna 404. Parâmetros inválidos/desconhecidos retornam 400. Ausência de sessão retorna 401. Limites excedidos ou histórico inválido não são truncados silenciosamente: 503. O BFF existente permite somente a nova rota na allowlist e mantém cookies/origem/CSRF intactos. Nenhuma mutation foi adicionada.

Payload tipado em packages/shared: portfolios (apenas IDs/nomes/moeda/estado/contagem próprios), contagens, status COMPLETE/INCOMPLETE_HISTORY/MIXED_CURRENCIES, grupos por moeda, posições abertas, distribuição por classe/ativo, séries de custo/fluxos, proventos por mês/tipo, resultados realizados diários e até oito últimas movimentações/proventos com carteira correspondente. Valores monetários são strings de 12 casas ou null quando indisponíveis. Sem e-mails, passwordHash, authVersion, notas privadas de terceiros ou metadados de sessão. Não há cotação no payload; quoteStatus UNAVAILABLE.

Leitura em transação RepeatableRead: duas chamadas Prisma (carteiras e ledger com identificação do ativo em lote; o ORM pode emitir um SELECT adicional para a relação), além das consultas já existentes de sessão/autorização. Sempre filtrados pelo ownerId autenticado, sem confiar em userId do cliente. Sem N+1 por carteira/ativo. O ledger é agrupado em memória e cada carteira é reprocessada uma vez; observador incremental produz séries sem replay por data. Ordenação O(N log N), agregação linear por evento/posição. Sem cache, snapshots, tabelas ou migrations novos. Correções/cancelamentos são refletidos na próxima leitura; botão Atualizar e nova navegação consultam novamente o endpoint.

Limites: até 500 carteiras, 50.000 eventos na seleção e 10.000 por carteira (limite do replay da Etapa 03), período de gráficos até 3660 dias. Selecionar carteira/período reduz resposta; eventos anteriores a from permanecem necessários ao custo de abertura. Não há benchmark de escala de produção nem garantia de latência fora desses limites. Evolução futura pode paginar detalhes/projetar snapshots reconstruíveis após medir necessidade.

Definições: [DASHBOARD_INDICATORS](../finance/DASHBOARD_INDICATORS.md).
