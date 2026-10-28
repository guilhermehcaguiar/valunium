# Etapa 05 — referências de mercado e valorização estimada

28/10/2026. HEAD inicial `04fcaa9c30d87848e9a5830195197b3be6c37a6f`, árvore limpa. Lidos integralmente AGENTS, relatórios 03/04, schema/migrations, contratos, regras, dashboard, autenticação/sessões, componentes e testes existentes. Fundação reutilizada, nenhuma reconstrução ou avanço à Etapa 06.

## Diagnóstico e versões

Dashboard contábil e replay já funcionavam, sem módulos de cotações. A documentação antiga do README tinha trechos de status de etapas anteriores, agora harmonizados. Não havia token brapi no ambiente. Versões reais confirmadas por pnpm list: Node 24.21.0, pnpm 10.34.9, Next 16.4.3, React 19.3.1, Nest 11.2.8, TypeScript 6.0.3, Prisma/client/adapter 7.10.1, PostgreSQL 18.6, Decimal.js 10.6.0, ECharts 6.1.0, Tailwind 4.3.3, ESLint 9.39.5. Nenhuma dependência adicionada; patch de tipos ECharts intacto e configurações strict preservadas.

## Fornecedor e autorização dos dados

Único endpoint externo implementado: `GET https://brapi.dev/api/v2/stocks/quote?symbols=TICKER`, um ticker e Authorization Bearer, token somente no backend. Contrato v2 real/doc: results[0].requestedSymbol, symbol, changed e data.currency/regularMarketPrice/regularMarketTime. FetchedAt é o relógio da consulta; horário efetivo ausente permanece null. Ticker substituído é rejeitado para evitar aplicar conversões societárias inadvertidamente. Sem v1, scraping, dividendos ou recursos pagos.

