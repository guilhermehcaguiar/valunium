/** Storage contract matching PostgreSQL NUMERIC(38,12). No arithmetic or I/O. */
export const DECIMAL_SCALE = 12;
export const DECIMAL_PRECISION = 38;

export function normalizeDecimal(value: string): string {
  if (typeof value !== 'string' || !/^-?(0|[1-9]\d*)(\.\d{1,12})?$/.test(value)) {
    throw new TypeError('Expected a decimal string with at most 12 fractional digits');
  }
  const negative = value.startsWith('-');
  const [integer = '', fraction = ''] = (negative ? value.slice(1) : value).split('.');
  if (integer.length > DECIMAL_PRECISION - DECIMAL_SCALE) {
    throw new RangeError('Decimal exceeds NUMERIC(38,12)');
  }
  const digits = `${integer}.${fraction.padEnd(DECIMAL_SCALE, '0')}`;
  return negative && /[1-9]/.test(digits) ? `-${digits}` : digits;
}


import Decimal from 'decimal.js';
const D = Decimal.clone({ precision: 80, rounding: Decimal.ROUND_HALF_EVEN });
export type EventKind = 'BUY' | 'SELL' | 'DIVIDEND' | 'JCP' | 'OTHER';
export interface FinancialEvent {
  id: string; assetId: string; kind: EventKind; date: string; sequence: string;
  quantity: string; unitPrice: string; fees: string; gross: string; withholding: string;
}
export function amount(value: string): Decimal {
  const result = new D(normalizeDecimal(value));
  if (result.isNegative()) throw new Error('NEGATIVE_AMOUNT');
  return result;
}
export function calendar(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) !== value) throw new Error('INVALID_DATE');
  return value;
}
const output = (value: Decimal) => value.isZero() ? '0.000000000000' : value.toFixed(12);
export function eventValues(e: Pick<FinancialEvent, 'kind' | 'quantity' | 'unitPrice' | 'fees' | 'gross' | 'withholding'>) {
  if (!['BUY','SELL','DIVIDEND','JCP','OTHER'].includes(e.kind)) throw new Error('INVALID_KIND');
  const q = amount(e.quantity), p = amount(e.unitPrice), fees = amount(e.fees), withholding = amount(e.withholding);
  const trade = e.kind === 'BUY' || e.kind === 'SELL';
  const gross = trade ? q.mul(p) : amount(e.gross);
  if (trade && q.isZero()) throw new Error('ZERO_QUANTITY');
  if (e.kind === 'SELL' && fees.gt(gross)) throw new Error('FEES_EXCEED_GROSS');
  if (!trade && withholding.gt(gross)) throw new Error('WITHHOLDING_EXCEEDS_GROSS');
  return { gross: output(gross), total: output(e.kind === 'BUY' ? gross.add(fees) : trade ? gross.sub(fees) : gross.sub(withholding)) };
}
export interface ReplayPosition { quantity: Decimal; cost: Decimal; realized: Decimal; income: Decimal }
export function replay(events: readonly FinancialEvent[], observe?: (event: FinancialEvent, positions: ReadonlyMap<string, Readonly<ReplayPosition>>) => void) {
  if (events.length > 10000) throw new Error('HISTORY_LIMIT');
  const sorted = [...events].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : BigInt(a.sequence) < BigInt(b.sequence) ? -1 : BigInt(a.sequence) > BigInt(b.sequence) ? 1 : a.id.localeCompare(b.id));
  const positions = new Map<string, { quantity: Decimal; cost: Decimal; realized: Decimal; income: Decimal }>();
  for (const e of sorted) {
    calendar(e.date); eventValues(e);
    const s = positions.get(e.assetId) ?? { quantity: new D('0'), cost: new D('0'), realized: new D('0'), income: new D('0') };
    const q = amount(e.quantity), gross = q.mul(amount(e.unitPrice)), fees = amount(e.fees);
    if (e.kind === 'BUY') { s.quantity = s.quantity.add(q); s.cost = s.cost.add(gross).add(fees); }
    else if (e.kind === 'SELL') {
      if (q.gt(s.quantity)) throw new Error('NEGATIVE_POSITION');
      const removed = q.eq(s.quantity) ? s.cost : s.cost.mul(q).div(s.quantity);
      s.quantity = s.quantity.sub(q); s.cost = s.quantity.isZero() ? new D('0') : s.cost.sub(removed);
      s.realized = s.realized.add(gross.sub(fees).sub(removed));
    } else s.income = s.income.add(amount(e.gross).sub(amount(e.withholding)));
    positions.set(e.assetId, s);
    observe?.(e, positions);
  }
  return [...positions].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([assetId, s]) => ({ assetId, quantity: output(s.quantity), cost: output(s.cost),
    averagePrice: output(s.quantity.isZero() ? new D('0') : s.cost.div(s.quantity)), realized: output(s.realized), income: output(s.income),
    marketValue: null, unrealized: null, quoteStatus: 'UNAVAILABLE' as const }));
}
export interface ReferencePrice { price: string; asOf: string; source: string; currency: 'BRL' }

export { summarizeDashboard } from './dashboard';
export { valuePositions } from './valuation';
export type { ValuationPosition, ValuationQuote } from './valuation';
