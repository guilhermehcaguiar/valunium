# PRD v0.1 — Valunium
**Data-base:** 2026-10-27. **Estado:** proposta técnica aprovada em princípio, pendente validação em uso real.

## Visão
Uma plataforma brasileira para **acompanhar, organizar e compreender** uma carteira de investimentos com precisão, rastreabilidade e apresentação clara.

## Problema
Investidores que usam corretoras diversas têm dados fragmentados, planilhas frágeis, cálculos pouco transparentes e dificuldade para enxergar aportes, proventos, performance e concentração.

## Usuário-alvo e validação
MVP para uso pessoal em carteira da Rico com entradas manuais/CSV; modelo multiusuário desde a arquitetura para futuro beta SaaS, sem presumir integração automática com a Rico.

## Proposta
Cadastro manual de carteiras, ativos e operações pretéritas; cálculo auditável de posições e custo; proventos; cotações licenciadas se viáveis; dashboard e exportação. Nenhuma funcionalidade de execução financeira.

## Objetivos
1. Conseguir reconciliar posições e movimentos com extratos reais.
2. Explicitar datas/fontes das cotações e estados de dados incompletos.
3. Minimizar erro em cálculo financeiro e impedir acesso cruzado entre usuários.
4. Criar experiência premium e acessível em tema Obsidian/Gold.

## Não objetivos
Negociar ativos, pagamentos, Open Finance transacional, renda fixa detalhada no primeiro corte, aconselhamento personalizado, apuração tributária definitiva, IA, integrações sem licença e corretagem.

## Personas
- Investidor que aporta mensalmente e deseja ver evolução real.
- Investidor que acompanha ações, FIIs, ETFs e BDRs da B3.

## Jornadas prioritárias
1. Criar conta → carteira → registrar compra histórica → consultar posição.
2. Registrar venda histórica → atualizar quantidade/custo → visualizar ganho realizado bruto.
3. Registrar provento recebido → consultar histórico sem misturar com aporte.
4. Importar CSV → validar → prévia de conflitos → confirmar registros → exportar.
5. Aplicar filtro por período e identificar variação patrimonial versus fluxo de caixa.

## Métricas de aceite
- Casos de teste financeiros críticos: 100% aprovados.
- Testes de isolamento: zero acesso cruzado conhecido.
- Reimportar mesmo arquivo sem duplicação.
- Dashboard informa quando cotação está indisponível.
- Validação de uso pessoal por 30 dias antes do beta externo.

## Dependências e riscos
Cotações comerciais, licenças de redistribuição, eventos corporativos, coleta de dados pessoais, custos de SaaS e marca/domínio `Valunium` pendentes de confirmação.

## Referências
[MVP](MVP_SCOPE.md), [Política](../security/FINANCIAL_READ_ONLY_POLICY.md), [Cálculos](../finance/FINANCIAL_RULES.md).