Fontes oficiais verificadas em 28/10/2026: [docs](https://brapi.dev/docs), [cotação v2](https://brapi.dev/docs/acoes/cotacao), [autenticação](https://brapi.dev/docs/authentication), [planos](https://brapi.dev/pricing), [termos](https://brapi.dev/terms-of-use). O leitor web retornou 404 para termos, mas fetch HTTPS direto retornou 200 e o texto integral renderizado foi inspecionado, versão de 07/06/2025. Gratuito confirma R$0, 15.000 chamadas por ciclo, 1 ticker/chamada, 1 simultânea, atualização 30 min, histórico até 3 meses. Sandbox sem chave informa 20/min/IP. Não há reinício garantido no dia 1. Histórico externo e dividendos automáticos não são consumidos.

**BLOCKED — ativação operacional externa.** Os termos proíbem redistribuição/sublicenciamento de dados e espelhos públicos; não identificamos autorização expressa para cache persistente compartilhado e apresentação a múltiplos usuários. Consumo, persistência e apresentação externos ficam desligados por padrão, inclusive quando somente token é preenchido. Para ativar, obter autorização escrita específica (armazenamento, retenção, apresentação e compartilhamento) e identificá-la em BRAPI_TERMS_REFERENCE, com BRAPI_DATA_USE_AUTHORIZED=true. A configuração não concede direitos. Adequar retenção à autorização antes do consumo real. Uso comercial no plano gratuito não é presumido autorizado. Atribuição específica não foi identificada; nome/fonte brapi permanecem na interface. AGPL licencia código, não dados. Não existe proxy público, revenda ou assinatura criada.

**PASS — consulta pública de contrato, limitada.** Uma chamada autorizada de sandbox a PETR4 sem token retornou HTTP 200, identidade exata, BRL, preço numérico e horário efetivo ISO; nenhuma cotação foi persistida e nenhum dado fundamental copiado para o catálogo. Isso verifica o contrato público, não a credencial/cobertura da conta.

**BLOCKED — consulta autenticada real.** Nenhum BRAPI_API_TOKEN no ambiente durante a validação. Não se declara o adaptador autenticado validado com serviço real. Bearer, erros e persistência foram testados com fixtures sintéticas e HTTP controlado, conforme a seção de testes. Não houve criação de conta, chave ou assinatura por automação.

## Arquitetura, cache e orçamento

MarketDataModule reúne abstração MarketDataProvider, BrapiProvider, QuoteService, QuoteRepository e MarketValuationService. Adaptador substituível sem acoplar o financial-core ao Nest/Prisma. GET de painel/valorização nunca consulta brapi. POST explícito só atualiza ativo com registro não cancelado em carteira própria. Cache compartilhado somente sob autorização específica, inicialmente 60 min; referência manual privada tem prioridade. Referência vencida permanece visível e é excluída da valorização. Cotação sem timestamp confiável não é considerada recente.

Reserva transacional global no PostgreSQL antes da rede: orçamento conta tentativas e falhas/crashes em janela móvel de 35 dias, padrão 10.000, máximo configurável 14.000. Não reseta no calendário nem presume refletir cota do painel brapi. Lock curto de MarketProviderState e lease de 30 s coordenam duas instâncias no mesmo banco. Uma chamada por ticker; pedido simultâneo retorna IN_PROGRESS, conclusão seguinte reutiliza cache. Rede fora da transação, timeout 4 s, zero retries automáticos, limite de resposta 64 KiB. 429 respeita cooldown/Retry-After, 401 pausa; falhas por ticker recebem cache negativo. Outros programas usando o token não são contabilizados. Nenhum Redis, fila ou serviço externo extra.

JSON numérico: valida magnitude, até 8 casas e 15 algarismos significativos da origem, limite 10^9. Node 24 JSON.parse context.source verifica o lexema original antes de aceitar um number já arredondado pelo parser. Depois vira string Decimal; 12 casas na saída não alegam precisão adicional. Moeda/ticker/datas/shape runtime estritos. Logs contêm evento/estado, sem token, corpo externo, URL privada ou dados pessoais.

## Modelo e migration

Migration aditiva `20261028000500_market_references` cria:

- ManualQuote privada: owner/asset, Decimal(38,12), moeda, horário efetivo/registro, motivo, chave idempotente, invalidação/motivo.
- MarketQuote: referência externa append-only, asset/ticker, provider, tipo DELAYED, Decimal, moeda, horário efetivo nullable e consulta. Não se presume fechamento. Fixtures só existem nos bancos de teste; não há seed de preços fictícios no ambiente local.
- MarketProviderState: lease e cooldown global.
- MarketRequest: tentativas confirmadas antes da rede, estado e data.

FKs restritivas, checks de preço positivo/moeda/datas, índice parcial de manual ativa única por usuário/ativo, requestKey único por proprietário, índices para histórico e orçamento. Trigger impede alteração/exclusão de referências externas e alteração dos valores originais/exclusão de manuais; só a primeira invalidação é permitida. Atualizar manual cria outra referência e invalida a anterior com rastreabilidade, sob lock do usuário. Mesma chave/payload é idempotente; payload diferente conflita. Invalidação é idempotente por ID e somente para proprietário. Histórico paginado (25 itens).

**PASS — PostgreSQL descartável:** quatro migrations aplicadas desde zero, regressões e testes reais de persistência/isolamento/concorrência. Clusters nativos privados em /tmp, sem TCP; encerrados no finally. Nenhuma escolha automática de banco desconhecido.

**PASS — ambiente local identificado:** após validar as migrations descartáveis e conferir modo development, URL loopback e current_database=valunium_dev, aplicada apenas a migration aditiva pendente. Contagens de usuários/carteiras/ledger preservadas; zero referências manuais/externas inseridas pela migração. Sem reset, exclusão, seed financeiro ou alteração global do PostgreSQL. Login local e GET /market/valuation retornaram 200, providerStatus NO_TOKEN.

## Fórmulas e indicadores

Função pura valuePositions separada do replay; fórmulas aprovadas das Etapas 03/04 não foram modificadas. Decimal com 80 algarismos/HALF_EVEN. Valor estimado = quantidade × preço válido. Não realizado = estimado − custo remanescente. Variação (%) = não realizado / custo × 100, indefinida com custo zero. Somatórios ocorrem antes do arredondamento de saída de 12 casas, inclusive produtos menores que 10^-12. Totais derivados podem exceder o tamanho de uma entrada armazenada, sem forçar truncamento no contrato de entrada NUMERIC. Apresentação em centavos com BigInt; nenhuma matemática monetária no frontend.

Realizado e proventos permanecem separados, sem retorno histórico total, TWR ou XIRR. Zero real em posição fechada não requer preço. Moedas separadas, nenhum FX. Preços ausentes/vencidos/sem horário/moeda incompatível são excluídos. Total completo fica null; subtotal e cobertura ativo/carteira são explícitos. Histórico incompleto bloqueia valorização. Filtro com data final diferente de hoje UTC não aplica preço atual ao passado/futuro. Sem cotação histórica licenciada, estado HISTORICAL_VIEW explica a limitação.

## Telas, endpoints e UX

Dashboard geral e por carteira ampliados pelo MarketPanel, preservando layouts/sidebar, texto da marca, cores, cinco gráficos ECharts sob demanda e tabelas contábeis. Novos cards de estimativa, não realizado/variação e cobertura. Fonte, horário e exclusão visíveis fora da tabela rolável; detalhes exatos por ativo/carteira. Distribuições contábeis continuam rotuladas por custo. Novo gráfico separado Distribuição do valor estimado de mercado usa a agregação Decimal por ativo do backend, somente com cobertura completa, com alternativa tabular exata. Nenhum preço ou série histórica foi inventado.

Formulário acessível de referência manual com seleção de ativo, preço string pt-BR sem arredondamento, datetime-local convertido explicitamente a UTC, motivo e checkbox obrigatório de confirmação. Fonte manual identificada como não oficial. Atualização cria histórico, invalidação pede motivo, paginação e feedback. Botões atualizar painel/valorização não consomem fornecedor; botão brapi explícito usa cache/limites e fica indisponível sem configuração. Não há polling.

GET /market/valuation; POST /market/refresh; POST /market/manual; GET /market/manual/:assetId; POST /market/manual/:id/invalidate. Contratos detalhados em [STAGE_05_API](../architecture/STAGE_05_API.md), regras/termos em [MARKET_DATA_POLICY](../finance/MARKET_DATA_POLICY.md).

## Segurança, desempenho e acessibilidade

Passport Local, Argon2id, sessão PostgreSQL/HttpOnly, CSRF, Origin allowlist e throttling preservados. Toda agregação filtra carteiras pelo proprietário; recursos de terceiros retornam 404. Manual do usuário A não altera referência global nem manual de B, mesmo no mesmo ativo. Cache externo autorizado não inclui dados pessoais. BFF allowlist ampliada só para novas rotas; credenciais nunca chegam a React/localStorage/respostas/screenshots/docs.

Distribuição de mercado agrega ativos entre carteiras no backend, sem converter valores monetários para number; o renderer reutilizado faz somente a projeção visual limitada, com tabela exata e supressão fora da faixa. Leituras de preço em lote e SQL DISTINCT ON para últimas referências, mapas por asset/ticker; sem N+1 por posição. Duas leituras do frontend (contábil e valorização), com replay adicional explícito do serviço reutilizado, sem promessa de snapshot único entre respostas. Limites de replay das etapas anteriores preservados. Resize não consulta API/fornecedor. Sem dependência de gráficos nova; ECharts e patch intactos. Sem cache contábil complexo ou projeções novas.

Tokens Obsidian + Gold e foco visível preservados, tabela rolável/focável, labels e checkbox, estados textuais e sinais positivos/negativos, reduced-motion. Cards 1 coluna em mobile, 2 em larguras intermediárias e 4 no desktop amplo. Fonte/horário também aparecem em lista visível sem exigir rolar horizontalmente. Não é certificação WCAG completa.

## Validação final

| Verificação | Estado |
|---|---|
| pnpm lint | PASS |
| pnpm typecheck | PASS |
| pnpm build | PASS |
| pnpm test | PASS — 60 testes, zero falhas |
| Prisma validate / generate | PASS |
| Migrations e integrações PostgreSQL nativo | PASS — 23 integrações finais, quatro migrations |
| Runtime local login/valorização | PASS — HTTP 200, NO_TOKEN |
| brapi sandbox público PETR4 | PASS — contrato real, sem persistência |
| brapi autenticada com chave real | BLOCKED — chave ausente |
| Consumo persistente/redistribuição brapi em runtime real | BLOCKED — autorização específica pendente |
| Chromium com fixtures, responsividade e inspeção visual final | PASS — cinco larguras, imagens inspecionadas diretamente |
| pnpm audit | PASS — zero vulnerabilidades conhecidas |
| git diff --check / docs:check | PASS |
| HTTPS/SMTP externo, WCAG completo, carga/CI remota/deploy | NOT RUN |

Suíte final: 60 testes reais, core 19, shared 2, web 5, API HTTP/provedor 11, PostgreSQL 23. Novos unitários cobrem preço positivo/inválido, ausência/staleness, ganho/perda, posição zero, custo zero, venda parcial com taxas, realizado/provento separado, alta precisão, moedas e incompletude. Provider usa fixtures do shape v2 documentado, com valores sintéticos: Bearer/ticker único, ausência/invalidez de token, cobertura, payload malformado/oversized, perda lexical de precisão, timeout abortado em 4 s, 429 e 5xx, sem retries.

Integração real PostgreSQL demonstra autorização/404, privacidade manual no mesmo ativo entre dois usuários, confirmação/idempotência/conflito, preço/data inválidos, histórico imutável e paginado, concorrência de substituição, duas instâncias e uma chamada, cache hit/miss/TTL, preservação do cache e contabilidade em falhas, orçamento móvel, cooldown, horário ausente/manual vencida, histórico incompleto e recorte passado. Fixtures de fornecedor não são a única prova: sessão, autorização, SQL, persistência, replay e cálculos são reais no banco.

Chromium isolado usa provedor sintético somente no processo de teste: login, carteira/duas compras/venda/dividendo, estado sem preço, timeout/recuperação do fornecedor, cotação brapi atrasada, referência manual 20 e atualização para 25, valores 264/240/300, fontes, histórico, filtros/gráficos, duas contas no mesmo ativo (B usa 22 do fornecedor, A mantém 25 manual), tentativas de invalidação/acesso alheio 404 e logout. Screenshots privados de 320/375/768/1024/1440, vazio/erro/incompleto, sem arquivos de imagem no repositório. Fixtures iniciais foram corrigidas para enviar a nota obrigatória da movimentação e preencher um novo motivo na segunda referência, sem remover validações. Inspeção visual motivou grid 2×2 intermediário, fonte/horário fora da tabela e redução tipográfica dos valores para manter Indisponível em uma linha nos cards de desktop. Artefatos finais inspecionados diretamente: /tmp/valunium-stage02-xBkJGv/market-{320,375,768,1024,1440}-panel.png e imagens fullPage correspondentes, além de market-distribution.png com o novo gráfico e tabela exata. Capturas iniciais de estados vazio/erro/incompleto e falha do fornecedor também foram inspecionadas; capturas ficam fora do repositório. O teste final confirmou ausência de overflow global nas cinco larguras, zero pageerrors e isolamento entre contextos.

## Arquivos

Alterados: `.env.example`, `README.md`, `turbo.json`; app.module, config/environment e finance/dashboard da API; BFF route, globals.css, dashboard e financial-workspace da web; next-env.d.ts regenerado pelo Next; infra/prisma/schema.prisma; financial-core/src/index.ts; shared/src/index.ts; scripts/test-integration.mjs e test-browser.mjs; DATA_MODEL, CALCULATION_RULES e ROADMAP.

Criados: apps/api/src/market/{brapi.provider,quote.repository,quote.service,market.module}.ts; apps/api/test/brapi.test.cjs e integration/market.cjs; apps/web/src/components/market-panel.tsx; packages/financial-core/src/valuation.ts e test/valuation.test.cjs; migration SQL 20261028000500_market_references; STAGE_05_API.md, MARKET_DATA_POLICY.md e este relatório.

`.env` local atualizado a pedido do usuário: BRAPI_API_TOKEN e BRAPI_TERMS_REFERENCE vazios; TTL 60, orçamento 10.000 e uso autorizado=false. Permissão 0600, ignorado pelo Git. Nenhum segredo real foi adicionado a arquivo versionado. AGENTS, LICENSE/AGPL-3.0-only, contribuições/segurança/código de conduta e patch ECharts byte a byte preservados. Não há dependência nova, Docker, formatador, logo, commit/push/reset, deploy, serviço pago ou mecanismo de execução financeira.

## Limitações e próxima etapa

Token e autorização específica do fornecedor são pendências externas explícitas. Cotação autenticada de conta e cobertura real de FIIs/ETFs/BDRs: NOT RUN/BLOCKED; só PETR4 no sandbox foi consultada. Cobertura nunca é presumida por classe. A expiração conservadora de 60 min pode tornar preços de fechamento/mercado fechado indisponíveis nos totais; não há calendário de pregão ou série histórica externa. Nenhum fechamento é inferido. Referências manuais têm a mesma política de idade. Histórico societário não suportado precisa ser sinalizado e conciliado externamente. Sem FX, previsão, benchmark, TWR/XIRR ou retorno total.

Antes de habilitar uso externo real, obter a autorização e adequar retenção, configurar chave gratuita e executar consulta autenticada controlada sem publicar token. Limites anteriores de escala/SMTP/proxy/rate limit distribuído/ESLint 9 permanecem; nenhuma infraestrutura comercial foi provisionada. Etapa 06 não iniciada nem planejada automaticamente.

Execução: conferir banco local autorizado, pnpm install, prisma:generate, db:migrate (sem reset), pnpm dev; acesso em http://localhost:3000 (Origin configurado, não alternar com 127.0.0.1). Após editar token/ambiente, reiniciar API. Validar com pnpm lint, typecheck, build, test, prisma:validate, prisma:generate e test:browser. Testes nunca consomem token pessoal herdado.

Commit sugerido: `feat(market): adicionar cotações controladas e valorização com preços manuais privados`.


Evidências finais de comandos: /tmp/valunium-stage05/test-complete.log (core 19 + shared 2 + web 5 + API 11 + PostgreSQL 23), build-complete.log, typecheck-complete.log, lint-complete.log, browser-complete.log, audit.json (todas severidades zero). Diretório de integração final /tmp/valunium-stage02-o9bFbo; browser final /tmp/valunium-stage02-xBkJGv. Ambos encerrados. A conferência local não gerou dados financeiros ou capturas da conta do usuário.

O gráfico de distribuição de mercado só aparece com cobertura completa; testes verificaram agregação do mesmo ativo em duas carteiras e ausência de distribuição parcial, além do SVG e tabela no Chromium. A correção tipográfica de Indisponível foi confirmada por captura e teste de uma linha no desktop.


Atualização posterior — Etapa 05.1: este relatório preserva o estado histórico da entrega. A investigação complementar encontrou token configurado e esclarecimentos oficiais de uso pessoal/cache, validou 14 candidatos e introduziu política restritiva de modo local individual em memória. O bloqueio de cache PostgreSQL compartilhado permanece. Ver ETAPA_05_1_REPORT.md para estado atual; não habilitar compartilhamento com as instruções antigas de flag/referência livre.
