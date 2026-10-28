# Relatório verificável — Etapa 02

Data: 27/10/2026. Escopo: autenticação, usuários e carteiras. Etapa 03 não iniciada.

## Auditoria inicial

Lidos AGENTS.md, README, relatório da Etapa 01, política financeira, segurança/privacidade, PRD, arquitetura, modelo de dados, convenções da API, ADR de open source, design e configurações implementadas. A base continha somente a fundação executável, sem autenticação/carteiras duplicadas a reutilizar. Schema e migration inicial inspecionados antes da alteração.

Git: árvore inicialmente limpa, HEAD `4d212d1ca08bcb803ec92bf83937c256b647be3a`. O Git passou a estar inicializado desde a etapa anterior. Foram usados apenas status/diff/rev-parse/show/ls-files para auditoria; nenhum commit, push, reset, alteração de histórico ou publicação.

Stack preservada: Node 24.21.0, pnpm 10.34.9, Next 16.4.3, React 19.3.1, Nest 11.2.8, TypeScript 6.0.3 strict, Prisma 7.10.1, Tailwind 4 e ESLint 9. Não houve reconstrução da fundação.

## Implementações

- Módulos Core (ambiente, banco, e-mail), Auth (Passport, guards, DTOs e sessão), Users e Portfolios.
- Cadastro, login/logout, consulta autenticada, perfil/preferências, alteração e recuperação/redefinição de senha.
- Carteiras por proprietário: criar, listar, detalhar, editar nome/descrição, BRL, principal, arquivar e reativar. Sem exclusão ou compartilhamento.
- Frontend com páginas públicas/privadas, sidebar/header responsivos, formulários e feedback, estados de loading/erro/vazio e navegação por teclado. Dashboard exclusivamente de contexto/navegação, sem gráficos/saldos fictícios. Marca textual provisória e tokens Obsidian + Gold preservados.
- Intermediário HTTP restrito no Next (`/api/*`), cookie na mesma origem, proteção de páginas no servidor e autorização independente no backend. Consulta de sessão deduplicada por renderização com React cache; nenhuma cache compartilhada de respostas privadas.
- Testes de integração PostgreSQL e jornada Chromium reproduzíveis por scripts do repositório. CI prepara PostgreSQL nativo, sem deploy/publicação.

## Autenticação e segurança

Estratégia única: Passport Local 1.0.0 / Passport 0.7.0 / @nestjs/passport 11.0.5 com express-session 1.19.0 e connect-pg-simple 10.0.0. Senhas com argon2 0.45.1, Argon2id (64 MiB, três iterações, paralelismo 1). pg 8.23.1; @nestjs/throttler 6.7.1; Nodemailer 10.2.1; Playwright 1.64.1 para runtime UI. Versões completas no lockfile.

Sessão opaca assinada e persistida no PostgreSQL; cookie host-only HttpOnly, SameSite=Lax, Path=/, Secure em produção. Expiração fixa em sete dias, regeneração no login, destruição no logout e versão de autenticação para revogar todas as sessões após mudança/reset de senha. Sem segredos de fallback, JWT ou armazenamento sensível em localStorage.

CSRF: cookie + sincronizador aleatório por sessão + header X-CSRF-Token + Origin explícito na allowlist, inclusive cadastro/login/logout/recuperação. Validação server-side de dados, rejeição de campos desconhecidos, normalização de e-mail/nome, limite JSON 16 KiB. Rate limiting real: 20/minuto por IP/handler sensível, 120/minuto para operações gerais/consulta de sessão/CSRF; HTTP 429 testado. Erros, logs e respostas não expõem hashes, tokens de recuperação, payloads ou mensagens internas de drivers.

Cadastro duplicado e recuperação de e-mail ausente retornam respostas genéricas. Login ausente também executa verificação Argon2 com hash de descarte. Token de recuperação: CSPRNG de 32 bytes, apenas SHA-256 no banco, 15 minutos, uso único transacional; novos pedidos substituem verificadores anteriores. Links usam fragmento, não query string, e o token é removido da barra de endereço e mantido apenas em memória.

