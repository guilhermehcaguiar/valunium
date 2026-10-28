# Relatório verificável — Etapa 04

Data-base da solicitação: 27/10/2026. Auditoria inicial: git status limpo, HEAD `3d5275bd22d41a77454ff0087e44b419fea97838`. Lidos AGENTS, PRD, design system, regras/contratos e relatório da Etapa 03, ADRs, componentes reais, replay e estratégia de sessão/BFF. Não havia dashboard analítico: /dashboard era contexto/navegação, /portfolios/:id era configuração. Serviços existentes foram reutilizados. Não foram criadas tabelas, migrations, credenciais ou integrações.

## Resultado e componentes

Dashboard geral /dashboard e painel por carteira /portfolios/[id], preservando configuração da carteira e acesso ao histórico da Etapa 03. Seletor de carteira, filtro temporal, cards, lista de carteiras, posições abertas, últimos oito registros de movimentações/proventos, avisos de incompletude e ausência de mercado. Novo endpoint exclusivamente de leitura GET /api/v1/dashboard. Datas/portfolioId são filtros; nenhum userId do cliente é aceito como autorização.

Componentes Dashboard, Metric, Plot, Recent e DashboardSkeleton; módulo DashboardChart separado carregado sob demanda. Estilos reutilizam buttonClass/inputClass e tokens Obsidian + Gold. Cards, filtros, tabs/links, tabelas roláveis/focáveis, skeletons, legends/tooltips e estados vazios/erro padronizados. Configurações/formulários anteriores permanecem disponíveis; não foi criada outra tela vazia. Marca textual e suporte ao futuro SVG preservados. Manrope/Inter são preferências CSS locais, sem downloads de fontes ou novas famílias binárias.

## Indicadores e precisão

Definições completas em [DASHBOARD_INDICATORS](../finance/DASHBOARD_INDICATORS.md):

- Total de carteiras selecionadas, incluindo arquivadas.
- Ativos distintos com quantidade positiva por moeda, sem dupla contagem entre carteiras.
- Custo remanescente das posições abertas até a data final; não patrimônio a mercado ou aporte bancário.
- Resultado realizado acumulado até a data final, preservando perdas e posições encerradas.
- Proventos líquidos efetivamente registrados até a data final, sem estimativa de renda futura.
- Quantidade de registros ativos no intervalo, incluindo proventos e excluindo cancelados.

Gráficos: distribuição do custo por classe; custo por ativo; evolução de custo contábil/compras com taxas/receitas líquidas de vendas; proventos por mês/tipo; resultado realizado diário com sinais positivos/negativos. Cada visualização tem unidade, legenda, tooltip e tabela exata acessível por teclado. Eixos/datas em pt-BR; curvas em degraus, sem interpolar preços ou rentabilidade. Valores negativos não dependem de cor: eixo e tabela mostram sinais e o texto identifica ganho/perda.

Agregação no financial-core usa o replay aprovado com observador de leitura; fórmulas não foram duplicadas no frontend ou modificadas. Totais e distribuições somam estados Decimal internos antes do arredondamento final de 12 casas. `from` filtra séries/contagem/recentes, mas preserva o custo de abertura; `to` define o snapshot as-of. Padrão último ano, janela explícita máxima de 3660 dias. Datas de operação/recebimento são calendário, sem mudança de mês por timezone do navegador.

Frontend usa strings e BigInt/Intl para formatar centavos HALF_EVEN; nunca parseFloat/Number para cálculos contábeis. Única conversão monetária a number ocorre em visualNumber, exclusivamente para coordenadas aproximadas com faixa |x|<=10^12 e x=0 ou |x|>=10^-8. Fora da faixa, suprime gráfico e mantém a tabela exata. Não se reutiliza coordenada ou valor formatado em nenhuma fórmula financeira.

Moedas são segmentadas, sem somatório monetário global nem conversão fictícia. O schema atual aceita BRL; o contrato e testes puros demonstram segmentação futura com moedas diferentes. Histórico incompleto em qualquer carteira bloqueia totais/gráficos financeiros de sua moeda (null), em vez de subtotal enganoso. É possível selecionar outra carteira completa. Zero em histórico completo significa zero real nos registros disponíveis; ausência de cotação sempre é explicitada como indisponível. Não há afirmação de completude patrimonial externa do usuário.

## Backend, segurança e performance

