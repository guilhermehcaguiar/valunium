# Etapa 03 — relatório verificável

Data: 27/10/2026. Auditoria inicial: árvore limpa, HEAD `88930da0619d7c88c2f1663813005f6d5e62a556`. Lidos AGENTS, PRD, modelo lógico, ADRs, relatórios 01/02, política, regras financeiras e módulos reais. Não existia CALCULATION_RULES: as regras estavam em FINANCIAL_RULES; a interpretação executável foi documentada antes dos cálculos no novo CALCULATION_RULES.md. Fundação, autenticação, autorização e carteira reutilizadas.

## Implementação e arquitetura

Motor puro independente em financial-core, Decimal.js 10.6.0 (MIT), construtor isolado com 80 algarismos/HALF_EVEN. Nenhum valor monetário é convertido para number. Normalizador estrito de entrada preservado. Eventos são ordenados por data/sequence BIGINT crescente; correções preservam sequência original. Mesmo dia não presume compra antes de venda. Replay deriva posições sempre dos registros ativos; nenhum snapshot arredondado vira fonte da verdade.

Compra: custo += quantidade × preço + taxas. Venda: custo baixado = custo anterior × quantidade vendida / quantidade anterior; realizado += bruto − taxas − custo baixado. Venda total baixa exatamente todo o custo; realizado permanece mesmo com posição zero. Preço médio = custo remanescente / quantidade, sem arredondamento intermediário para centavos. Proventos = bruto − retenção, sem mudar custo/quantidade. Entradas NUMERIC(38,12), saída com 12 casas HALF_EVEN. Precisão interna é finita (80 algarismos), não aritmética racional infinita; limite explícito de 10.000 eventos ativos por carteira. Veja [regras](../finance/CALCULATION_RULES.md).

Módulos Assets, Transactions, IncomeEvents e Positions, com serviço comum de validação/replay/lock para evitar fórmulas duplicadas. Correções completas com version/reason e cancelamento lógico. Idempotência por requestKey UUID por carteira, com fingerprint canônico: payload incompatível conflita. Interface mantém a chave após falha para evitar duplicar por retry. Valores calculados não são aceitos como verdade do cliente. Bruto/total são derivados também na consulta/retorno da API.

## Modelo e migration

Migration aditiva `20261027000300_financial_ledger`: Asset, AssetAlias, AssetChange, LedgerEvent e LedgerRevision; flag historyIncomplete em Portfolio. Campos monetários/quantidade Decimal(38,12), IDs UUID, sequência BIGINT gerada, índices carteira/data/sequence e carteira/ativo, requestKey único por carteira, alias único mercado/ticker, FKs restritivas e constraints de tipo/valores. Triggers impedem UPDATE/DELETE nas revisões. Nenhuma migration anterior ou schema conceitual foi sobrescrito.

LedgerEvent unifica o armazenamento de transações e proventos; rotas/controllers distintos restringem tipos. gross armazenado representa entrada bruta somente para proventos; BUY/SELL armazenam zero nesse campo e derivam bruto de quantidade × preço. Revisões guardam os valores-fonte antes/depois, ator e motivo, inclusive cancelamento. São privadas por carteira.

Catálogo global B3/BRL para STOCK/FII/ETF/BDR, identificação manual/fonte declarada sem fundamentos/ISIN inventados. Usuários autenticados cadastram; somente criador altera identificação/status. Nome/status/ticker têm histórico, aliases antigos permanecem reservados, ID estável é usado por múltiplas carteiras. Não há scraping/provedores ou exclusão de ativo.

Escritas financeiras bloqueiam a linha da carteira e reprocessam todos os registros antes de confirmar a transação. Venda negativa em qualquer data provoca rollback inclusive da revisão. Concorrência em processos distintos é serializada pelo PostgreSQL. Carteira arquivada não aceita mutações financeiras. Autorização vem exclusivamente da sessão: toda operação filtra ownerId; terceiros recebem 404.

## Endpoints e telas

Prefixo /api/v1. GET/POST /assets, PATCH /assets/:id.
GET/POST /portfolios/:p/transactions e /income; PATCH /:id, POST /:id/cancel e GET /:id/revisions sob cada coleção. GET /portfolios/:p/positions e POST /positions/limitation. Filtros assetId/kind/from/to, paginação de 25 e opção cancelled=true. Contratos completos em [STAGE_03_API](../architecture/STAGE_03_API.md).

Telas: /assets (cadastro, manutenção e seleção do catálogo), /portfolios/:id/history (compras/vendas históricas, proventos, histórico filtrado/paginado, posições, correções/cancelamentos com motivo e consulta das revisões). Link no detalhe da carteira e catálogo na navegação existente. Sem redesenho da autenticação/sidebar, sem logo novo ou dashboard financeiro. Entradas pt-BR viram strings canônicas sem arredondamento; saída decimal troca ponto por vírgula preservando 12 casas. Uso de diálogos nativos para manutenção/motivos/revisões é funcional, com acabamento visual adicional reservado para evolução futura.

Sem cotação: marketValue/unrealized=null, quoteStatus UNAVAILABLE; não há market cap, rentabilidade, benchmark ou preços fictícios. Flag auditada para histórico societário incompleto suprime posições. Splits, grupamentos, bonificações e amortizações permanecem documentais; não há implementação parcial desses eventos.