E-mail por MailAdapter: caixa local privada fora do repositório, diretório 0700/arquivos 0600 sem endpoint de listagem e sem logs de links. SMTP próprio configurável por ambiente, TLS/certificados verificados, obrigatório em produção. O envio é desacoplado da resposta para reduzir enumeração e aguardado no encerramento normal.

Fluxo, decisões, referências e limites detalhados em [AUTHENTICATION](../security/AUTHENTICATION.md) e [ADR-0006](../decisions/ADR-0006-LOCAL-IDENTITY.md).

## Endpoints e telas

Contratos completos: [STAGE_02_API](../architecture/STAGE_02_API.md).

- Público: GET `/api/v1/health`, GET `/auth/csrf`; POST `/auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password` (mutações sempre com CSRF).
- Sessão/perfil: GET `/auth/me`, POST `/auth/logout`, POST `/auth/change-password`, GET/PATCH `/users/me`.
- Carteiras: GET/POST `/portfolios`, GET/PATCH `/portfolios/:id`, POST `/portfolios/:id/primary`, `/archive`, `/restore`.
- Prefixo de todos os endpoints acima: `/api/v1`.
- Páginas públicas: `/login`, `/register`, `/forgot-password`, `/reset-password`.
- Páginas privadas: `/dashboard`, `/portfolios`, `/portfolios/new`, `/portfolios/[id]`, `/settings/profile`.

Preferências persistidas: idioma (`pt-BR`/`en-US`) e fuso (`America/Sao_Paulo`/`UTC`); interface ainda em português. E-mail não é editável nesta etapa.

## Schema e migrations

Migration aditiva `20261027000200_identity_portfolios`, sem drop/reset ou alteração destrutiva da migration inicial. Novas tabelas User, Session, PasswordReset e Portfolio. UUIDs, timestamps, FK de proprietário, unicidade de e-mail e hash de recuperação, índices de validade/escopo e constraints: e-mail canônico, nomes não vazios, BRL, principal ativa e índice único parcial por proprietário. As constraints SQL adicionais devem ser preservadas em migrations futuras.

As operações de lifecycle/primary bloqueiam o registro do proprietário em transação, evitando duas principais sob concorrência. Toda consulta/mutação de carteira contém o proprietário autenticado; não basta verificar a propriedade no frontend.

O schema conceitual original e seus relacionamentos/Decimal foram preservados sem alteração. Modelos financeiros continuam fora do executável. O cliente Prisma passa a ser gerado como CJS em `apps/api/src/generated/prisma`, ignorado pelo Git, para uso nativo no backend Nest compilado. Build/dev/typecheck/test geram o cliente antes de usá-lo.

Ambos os pools fixam `timezone=UTC` por conexão; nenhuma configuração global foi alterada. A primeira rodada encontrou diferença de três horas ao forçar expiração pelo Prisma em cluster com timezone local; a correção foi verificada também por consulta SQL de expiração antes da requisição HTTP. Session.expire usa timestamptz.

## Resultados finais