[Contrato STAGE_04_API](../architecture/STAGE_04_API.md). Leitura RepeatableRead, duas chamadas Prisma de negócio (carteiras e eventos/ativos em lote; o ORM pode emitir SELECT adicional da relação), mais verificações existentes de sessão. Todos os caminhos filtram proprietário, inclusive o ledger. Carteira de terceiro/inexistente retorna 404, sessão ausente 401. Payload não contém e-mail, hash, token, authVersion ou dados de terceiros. BFF/sessão/no-store/CSRF anteriores preservados. Nenhuma rota de escrita adicionada ao dashboard.

Sem N+1 por carteira/ativo; um replay por carteira e observador incremental, ordenação O(N log N) e agregação linear após ordenação. Não há replay por data nem cache/projeção persistida. Correções/cancelamentos aparecem na nova leitura; nova navegação, filtro e botão Atualizar consultam o endpoint. Limites explícitos: 500 carteiras, 50.000 eventos na seleção, 10.000 por carteira. Exceder limite falha explicitamente, sem truncar os cálculos. Detalhes maiores podem exigir paginação futura após medição.

ECharts/SVG é importado dinamicamente só nos gráficos com dados suficientes. Bar/Line, grid, tooltip, legend, aria e renderer necessários; sem animações e com ResizeObserver/dispose. Maior chunk medido no build inicial finalizado: 590.387 bytes brutos / 203.303 bytes gzip (~198,5 KiB); é uma medição local de artefato, não benchmark Lighthouse de produção. A checagem de requisições confirmou um fetch de dashboard por carregamento/filtro/retry; redimensionar não depende de novas agregações HTTP. Sessão consultada no servidor permanece deduplicada por renderização, como na Etapa 03. Não há promessa de latência pública ou teste de carga de produção.

## Biblioteca e compatibilidade

ECharts 6.1.0, Apache-2.0, com dependência zrender. Recharts/Redux e ECharts 6.0 foram tentativas intermediárias, removidas da árvore final. ECharts 6.1 corrige o aviso moderado GHSA-fgmj-fm8m-jvvx encontrado na versão 6.0; tooltip richText evita HTML cru.

Patch pnpm versionado em patches/echarts@6.1.0.patch corrige declarações opcionais de focus (Graph/Chord) e hoverLayer (Path) usando NonNullable para respeitar as interfaces-base. Afeta somente .d.ts, restringe os valores aceitos e não muda JavaScript. strict, exactOptionalPropertyTypes, noUncheckedIndexedAccess e skipLibCheck=false permanecem. Não há shim any, @ts-ignore, desativação de lint ou alteração de fórmulas para passar testes. Reavaliar/remover o patch quando upstream corrigir os tipos. AGPL e licença/avisos próprios da biblioteca permanecem separados.

Referências: https://echarts.apache.org/handbook/en/basics/import/ e https://github.com/advisories/GHSA-fgmj-fm8m-jvvx.

## Testes e runtime

| Verificação | Estado |
|---|---|
| pnpm install e instalação congelada | PASS |
| pnpm lint | PASS |
| pnpm typecheck | PASS |
| pnpm build | PASS |
| pnpm test | PASS — 42 testes: core 13, shared 2, web 5, API HTTP 6, integrações 16 |
| Prisma validate/generate | PASS |
| Integração PostgreSQL nativo descartável | PASS — três migrations anteriores e isolamento real |
| Browser runtime e regressões 01–03 | PASS — Chromium, dois contextos distintos |
| Auditoria responsiva 320/375/768/1024/1440 | PASS — capturas finais inspecionadas diretamente |
| Indicadores/series/agrupamento/precisão/zero/perdas/vazio/moedas | PASS — testes puros e PostgreSQL para agregação/autorização |
| Histórico incompleto e acesso cruzado | PASS — null/404 reais na API; aviso e cards indisponíveis no browser |
| Falha temporária e retry | PASS — interceptação somente do teste visual, com recuperação real da API |
| Audit de dependências final | PASS — zero avisos conhecidos |
| git diff --check / verificador documental | PASS |
| Múltiplas moedas no PostgreSQL real | NOT RUN — schema atual BRL; cenário coberto no núcleo puro |
| CI remota, deploy, SMTP/HTTPS externos, pentest e auditoria WCAG completa | NOT RUN |

Os testes puros verificam custo 212, realizado 7 e provento 10; filtro com custo anterior preservado; grandes valores acima de Number.MAX_SAFE_INTEGER; classe/ativo; datas ordenadas/mês; perda realizada após zerar posição; grupos monetários e incompletude. O teste de integração usa as fixtures reais da Etapa 03, incluindo recibos corrigidos e 26 proventos adicionais: custo 164, realizado 19 e proventos 253 até 04/01/2026. Verifica 401, 404 de outro proprietário, ausência de dados de A na consolidação de B, data inválida e null após sinalização de histórico incompleto.

