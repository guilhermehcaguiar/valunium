# ADR-0001: Monólito modular TypeScript
**Status:** proposta aceita para fundação.
## Contexto
MVP pessoal com perspectiva SaaS; equipe pequena, foco em precisão e custos.
## Decisão
Next.js + NestJS no monorepo, PostgreSQL, Prisma e pacote financeiro puro separado. Escala horizontal e serviços independentes não serão construídos sem necessidade.
## Consequências
Facilita testes e compartilhamento de tipos; requer limites de módulo, autorização e disciplina de migrations.