| Comando/verificação | Estado | Evidência |
|---|---|---|
| `pnpm install` / `pnpm install --frozen-lockfile` | PASS | Dependências e lockfile consistentes |
| `pnpm lint` | PASS | Zero erros/warnings; sem desabilitar regras de qualidade |
| `pnpm typecheck` | PASS | Quatro workspaces e scripts/configuração; strict preservado |
| `pnpm build` | PASS | API, pacotes e todas as páginas App Router |
| `pnpm test` | PASS | 13 testes da fundação + 14 integrações = 27 aprovados |
| `pnpm test:integration` | PASS | PostgreSQL 18.6 nativo novo e isolado, sem mocks de dados |
| `pnpm prisma:validate` | PASS | Schema válido |
| `pnpm prisma:generate` | PASS | Cliente 7.10.1 gerado |
| `pnpm db:migrate` pelo runner | PASS | Ambas as migrations aplicadas a novos bancos descartáveis |
| `pnpm test:browser` | PASS | Chromium real com dois contextos isolados |
| Cadastro → login → carteira → consulta → logout | PASS | Executado por HTTP e pela interface |
| Isolamento entre dois usuários | PASS | Listas próprias e 404 para operações sobre carteira alheia |
| Expiração/revogação/logout/replay | PASS | Banco e HTTP reais |
| Tokens expirados/reutilizados/simultâneos | PASS | Token válido tem um único sucesso sob concorrência |
| CSRF e origem não confiável | PASS | Rejeição 403; caminho válido também testado |
| Rate limit | PASS | 429 real com excesso de solicitações |
| Cookie HttpOnly/SameSite/persistência | PASS | Headers HTTP e novo navegador/página na mesma sessão |
| UI mobile/teclado/erros JavaScript | PASS | Largura 390 px sem overflow, skip link focável e zero pageerror |
| `pnpm audit --json` | PASS | Zero vulnerabilidades conhecidas, todas as severidades |
| `git diff --check` / docs | PASS | Sem erros de whitespace; verificador documental aprovado |
| SMTP real externo / entrega em caixa externa | NOT RUN | Nenhum provedor real/credencial usado |
| HTTPS real de produção | NOT RUN | Runtime local via HTTP; Secure está condicionado à configuração de produção |
| Workflow remoto do GitHub | NOT RUN | Nenhuma publicação/push autorizado ou executado |
| Auditoria WCAG completa / pentest independente | NOT RUN | Apenas verificações funcionais e de acessibilidade básica |

Não há FAIL crítico conhecido nos gates locais. Falhas intermediárias de timezone/expiração e limite excessivo na consulta de sessão foram corrigidas e os testes repetidos. ESLint foi alinhado às opções reais de decorators/metadata do compilador, para reconhecer imports necessários à injeção Nest; strict, skipLibCheck=false, regras de any, validação e assertions não foram relaxados.

## Evidências de isolamento

Em PostgreSQL real, dois usuários criaram carteiras próprias. Cada lista retornou apenas seu registro. O usuário B recebeu 404 ao consultar, editar, arquivar, reativar e tornar principal a carteira do A; o registro original permaneceu com o mesmo proprietário/nome/estado. Payload com ownerId externo recebeu 400. Perfil B não mudou após atualizar perfil A. Concorrência de principal terminou com exatamente uma principal por proprietário no banco.

Em Chromium, contextos/cookies separados registraram e autenticaram dois usuários, criaram carteiras e confirmaram listas isoladas. Acesso à carteira alheia pela tela exibiu erro sem dados; mutações pelo BFF também receberam 404. Página privada anônima e após logout redirecionou a login. Recuperação pela UI leu apenas a caixa local privada, redefiniu a senha e autenticou com a nova senha. Nenhum token foi colocado no localStorage ou query.

O runner não usa DATABASE_URL externa para escolher seu destino: cria um novo diretório 0700 em /tmp, inicia cluster próprio com TCP desabilitado, cria `valunium_stage02_disposable` e executa migrations/testes somente ali. Testes conferem que DATABASE_URL é igual a INTEGRATION_DATABASE_URL. Clusters e processos temporários foram encerrados normalmente. Artefatos privados em /tmp permanecem para inspeção local, sem incorporação ao Git.

## Pendências e limites

- Nenhum bloqueio técnico local para o critério de aceite da Etapa 02.
- SMTP externo e HTTPS real de produção não foram exercitados; não se declara serviço pronto/hospedado.
- Entrega de e-mail em background não é fila durável para queda abrupta. Limites são por processo/IP; com BFF, o limite é conservadoramente compartilhado pelo intermediário. Antes de hospedagem pública, revisar identificação de cliente/proxies, limites distribuídos e reentrega.
- Verificação de posse de e-mail e MFA permanecem decisões futuras, fora do pedido. Não foram criados eventos financeiros ou acesso a contas externas.
- Preferência de idioma é persistida, sem tradução integral da interface nesta etapa.
- ESLint 9 é mantido por requisito do projeto, apesar do aviso upstream de fim de suporte. Audit atual sem avisos conhecidos; não é garantia permanente.
- Logo vetorial e política de marca seguem pendentes; somente marca textual provisória.
- AGENTS.md, licença AGPL-3.0-only, contribuições, SECURITY, CODE_OF_CONDUCT e schema documental preservados. Sem Docker, Prettier, SaaS/billing, deploy, releases, publicação ou Etapa 03.

