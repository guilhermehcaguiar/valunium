# PostgreSQL nativo e isolado

Pré-requisitos: PostgreSQL instalado (`sudo pacman -S postgresql` no Arch), usuário comum (não root), Node 24 e dependências do projeto. Não exige alterações no serviço PostgreSQL global nem na configuração do desktop Omarchy.

## Cluster descartável para validação

Execute sob seu próprio usuário. `mktemp` cria um diretório novo: nunca substitua por um diretório com dados existentes. A autenticação `trust` abaixo fica limitada ao socket privado de diretório com permissão 0700; TCP é desabilitado.

```bash
VALUNIUM_PG_DIR=$(mktemp -d /tmp/valunium-pg-XXXXXX)
chmod 700 "$VALUNIUM_PG_DIR"
initdb -D "$VALUNIUM_PG_DIR/data" --auth-local=trust --auth-host=reject --no-locale --encoding=UTF8
pg_ctl -D "$VALUNIUM_PG_DIR/data" -l "$VALUNIUM_PG_DIR/postgres.log" -o "-k $VALUNIUM_PG_DIR -p 55439 -c listen_addresses=''" -w start
createdb -h "$VALUNIUM_PG_DIR" -p 55439 valunium_stage01_disposable
export DATABASE_URL="postgresql://$(id -un)@localhost:55439/valunium_stage01_disposable?host=$VALUNIUM_PG_DIR"
pnpm prisma:generate
pnpm db:migrate
pnpm db:status
pnpm db:check
pg_ctl -D "$VALUNIUM_PG_DIR/data" -m fast -w stop
unset DATABASE_URL
```

A pasta pode ser removida manualmente após parar o cluster e conferir o caminho. Não há script de reset contra uma URL fornecida pelo usuário. Em falha, interrompa o cluster explicitamente e investigue o log local; não publique logs contendo credenciais.

## Desenvolvimento persistente

Pode-se usar o mesmo procedimento com diretório dedicado privado e banco de desenvolvimento; escolha uma porta/socket livre e ajuste a URL. A aplicação web e a API de saúde não precisam de PostgreSQL ativo. Se usar TCP em um cluster persistente, mantenha-o em loopback, use autenticação SCRAM e credenciais próprias em `.env`, sem mudar configurações globais de um cluster desconhecido. Administre papéis/permissões de acordo com o ambiente.

## Migrations

O schema ativo não inclui os modelos de domínio ainda propostos. A migration inicial cria apenas `FoundationMetadata`. A versão conceitual original permanece preservada e contém valores `Decimal(38,12)` e índices de escopo. Não fornece autorização multiusuário: nenhuma rota de dados pessoais existe nesta etapa.

Para uma alteração aprovada futura, revise o schema e gere a migration em banco descartável com `pnpm exec prisma migrate dev --name nome_descritivo`; inspecione o SQL antes de versionar. `migrate deploy` não gera migrations nem faz reset. Nunca use `migrate reset` contra dados reais. Recuperação de ambiente com dados exige backup/restauração validada; não se promete rollback automático de SQL.

Produção futura usará PostgreSQL gerenciado com credenciais/ambientes separados; nenhuma infraestrutura de produção é provisionada nesta fase.
