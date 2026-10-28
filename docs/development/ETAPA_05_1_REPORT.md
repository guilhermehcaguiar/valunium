# Etapa 05.1 — permissões, cobertura e validação real

Data: 28/10/2026. Estado técnico: implementação concluída; ativação pessoal depende da vinculação explícita pelo responsável; cache PostgreSQL compartilhado/SaaS continuam **WAITING_FOR_PROVIDER**. Não é parecer jurídico. Não foi iniciada a Etapa 06.

## 1. Diagnóstico

HEAD inicial `1e728e626e9918dd8a52ad2df7fb7a9650368861`, git status limpo. Lidos AGENTS, relatório 05, política/contrato, schema/quatro migrations, provider, serviço/repositório, módulos, UI, configuração e testes. Fundação/replay/valorização Decimal reutilizados sem mudanças nas fórmulas. O bloqueio antigo era excessivamente genérico sobre cache, mas insuficiente na aplicação de permissões: uma flag true e qualquer texto de referência ativavam PostgreSQL compartilhado. HTTP 403 era confundido com ativo sem cobertura. Não havia modo pessoal sem persistência de preços.

Token real encontrado no `.env`; verificado apenas como presença, sem imprimir/modificar o valor. BRAPI_DATA_USE_AUTHORIZED permaneceu false, referência vazia e modo operacional desativado; não foi presumido quem é o titular da chave nem vinculada uma conta automaticamente. Nenhuma credencial foi substituída ou inventada. Testes sintéticos mantêm suas credenciais fictícias isoladas, nunca usadas contra serviço real.

## 2. Pesquisa documental e matriz

