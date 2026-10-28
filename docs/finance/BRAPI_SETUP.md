# brapi — configuração segura e operação manual

## Estado e modos

O token da instância foi encontrado e validado sem ser exibido/alterado. A auditoria real não persistiu preços, não alimentou o dashboard e não ligou nenhuma flag. [Matriz documental](MARKET_PERMISSIONS.md), [cobertura](BRAPI_COVERAGE.md) e [minuta de contato](BRAPI_CONTACT_DRAFT.md).

| Modo | Preço externo | Persistência | Compartilhamento | Estado |
|---|---|---|---|---|
| disabled | Nenhum | Nenhuma | Não | Padrão; contabilidade e manual funcionam |
| personal-memory | Conta vinculada ao dono da chave | Somente RAM, remoção ao vencer TTL/desligar processo | Proibido | Perfil documental revisado; só local/loopback, sem produção |
| shared-postgres | Nenhum em operação real | Bloqueada | Bloqueado | WAITING_FOR_PROVIDER; referência livre/flag não libera |
| Fixtures | Valores sintéticos | Banco descartável identificado | Só teste | Exige provedor substituído no código; não ativável por variável de produção |

`QUOTE_TTL_MINUTES` controla validade e retenção em memória no modo pessoal: 30–60 min, padrão 60. A cotação pode ser considerada vencida antes disso se seu horário efetivo for antigo. O teto é uma decisão conservadora do Valunium, não prazo de licença atribuído à brapi. Preços externos não são gravados em MarketQuote neste modo. Metadados de tentativas/lease/cooldown continuam no PostgreSQL para proteger a cota, sem preço, token ou usuário.

## Ativar o modo pessoal local

Não use a chave de outra pessoa. O responsável deve confirmar que a conta Valunium e a chave brapi pertencem ao mesmo titular e que se trata de acompanhamento pessoal local. A base revisada está na matriz, incluindo limitações, fontes e diferença entre dado do fornecedor e código AGPL. Não usar este modo para SaaS, usuários terceiros ou publicação de dados.

1. Caso não haja chave: criar manualmente conta gratuita em [brapi.dev/login](https://brapi.dev/login), escolher Gratuito/sem cartão, copiar chave no [dashboard](https://brapi.dev/dashboard). Não criar assinatura paga. A documentação brapi usa o nome BRAPI_API_KEY; o Valunium usa BRAPI_API_TOKEN para enviar o mesmo header Bearer, sem duplicar a chave. Neste ambiente o token já está presente: preserve-o.
2. Entrar na conta própria do Valunium usando http://localhost:3000. Obter o ID da própria conta com o GET autenticado `/api/auth/me` (campo `data.id`). No console do navegador local, `fetch('/api/auth/me').then(r=>r.json()).then(b=>b.data.id)` retorna só seu UUID. Isso não substitui autorização do backend.
3. No `.env` raiz, manter o token existente e configurar explicitamente os campos abaixo. Não colocar nenhuma dessas credenciais em NEXT_PUBLIC_*, URL ou código versionado.

```dotenv
# BRAPI_API_TOKEN já configurado: não substituir nem publicar.
BRAPI_PROVIDER_ENABLED=true
BRAPI_MODE=personal-memory
BRAPI_PERSONAL_USER_ID=UUID_DA_SUA_PROPRIA_CONTA
BRAPI_DATA_USE_AUTHORIZED=true
BRAPI_TERMS_REFERENCE=brapi-personal-local-2026-10-28
QUOTE_TTL_MINUTES=60
BRAPI_REQUEST_BUDGET=10000
```

A flag true só corresponde ao perfil documentado acima quando todas as condições passam. A implementação exige também referência revisada exata, UUID próprio, modo pessoal, loopback, ambiente não production e TTL compatível. Uma URL ou texto inventado não concede capacidades. Não mudamos essas flags automaticamente, pois não inferimos quem é o dono da chave nem vinculamos uma conta sem confirmação do responsável.

4. Reiniciar API/pnpm dev para carregar ambiente. Com usuário vinculado, abrir uma carteira com posição e usar o botão explícito **Consultar brapi com controle de chamadas**. GET, renderização e resize não consultam brapi. Outros usuários continuam manuais e recebem PERSONAL_ACCESS_ONLY.
5. Conferir fonte, horário, cobertura e estado. Preço sem horário válido, vencido ou em moeda incompatível não compõe total completo. Nenhuma cotação altera histórico/custo médio/realizado/proventos.

O modo é local e de uma conta, não infraestrutura de produção. Se o processo reiniciar ou a leitura chegar a outra instância, a memória não é compartilhada. Um sucesso recente registrado impede refetch imediato até o TTL: NO_LOCAL_CACHE. Aguarde ou use referência manual. Isso protege cota em vez de repetir consultas para preencher memória. Limite estimado local de 10.000 tentativas em 35 dias não substitui o painel de consumo brapi e não contabiliza outros programas/sondagens manuais.

Para desligar: BRAPI_PROVIDER_ENABLED=false ou BRAPI_MODE=disabled e reiniciar a API; memória é descartada ao encerrar. Alterar o modo/usuário não entrega cache anterior a outra conta. Não reutilizar a chave entre contas para contornar limites.

## Diagnóstico controlado

`pnpm build` prepara os módulos. `pnpm market:probe` não faz chamadas e retorna NOT RUN. `pnpm market:probe --live` solicita explicitamente até 28 chamadas sequenciais (identidade/cobertura antes de cotação, um ticker por chamada). Usa chave local com Bearer; nunca exibe preços/token/corpos de erro. Retorna metadados sanitizados e timestamps. Para guardar a saída fora do Git, use arquivo privado 0600. O diagnóstico não habilita cache ou compartilhamento e consome cota do fornecedor; não repita sem necessidade. 401/429 encerram chamadas seguintes. Nenhum retry, endpoint legado ou alternativa paga é usado.

## Sem token ou modo desabilitado

O dashboard contábil continua funcionando. Na carteira, **Gerenciar referências de preço** → selecionar ativo próprio → preço positivo e horário local de referência → fonte/motivo → confirmar dados → salvar. Valores são strings decimais, sem arredondamento de entrada. São referências privadas, não cotações oficiais B3. Nova referência mantém histórico e substitui a anterior somente para o mesmo usuário. Invalidar exige motivo e preserva a trilha. Manual vencida fica visível, mas é excluída da valorização; não use preço inventado ou campo manual para contornar licença de dados de terceiros.

## Desbloquear cache compartilhado

Enviar a minuta ao canal oficial e obter esclarecimento aplicável, sem token. Estado WAITING_FOR_PROVIDER. Revisar planos/termos/fontes, AGPL, multiusuário, prazo de retenção e atribuição. A tabela MarketQuote histórica é append-only e não implementa expurgo de licença: requer adequação revisada antes de voltar a persistir dados reais. Só depois acrescentar uma política de capacidade correspondente no código e testes. `shared-postgres` permanece bloqueado mesmo com todas as flags true.
