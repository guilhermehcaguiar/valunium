# Design system Valunium — Obsidian / Coin Gold
**Direção validada:** preto/grafite premium com ouro/moeda como destaque; visual sóbrio, sem neon excessivo.

## Tokens de cores
| Token | Valor | Uso |
|---|---|---|
| `bg.base` | `#0A0A0B` | fundo |
| `bg.surface` | `#121315` | container |
| `bg.card` | `#1A1C1F` | cards |
| `bg.elevated` | `#22252A` | menu/popover |
| `border.default` | `#2E3238` | divisórias |
| `text.primary` | `#F5F3EF` | texto |
| `text.secondary` | `#C8C2B8` | apoio |
| `text.muted` | `#8F877C` | terciário (validar contraste) |
| `brand.gold` | `#C9A646` | destaque |
| `brand.goldSoft` | `#D8B96A` | hover e gráficos |
| `brand.champagne` | `#E5D3A1` | dados auxiliares |
| `brand.bronze` | `#9D7A36` | categorias |
| `finance.positive` | `#3FA46A` | ganho |
| `finance.negative` | `#C45555` | perda |
| `info` | `#7E8A97` | informação |

## Regras de aplicação
- Predominância preta/grafite; ouro ocupa pequenas áreas significativas, nunca texto extenso.
- Verde/vermelho exclusivos de performance; não sinalizar apenas por cor (usar sinal e rótulo).
- Patrimônio total com tipografia branca; ouro marca seleção, ícones e linhas.
- Tipografia UI: Inter ou Manrope; números tabulares alinhados em colunas.
- Grid base 8px, espaçamentos coerentes, borda 1px e raio 10–16px.
- Feedback visual completo: empty, loading, error, stale, success e disabled.
- Acessibilidade WCAG AA como alvo: medir contraste real, teclado, foco visível, leitura por screen reader, responsividade.
- Gráficos com tooltip e tabela textual alternativa; nunca somente cor.

## Componentes v1
AppShell, Sidebar, Topbar, PortfolioSwitcher, MetricCard, AllocationChart, HoldingsTable, TransactionsTable, HistoricalTransactionForm, QuoteStaleBanner, EmptyState, ConfirmImportDialog.
