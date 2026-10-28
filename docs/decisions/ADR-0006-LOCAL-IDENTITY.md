# ADR-0006 — Identidade local e sessões no PostgreSQL

**Status: adotado na Etapa 02 — 27/10/2026.**

## Decisão

Passport Local integrado ao NestJS, express-session, store connect-pg-simple no PostgreSQL, Argon2id e Prisma. O servidor é a fonte de autorização; IDs de usuário não vêm do cliente. Cookie HttpOnly assinado, Secure em produção e SameSite Lax. Web e API usam BFF na mesma origem e CSRF sincronizador com validação de Origin para todas as mutações.

Recuperação usa verificadores SHA-256 de tokens aleatórios de 256 bits, validade de 15 minutos, consumo transacional único e invalidação global por versão de autenticação. Transporte de e-mail abstrato: caixa privada local em desenvolvimento e SMTP próprio com TLS configurável. Nenhuma conta comercial é obrigatória.

## Consequências

Sessões exigem PostgreSQL e SESSION_SECRET; não há JWT, fallback MemoryStore ou tokens no localStorage. A UI protege páginas por consulta ao backend e o backend repete a autorização em cada operação. Sessões duram sete dias sem renovação deslizante. Pools fixam timezone UTC por conexão.

O rascunho documental não é sobrescrito: o authSub conceitual foi substituído no schema executável pela identidade local aprovada para esta etapa. Login social, MFA e verificação de posse de e-mail não são implementados. Limites distribuídos, reentrega durável de e-mail, topologia de proxies e infraestrutura pública são decisões futuras, sem provisionamento nesta etapa.

Veja [AUTHENTICATION](../security/AUTHENTICATION.md) para fluxo, limites e referências oficiais, e [STAGE_02_API](../architecture/STAGE_02_API.md) para contratos.
