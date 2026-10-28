# Autenticação e autorização — Etapa 02

Estratégia única: **Passport Local + express-session**, store **connect-pg-simple no PostgreSQL**, Prisma para identidade/perfil/carteiras e Argon2id para senhas. Não há JWT, localStorage, login social ou dependência de serviço pago.

## Fluxo

1. `GET /api/v1/auth/csrf` cria uma sessão anônima e retorna um token CSRF sincronizador de 256 bits.
2. Mutações exigem cookie + header `X-CSRF-Token` e `Origin` exatamente presente em `CORS_ORIGINS`. JSON é limitado a 16 KiB. Não há exceção CSRF para cadastro/login/recuperação/logout.
3. Cadastro retorna a mesma resposta 202 para criação e e-mail já existente; não autentica automaticamente. Nome é aparado, e-mail é aparado e convertido para minúsculas; senhas não são normalizadas. A constraint SQL reforça a normalização do e-mail.
4. Passport valida a credencial. Usuário ausente também executa Argon2 para reduzir diferença de tempo. Credenciais incorretas recebem 401 genérico.
5. Login regenera a sessão (fixation), grava somente identidade/versão de autenticação e novo token CSRF no servidor. O cookie contém o ID opaco assinado pela biblioteca.
6. Toda rota privada consulta o usuário no banco e compara a versão de autenticação. Não confia em IDs de usuário do cliente. Logout destrói o registro; alteração/redefinição de senha incrementa a versão e invalida todas as sessões anteriores.

## Cookie, expiração e origem

Cookie host-only `valunium.sid`, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` obrigatório em produção. Validade de sete dias, sem renovação deslizante: `rolling=false`, `disableTouch=true`. O store tem pruning periódico de sessões expiradas. Ambos os pools usam `timezone=UTC` por conexão, sem alterar configurações globais do PostgreSQL. `expire` usa timestamptz para evitar ambiguidades entre Prisma, pg e o timezone do PostgreSQL.

A web usa BFF restrito em `/api/*`: o navegador acessa sua própria origem, recebe cookies HttpOnly e nunca recebe `API_INTERNAL_URL`/credenciais de banco. O BFF permite somente os endpoints desta etapa, não aceita query strings ou redirects, filtra cookies e repassa Origin/CSRF. Cada página privada e o layout verificam a sessão no backend; endpoints continuam protegidos independentemente da interface. Preferências e dados privados não usam cache compartilhado.

Em produção a API confia em proxy somente de loopback para reconhecer HTTPS encerrado pelo Next/proxy local. O BFF define `X-Forwarded-Proto` a partir do protocolo da requisição, sem aceitar esse valor do cliente. Uma topologia futura diferente exige revisão explícita de proxies confiáveis; não habilitar `trust proxy=true` indiscriminadamente. `WEB_ORIGIN` da web/API e `CORS_ORIGINS` devem corresponder. HTTP fica limitado ao desenvolvimento local.

## Senhas e recuperação

Argon2id: memória 64 MiB, três iterações, paralelismo 1; salt aleatório da biblioteca. Senhas: 12 a 128 caracteres, sem truncamento ou regras artificiais de composição. Hashes nunca constam em respostas.

Recuperação retorna 202 genérico, inclusive para e-mails ausentes, com piso de 200 ms e envio desacoplado da resposta. Isso reduz canais de enumeração, mas não promete tempo perfeitamente constante sob carga. Token CSPRNG de 32 bytes, apenas SHA-256 armazenado, expiração de 15 minutos. Novo pedido substitui os verificadores antigos. Consumo e alteração de senha são transacionais/serializados por usuário; tentativas simultâneas de reutilização permitem um único sucesso. Troca de senha autenticada requer a senha atual e também elimina verificadores pendentes.

O link carrega o token no **fragmento** `/reset-password#token=...`, ausente de requisições HTTP e access logs. A tela retira o fragmento do endereço e mantém o token somente em memória até enviar o POST. Não recarregue a página depois de abrir o link: será necessário abri-lo novamente. Não há token em query, cookie de recuperação ou localStorage.

## E-mail

`MailAdapter` separa entrega e domínio. Desenvolvimento/testes: `LocalMailAdapter`, com diretório absoluto fora do repositório, pertencente ao usuário, 0700; mensagens criadas com `wx` e 0600. Não existe endpoint para listar mensagens e nenhum link/token é impresso em logs. Por padrão: `/tmp/valunium-mail-<uid>`. A leitura local é manual, sob o próprio usuário. Mensagens antigas são removidas oportunisticamente na próxima entrega após 15 minutos; a validade efetiva é sempre imposta no banco. Remova arquivos locais quando não forem mais necessários.

`SmtpMailAdapter` aceita SMTP próprio/gratuito por ambiente, exige TLS com validação de certificado, não usa logs SMTP e não é executado nos testes. `SMTP_URL` e `SMTP_FROM` são obrigatórios em produção; o adaptador local é proibido nesse ambiente. Falhas de entrega geram apenas aviso estático, sem e-mail, link ou erro do driver. O envio em background é aguardado no encerramento normal; não é uma fila durável para falhas abruptas. Antes de hospedagem, implementar/revisar reentrega operacional conforme necessidade, sem expor tokens.

## Rate limiting e limites

Nest Throttler: 120 requisições/minuto por IP e handler, com 20/minuto em endpoints sensíveis de autenticação; bootstrap CSRF e consulta de sessão mantêm 120/minuto. 429 é testado. O store de limites é em memória por processo. Com BFF, clientes compartilham conservadoramente o IP do intermediário; produção com múltiplos processos ou volume público exige estratégia distribuída e identificação confiável do cliente. Não se confia em `X-Forwarded-For` arbitrário para aumentar limites.

Nenhuma mensagem/log de exceção inclui payloads, headers, URL de banco, senha, hash ou token. As respostas seguem o envelope da API. Cadastro não verifica posse de e-mail nesta etapa; MFA/verificação de e-mail e operação pública exigem avaliação futura. Não há dados financeiros, conectores, exclusão de usuários/carteiras ou compartilhamento.

## Referências de implementação

- https://docs.nestjs.com/recipes/passport
- https://expressjs.com/en/resources/middleware/session/
- https://github.com/voxpelli/node-connect-pg-simple
- https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
