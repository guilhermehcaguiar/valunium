# API implementada — Etapa 02

Prefixo `/api/v1`. JSON de sucesso `{ data }`; erros sanitizados `{ error: { code, message }, requestId }`. CSRF e origem confiável são exigidos em todas as mutações. Cadastro e recuperação utilizam respostas genéricas para evitar enumeração. Payload com campo desconhecido é rejeitado.

| Método | Endpoint | Contrato |
|---|---|---|
| GET | `/health` | Vida do processo, público |
| GET | `/auth/csrf` | Inicializa sessão/retorna CSRF |
| POST | `/auth/register` | `{ name, email, password }`, 202 também para duplicado |
| POST | `/auth/login` | `{ email, password }`, retorna perfil e cookie regenerado |
| GET | `/auth/me` | Perfil autenticado |
| POST | `/auth/logout` | Destrói sessão e remove cookie |
| POST | `/auth/change-password` | `{ currentPassword, password }`, revoga todas as sessões |
| POST | `/auth/forgot-password` | `{ email }`, 202 genérico |
| POST | `/auth/reset-password` | `{ token, password }`, consumo único |
| GET | `/users/me` | Perfil próprio |
| PATCH | `/users/me` | Nome e preferências opcionais: `name`, `locale`, `timeZone` |
| GET | `/portfolios` | Carteiras próprias, incluindo arquivadas |
| POST | `/portfolios` | `{ name, description?, baseCurrency?: "BRL" }` |
| GET | `/portfolios/:id` | Detalhe próprio |
| PATCH | `/portfolios/:id` | `{ name?, description? }` |
| POST | `/portfolios/:id/primary` | Principal própria e ativa |
| POST | `/portfolios/:id/archive` | Arquiva e seleciona outra principal ativa, se houver |
| POST | `/portfolios/:id/restore` | Reativa; torna principal se nenhuma existir |

`locale`: `pt-BR` ou `en-US`; `timeZone`: `America/Sao_Paulo` ou `UTC`. São preferências persistidas; a interface ainda está em português. E-mail não é alterável por PATCH e nenhuma resposta inclui passwordHash/authVersion/tokens.

Propriedade vem exclusivamente da sessão validada. Recursos inexistentes e pertencentes a outro usuário retornam 404. Nome não vazio, descrição até 1000 caracteres, BRL somente. A primeira carteira ativa torna-se principal; existe no máximo uma principal por usuário, garantida por índice único parcial. Arquivada nunca é principal. Requisições concorrentes de lifecycle/primary são serializadas pelo registro do proprietário. Não há DELETE, compartilhamento ou eventos financeiros.

Web: `/login`, `/register`, `/forgot-password`, `/reset-password`; protegidas `/dashboard`, `/portfolios`, `/portfolios/new`, `/portfolios/[id]`, `/settings/profile`. O dashboard fornece navegação e contexto, sem gráficos ou saldos fictícios.
