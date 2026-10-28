# Valunium

Plataforma open source de acompanhamento e inteligência patrimonial. Gratuita nesta fase, desenvolvida para colaboração, uso independente e portfólio técnico.

**Estado: Etapa 05 — referências de preço e valorização estimada.** Autenticação, carteiras privadas, registros históricos auditáveis, posições, custo médio, realizado, proventos e dashboards contábeis estão implementados. Referências manuais privadas permitem valor estimado e resultado não realizado. Adaptador brapi v2 gratuito implementado, com controle de chamadas; consumo operacional externo desativado por padrão até token e autorização específica para armazenar/apresentar/compartilhar dados. Não há serviço hospedado ou execução financeira.

## Política financeira permanente

O Valunium **nunca executa operações financeiras**: não envia ordens, transferências, pagamentos, saques, resgates ou rebalanceamento. Integrações futuras terão somente permissões de leitura. Registros futuros de compra/venda serão fatos históricos de operações feitas externamente. Leia [a política absoluta](docs/security/FINANCIAL_READ_ONLY_POLICY.md).

## Stack e requisitos

- Linux nativo; Node.js 24 LTS (`.node-version`), pnpm 10.34.9 via Corepack.
- pnpm Workspaces e Turborepo 2.11.10.
- Next.js 16.4.3, React 19.3.1, Tailwind CSS 4.3.3, App Router.
- NestJS 11.2.8, TypeScript 6.0.3 strict, ESLint 9.39.5.
- Prisma 7.10.1 estável, adaptador PostgreSQL e PostgreSQL nativo (validado com 18).
- Test runner nativo do Node; TSX para testes React e scripts TypeScript.

Versões efetivas e integridade das dependências em `pnpm-lock.yaml`. **Sem Docker, Prettier ou outro formatador.** Nenhum serviço pago é necessário.

## Estrutura

```text
apps/web/                 Next.js, acesso, perfil e carteiras
apps/api/                 NestJS modular; autenticação, perfil, carteiras e health
packages/shared/          Contratos e validações independentes
packages/financial-core/  Strings decimais exatas, sem cálculos de investimento
infra/prisma/             Schema de identidade/carteiras e migrations aditivas
scripts/                  Verificações de banco e documentação
docs/                     Produto, arquitetura, segurança, design e decisões
.github/workflows/ci.yml  Instalação, lint, typecheck, build e testes
```

## Instalação no Linux

Instale Node 24 LTS com seu gerenciador de versões e habilite Corepack (`corepack enable`, se disponível na sua instalação). Não há instalação automática de serviços do sistema.

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
pnpm install
pnpm prisma:validate
pnpm prisma:generate
# Configure DATABASE_URL e SESSION_SECRET; prepare o PostgreSQL conforme abaixo.
pnpm db:migrate
pnpm dev
```

Web: `http://localhost:3000`. API: `http://127.0.0.1:3001/api/v1/health`. O comando `pnpm dev` prepara as dependências compartilhadas e inicia ambos os aplicativos. A web pode ser iniciada separadamente com `pnpm --filter @valunium/web dev`; a API, com `pnpm --filter @valunium/api dev`, após `pnpm build` ou o preparo dos pacotes compartilhados.

A página pública e health continuam independentes de consultas ao banco. Autenticação e rotas privadas exigem PostgreSQL e `SESSION_SECRET`. Sem ambas as configurações, os endpoints de identidade falham fechados com 503; não existe fallback de sessões em memória. Health é uma verificação de vida do processo, sem verificação de prontidão do banco. Nenhum dado privado é exposto. Os endpoints implementados estão em [STAGE_02_API](docs/architecture/STAGE_02_API.md), e a estratégia está em [AUTHENTICATION](docs/security/AUTHENTICATION.md). Swagger continua adiado. O contrato de saúde é:

```json
{"data":{"status":"ok","service":"valunium-api","version":"v1"}}
```

## Variáveis de ambiente

| Variável | Local | Uso |
|---|---|---|
| `DATABASE_URL` | `.env` na raiz | Prisma e scripts de banco; nunca pública |
| `NODE_ENV` | raiz/processo | `development`, `test` ou `production` |
| `HOST` | raiz/processo | API; padrão `127.0.0.1` |
| `PORT` | raiz/processo | API; padrão `3001` |
| `CORS_ORIGINS` | raiz/processo | Origens HTTP(S) explícitas separadas por vírgula |
| `SESSION_SECRET` | raiz/processo | Pelo menos 32 bytes aleatórios; assinatura do cookie |
| `WEB_ORIGIN` | raiz e web | Origem pública única da web |
| `API_INTERNAL_URL` | `apps/web/.env.local` | Origem privada da API usada pelo servidor Next/BFF |
| `MAIL_OUTBOX_DIR` | raiz/processo | Caixa local privada fora do repositório |
| `SMTP_URL`, `SMTP_FROM` | raiz/processo | Transporte próprio, obrigatório em produção |
| `NEXT_PUBLIC_API_URL` | `apps/web/.env.local` | Origem pública da API, padrão `http://localhost:3001` |

