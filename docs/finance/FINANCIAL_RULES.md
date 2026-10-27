# Domínio financeiro: especificação inicial
## Princípios
- **Não executar ordens.** `BUY`/`SELL` são operações externas já realizadas e apenas registradas.
- Sem `number` de ponto flutuante para montantes em JS; biblioteca decimal ou inteiros escalados.
- Distinguir `tradeDate`, `settlementDate`, `createdAt`, `priceAsOf`.
- Todos os indicadores mostram método e data-base. Dados faltantes não podem ser substituídos por zero sem sinalizar.

## Custo médio móvel — MVP spot simplificado
- Compra: `novo_custo = custo_anterior + quantidade * preco_unitario + taxas_capitalizaveis`.
- `quantidade_nova = quantidade_anterior + quantidade_comprada`.
- `preco_medio = custo_total / quantidade` quando quantidade > 0.
- Venda: custo removido `quantidade_vendida * preco_medio_anterior`; quantidade e custo reduzem, preço médio remanescente se mantém (ressalvados arredondamentos).
- Ganho realizado bruto na venda: `quantidade_vendida * preco_venda - custo_removido - taxas_venda`.
- Ao zerar posição: custo residual de arredondamento deve ser zerado por regra explícita e auditável.

## Patrimônio x performance
- Posição a mercado: quantidade × última cotação válida, com data/fonte.
- Patrimônio total não é rentabilidade; aportes e saques externos mudam o capital sem representar ganho.
- MVP: mostrar claramente custo investido, resultado não realizado, resultado realizado bruto e proventos; só exibir TWR/XIRR após especificar e testar fluxos.
- Dividendos recebidos registrados separadamente; não presumir reinvestimento automático.

## Eventos corporativos
Desdobramentos, grupamentos, bonificações, subscrições e amortizações exigem tipos de eventos e casos de teste próprios. **Não apresentar cálculo como exato se existirem eventos não suportados.** Informar limitações e bloquear importações ambíguas.

## Internacional e renda fixa
BDRs em BRL sob classificação própria; ETFs internacionais diretos e renda fixa complexa fora do primeiro corte. FX e marcação a mercado só após metodologia aprovada.

## Arredondamento
Cálculo interno em alta precisão; formato BRL exibido em 2 casas, mas custo médio preserva precisão maior. Reconciliar diferenças de centavos explicitamente.
