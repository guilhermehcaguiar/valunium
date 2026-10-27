# Casos de teste financeiros de referência
Todos os testes abaixo são **exemplos sintéticos** e sem tributos, salvo indicação.

| Caso | Eventos | Resultado esperado |
|---|---|---|
| F-001 | Compra 10 @ 17; compra 5 @ 19 | 15 unidades, custo 265, PM 17,666666… |
| F-002 | Após F-001 venda 3 @ 20 | 12 unidades, custo 212, PM 17,666666…, lucro realizado bruto 7 |
| F-003 | Compra 2 @ 10; venda 2 @ 9 | 0 unidades, custo 0, lucro realizado bruto -2 |
| F-004 | Compra 1 @ 100 com taxa de compra 2 | Custo 102, PM 102 |
| F-005 | Venda acima da quantidade disponível | Erro de validação; nenhum evento gravado |
| F-006 | Compra 1 @ 10 e provento recebido 1 | Posição custo 10, provento acumulado 1, sem reduzir custo |
| F-007 | Importar arquivo idêntico duas vezes | Não duplicar eventos |
| F-008 | Usuário A tenta consultar portfolio B | 403 ou 404 sem vazamento |
| F-009 | Cotação indisponível | Valor de mercado sinalizado como indisponível, não R$ 0 |
| F-010 | Registrar compra histórica | Nenhuma chamada de rede a corretora ou execução financeira |

## Resolução numérica F-002
Custo após compras = `10*17 + 5*19 = 265`. PM exato = `265/15 = 53/3`.
Custo removido = `3*(53/3)=53`; custo remanescente = `265-53=212`.
Receita da venda = `3*20=60`; ganho realizado = `60-53=7`.

## Casos adicionais para elaboração
Mesma data com ordenação determinística; taxas distintas; correção retroativa; mudança de ticker; splits; moedas; suspensão de cotação; duplicata sem ID original.
