# Segurança, proteção de dados e privacidade
## Controles mínimos
- Login gerenciado ou biblioteca madura; senhas nunca em claro; MFA futura.
- Sessões seguras, CSRF conforme arquitetura, cookies `HttpOnly`, `Secure`, `SameSite` adequados.
- Autorização no backend para cada recurso, não confiar em IDs enviados pelo frontend.
- Testes IDOR/tenant isolation em todos os endpoints por carteira.
- HTTPS em produção, segredo via vault/ambiente, rotação e nada em logs.
- Limite de requisições, proteção contra brute force e validação de payload.
- Backups criptografados com teste de restauração.
- Logs estruturados, requestId, minimização de PII.

## LGPD
Definir base legal, finalidade, minimização, retenção e processo de exclusão/exportação. Política de privacidade e termos requerem revisão antes do beta público. Evitar armazenar dados fiscais, bancários ou documentos desnecessários no MVP.

## Modelo de ameaça
- Acesso cruzado (IDOR): isolamento e testes.
- Vazamento de extratos: storage privado, URLs temporárias, expiração.
- CSV malicioso / CSV formula injection: saneamento de import/export.
- Injeção SQL: parâmetros/ORM, validação.
- Dados falsos de cotação: proveniência e stale state.
- Invasão de conta: MFA, alertas, revogação de sessões.
- Injeção de prompt (IA futura): nenhuma ferramenta de operação financeira.

## Aceite
Uma falha crítica ou alta conhecida bloqueia beta público. Proibir qualquer permissão de execução financeira mesmo se o usuário pedir.