[Matriz completa A/B/C e alternativas](../finance/MARKET_PERMISSIONS.md). Fontes atuais examinadas: [termos legais](https://brapi.dev/legal/terms-of-use), [FAQ](https://brapi.dev/faq), [docs](https://brapi.dev/docs), [pricing](https://brapi.dev/pricing), FAQs específicas de licença/fontes, projetos pessoais, uso comercial e múltiplos projetos. Termos de 07/06/2025 mantêm proibição de redistribuição/sublicenciamento/feed/proxy público. A FAQ atual esclarece positivamente exibição aos usuários e cache/persistência dentro do próprio produto; a FAQ do gratuito inclui acompanhamento pessoal básico e protótipos.

Conclusões documentais:

- **A — explícito:** uso pessoal/prototipagem no gratuito, cache/persistência e exibição no próprio produto, backend/scripts e múltiplos projetos próprios dentro dos limites.
- **B — explícito:** publicar/revender feed/base/API, sublicenciar, expor chave, retirar avisos ou exceder limites. Não implementamos contorno por múltiplas contas/chaves.
- **C — não esclarecido no escopo específico:** cache comum para titulares independentes, condições de SaaS gratuito, AGPL nominalmente, retenção/exclusão e formato de atribuição. A FAQ não foi tratada como autorização irrestrita ou substituição dos termos gerais.

O fornecedor declara não integrar a cadeia de distribuidor/redistribuidor licenciado B3. Não certificamos a origem jurídica de toda cotação nem a apresentamos como oficial B3. A licença do código permanece separada dos dados. A evidência permite perfil técnico conservador de acompanhamento pessoal local; a ampliação para cache compartilhado exige esclarecimento aplicável e revisão.

## 3. Validação autenticada real e cobertura

**PASS — serviço real, não apenas mocks.** Foram feitas consultas individuais controladas com Bearer, identidade/classe/cobertura antes do preço, um ticker por requisição, sem concorrência, retries ou endpoint legado. BBAS3, ABEV3 e CMIG4, fora do sandbox documentado, confirmaram acesso autenticado. Header RateLimit-Limit=15000 observado nos ativos autenticados, compatível com o gratuito; não fizemos login no painel ou contratação/alteração de plano.

Todos os 14 candidatos retornaram identidade exata e cotação HTTP 200, BRL, preço positivo válido e timestamp efetivo ISO: PETR4, VALE3, ITUB4, BBAS3, ABEV3, CMIG4; HGLG11, MXRF11; BOVA11, IVVB11, NASD11; AAPL34, MSFT34, GOGL34. Matriz individual com HTTP, horário, classe, plano observado e limitações em [BRAPI_COVERAGE](../finance/BRAPI_COVERAGE.md). Não houve 403/429 nem candidato comprovadamente UNSUPPORTED_ON_FREE_PLAN nesta amostra; fora dela, cobertura continua não garantida.

Total: 30 chamadas, sendo 14 metadados e 12 cotações na passagem inicial; mais 2 metadados e 2 cotações FII após investigar a ausência de recommendedEndpoints.quote no catálogo. Não ignoramos essa inconsistência: availableData.quote e identidade estavam corretos, e a documentação oficial v2 quote inclui FIIs. A sondagem complementar usou o mesmo endpoint `/api/v2/stocks/quote`, sem `/api/quote` v1 nem indicadores/dividendos dedicados `/api/v2/fii/*` do Pro. Isso não prova cobertura universal por classe.

Nenhum preço/token/corpo bruto foi salvo no repositório, PostgreSQL ou screenshots. A saída sanitizada privada em `/tmp/valunium-stage05-1/coverage.json` contém somente estados/identidade/horários. O relatório não publica valores de preço. Autenticação/transporte/contrato real estão validados; o dashboard pessoal com dados reais não foi ativado, pois falta escolha expressa da conta do titular. O runtime de política/cache/UI foi validado separadamente com fixtures e banco real descartável.

Limites confirmados: R$0, 15.000/ciclo, um ticker e uma chamada simultânea, atualização aproximada 30 min e histórico até três meses. Ciclo não necessariamente começa no dia 1. Sem dividendos automáticos e sem exigência de plano pago.

## 4. Modos e correções técnicas

MarketProviderPolicy contém capacidades revisadas no código e fontes públicas. `providerPolicy` no GET de valorização informa estado, modo solicitado/efetivo, presença booleana de token, armazenamento, compartilhamento, TTL interno, referência revisada, atribuição e fontes; nunca o usuário vinculado, token ou autorização privada.

| Modo | Comportamento |
|---|---|
| disabled | Padrão: nenhum preço externo lido ou consultado; manual/contábil preservados |
| personal-memory | Uma conta do titular, host/origem loopback, sem NODE_ENV=production; RAM, sem compartilhamento, máximo interno de 60 min |
| shared-postgres | Bloqueado em operação real, mesmo com flag true e referência/URL livre |
| Fixture PostgreSQL | Somente provedor substituído no código + NODE_ENV=test + URL de cluster descartável identificado; nenhuma flag de produção basta |

O perfil pessoal exige referência exata `brapi-personal-local-2026-10-28`, enabled=true, modo correto, autorização correspondente, UUID do responsável e TTL compatível. A documentação oficial é a base, não a flag. Host público, outra conta, falta de vínculo, referência não revisada ou TTL excessivo não liberam dados. Não há modo individual secreto que use cache comum.

PersonalQuoteCache mantém chaves owner/asset/ticker, expiração efetiva e timer de descarte sem novas consultas; limpa ao encerrar a aplicação. Não lê/escreve MarketQuote. Preço manual privado continua tendo prioridade. Estado efetivo/vencido permanece separado da idade do cache. Ausência nunca vira preço de custo ou zero.

QuoteRepository continua coordenando lease/cota/cooldown via PostgreSQL, mas persistência de preço é deny-by-default. Em modo pessoal só ficam metadados de tentativa, não o preço. Se outra instância/reinicialização não tiver a memória, um sucesso recente retorna NO_LOCAL_CACHE até o TTL; não há refetch ilimitado. Limite conservador 10.000 tentativas/35 dias (máximo configurável 14.000), sem reset mensal artificial. Não controla outros programas/diagnósticos usando a mesma chave; painel brapi é fonte do consumo real.

403 agora é ACCESS_DENIED e não ausência de ativo; 404 é NO_COVERAGE. 401, 429/Retry-After, timeout, cache negativo, coordenação e ausência de retries preservados. Falhas de transporte são PROVIDER_ERROR, sem imprimir erros de fetch que possam conter segredo. Resultado de lease substituído retorna rejeição; só resultado aceito pode popular RAM/persistência de teste. A checagem TypeScript detectou falta do retorno booleano ao integrar essa confirmação, corrigida sem enfraquecer tipos.

Parser de texto único preserva validação do lexema numérico original de JSON (magnitude/escala/algarismos), reutilizado na sondagem e provider. Não houve alteração de fórmulas/replay, preço médio, contabilidade ou Decimal.js. Não há biblioteca nova.

## 5. Alternativas e recomendação

HG Finance: gratuito anunciado 400/dia, mas documentação de stock_price exige Member Premium; não confirmamos acesso gratuito às quatro classes. Cache local/temporário é recomendado, porém escopo de dados/AGPL/multiusuário não demonstrou uma solução melhor. Twelve Data Basic: US$0, 8 créditos/min e 800/dia, escopo básico não demonstra B3 grátis, gratuito sem uso comercial e exibição/redistribuição regidas por direitos adicionais. Dados B3 independente: 200/dia, EOD e uso próprio; termos não autorizam produto/redistribuição em gratuito/Pro. Dados oficiais B3: consulta informativa e vedação expressa de coleta automatizada na página histórica; sem scraping/download automatizado. CVM/BCB não fornecem substituto completo de preços negociados para esta carteira. Importação depende de direito do arquivo e não foi implementada fora do escopo. Preço manual privado existente é a alternativa gratuita operacional para todos.

Decisão: manter brapi como candidato externo validado, liberar capacidade somente no perfil pessoal local documentado e com escolha explícita do titular; manual privado para os demais. PostgreSQL compartilhado/SaaS continuam WAITING_FOR_PROVIDER. Não foi criada conta de fornecedor alternativo, integração adicional, assinatura ou solução automática Yahoo/endpoints não documentados.

## 6. Contato e ações humanas

[Minuta em português](../finance/BRAPI_CONTACT_DRAFT.md) pronta com as oito perguntas solicitadas. Canal oficial verificado: [brapi.dev/contact](https://brapi.dev/contact), mailto `contato@brapi.dev`. Não enviamos mensagem, não presumimos resposta e não prometemos SLA de retorno.

Para uso pessoal agora: o responsável confirma titularidade, obtém o UUID da própria sessão Valunium (`GET /api/auth/me`, campo data.id), mantém o token existente, configura o perfil e reinicia a API conforme [BRAPI_SETUP](../finance/BRAPI_SETUP.md). Não inferimos que o usuário de teste seja o titular da chave. Nenhuma flag true foi escrita automaticamente no `.env`.

Para compartilhamento: enviar a minuta sem segredo; obter esclarecimento sobre titulares distintos/plano gratuito/retensão/atribuição/AGPL/SaaS; preservar resposta original fora do Git; revisar matriz/capacidades e adequar retenção da tabela append-only antes de permitir persistência real. Uma resposta privada ou uma URL inserida em BRAPI_TERMS_REFERENCE não muda a política de código. WAITING_FOR_PROVIDER significa minuta não enviada, aguardando envio humano e posterior resposta, não contato já realizado.

## 7. Testes e evidências

| Verificação | Estado |
|---|---|
| pnpm lint | PASS |
| pnpm typecheck | PASS |
| pnpm build | PASS |
| pnpm test | PASS — 66 testes, zero falhas |
| Prisma validate/generate | PASS |
| PostgreSQL nativo descartável e quatro migrations anteriores | PASS — 25 integrações |
| Segurança multiusuário e política/flags | PASS — SQL/sessão reais; sem depender só de mocks |
| Chromium | PASS — jornada anterior, bloqueio real, manual durante bloqueio e modo pessoal RAM |
| Responsividade/inspeção visual | PASS — 320/375/768/1024/1440, capturas privadas inspecionadas |
| brapi real autenticada | PASS — 14 candidatos, diagnóstico sem preços persistidos |
| Dashboard pessoal com dados reais da conta | NOT RUN — não vinculamos titular automaticamente |
| Persistência/compartilhamento operacional | BLOCKED / WAITING_FOR_PROVIDER |
| pnpm audit | PASS — zero vulnerabilidades conhecidas |
| git diff --check | PASS |
| docs:check | PASS |
| CI remota, produção/SaaS/HTTPS/pentest/WCAG integral | NOT RUN |

Regressões 01–05 preservadas. Suíte final: core 19, shared 2, web 5, API 15 e integração 25 = 66. Política testa referências arbitrárias, URLs/flags, limites de host/TTL, vínculo, compartilhamento e ausência de bypass por NODE_ENV=test. Cache RAM testa isolamento por usuário/ticker, expiração e limpeza. PostgreSQL testa modo pessoal com duas instâncias: uma chamada, zero preços gravados, ausência em outra conta, refetch bloqueado sem RAM e referência manual preservada. Teste de lease vencido/substituído rejeita resposta atrasada e aceita só a mais nova. Valores/replay das etapas anteriores continuam cobertos.

Chromium real: fixtures explicitamente marcadas, dois contextos, fluxo financeiro anterior, backend de política real recusando compartilhamento mesmo com flags; manual salva referência durante bloqueio; modo pessoal usa RAM sem aumentar MarketQuote, B recebe PERSONAL_ACCESS_ONLY e nenhum preço alheio. Capturas em `/tmp/valunium-stage02-q6eOx5`, cinco larguras mais market-policy-blocked-manual.png e market-personal-{375,1440}.png, inspecionadas diretamente. Zero pageerrors e overflow global. Uma primeira asserção de browser encontrou dois avisos textuais iguais; seletor foi delimitado ao aviso principal sem mudar o comportamento ou a proteção.

Logs privados: `/tmp/valunium-stage05-1/test-final.log`, `integration-final.log`, `typecheck-final.log`, `build-final.log`, `browser-second.log`, `lint-final.log`, `prisma-validate.log`, `prisma-generate.log`, `audit.json`. Integração isolada em `/tmp/valunium-stage02-IiHpVZ` e execução completa final em `/tmp/valunium-stage02-k9RpYf`; clusters encerrados. Sondagem sem --live retorna NOT RUN e zero chamadas; não repetimos os 14 candidatos após validar o token. Nenhum dado financeiro de usuário foi capturado.

## 8. Arquivos e preservação

Criados: `apps/api/src/market/provider-policy.ts`, `personal-quote-cache.ts`; `apps/api/test/market-policy.test.cjs`; `scripts/probe-brapi.mjs`; `docs/finance/MARKET_PERMISSIONS.md`, `BRAPI_SETUP.md`, `BRAPI_COVERAGE.md`, `BRAPI_CONTACT_DRAFT.md`; este relatório.

Alterados: configuração de ambiente; provider/repositório/serviço/módulo de mercado; testes de provider/integração; componente market-panel; tipos shared; scripts de browser/integração; package.json (somente comando de sondagem); turbo passThroughEnv; .env.example; README; STAGE_05_API; MARKET_DATA_POLICY; ROADMAP; relatório 05 com nota histórica. Nenhuma dependência ou formatter instalado.

AGENTS, LICENSE/AGPL, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, schema/migrations Prisma, patch ECharts e código financial-core byte a byte preservados. `.env` real e credenciais não foram modificados; só presença/flags não secretas foram verificadas. Banco valunium_dev não foi apagado, migrado ou semeado nesta etapa. Nenhuma cotação real foi inserida nele. Todos os testes de persistência usaram novos clusters nativos descartáveis.

Sem Docker, Prettier, outro formatador, cloud, pagamentos, commits/push/reset, deploy ou execução financeira. Nenhuma mensagem externa enviada. Etapa 06 não iniciada.

## 9. Commit sugerido

`fix(market): validar permissões e isolar cotações pessoais em memória`

Inventário final: 19 arquivos existentes alterados e 9 novos (28 no total). Lockfile e dependências preservados. As credenciais e flags da instalação foram mantidas: token presente, autorização solicitada=false, providerEnabled=false e modo disabled.