A API carrega `.env` da raiz via Node. Next carrega seu próprio `.env.local`. Somente valores públicos recebem `NEXT_PUBLIC_`. Não reutilize `PORT` para a web. Em produção/testes, CORS sem configuração não autoriza nenhuma origem; em desenvolvimento, o padrão é `http://localhost:3000`. CORS não substitui a autorização implementada no backend. A interface usa `/api` na mesma origem, cookie HttpOnly e CSRF; não armazena tokens em localStorage. Não coloque segredos no frontend nem nos logs.

## PostgreSQL nativo — Arch Linux / Omarchy

Instale explicitamente, se necessário: `sudo pacman -S postgresql`. Use um cluster existente somente após identificar seus dados e privilégios. Não reinicialize `/var/lib/postgres/data` nem altere `pg_hba.conf` de um serviço existente para fazer o projeto funcionar.

Para um ambiente **novo e isolado**, sob seu próprio usuário, siga [o procedimento local](docs/development/POSTGRESQL.md). Configure `DATABASE_URL` e então:

```bash
pnpm prisma:generate
pnpm db:migrate
pnpm db:status
pnpm db:check
```

`db:migrate` aplica migrations versionadas ao destino indicado: confira a URL antes de executar. Não há reset automático, seed com dados reais ou criação automática de banco desconhecido. O schema ativo contém identidade/sessões/carteiras, catálogo, ledger auditável e referências de preços da Etapa 05. O rascunho original com relacionamentos/índices e `Decimal(38,12)` foi preservado em [schema.conceptual.prisma](docs/architecture/schema.conceptual.prisma); não é migrado. O schema documental foi preservado; o schema executável e migrations são a fonte do estado implementado.

## Comandos e qualidade

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
# Somente integração nativa (prepara cliente e API):
pnpm test:integration
pnpm prisma:validate
pnpm prisma:generate
pnpm docs:check
```

`build` compila todos os pacotes e apps; `test` prepara builds e executa testes reais da API por HTTP, validação de ambiente/CORS, renderização da web, contratos e limites decimais. `pnpm test` também cria um cluster PostgreSQL nativo descartável, aplica todas as migrations versionadas e testa dois usuários reais. Exige `pg_config`, `initdb`, `pg_ctl` e usuário não root; não usa DATABASE_URL do ambiente para escolher o banco de teste. O cluster é sempre encerrado e os artefatos privados ficam em /tmp para inspeção. A CI instala PostgreSQL nativo e executa os mesmos gates, sem deploy, publicação ou banco de produção. Execute build e typecheck em sequência: ambos geram arquivos em `.next/types`. O build usa webpack explicitamente e não baixa fontes remotas. A fonte Inter é preferida quando instalada, com fallback do sistema.

Após build, em terminais separados:

```bash
pnpm --filter @valunium/api start
pnpm --filter @valunium/web start
curl --fail http://127.0.0.1:3001/api/v1/health
curl --fail http://localhost:3000/
```

## Design e roadmap

Obsidian + Gold, com tokens centralizados em `apps/web/src/app/globals.css`. A marca textual é provisória. O conceito Aureus A1 Clássico está aprovado como direção; o vetor final segue pendente.

1. Etapa 01: fundação técnica concluída.
2. Etapa 02: autenticação, usuários e carteiras concluídos; sem publicação.
3. Etapa 03: registros históricos internos e cálculos determinísticos.
4. Etapa 04: dashboard contábil concluído.
5. Etapa 05: referências de preço e valorização estimada; integração autenticada depende de token e autorização de dados.

Etapas futuras exigem autorização própria. SaaS, billing, cloud e execução financeira não fazem parte desta entrega. Leia [o roadmap](docs/product/ROADMAP.md), [a arquitetura](docs/architecture/ARCHITECTURE.md) e [o relatório da Etapa 02](docs/development/ETAPA_02_REPORT.md).

## Licença e contribuição

Código sob **GNU AGPLv3 — SPDX `AGPL-3.0-only`**, com [texto integral em LICENSE](LICENSE), obtido de [GNU](https://www.gnu.org/licenses/agpl-3.0.txt) sem alteração. Veja [a verificação](docs/development/LICENSE_VERIFICATION.md). Dependências mantêm suas próprias licenças; o lockfile não muda seus termos.

As contribuições seguem a licença do projeto, sem CLA obrigatório ou cessão integral. Consulte [CONTRIBUTING](CONTRIBUTING.md), [SECURITY](SECURITY.md), [CODE_OF_CONDUCT](CODE_OF_CONDUCT.md) e [AGENTS](AGENTS.md). Não envie dados patrimoniais reais, extratos ou credenciais. Nome e identidade visual terão política de marca separada; não há alegação de registro no INPI. Antes de beta público, permanecem os gates de segurança, isolamento e privacidade das etapas correspondentes.


## Configurar acesso local

Depois de escolher/criar um banco **de desenvolvimento identificado** conforme [POSTGRESQL](docs/development/POSTGRESQL.md), edite a URL em `.env`. Gere o segredo sem imprimi-lo nos logs:

```bash
umask 077
printf 'SESSION_SECRET=%s\n' "$(openssl rand -base64 48)" >> .env
pnpm db:migrate
pnpm dev
```

Use `http://localhost:3000` no navegador (não alterne entre localhost e 127.0.0.1 sem ajustar WEB_ORIGIN/CORS). Cadastro não autentica automaticamente: cadastre-se, entre, crie uma carteira e encerre a sessão. Para recuperação, o adaptador local grava uma mensagem 0600 em `/tmp/valunium-mail-<uid>` ou `MAIL_OUTBOX_DIR`, sem publicar/imprimir o link. Abra o link manualmente na mesma origem configurada. O arquivo é sensível e deve permanecer fora do repositório. SMTP real não é necessário para desenvolvimento; seu adaptador está configurável por ambiente e exige TLS.

