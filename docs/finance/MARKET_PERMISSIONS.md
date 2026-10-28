# Permissões de mercado — avaliação documental, 28/10/2026

Avaliação técnica, não parecer jurídico. Código AGPL-3.0-only não transforma dados de terceiros em dados AGPL. Endpoint público, token válido e HTTP 200 não concedem direito de redistribuição. Conclusões limitadas às fontes e ao uso descrito; revisar se mudarem termos, propósito ou forma de distribuição.

## Fontes oficiais verificadas

- [Termos brapi](https://brapi.dev/legal/terms-of-use), versão de 07/06/2025, seções 2–4.
- [FAQ sobre licença e fontes](https://brapi.dev/faq/a-brapi-e-distribuidora-licenciada-da-b3), seção sobre uso no próprio produto.
- [Gratuito e uso pessoal](https://brapi.dev/faq/o-plano-gratuito-tem-limitacoes-importantes).
- [Aplicações comerciais](https://brapi.dev/faq/posso-usar-a-brapi-para-construir-um-app-comercial-ou-para-minha-empresa).
- [Múltiplos projetos/chaves](https://brapi.dev/faq/posso-usar-minha-chave-de-api-de-um-plano-pago-em-mais-de-um-projeto-ou-aplicacao).
- [Planos](https://brapi.dev/pricing), [autenticação](https://brapi.dev/docs/authentication), [cotação v2](https://brapi.dev/docs/acoes/cotacao), [catálogo/cobertura](https://brapi.dev/docs/tickers/cobertura).

## Matriz A/B/C

| Uso | Classificação documental | Consequência no Valunium |
|---|---|---|
| Testes e acompanhamento pessoal básico no gratuito | A — FAQ explícita | Diagnóstico individual autorizado; modo local individual preparado |
| Exibir dados aos usuários dentro do próprio produto | A — FAQ explícita, sujeita aos termos/fontes/plano | Não equivale a licença para publicar feed bruto |
| Cache, persistência, gráficos e indicadores no próprio produto | A — FAQ esclarece expressamente | Bloqueio absoluto de todo cache da Etapa 05 era conservador demais; há base para cache individual |
| Usar chave em projetos próprios, backend/scripts | A — FAQ explícita; limites compartilhados | Chave só no backend; orçamento local não inclui outros programas |
| Redistribuir, revender, sublicenciar feed/base/API a terceiros | B — termos e FAQ | Sem endpoint público de preços, espelho ou exportação de dados brapi |
| Compartilhar publicamente a chave ou ultrapassar limites | B — explícito | Sem token no navegador/URL/log/Git; sem rotação de contas para contornar cotas |
| Software open source AGPL como cliente | C — não há menção específica à AGPL | Código cliente aberto não inclui chave/dados; pedir esclarecimento de compatibilidade do caso concreto |
| Cache PostgreSQL comum entre usuários autenticados independentes | C — FAQ permite cache/persistência e exibição, mas não detalha compartilhamento de credencial/cache entre titulares independentes | shared-postgres continua bloqueado; WAITING_FOR_PROVIDER |
| SaaS público/comercial no gratuito | C — FAQ admite produto comercial e recomenda gratuito para protótipo; não confirma todo SaaS gratuito | Sem ativação comercial automática; não provisionar SaaS |
| Prazo máximo de cache, retenção após término e exclusão | C — prazos não especificados nas fontes examinadas | Sem inferir retenção ilimitada; modo operacional disponível usa memória, máximo interno de 60 min |
| Atribuição específica/formato de aviso | C — termos proíbem remover avisos, não localizamos formato adicional obrigatório | Manter brapi.dev, origem, moeda e horários; perguntar ao fornecedor |
| Múltiplas contas para ampliar quota | Não autorizado pelas fontes; finalidade de contorno é B | Nunca implementar sharding/rotação de chaves/contas |

A FAQ sobre licença esclarece o sentido de uso interno do produto, enquanto os termos gerais mantêm uma proibição ampla de redistribuição. Não tratamos a FAQ como renúncia aos termos nem concluímos que todo compartilhamento é autorizado. Também registramos a afirmação do fornecedor de que não é distribuidor/redistribuidor licenciado da B3; não apresentamos sua cotação como feed oficial B3 nem certificamos a cadeia de direitos.

## Decisão aplicada

Perfil revisado `brapi-personal-local-2026-10-28`: acompanhamento pessoal, uma conta Valunium vinculada pelo próprio dono da chave, servidor e origem loopback, fora de produção/SaaS, dados somente em memória, sem compartilhamento e sem exportação/feed. A base é a permissão expressa para uso pessoal/cache no próprio produto, não o silêncio sobre armazenamento. O teto de 60 min é uma escolha conservadora de implementação; não é um prazo concedido pelo fornecedor.

Todos os requisitos são verificados pelo código. Uma referência textual livre, URL, flag, NODE_ENV=test ou token válido não habilita persistência compartilhada. Fixtures exigem substituição do provedor no código dos testes e banco nativo descartável identificado; não existe variável de produção que habilite esse modo. Se for necessária autorização com escopo diferente, revisar evidência e código antes de liberar capacidades.

Estado atual: token real presente e válido nas consultas controladas; flags/credenciais do usuário preservadas. A ativação do modo pessoal depende de vinculação explícita da conta e configuração pelo responsável. Cache compartilhado, retenção PostgreSQL e SaaS: **WAITING_FOR_PROVIDER**, não operacionalmente desbloqueados.

## Alternativas gratuitas examinadas

| Fonte | Cobertura e limites verificados | Cache/licença/multiusuário | Decisão |
|---|---|---|---|
| brapi gratuita | 15.000/ciclo, 1 ticker e 1 simultânea, ~30 min; 14 candidatos das quatro classes retornaram preço válido nesta auditoria | Cache/produto/pessoal documentados; compartilhamento específico/retensão/AGPL pendentes | Melhor candidato externo; liberar somente perfil pessoal local documentado |
| HG Finance | [Preços](https://hgbrasil.com/pricing/?origin=finance) anunciam 400/dia grátis; [documentação](https://console.hgbrasil.com/documentation/finance) exige Member Premium para stock_price; tipos STOCK/FII/ETF/BDR, atraso 15 min–1 h | Documentação recomenda cache local/temporário; [termos](https://hgbrasil.com/terms/) vedam abuso/múltiplas contas e não esclarecem AGPL/retensão/multiusuário específico | Não foi confirmada cotação gratuita desses ativos; contradição comercial/documental precisa de esclarecimento. Sem integração nova |
| Twelve Data Basic | [Preços](https://twelvedata.com/pricing): US$0, 8 créditos/min, 800/dia, mercados básicos US/FX/cripto; cobertura brasileira gratuita não confirmada | [Termos](https://twelvedata.com/terms), seções 2.2/2.3: direitos por plano, prazo de cache conforme docs, gratuito sem uso comercial; distribuição externa requer autorização | Não demonstrou solução gratuita para B3/multiusuário/SaaS. Não integrado |
| Dados B3 (empresa independente da B3) | [Termos](https://dadosb3.com/termos): 200 consultas/dia grátis; preços EOD COTAHIST e classes brasileiras | Uso próprio; gratuito/Pro não autorizam produto/serviço ou redistribuição; B3 conserva direitos | Não adequado ao produto multiusuário gratuito pretendido. Não integrado |
| Dados públicos oficiais B3 | [Séries históricas](https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/mercado-a-vista/series-historicas/) disponibilizam arquivos históricos, não API livre universal | Página veda coleta automatizada, inclusive IA; [política de consumo](https://www.b3.com.br/data/files/A0/D0/A2/FD/F441B9105B12E5A9AC094EA8/Politica%20de%20Consumo%20Market%20Data%20B3.pdf) distingue distribuição/licenciamento | Sem scraping/download automatizado; preço atrasado ou arquivo público não é licença de redistribuição |
| CVM/BCB | [CVM](https://dados.cvm.gov.br/) publica informes/demonstrações; [BCB](https://dadosabertos.bcb.gov.br/) tem séries econômicas/câmbio | Avaliar licença por conjunto, atribuição e obrigações; dados abertos não substituem os preços de negociação necessários | Não são substitutos completos de cotações de ações/FIIs/ETFs/BDRs |
| Arquivo legitimamente obtido pelo usuário | Cobertura/recência dependem do arquivo e dos direitos da origem | Importação não altera licença original; não compartilhar por padrão | Possibilidade documental futura; importador não implementado nesta etapa |
| Referência manual privada | Funciona para ativos catalogados; preço/data/motivo informados pelo usuário | Sem API externa ou cota; usuário deve ter direito de usar a referência, nunca qualificá-la como oficial sem base | Alternativa gratuita operacional já disponível para todos os usuários |

Não foi encontrada autorização que torne qualquer alternativa uma API gratuita irrestrita para SaaS/redistribuição. Não recomendamos assinatura paga como requisito. Nenhuma conta/chave/assinatura de alternativa foi criada e nenhuma API alternativa foi consumida. Não se usa Yahoo Finance ou endpoint não documentado como atalho.
