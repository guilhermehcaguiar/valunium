# POLÍTICA ABSOLUTA — FINANCIAL_READ_ONLY_POLICY

**Estado:** obrigatória e permanente. Qualquer código conflitante é defeito bloqueante.

## Permitido
- Consultar posições e cotações de fontes autorizadas.
- Armazenar **registros informativos** de compras/vendas **já executadas fora do Valunium**.
- Importar, validar, categorizar e consolidar extratos/movimentações históricas.
- Calcular custo, posição, proventos, variações, riscos descritivos e simulações hipotéticas.
- Exportar dados do próprio usuário e sincronizar via API **read-only** após consentimento.

## Absolutamente proibido
- Criar, enviar, cancelar ou modificar ordens reais de compra/venda.
- Efetuar pagamentos, PIX, transferências, depósitos, saques, resgates ou câmbio.
- Fazer rebalanceamento executável ou agendar ordens.
- Solicitar ou armazenar credenciais de acesso transacional a bancos/corretoras.
- Solicitar permissões OAuth/API de escrita para contas financeiras.
- Disponibilizar endpoints, jobs, assistentes, automações ou bots para execução de operações.

## Restrições de desenho
- Camada de integração externa definida por interfaces como `fetchPositions`, `fetchTransactions`, `fetchQuotes`; jamais `placeOrder`, `withdraw`, `transfer`, `trade`.
- Ambiente de desenvolvimento e CI devem rejeitar adição de capacidade financeira de escrita em revisão técnica e testes.
- Formulários `Registrar compra` / `Registrar venda` devem explicitar: **registro histórico; nenhuma ordem é enviada**.
- Operações CRUD **internas** no próprio banco para registrar dados são permitidas; read-only refere-se a **ações financeiras externas**, não a impedir salvar cadastros.
- Eventual IA terá somente ferramentas de busca/cálculo sobre dados internos autorizados, sem ferramentas de ação financeira.

## Critérios de revisão
1. Nenhuma integração externa com escopo de transação.
2. Nenhum endpoint ou job de execução financeira.
3. Testes para garantir que lançamento histórico não chama provedor financeiro.
4. Cada nova integração apresenta documento com endpoints, scopes, termos de uso e análise de risco.