A autorização foi validada com dois usuários reais no PostgreSQL. Antes de operação pública, revisar transporte SMTP real, proxies, limites distribuídos, posse de e-mail, MFA, privacidade e manutenção do ESLint 9. Não há deploy ou SaaS comercial nesta etapa.


## Teste da interface no navegador

```bash
pnpm exec playwright install chromium
pnpm test:browser
```

Esse comando prepara o build, cria outro cluster PostgreSQL descartável e testa com Chromium: dois contextos isolados, cadastro/login, carteiras, perfil, logout, recuperação, bloqueio de acesso cruzado, cookie persistente, CSRF, largura mobile e navegação por teclado. Usa portas locais 43102/43103 e encerra os processos ao terminar. Screenshots e logs ficam no diretório privado descartável em /tmp. O download do Chromium é opcional para os testes de API; não usa serviços externos em runtime.


## Histórico financeiro — Etapa 03

Abra **Ativos** para cadastrar identificação manual B3/BRL. Em cada carteira, abra **Histórico e posições** (`/portfolios/[id]/history`) para registrar operações já realizadas externamente, consultar posições, registrar dividendos/JCP recebidos e corrigir/cancelar com motivo auditado. Campos decimais aceitam vírgula na interface e são enviados como strings sem arredondamento. Catálogo em `/assets`; manutenção somente pelo criador. Não há integração financeira externa.

Motor puro Decimal.js 10.6.0 com 80 algarismos internos; regras, taxas, ordenação, limites e arredondamento em [CALCULATION_RULES](docs/finance/CALCULATION_RULES.md). Contratos e integridade em [STAGE_03_API](docs/architecture/STAGE_03_API.md). Relatório em [ETAPA_03_REPORT](docs/development/ETAPA_03_REPORT.md). `pnpm test` inclui regressões das etapas anteriores e PostgreSQL real; `pnpm test:browser` inclui duas compras, venda parcial, posição e dividendo recebido. Migração aditiva, aplicada automaticamente apenas ao banco descartável dos testes. Para seu banco identificado: gere cliente e execute `pnpm db:migrate` antes do dev.

Na Etapa 03 isolada, preço de mercado e resultado não realizado permaneciam indisponíveis; consulte abaixo a ampliação da Etapa 05. Histórico com evento societário não suportado deve ser sinalizado na interface: posições ficam bloqueadas até conciliação externa. Não há split/grupamento/bonificação/amortização, short, FX, impostos automáticos, importação, rentabilidade ou dashboard financeiro completo. Dashboard contábil foi acrescentado na Etapa 04.


## Dashboards — Etapa 04