Runner existente cria seu próprio cluster PostgreSQL 18.6 em diretório 0700 de /tmp, sem TCP e sem escolher DATABASE_URL de terceiros. Fixtures são sintéticas, não financeiras pessoais. Os processos e clusters temporários são encerrados e screenshots/logs ficam fora do repositório.

## Auditoria visual e acessibilidade

Capturas de viewport e página completa nas cinco larguras, mais painel vazio/erro/incompleto. Inspeção direta das imagens revelou necessidade de mais contraste nos eixos e melhor distribuição dos quatro cards financeiros; ambos corrigidos; também foram alinhadas as linhas de base dos valores e corrigido o padding do estado vazio. Uma nova execução de navegador gerou as imagens finais. Overflow horizontal global foi testado em todas as larguras; tabelas têm região rolável intencional e focável. Testes abriram tabelas exatas, gráficos SVG, filtros, retry, painel por carteira e verificaram ausência de pageerror. Skip link/foco e teclado da fundação seguem verificados.

Contraste calculado (WCAG sRGB): Gold #C9A646 sobre #0A0A0B 8,51:1; sobre Surface #121315 7,99:1; sobre Card #1A1C1F 7,34:1. Texto secundário #C8C2B8 sobre Surface 10,50:1. Não é certificação WCAG completa. Sem novos downloads de fonte, brilhos, glassmorphism, gradientes ou animação decorativa; skeleton respeita reduced-motion e gráficos não animam.

## Limites e Etapa 05

Sem cotações, rentabilidade de mercado, projeções de proventos, benchmarks ou integrações externas. O painel mostra custos contábeis e fatos registrados. Não há patrimônio atual de mercado ou execução financeira. Escala está limitada explicitamente ao volume de replay; cargas maiores podem requerer paginação/projeções reconstruíveis em etapa autorizada. A biblioteca de gráficos tem custo de download, mitigado por import modular/dinâmico. Manutenção do patch de tipos e do ESLint 9 (aviso de fim de suporte mantido por requisito) permanece necessária. Análises públicas, infraestrutura e demais limites operacionais das etapas anteriores continuam sem provisionamento.

Etapa 05 não iniciada. Nenhum commit, push, reset, histórico reescrito, deploy ou publicação. Sem Docker, Prettier, formatador novo, docs/agents ou novo logotipo. AGENTS, AGPL e contribuições preservados.

## Arquivos alterados/criados

- `README.md`
- `apps/api/src/app.module.ts`
- `apps/api/src/finance/dashboard.ts`
- `apps/api/test/integration/identity.cjs`
- `apps/web/package.json`
- `apps/web/src/app/(private)/dashboard/page.tsx`
- `apps/web/src/app/(private)/portfolios/[id]/page.tsx`
- `apps/web/src/app/api/[...path]/route.ts`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/dashboard-charts.tsx`
- `apps/web/src/components/dashboard.tsx`
- `apps/web/src/lib/display.ts`
- `apps/web/test/display.test.tsx`
- `docs/architecture/STAGE_04_API.md`
- `docs/design/DESIGN_SYSTEM.md`
- `docs/development/ETAPA_04_REPORT.md`
- `docs/finance/DASHBOARD_INDICATORS.md`
- `docs/product/ROADMAP.md`
- `package.json`
- `packages/financial-core/src/dashboard.ts`
- `packages/financial-core/src/index.ts`
- `packages/financial-core/test/dashboard.test.cjs`
- `packages/shared/src/index.ts`
- `patches/echarts@6.1.0.patch`
- `pnpm-lock.yaml`
- `scripts/test-browser.mjs`

## Como validar

Ambientes/banco da Etapa 02 continuam válidos. `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`; `pnpm prisma:validate` e `pnpm prisma:generate`. Navegador: `pnpm exec playwright install chromium` se ausente e `pnpm test:browser`. Native PostgreSQL é obrigatório nos testes de integração. Screenshots são gerados somente em /tmp; não são arquivos a publicar.

## Commit sugerido

`feat(dashboard): adicionar painéis contábeis e gráficos acessíveis com isolamento por usuário`


Artefatos visuais finais inspecionados: `/tmp/valunium-stage02-VF4tC0/dashboard-{320,375,768,1024,1440}.png`, versões `-top.png` e estados `dashboard-empty.png`, `dashboard-error.png`, `dashboard-incomplete.png`. Diretório privado de teste, sem arquivos adicionados ao repositório. Verificações de número de requisições também passaram: zero leituras ao redimensionar; três leituras para filtro, atualização com falha e retry.
