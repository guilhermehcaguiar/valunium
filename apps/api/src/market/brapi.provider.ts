import { Injectable, Inject } from '@nestjs/common';
import { normalizeDecimal } from '@valunium/financial-core';
import { ENVIRONMENT } from '../core/environment.token';
import type { Environment } from '../config/environment';

export interface ProviderQuote { price: string; currency: string; effectiveAt: Date | null; fetchedAt: Date }
export type ProviderStatus = 'OK' | 'NO_TOKEN' | 'INVALID_TOKEN' | 'NO_COVERAGE' | 'MALFORMED' | 'TIMEOUT' | 'RATE_LIMIT' | 'PROVIDER_ERROR' | 'TICKER_CHANGED';
export type ProviderResult = { status: 'OK'; quote: ProviderQuote } | { status: Exclude<ProviderStatus,'OK'>; retryAfterSeconds?: number };
export abstract class MarketDataProvider { abstract quote(ticker: string): Promise<ProviderResult> }
const record = (v: unknown): v is Record<string,unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** JSON numbers represent provider precision only; reject unsafe magnitude/digits before Decimal. */
export function providerPrice(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 1e9) throw new Error('INVALID_PROVIDER_PRICE');
  const text = String(value);
  if (!/^\d+(\.\d{1,8})?$/.test(text) || text.replace('.','').replace(/^0+/,'').length > 15) throw new Error('UNSUPPORTED_PROVIDER_PRECISION');
  return normalizeDecimal(text);
}
export function parseBrapi(value: unknown, ticker: string, fetchedAt: Date): ProviderResult {
  if (!record(value) || !Array.isArray(value.results) || value.results.length !== 1 || !record(value.results[0])) return {status:'MALFORMED'};
  const item = value.results[0];
  if (item.requestedSymbol !== ticker || typeof item.symbol !== 'string' || typeof item.changed !== 'boolean') return {status:'MALFORMED'};
  // Alias conversion may include corporate actions/ratios; never apply a different security's price.
  if (item.changed || item.symbol !== ticker) return {status:'TICKER_CHANGED'};
  if (!record(item.data) || item.data.currency !== 'BRL') return {status:'MALFORMED'};
  let price: string;
  try { price = providerPrice(item.data.regularMarketPrice); } catch { return {status:'MALFORMED'}; }
  const raw = item.data.regularMarketTime;
  let effectiveAt: Date | null = null;
  if (raw !== null && raw !== undefined) {
    if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(raw)) return {status:'MALFORMED'};
    effectiveAt = new Date(raw);
    if (!Number.isFinite(effectiveAt.getTime()) || effectiveAt.toISOString().slice(0,19)!==raw.slice(0,19) || effectiveAt.getTime() > fetchedAt.getTime()+60000 || effectiveAt.getUTCFullYear() < 2000) return {status:'MALFORMED'};
  }
  return {status:'OK',quote:{price,currency:'BRL',effectiveAt,fetchedAt}};
}
@Injectable()
export class BrapiProvider extends MarketDataProvider {
  constructor(@Inject(ENVIRONMENT) private readonly environment: Environment) { super(); }
  async quote(ticker: string): Promise<ProviderResult> {
    if (!this.environment.brapiToken) return {status:'NO_TOKEN'};
    if (!/^[A-Z0-9]{3,20}$/.test(ticker)) return {status:'NO_COVERAGE'};
    try {
      const response = await fetch(`https://brapi.dev/api/v2/stocks/quote?symbols=${encodeURIComponent(ticker)}`, {
        headers:{Authorization:`Bearer ${this.environment.brapiToken}`,Accept:'application/json'},
        signal:AbortSignal.timeout(4000),redirect:'error',cache:'no-store',
      });
      if (response.status === 429) {
        const header = response.headers.get('retry-after');
        const seconds = header && /^\d+$/.test(header) ? Number(header) : header ? Math.ceil((Date.parse(header)-Date.now())/1000) : 3600;
        return {status:'RATE_LIMIT',retryAfterSeconds:Number.isFinite(seconds)?Math.max(60,Math.min(seconds,604800)):3600};
      }
      if (response.status === 401) return {status:'INVALID_TOKEN'};
      if ([403,404].includes(response.status)) return {status:'NO_COVERAGE'};
      if (!response.ok) return {status:'PROVIDER_ERROR'};
      // Bound the stream, including responses with no Content-Length.
      if (!response.body || Number(response.headers.get('content-length') ?? 0)>65536) return {status:'MALFORMED'};
      const reader=response.body.getReader();let text='';let bytes=0;const decoder=new TextDecoder();
      try { for (;;) { const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>65536){await reader.cancel();return {status:'MALFORMED'};}text+=decoder.decode(chunk.value,{stream:true}); } text+=decoder.decode(); }
      finally {reader.releaseLock();}
      const body:unknown=JSON.parse(text,(key:string,value:unknown,context?:{source?:string})=>{
        if(key==='regularMarketPrice'&&typeof value==='number'){
          // Node 24 exposes the original numeric JSON lexeme: reject precision already lost by JSON.parse.
          const raw=context?.source;
          if(!raw||!/^\d+(\.\d{1,8})?$/.test(raw)||raw.replace('.','').replace(/^0+/,'').length>15||normalizeDecimal(raw)!==providerPrice(value))throw new Error('UNSUPPORTED_PROVIDER_PRECISION');
        }
        return value;
      });
      return parseBrapi(body,ticker,new Date());
    } catch (error) {
      if (error instanceof Error && ['TimeoutError','AbortError'].includes(error.name)) return {status:'TIMEOUT'};
      return {status:'MALFORMED'};
    }
  }
}
