import Decimal from 'decimal.js';
import { amount } from './index';

const D = Decimal.clone({ precision: 80, rounding: Decimal.ROUND_HALF_EVEN });
const output = (v: Decimal) => v.isZero() ? '0.000000000000' : v.toFixed(12);
// Derived ledger totals can exceed a single NUMERIC(38,12) input; they are not new stored inputs.
function state(value:string):Decimal {
  if(!/^\d{1,64}(\.\d{1,12})?$/.test(value))throw new Error('INVALID_DERIVED_POSITION');
  return new D(value);
}
export interface ValuationPosition { portfolioId: string; assetId: string; ticker: string; currency: string; quantity: string; cost: string; averagePrice: string }
export interface ValuationQuote {
  assetId: string; price: string | null; currency: string; source: 'MANUAL' | 'BRAPI' | null;
  priceType: 'MANUAL' | 'DELAYED' | null; effectiveAt: string | null; fetchedAt: string | null;
  status: 'VALID' | 'MANUAL' | 'STALE' | 'UNKNOWN_TIME' | 'UNAVAILABLE'; providerStatus: string;
}
/** No I/O, FX, quote fetching or historical-return calculation. Quotes already carry freshness. */
export function valuePositions(positions: readonly ValuationPosition[], quotes: readonly ValuationQuote[], incomplete = false) {
  const references = new Map(quotes.map(q => [q.assetId, q]));
  const groups = new Map<string, { currency: string; total: number; covered: number; market: Decimal; cost: Decimal; allocations: Map<string,{label:string;value:Decimal}>; rows: ReturnType<typeof row>[] }>();
  function row(p: ValuationPosition) {
    const quantity = state(p.quantity), cost = state(p.cost), q = references.get(p.assetId) ?? null;
    if (quantity.isZero() && !cost.isZero()) throw new Error('INCONSISTENT_CLOSED_POSITION');
    let status: string = incomplete ? 'INCOMPLETE_HISTORY' : quantity.isZero() ? 'ZERO_POSITION' : q?.status ?? 'UNAVAILABLE';
    let price: Decimal | null = null;
    if (!incomplete && !quantity.isZero() && q?.price !== null && q?.price !== undefined && ['VALID', 'MANUAL'].includes(q.status)) {
      try { price = amount(q.price); if (price.isZero()) { price = null; status = 'INVALID_PRICE'; } } catch { status = 'INVALID_PRICE'; }
      if (q.currency !== p.currency) { price = null; status = 'CURRENCY_MISMATCH'; }
    }
    const market = incomplete ? null : quantity.isZero() ? new D('0') : price ? quantity.mul(price) : null;
    const unrealized = market === null ? null : market.sub(cost);
    return { ...p, quote: q, status, marketValue: market === null ? null : output(market), unrealized: unrealized === null ? null : output(unrealized),
      unrealizedPercent: unrealized === null || cost.isZero() ? null : output(unrealized.div(cost).mul('100')) };
  }
  for (const p of positions) {
    const r = row(p);
    const group = groups.get(p.currency) ?? { currency: p.currency, total: 0, covered: 0, market: new D('0'), cost: new D('0'), allocations:new Map<string,{label:string;value:Decimal}>(), rows: [] };
    if (!state(p.quantity).isZero()) {
      group.total++;
      if (r.marketValue !== null) {
        const market=state(p.quantity).mul(amount(r.quote!.price!));
        group.covered++; group.market = group.market.add(market); group.cost = group.cost.add(p.cost);
        const previous=group.allocations.get(p.assetId);
        group.allocations.set(p.assetId,{label:p.ticker,value:(previous?.value??new D('0')).add(market)});
      }
    }
    group.rows.push(r); groups.set(p.currency, group);
  }
  return [...groups.values()].sort((a,b) => a.currency.localeCompare(b.currency)).map(g => {
    const complete = !incomplete && g.covered === g.total;
    const available = !incomplete && (g.covered > 0 || g.total === 0);
    const profit = g.market.sub(g.cost);
    return { currency: g.currency, complete, totalPositions: g.total, coveredPositions: g.covered,
      marketValue: complete ? output(g.market) : null, unrealized: complete ? output(profit) : null,
      unrealizedPercent: complete && !g.cost.isZero() ? output(profit.div(g.cost).mul('100')) : null,
      partialMarketValue: available ? output(g.market) : null, partialUnrealized: available ? output(profit) : null,
      byAsset:complete?[...g.allocations.values()].sort((a,b)=>a.label.localeCompare(b.label)).map(a=>({label:a.label,value:output(a.value)})):[],rows: g.rows };
  });
}
