# Contratos e convenções API — rascunho
Prefixo `/api/v1`, HTTPS, autenticação em todas as rotas de dados, timestamps ISO 8601 e cursor para paginação.

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/portfolios` | Listar carteiras do usuário |
| POST | `/portfolios` | Criar carteira **interna** |
| GET | `/portfolios/:id/positions` | Posições calculadas |
| GET | `/portfolios/:id/transactions` | Eventos internos |
| POST | `/portfolios/:id/transactions` | Registrar fato histórico **sem execução** |
| GET | `/portfolios/:id/income` | Proventos |
| POST | `/portfolios/:id/imports/preview` | Prévia de CSV |
| POST | `/portfolios/:id/imports/confirm` | Gravar eventos **internos** de lote |
| GET | `/assets/search` | Catálogo de ativos |
| GET | `/assets/:id/quotes` | Cotações read-only |

**Proibido:** qualquer endpoint que envie ordens ou realize movimentações financeiras. `POST` acima grava dados do próprio SaaS, não operações numa instituição financeira.

## Respostas
`{ data, meta? }` para sucesso; `{ error: { code, message, details? }, requestId }` para erro. Tipagem e validação de payload server-side; autorização por portfolio antes de ler/gravar.

## Idempotência
Importações com `idempotencyKey` ou fingerprint + escopo da carteira; repetição retorna resultado anterior ou conflito explícito, sem duplicar.
