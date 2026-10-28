# Minuta de esclarecimento à brapi

Estado: **WAITING_FOR_PROVIDER**. Mensagem preparada, não enviada. Canal oficial verificado em 28/10/2026: [página de contato](https://brapi.dev/contact), e-mail `contato@brapi.dev` (confirmado no link mailto da página). Não incluir token, credenciais, IDs privados ou dados de carteiras. O assistente de IA do site não substitui resposta documental da equipe.

**Assunto:** Esclarecimento de uso gratuito no Valunium — AGPLv3, dashboard privado e cache

Olá, equipe brapi.

Estou desenvolvendo o Valunium, aplicativo open source AGPL-3.0-only de acompanhamento patrimonial. Ele registra operações já realizadas externamente e nunca envia ordens ou movimenta dinheiro. Inicialmente será gratuito e instalado localmente. Um SaaS poderá ser avaliado no futuro; não oferecemos feed, revenda de dados ou proxy público da API.

Li os termos em /legal/terms-of-use e as FAQs sobre uso comercial, plano gratuito e licença. A FAQ informa que o próprio produto pode exibir dados aos usuários, fazer cache/persistência e gráficos; os termos proíbem redistribuição. Gostaria de confirmar por escrito o enquadramento deste uso:

1. Podemos distribuir o código cliente sob AGPLv3, sem chave ou dados de mercado incluídos no repositório?
2. O plano Gratuito permite consultar e exibir cotações em dashboard privado de acompanhamento, inclusive instalação local com mais de uma conta autenticada?
3. Podemos armazenar temporariamente cotações no PostgreSQL para cache, por exemplo TTL de 60 minutos? Qual prazo máximo e qual regra de exclusão/retensão após expiração ou encerramento da conta?
4. O cache pode ser reutilizado entre usuários autenticados da mesma instância, usando a chave da instância, sem endpoint público, exportação de base ou feed?
5. Há diferenças de permissão entre instalação pessoal/local, instância privada multiusuário e SaaS público? Cada titular precisaria de sua própria chave?
6. Quais atribuições, avisos de fonte/atraso e condições das fontes subjacentes precisamos preservar?
7. Esse caso cabe no plano Gratuito, respeitando um ticker e uma chamada simultânea? A política difere por ações, FIIs, ETFs ou BDRs?
8. Quais permissões precisariam ser revistas se futuramente cobrarmos pelas funcionalidades do aplicativo, sem revenda de dados? A resposta exige licença adicional ou análise específica?

Neste momento mantemos cache PostgreSQL compartilhado e SaaS desativados. Preparamos apenas um modo local individual, com memória temporária vinculada à conta do dono da chave, fundamentado na FAQ sobre projetos pessoais e cache. Também agradeço a confirmação expressa desse modo.

Se não oferecerem autorização/contrato individual, por favor indiquem a seção documental que cobre cada uso ou esclareçam quais usos não são permitidos. Não precisamos de SLA ou contratação paga para esta consulta.

Obrigado.
[Nome do responsável pelo projeto]

## O que falta e como registrar a resposta

Responsável humano deve enviar a mensagem e guardar a resposta original de forma privada, com data, remetente oficial e escopo aplicável. Não presumir resposta favorável nem copiar dados privados para o Git. A resposta precisa esclarecer compartilhamento entre titulares, plano gratuito, armazenamento/retensão e atribuição. Revisar a matriz e capacidades de código antes de habilitar outro modo. Mudar uma flag ou colocar o e-mail em BRAPI_TERMS_REFERENCE não libera PostgreSQL compartilhado.
