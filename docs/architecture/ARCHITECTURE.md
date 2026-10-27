# Arquitetura de referência
## Decisão principal
**Monorepo TypeScript; monólito modular** com Next.js (web), NestJS (API), PostgreSQL (dados), Prisma (ORM) e `packages/financial-core` livre de I/O. Sem microserviços prematuros.

```text
Browser/PWA --> Next.js Web --> NestJS API --> PostgreSQL
                                 |                                        |        --> Adapter de Cotações (READ-ONLY)
                                 --> Financial Core (funções puras)
                                 --> Job assíncrono (fase posterior)
```

## Limites dos módulos
- Identity: autenticação, sessão e auditoria de sessão.
- Portfolio: carteira, proprietário e políticas de autorização.
- AssetCatalog: ativos, símbolos, ISIN e classes.
- TransactionLedger: lançamentos informativos, reconciliação e correção.
- FinancialCore: posições, custo, ganhos, snapshots reprodutíveis.
- Income: proventos recebidos e declarados.
- QuoteRead: adaptadores exclusivamente de consulta, proveniência e validade.
- Import: validação, deduplicação e lote transacional.
- Reporting: visão agregada e exportações autorizadas.

## Regras estruturais
1. API nunca confia em `userId` submetido pelo cliente.
2. Cada query de dados pessoais é limitada por autorização e portfolio membership.
3. Operações financeiras são fatos históricos armazenados internamente, não comando a corretora.
4. Fonte de verdade: eventos, não saldo editável.
5. `financial-core` não importa Prisma, rede, Next ou Nest.
6. Jobs idempotentes e eventos auditáveis.
7. Armazenar datas de ocorrência, registro e fonte separadamente.

## Escala inicial
Banco único com chaves e índices por proprietário/carteira; Redis/BullMQ só com justificativa. Backup e restores desde beta. Não guardar tokens de instituições financeiras no MVP.

## ADRs
Ver `docs/decisions/ADR-0001-MODULAR-MONOLITH.md`, `ADR-0002-READ-ONLY.md` e `ADR-0003-FINANCIAL-LEDGER.md`.