`/dashboard` consolida somente suas carteiras, com seletor e período. `/portfolios/[id]` reúne visão contábil, posições, gráficos, histórico/proventos e as configurações existentes. Indicadores: custo das posições abertas, resultado realizado, proventos recebidos, ativos abertos, carteiras e registros. Cinco visualizações com ECharts 6.1.0/SVG sob demanda e alternativas tabulares exatas, estados vazios/incompletos e recuperação de falhas. Esses cinco gráficos continuam contábeis. Valorização pontual foi acrescentada separadamente na Etapa 05, sem previsões, benchmarks ou retorno histórico total.

O backend reutiliza o replay da Etapa 03 e lê um snapshot consistente; não houve migrations na Etapa 04; referências da Etapa 05 têm migration aditiva própria. Moedas são segmentadas, históricos incompletos tornam totais da moeda indisponíveis. Veja [definições dos indicadores](docs/finance/DASHBOARD_INDICATORS.md), [contrato de leitura](docs/architecture/STAGE_04_API.md) e [relatório verificável](docs/development/ETAPA_04_REPORT.md). `pnpm test` cobre indicadores e isolamento real em PostgreSQL; `pnpm test:browser` valida dashboards e captura screenshots privados em /tmp nas larguras 320/375/768/1024/1440, além das regressões 01–03.

O patch de tipos ECharts em patches/ é aplicado pelo pnpm e deve acompanhar o lockfile. Mantém as verificações strict/ESLint; não altera código executável da biblioteca. Não há serviço pago, deploy ou SaaS comercial. A Etapa 05 adiciona o adaptador de leitura descrito abaixo; a Etapa 06 não foi iniciada.


## Referências de preço — Etapa 05

No dashboard e na visão da carteira, a seção **Valorização estimada** mostra cobertura, preço/fonte/horário, valor estimado, resultado e variação não realizados. Resultados realizados e proventos permanecem separados. Totais incompletos são null; subtotal conhecido e ativos excluídos são identificados. Preço vencido não vira zero nem preço de custo. Gráficos contábeis continuam por custo; um gráfico separado mostra a distribuição do valor estimado por ativo somente com cobertura completa, com tabela exata. Não há câmbio, TWR/XIRR, benchmarks, previsões de dividendos ou eventos societários automáticos.

Abra **Gerenciar referências de preço**, escolha um ativo com posição própria, informe preço positivo e data/hora local da referência, fonte/motivo e confirme os dados. Referência manual é privada e não é cotação oficial; novas referências e invalidações preservam o histórico. TTL padrão 60 minutos também se aplica à validade manual. Para voltar à referência externa, invalide a manual ativa.

brapi plano gratuito: 15.000 requisições por ciclo, 1 ticker/chamada, 1 chamada simultânea, atualização a cada 30 minutos; não pressupomos cobertura de FIIs/ETFs/BDRs. Usa somente `/api/v2/stocks/quote` com Bearer no backend. Configure `BRAPI_API_TOKEN` somente no `.env` raiz; nunca `NEXT_PUBLIC_*`. Não crie assinatura paga. Sem token o sistema continua contábil e manual. A consulta pública de sandbox confirma contrato; não valida token/cobertura da conta.

**Bloqueio de uso de dados:** os termos proíbem redistribuição e não concedem expressamente o cache persistente multiusuário planejado. Mesmo com token, não habilite consumo antes de obter autorização escrita específica do fornecedor para persistência, apresentação e compartilhamento. Só então configure `BRAPI_DATA_USE_AUTHORIZED=true` e `BRAPI_TERMS_REFERENCE` com identificação da autorização (não o token). A configuração não concede direitos. AGPL licencia código, não dados. Veja [política e limites](docs/finance/MARKET_DATA_POLICY.md), [contrato da API](docs/architecture/STAGE_05_API.md) e [relatório](docs/development/ETAPA_05_REPORT.md).

`QUOTE_TTL_MINUTES=60`, `BRAPI_REQUEST_BUDGET=10000` (tentativas nos últimos 35 dias, sem reset mensal automático). GET/renderização não chama brapi. Botão explícito consulta um ticker, reutiliza cache válido e coordena processos no PostgreSQL. Timeout/cota/erros preservam contabilidade e preços antigos com recência explícita. O painel da brapi continua fonte da cota real.

Migration aditiva deve ser aplicada somente ao banco local **identificado e autorizado**, após conferir `DATABASE_URL`: `pnpm prisma:generate` e `pnpm db:migrate`. Os testes usam clusters descartáveis; a migration aditiva também foi aplicada ao valunium_dev local identificado, preservando os registros existentes. Nenhum reset ou dado financeiro de exemplo foi inserido nele. `pnpm dev` inicia os serviços; `pnpm test` inclui regressões e PostgreSQL real; `pnpm test:browser` usa fixtures sintéticas isoladas de fornecedor, sem consumir token pessoal.