## Executar localmente

Configure banco de desenvolvimento identificado, SESSION_SECRET aleatório e origens conforme README. Exemplos seguros em .env.example e apps/web/.env.example.

```bash
pnpm install
pnpm prisma:validate
pnpm prisma:generate
pnpm db:migrate
pnpm dev
```

`http://localhost:3000/login`. Cadastro não autentica automaticamente. Para testes completos: `pnpm test`; para interface: `pnpm exec playwright install chromium` e `pnpm test:browser`. Native PostgreSQL é obrigatório para integração; não há skip silencioso quando falta o ambiente.

## Arquivos modificados

- `.env.example`
- `.github/workflows/ci.yml`
- `.gitignore`
- `README.md`
- `apps/api/README.md`
- `apps/api/package.json`
- `apps/api/src/app.module.ts`
- `apps/api/src/application.ts`
- `apps/api/src/config/environment.ts`
- `apps/api/test/health.test.cjs`
- `apps/web/.env.example`
- `apps/web/README.md`
- `apps/web/src/app/page.tsx`
- `apps/web/test/page.test.tsx`
- `docs/architecture/DATA_MODEL.md`
- `docs/decisions/OPEN_DECISIONS.md`
- `eslint.config.mjs`
- `infra/prisma/schema.prisma`
- `package.json`
- `packages/shared/src/index.ts`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `scripts/check-database.ts`
- `turbo.json`

## Arquivos criados

- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/auth.module.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/dto.ts`
- `apps/api/src/auth/guards.ts`
- `apps/api/src/auth/types.ts`
- `apps/api/src/core/core.module.ts`
- `apps/api/src/core/database.ts`
- `apps/api/src/core/environment.token.ts`
- `apps/api/src/core/mail.ts`
- `apps/api/src/portfolios/dto.ts`
- `apps/api/src/portfolios/portfolios.controller.ts`
- `apps/api/src/portfolios/portfolios.module.ts`
- `apps/api/src/portfolios/portfolios.service.ts`
- `apps/api/src/users/users.controller.ts`
- `apps/api/test/integration/identity.cjs`
- `apps/web/src/app/(private)/dashboard/page.tsx`
- `apps/web/src/app/(private)/layout.tsx`
- `apps/web/src/app/(private)/portfolios/[id]/page.tsx`
- `apps/web/src/app/(private)/portfolios/new/page.tsx`
- `apps/web/src/app/(private)/portfolios/page.tsx`
- `apps/web/src/app/(private)/settings/profile/page.tsx`
- `apps/web/src/app/(public)/forgot-password/page.tsx`
- `apps/web/src/app/(public)/login/page.tsx`
- `apps/web/src/app/(public)/register/page.tsx`
- `apps/web/src/app/(public)/reset-password/page.tsx`
- `apps/web/src/app/api/[...path]/route.ts`
- `apps/web/src/components/auth-form.tsx`
- `apps/web/src/components/form-ui.tsx`
- `apps/web/src/components/portfolios.tsx`
- `apps/web/src/components/private-shell.tsx`
- `apps/web/src/components/profile.tsx`
- `apps/web/src/lib/client-api.ts`
- `apps/web/src/lib/server-api.ts`
- `docs/architecture/STAGE_02_API.md`
- `docs/decisions/ADR-0006-LOCAL-IDENTITY.md`
- `docs/development/ETAPA_02_REPORT.md`
- `docs/security/AUTHENTICATION.md`
- `infra/prisma/migrations/20261027000200_identity_portfolios/migration.sql`
- `scripts/test-browser.mjs`
- `scripts/test-integration.mjs`

Artefatos gerados (`dist`, `.next`, cliente Prisma, caches e screenshots locais) não estão incluídos na fonte a versionar. Consulte git status/diff para revisão humana; nenhuma alteração foi adicionada ao índice por agente.

## Mensagem sugerida

`feat(auth): implementar sessões seguras, perfil e carteiras isoladas por usuário`

Mensagem apenas sugerida. Nenhum commit executado.
