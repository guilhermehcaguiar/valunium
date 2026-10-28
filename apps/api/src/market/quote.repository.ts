import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Database } from '../core/database';
import type { ProviderResult } from './brapi.provider';

@Injectable()
export class QuoteRepository {
  constructor(private readonly db: Database) {}
  /** Short committed reservation before network: a crash still spends a local budget unit. */
  reserve(assetId: string, ticker: string, ttl: number, budget: number) {
    return this.db.client.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "MarketProviderState" WHERE id='BRAPI' FOR UPDATE`;
      const clock = await tx.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`;
      const now = clock[0]!.now;
      const state = await tx.marketProviderState.findUniqueOrThrow({where:{id:'BRAPI'}});
      const cached = await tx.marketQuote.findFirst({where:{assetId,ticker,fetchedAt:{gte:new Date(now.getTime()-ttl)}},orderBy:{fetchedAt:'desc'}});
      if (cached) return {status:'CACHED' as const};
      if (state.blockedUntil && state.blockedUntil>now) return {status:'COOLDOWN' as const};
      const latest = await tx.marketRequest.findFirst({where:{ticker,startedAt:{gte:new Date(now.getTime()-ttl)}},orderBy:{startedAt:'desc'}});
      if (latest && latest.status!=='OK' && latest.status!=='PENDING') return {status:latest.status};
      if (state.leaseUntil && state.leaseUntil>now) return {status:'IN_PROGRESS' as const};
      const spent = await tx.marketRequest.count({where:{startedAt:{gte:new Date(now.getTime()-35*86400000)}}});
      if (spent>=budget) return {status:'LOCAL_BUDGET' as const};
      const leaseId=randomUUID();
      const request=await tx.marketRequest.create({data:{ticker,startedAt:now}});
      await tx.marketProviderState.update({where:{id:'BRAPI'},data:{leaseId,leaseUntil:new Date(now.getTime()+30000)}});
      return {status:'RESERVED' as const,leaseId,requestId:request.id};
    });
  }
  async settle(assetId:string,ticker:string,leaseId:string,requestId:string,result:ProviderResult) {
    await this.db.client.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "MarketProviderState" WHERE id='BRAPI' FOR UPDATE`;
      const state=await tx.marketProviderState.findUniqueOrThrow({where:{id:'BRAPI'}});
      await tx.marketRequest.update({where:{id:requestId},data:{status:result.status}});
      // An expired lease can never overwrite the newer lease's shared state or append a quote.
      if(state.leaseId!==leaseId)return;
      if(result.status==='OK') {
        const asset=await tx.asset.findFirst({where:{id:assetId,ticker,active:true}});
        if(asset)await tx.marketQuote.create({data:{assetId,ticker,...result.quote}});
      }
      const seconds=result.status==='RATE_LIMIT'?result.retryAfterSeconds??3600:result.status==='INVALID_TOKEN'?3600:0;
      await tx.marketProviderState.update({where:{id:'BRAPI'},data:{leaseId:null,leaseUntil:null,...(seconds?{blockedUntil:new Date(Date.now()+seconds*1000)}:{})}});
    });
  }
}
