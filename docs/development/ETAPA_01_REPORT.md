# Relatório verificável — Etapa 01

Data: 27/10/2026. Etapa 01 concluída no escopo técnico. Nenhuma Etapa 02 iniciada.

## Diagnóstico inicial

O diretório recuperado continha documentos, READMEs reservados, um rascunho Prisma e exemplos de ambiente. Não continha manifests, apps executáveis, workspaces, lockfile, testes ou CI. `AGENTS.md`, README, políticas, PRD, arquitetura, decisões, design, bootstrap, documentação financeira e schema foram lidos antes das alterações.

`git status --short`: **BLOCKED**, com `fatal: not a git repository`. Existe uma pasta `.git` que não constitui um repositório válido neste ambiente. Não foi inicializado Git, configurado remoto, feito commit/push/reset ou reescrita de histórico. O aviso correspondente do Turborepo não impediu as validações.

## Implementação e estrutura

```text
valunium/
├── apps/
│   ├── web/                 Next.js App Router, UI e testes React
│   └── api/                 NestJS, health, ambiente, filtro e testes HTTP
├── packages/
│   ├── shared/              Contratos e validação de origens
│   └── financial-core/      Strings decimais exatas e testes de limites
├── infra/prisma/
│   ├── schema.prisma        Metadados técnicos
│   └── migrations/          Migration inicial versionada
├── docs/                    Documentação aprovada e evidências desta etapa
├── scripts/                 Verificação documental e conexão PostgreSQL
├── .github/workflows/ci.yml
├── AGENTS.md
├── LICENSE
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
├── tsconfig.base.json
├── tsconfig.tools.json
├── eslint.config.mjs
└── README.md
```

- Workspaces com dependências declaradas e scripts reais de dev/build/typecheck/test; lint central com ESLint 9 e zero warnings permitido.
- TypeScript strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `skipLibCheck: false`; nenhuma checagem relaxada para obter PASS. `next typegen` antes do typecheck permite gerar tipos mesmo antes do primeiro build.
- Web provisória responsiva com tokens Obsidian + Gold, marca textual substituível, cards/shell, skip link, foco, loading, erro e 404. Sem fontes remotas, imagens externas, logo inventado ou dashboard.
- API modular com ambiente validado, prefixo/versionamento, ValidationPipe global, Helmet, payload JSON limitado, CORS por allowlist, requestId gerado no servidor, erros consistentes e logs sem corpo/headers/URLs/segredos. Swagger adiado por haver somente uma rota pública estática documentada.
- `shared`: contratos e normalização segura de origens HTTP(S). `financial-core`: validação/normalização exata de strings compatíveis com NUMERIC(38,12), sem float, arredondamento, I/O ou cálculos de investimento.
- CI apenas de qualidade, com permissões de leitura; sem deploy, publicação, releases ou serviços comerciais.

## Dependências efetivas

| Componente | Versão |
|---|---|
| Node.js validado | 24.21.0 |
| pnpm | 10.34.9 |
| Turborepo | 2.11.10 |
| Next.js | 16.4.3 |
| React / React DOM | 19.3.1 |
| Tailwind / plugin PostCSS | 4.3.3 |
| NestJS common/core/platform-express | 11.2.8 |
| TypeScript | 6.0.3 |
| ESLint / @eslint/js | 9.39.5 |
| typescript-eslint | 8.72.1 |
| Prisma / client / adapter-pg | 7.10.1 |
| PostgreSQL validado | 18.6 |
| TSX | 4.23.15 |
| concurrently | 9.2.5 |
| dotenv | 17.4.2 |
| Helmet | 8.3.0 |
| class-validator / class-transformer | 0.14.4 / 0.5.1 |
| reflect-metadata / RxJS | 0.2.2 / 7.8.2 |
| @types/node | 24.19.2 |
| @types/react / react-dom | 19.3.0 |
| @types/express | 5.0.6 |
| multer transitivo corrigido | 2.5.0 |

Manifests e `pnpm-lock.yaml` são a fonte das demais versões e checksums. As versões principais selecionadas são estáveis; a tag `latest` do Prisma indicava uma RC, explicitamente rejeitada. A primeira seleção TypeScript 5.9 não tinha tipos de plataforma exigidos pelo Next atual; foi corrigida para 6.0.3 com bibliotecas ES2024 e tipos Node explícitos.

## Validação executada

