# Valunium

Plataforma open source de acompanhamento e inteligência patrimonial. Gratuita nesta fase, desenvolvida para colaboração, uso independente e portfólio técnico.

**Estado: Etapa 01 — fundação técnica.** Web provisória e API de saúde implementadas. Autenticação, usuários, carteiras, registros históricos, cotações e dashboard pertencem às próximas etapas. Não há serviço hospedado.

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
apps/web/                 Next.js, página provisória e componentes de base
apps/api/                 NestJS modular; GET /api/v1/health
packages/shared/          Contratos e validações independentes
packages/financial-core/  Strings decimais exatas, sem cálculos de investimento
infra/prisma/             Schema técnico, cliente gerado ignorado, migrations
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
pnpm dev
```

Web: `http://localhost:3000`. API: `http://127.0.0.1:3001/api/v1/health`. O comando `pnpm dev` prepara as dependências compartilhadas e inicia ambos os aplicativos. A web pode ser iniciada separadamente com `pnpm --filter @valunium/web dev`; a API, com `pnpm --filter @valunium/api dev`, após `pnpm build` ou o preparo dos pacotes compartilhados.

Web e health funcionam **sem banco**. Health é uma verificação de vida do processo, sem verificação de prontidão do banco. Nenhum dado privado é exposto. Swagger foi adiado: há apenas uma rota pública estática, cujo contrato está abaixo.

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
| `NEXT_PUBLIC_API_URL` | `apps/web/.env.local` | Origem pública da API, padrão `http://localhost:3001` |

A API carrega `.env` da raiz via Node. Next carrega seu próprio `.env.local`. Somente valores públicos recebem `NEXT_PUBLIC_`. Não reutilize `PORT` para a web. Em produção/testes, CORS sem configuração não autoriza nenhuma origem; em desenvolvimento, o padrão é `http://localhost:3000`. CORS não substitui autenticação/autorização, que serão implementadas na Etapa 02. Não coloque segredos no frontend nem nos logs.

## PostgreSQL nativo — Arch Linux / Omarchy

Instale explicitamente, se necessário: `sudo pacman -S postgresql`. Use um cluster existente somente após identificar seus dados e privilégios. Não reinicialize `/var/lib/postgres/data` nem altere `pg_hba.conf` de um serviço existente para fazer o projeto funcionar.

Para um ambiente **novo e isolado**, sob seu próprio usuário, siga [o procedimento local](docs/development/POSTGRESQL.md). Configure `DATABASE_URL` e então:

```bash
pnpm prisma:generate
pnpm db:migrate
pnpm db:status
pnpm db:check
```

`db:migrate` aplica migrations versionadas ao destino indicado: confira a URL antes de executar. Não há reset automático, seed com dados reais ou criação automática de banco desconhecido. O schema ativo contém somente metadados técnicos. O rascunho original com relacionamentos/índices e `Decimal(38,12)` foi preservado em [schema.conceptual.prisma](docs/architecture/schema.conceptual.prisma); não é migrado. Identidade/isolamento serão revisados na Etapa 02; ledger e regras de integridade na Etapa 03.

## Comandos e qualidade

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm prisma:validate
pnpm prisma:generate
pnpm docs:check
```

`build` compila todos os pacotes e apps; `test` prepara builds e executa testes reais da API por HTTP, validação de ambiente/CORS, renderização da web, contratos e limites decimais. A CI executa esses gates, sem deploy, publicação ou banco de produção. Execute build e typecheck em sequência: ambos geram arquivos em `.next/types`. O build usa webpack explicitamente e não baixa fontes remotas. A fonte Inter é preferida quando instalada, com fallback do sistema.

Após build, em terminais separados:

```bash
pnpm --filter @valunium/api start
pnpm --filter @valunium/web start
curl --fail http://127.0.0.1:3001/api/v1/health
curl --fail http://localhost:3000/
```

## Design e roadmap

Obsidian + Gold, com tokens centralizados em `apps/web/src/app/globals.css`. A marca textual é provisória. O conceito Aureus A1 Clássico está aprovado como direção; o vetor final segue pendente.

1. Etapa 01: fundação técnica (esta entrega).
2. Etapa 02: autenticação, usuários, carteiras, autorização e preparo público.
3. Etapa 03: registros históricos internos e cálculos determinísticos.
4. Etapa 04: dashboard patrimonial.

Etapas futuras exigem autorização própria. SaaS, billing, cloud e execução financeira não fazem parte desta entrega. Leia [o roadmap](docs/product/ROADMAP.md), [a arquitetura](docs/architecture/ARCHITECTURE.md) e [o relatório verificável](docs/development/ETAPA_01_REPORT.md).

## Licença e contribuição

Código sob **GNU AGPLv3 — SPDX `AGPL-3.0-only`**, com [texto integral em LICENSE](LICENSE), obtido de [GNU](https://www.gnu.org/licenses/agpl-3.0.txt) sem alteração. Veja [a verificação](docs/development/LICENSE_VERIFICATION.md). Dependências mantêm suas próprias licenças; o lockfile não muda seus termos.

As contribuições seguem a licença do projeto, sem CLA obrigatório ou cessão integral. Consulte [CONTRIBUTING](CONTRIBUTING.md), [SECURITY](SECURITY.md), [CODE_OF_CONDUCT](CODE_OF_CONDUCT.md) e [AGENTS](AGENTS.md). Não envie dados patrimoniais reais, extratos ou credenciais. Nome e identidade visual terão política de marca separada; não há alegação de registro no INPI. Antes de beta público, permanecem os gates de segurança, isolamento e privacidade das etapas correspondentes.