## Testes e evidências

Unitários (8 casos no financial-core, incluindo os 2 normalizadores anteriores): cenários A–F, taxas de compra/venda, parcial/total, prejuízo e zero, precisão acima de Number.MAX_SAFE_INTEGER, sequência de 1000 eventos, ordem reversa/retroativa/mesma data, valores inválidos, proventos bruto/líquido. Resultado obrigatório A: 12 unidades, custo 212, realizado 7; B: custo 202 e PM 20,20; C: realizado 24. Nenhum preço médio arredondado para centavos é usado nas vendas.

Integração: PostgreSQL 18.6 real, três migrations em novo banco descartável, sessões/CSRF reais. Dois usuários: catálogo compartilhado mas manutenção restrita, listas e registros privados 404 para outro proprietário; correções/cancelamento, rollback de venda negativa, chave idempotente, versões, duas vendas concorrentes com somente um sucesso, paginação/filtros, FK rejeitada e revisão imutável. Cancelamento válido recalcula, cancelamento inválido preserva histórico. Correção retroativa inválida rejeitada; correção válida recalcula custo/realizado. Histórico incompleto retorna estado explícito.

O runner existente da Etapa 02 foi preservado e estendido; seu nome de banco ainda é valunium_stage02_disposable. Ele sempre cria um cluster privado em /tmp com TCP desabilitado, ignora DATABASE_URL externa para escolher destino e encerra o cluster no finally. Nenhum banco de produção/desconhecido foi acessado.

| Verificação | Estado |
|---|---|
| pnpm install | PASS |
| pnpm lint | PASS |
| pnpm typecheck | PASS |
| pnpm build | PASS |
| pnpm test | PASS — 34 testes (19 unitários/HTTP, incluindo financial-core e 15 integrações) |
| Prisma validate e generate | PASS |
| Três migrations em PostgreSQL descartável | PASS |
| Integração financeira e regressões 01/02 | PASS — 15 integrações |
| Chromium: login, carteira, ativo, duas compras, venda parcial, posição, dividendo, histórico, logout e acesso cruzado | PASS — Chromium real |
| pnpm audit | PASS — zero vulnerabilidades conhecidas |
| git diff --check | PASS |
| CI remota / HTTPS / SMTP externo / auditoria WCAG completa | NOT RUN |

## Limites e pendências da Etapa 04

Sem cotações/valor de mercado/resultado não realizado/rentabilidade/gráficos avançados, impostos, FX, shorts, renda fixa complexa, importação ou eventos societários. Catálogo retorna até 1000 ativos e auditoria até 100 revisões por recurso; escalar essas consultas exige paginação adicional. Replay completo foi escolhido por simplicidade auditável; limite de eventos protege a carga. Nenhuma otimização pode substituir o histórico como fonte da verdade. UI de revisão usa diálogos nativos; refinamento de apresentação e dashboard pertencem à próxima etapa, que não foi iniciada.

Os limites de operação pública da Etapa 02 (SMTP real, proxies, rate limits distribuídos, posse de e-mail/MFA, LGPD) permanecem. Não há SaaS, serviços pagos, deploy ou publicação. Nenhum mecanismo, endpoint, job ou integração de execução financeira foi criado. Sem Docker ou formatadores novos. AGPL, AGENTS, identidade e contribuições preservados.

## Arquivos alterados/criados

- `package.json`

- `README.md`
- `apps/api/package.json`
- `apps/api/src/app.module.ts`
- `apps/api/src/finance/assets.ts`
- `apps/api/src/finance/dto.ts`
- `apps/api/src/finance/finance.service.ts`
- `apps/api/src/finance/modules.ts`
- `apps/api/test/integration/identity.cjs`
- `apps/web/src/app/(private)/assets/page.tsx`
- `apps/web/src/app/(private)/portfolios/[id]/history/page.tsx`
- `apps/web/src/app/api/[...path]/route.ts`
- `apps/web/src/components/financial-workspace.tsx`
- `apps/web/src/components/portfolios.tsx`
- `apps/web/src/components/private-shell.tsx`
- `docs/architecture/DATA_MODEL.md`
- `docs/architecture/STAGE_03_API.md`
- `docs/development/ETAPA_03_REPORT.md`
- `docs/finance/CALCULATION_RULES.md`
- `infra/prisma/migrations/20261027000300_financial_ledger/migration.sql`
- `infra/prisma/schema.prisma`
- `packages/financial-core/README.md`
- `packages/financial-core/package.json`
- `packages/financial-core/src/index.ts`
- `packages/financial-core/test/ledger.test.cjs`
- `packages/shared/src/index.ts`
- `pnpm-lock.yaml`
- `scripts/test-browser.mjs`

## Execução

Configure o banco local identificado e ambientes da Etapa 02; `pnpm install`, `pnpm prisma:generate`, `pnpm db:migrate`, `pnpm dev`. Testes completos: `pnpm test`. Chromium: `pnpm test:browser` (instale Chromium com Playwright se ausente). Nenhum teste dependente de PostgreSQL/Chromium é declarado aprovado se o ambiente faltar.

## Commit sugerido

`feat(financeiro): implementar histórico auditável, posições e proventos com precisão decimal`

Nenhum commit/push/reset realizado. Etapa 04 não iniciada.