| Comando/verificação | Estado | Evidência |
|---|---|---|
| `pnpm install` | PASS | Cinco projetos; lockfile gerado |
| `pnpm install --frozen-lockfile` | PASS | Lockfile consistente; sem nova resolução |
| `pnpm lint` | PASS | Zero erros e warnings |
| `pnpm typecheck` | PASS | Quatro workspaces e configuração/scripts Prisma |
| `pnpm build` | PASS | Quatro workspaces; web estática e API compilada |
| `pnpm test` | PASS | 13 testes: API 6, web 3, shared 2, financial-core 2 |
| `pnpm prisma:validate` | PASS | Schema ativo válido |
| `pnpm prisma:generate` | PASS | Cliente 7.10.1 gerado, ignorado no Git |
| `pnpm db:migrate` | PASS | Migration inicial aplicada ao banco descartável |
| `pnpm db:status` | PASS | Schema atualizado |
| `pnpm db:check` | PASS | SELECT 1 e leitura de metadados via PrismaPg/PrismaClient |
| `pnpm docs:check` | PASS | Documentos básicos presentes |
| `pnpm dev` | PASS | Inicializou os quatro workspaces e os dois servidores |
| HTTP `/` web | PASS | 200 e conteúdo provisório esperado |
| HTTP página web inexistente | PASS | 404 |
| HTTP `/api/v1/health` | PASS | 200 público e contrato esperado |
| Headers HTTP / allowlist CORS | PASS | Testes de origem permitida/negada e headers de proteção |
| Erros 404/500 e logs | PASS | Mensagens sintéticas sensíveis não refletidas |
| `pnpm audit --json` final | PASS | Zero vulnerabilidades conhecidas em todas as severidades |
| `pnpm list -r --depth 0` | PASS | Dependências efetivas conferidas |
| AGPL íntegra / SPDX | PASS | Arquivo oficial comparado byte a byte e SHA-256 registrado |
| Busca de assinaturas comuns de segredo no código/docs | PASS | Sem ocorrência dos padrões pesquisados; não equivale a garantia universal |
| Busca de formatadores no lockfile/manifests | PASS | Sem Prettier, Biome ou dprint |
| Workflow no GitHub | NOT RUN | Sem repositório Git válido/publicação; workflow preparado |
| Auditoria visual em navegador / WCAG completa | NOT RUN | Renderização testada; não houve revisão visual automatizada ou certificação de acessibilidade |

Falhas intermediárias foram corrigidas: incompatibilidade de tipos Next/TS 5.9; limitação de subprocessos/sockets no sandbox; vulnerabilidade transitiva do multer; duplicação de declarações globais geradas pelo Next após dev/build, corrigida pela separação do diretório .next/dev no tsconfig de produção. Build, testes HTTP e PostgreSQL que exigiam sockets/subprocessos foram executados com permissão fora do sandbox. Execuções concorrentes encontraram o lock do Next e arquivos gerados transitórios; build, testes e typecheck finais foram feitos em sequência. Não executar next typegen/typecheck simultaneamente com um build que reescreve .next/types. Nenhum FAIL conhecido permanece nas verificações obrigatórias locais.

Os testes cobrem contrato/versionamento do health, ausência de rotas/métodos fora do escopo, CORS, ambiente inválido, sanitização de erros/logs, renderização do escopo provisório, loading acessível, URLs com credenciais e precisão/limites decimais. Não se declara validação dos casos financeiros ou isolamento de usuários futuros: esses módulos não existem nesta etapa.

## Prisma e PostgreSQL

O schema original foi preservado integralmente em `docs/architecture/schema.conceptual.prisma`, incluindo relacionamentos, índices por carteira e Decimal(38,12). Não foi aplicado automaticamente: contém identidade e eventos financeiros ainda dependentes das Etapas 02/03 e decisões abertas. A migration `20261027000100_foundation` cria somente `FoundationMetadata`.

O cliente é gerado em `infra/prisma/generated/client` e o CLI é configurado por `prisma.config.ts`. Validate/generate não exigem banco; comandos de conexão precisam de `DATABASE_URL`. O script de conexão omite mensagens de erro com URLs/segredos.

Validação feita exclusivamente em `valunium_stage01_disposable`, em cluster novo sob `/tmp/valunium-work/postgres`, socket privado, TCP desabilitado. Nenhuma configuração global foi alterada e nenhum banco desconhecido foi utilizado. Não houve reset, drop ou carga de dados financeiros. Os processos temporários foram encerrados após a validação; as pastas descartáveis em /tmp podem ser inspecionadas/removidas manualmente. Consulte `POSTGRESQL.md` para repetir em novo diretório.

## Licença, segurança e limites

`LICENSE` contém o texto integral da GNU AGPLv3 obtido da GNU por HTTPS, sem modificar termos. Os cinco manifests usam `AGPL-3.0-only`. Ver `LICENSE_VERIFICATION.md` para fonte, hash e conferência de licenças transitivas. Não há bloqueio por ausência de texto oficial. Contribuições seguem a licença do projeto, sem CLA obrigatório/cessão integral.

