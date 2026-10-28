# Indicadores de acompanhamento — Etapa 04

O dashboard apresenta registros históricos, não patrimônio de mercado. Fonte única: eventos ativos do ledger e replay aprovado da Etapa 03, com Decimal.js a 80 algarismos e HALF_EVEN. O replay ganhou um observador de leitura para séries; as fórmulas de aquisição/baixa não mudaram. Agregações usam estados internos não arredondados, somente depois serializados em strings de 12 casas. Não há cálculo contábil no frontend.

## Definições

- Total de carteiras: seleção do usuário, incluindo arquivadas.
- Ativos com posição aberta: IDs distintos com quantidade positiva por moeda; o mesmo ativo em duas carteiras conta uma vez.
- Custo das posições abertas: soma do custo remanescente após baixas proporcionais, na data final. Não é valor de mercado nem total de aportes históricos.
- Resultado realizado acumulado: receita líquida das vendas menos custo baixado até a data final; perdas permanecem após zerar posição. Não é rentabilidade total.
- Proventos recebidos: bruto menos retenção informado, acumulado até a data final. Sem previsões/reinvestimento presumido.
- Movimentações registradas: eventos ativos no intervalo, inclusive proventos, excluindo cancelados.

Distribuições por classe/ativo usam custo remanescente, nunca peso de mercado. Séries de capital têm custo contábil acumulado e dois fluxos distintos por dia: compras + taxas e receitas líquidas de vendas. Não são aporte bancário, lucro ou taxa de retorno. Série de resultado é incremento realizado por dia efetivo. Proventos agrupados por mês calendário e tipo, em valores líquidos. Datas são YYYY-MM-DD no banco, agrupadas sem conversão a fuso do navegador e exibidas em pt-BR. Dias sem eventos não são preços estimados; curvas são em degraus, sem suavização que invente trajetórias.

## Período e comparabilidade

`to` define a posição e acumulados as-of. `from` filtra séries/contagem/registros recentes sem descartar o custo de abertura: eventos anteriores são reprocessados. Padrão: último ano; intervalo explícito máximo 3660 dias. As posições continuam corretas mesmo sem venda/provento ou sem eventos nesse intervalo. Gráfico de evolução requer pelo menos duas datas; séries vazias exibem ausência de registros, não previsões.

Cada moeda tem grupo independente. Não há consolidado monetário entre moedas sem câmbio válido. O schema atual só aceita BRL, mas o contrato e testes puros cobrem grupos distintos. Se qualquer carteira selecionada tiver historyIncomplete, todos os totais e gráficos financeiros da moeda afetada ficam indisponíveis (null), evitando apresentar subtotal parcial como completo. Carteiras/registros factuais continuam identificados. Selecionar uma carteira completa permite consultá-la independentemente. Não se substitui indisponibilidade por zero.

Zero em histórico completo significa zero real nos registros existentes; não certifica que o usuário informou todo seu patrimônio. Cotação, valor de mercado, resultado não realizado, rentabilidade, benchmarks e previsões de dividendos permanecem ausentes.

## Apresentação e gráficos

Cards formatam strings com BigInt/Intl e HALF_EVEN em centavos; o valor exato está preservado nas tabelas e no título do card. As tabelas mostram 12 casas. Não se reutiliza exibição arredondada em cálculos.

ECharts 6.1.0 (Apache-2.0), carregamento sob demanda de barras/linhas, componentes necessários e renderer SVG. Sem animações; tooltips usam richText, sem HTML cru. A projeção `visualNumber` é a única conversão para number de valores monetários e serve somente a coordenadas: suporta |valor| <= 10^12 e valor zero ou |valor| >= 10^-8. Se qualquer ponto estiver fora da faixa, o gráfico é suprimido com explicação; a tabela exata permanece. As coordenadas/tooltips são aproximações, não fonte contábil. Unidades, sinais, legendas e tabelas evitam dependência exclusiva de cor. Navegação e details têm suporte nativo a teclado.

Há patch pnpm versionado de declarações do ECharts: NonNullable remove undefined indevido de propriedades opcionais focus e hoverLayer nas interfaces derivadas, compatibilizando-as com suas bases. Isso restringe os tipos aceitos; não altera JavaScript, fórmulas, compilador ou skipLibCheck. Preservar/reavaliar o patch ao atualizar ECharts. A primeira tentativa com Recharts/Redux e ECharts 6.0 não ficou na árvore final. ECharts 6.1 corrige o advisory GHSA-fgmj-fm8m-jvvx das versões anteriores.