A auditoria encontrou inicialmente um aviso alto no multer 2.4.0 transitivo do Nest. Foi aplicado override restrito `@nestjs/platform-express>multer: 2.5.0`, conforme o advisory https://github.com/expressjs/multer/security/advisories/GHSA-q7qp-rjg7-q26m; nova auditoria retornou zero avisos. Manter/reavaliar o override quando o Nest atualizar sua árvore.

ESLint 9 foi mantido por requisito explícito, embora o registro npm emita aviso de fim de suporte dessa linha. A auditoria não apresentou vulnerabilidade conhecida; manutenção futura deve considerar essa restrição. O resultado do audit é um retrato da base consultada, não garantia permanente.

Não há auth, usuários, carteiras, dashboard, cálculos de investimento, integração financeira, SaaS, billing, cloud ou mecanismo de execução financeira. O logo vetorial e a política de marca seguem pendentes; não há alegação de registro no INPI. CORS é proteção de navegador, não autorização; backend/isolamento devem ser implementados antes de expor dados pessoais na Etapa 02.

AGENTS.md, SECURITY.md, CODE_OF_CONDUCT.md e decisões aprovadas foram preservados. O roadmap antigo foi alinhado à divisão definitiva de etapas, e os documentos de bootstrap/modelo de dados indicam o estado executável atual. Não há `docs/agents/` ou prompt no repositório. Não há Docker, Prettier ou outro formatador instalado no lockfile.

## Execução local

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
pnpm install
pnpm prisma:validate
pnpm prisma:generate
pnpm dev
```

Web: http://localhost:3000. Health: http://127.0.0.1:3001/api/v1/health. Banco não é necessário para esses dois serviços. Para validar banco, use `POSTGRESQL.md` e então `pnpm db:migrate`, `pnpm db:status`, `pnpm db:check` com `DATABASE_URL` descartável identificada. Nunca reaproveite credenciais reais nos exemplos.

## Arquivos alterados

- `.env.example`
- `.gitignore`
- `README.md`
- `CONTRIBUTING.md`
- `apps/web/README.md`
- `apps/api/README.md`
- `packages/shared/README.md`
- `packages/financial-core/README.md`
- `infra/prisma/schema.prisma`
- `docs/architecture/DATA_MODEL.md`
- `docs/development/BOOTSTRAP.md`
- `docs/product/ROADMAP.md`

## Arquivos criados

- `.github/workflows/ci.yml`
- `.node-version`
- `.npmrc`
- `LICENSE`
- `apps/api/package.json`
- `apps/api/src/app.module.ts`
- `apps/api/src/application.ts`
- `apps/api/src/common/http-exception.filter.ts`
- `apps/api/src/config/environment.ts`
- `apps/api/src/health/health.controller.ts`
- `apps/api/src/health/health.module.ts`
- `apps/api/src/main.ts`
- `apps/api/test/health.test.cjs`
- `apps/api/tsconfig.json`
- `apps/web/.env.example`
- `apps/web/next-env.d.ts`
- `apps/web/next.config.ts`
- `apps/web/package.json`
- `apps/web/postcss.config.mjs`
- `apps/web/src/app/error.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/loading.tsx`
- `apps/web/src/app/not-found.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/components/ui.tsx`
- `apps/web/src/config/environment.ts`
- `apps/web/test/page.test.tsx`
- `apps/web/tsconfig.json`
- `docs/architecture/schema.conceptual.prisma`
- `docs/development/LICENSE_VERIFICATION.md`
- `docs/development/POSTGRESQL.md`
- `eslint.config.mjs`
- `infra/prisma/migrations/20261027000100_foundation/migration.sql`
- `infra/prisma/migrations/migration_lock.toml`
- `package.json`
- `packages/financial-core/package.json`
- `packages/financial-core/src/index.ts`
- `packages/financial-core/test/decimal.test.cjs`
- `packages/financial-core/tsconfig.json`
- `packages/shared/package.json`
- `packages/shared/src/index.ts`
- `packages/shared/test/origin.test.cjs`
- `packages/shared/tsconfig.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `prisma.config.ts`
- `scripts/check-database.ts`
- `tsconfig.base.json`
- `tsconfig.tools.json`
- `turbo.json`
- `docs/development/ETAPA_01_REPORT.md` (este relatório)

Cliente Prisma gerado, dist, .next, caches e arquivos de log são artefatos locais ignorados, não fontes a publicar. Como não há Git válido, a classificação acima resulta da comparação com o inventário documental inicial, sem alegar um git diff disponível.

## Mensagem sugerida de Conventional Commit

`feat(fundacao): reconstruir monorepo open source com Next, Nest e Prisma`

Mensagem apenas sugerida. Nenhum commit executado.
