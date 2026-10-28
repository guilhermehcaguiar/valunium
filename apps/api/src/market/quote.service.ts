import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { amount, normalizeDecimal } from '@valunium/financial-core';
import type { ValuationQuote } from '@valunium/financial-core';
import { Database } from '../core/database';
import { ENVIRONMENT } from '../core/environment.token';
import type { Environment } from '../config/environment';
import { MarketDataProvider } from './brapi.provider';
import { QuoteRepository } from './quote.repository';
import type { MarketQuote, MarketRequest } from '../generated/prisma/client';
export interface ManualInput {assetId:string;price:string;effectiveAt:string;reason:string;requestKey:string;confirmed:true}

@Injectable()
export class QuoteService {
  private readonly logger=new Logger('MarketData');
  constructor(private readonly db:Database,private readonly repository:QuoteRepository,private readonly provider:MarketDataProvider,
    @Inject(ENVIRONMENT)private readonly env:Environment){}
  availability(){return !this.env.brapiToken?'NO_TOKEN':!this.env.brapiAuthorized?'TERMS_BLOCKED':'READY';}
  async assertAsset(ownerId:string,assetId:string){
    const asset=await this.db.client.asset.findUnique({where:{id:assetId}});
    const owned=asset&&await this.db.client.ledgerEvent.findFirst({where:{assetId,cancelled:false,portfolio:{ownerId}},select:{id:true}});
    if(!asset||!owned)throw new NotFoundException();return asset;
  }
  async manual(ownerId:string,input:ManualInput){
    const asset=await this.assertAsset(ownerId,input.assetId);
    let price:string;
    try{price=normalizeDecimal(input.price);if(amount(price).isZero())throw new Error();}catch{throw new BadRequestException();}
    const effectiveAt=new Date(input.effectiveAt);
    if(!/Z$/.test(input.effectiveAt)||!Number.isFinite(effectiveAt.getTime())||effectiveAt.getTime()>Date.now()||effectiveAt.getUTCFullYear()<2000)throw new BadRequestException();
    return this.db.client.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${ownerId}::uuid FOR UPDATE`;
      const previous=await tx.manualQuote.findUnique({where:{ownerId_requestKey:{ownerId,requestKey:input.requestKey}}});
      if(previous){if(previous.assetId!==input.assetId||previous.price.toFixed(12)!==price||previous.effectiveAt.getTime()!==effectiveAt.getTime()||previous.reason!==input.reason)throw new ConflictException();return this.manualWire(previous);}
      const now=new Date();
      await tx.manualQuote.updateMany({where:{ownerId,assetId:input.assetId,invalidatedAt:null},data:{invalidatedAt:now,invalidationReason:'Substituída por nova referência confirmada'}});
      return this.manualWire(await tx.manualQuote.create({data:{ownerId,assetId:input.assetId,price,currency:asset.currency,effectiveAt,createdAt:now,reason:input.reason,requestKey:input.requestKey}}));
    });
  }
  private manualWire(q:{id:string;assetId:string;price:{toFixed:(n:number)=>string};currency:string;effectiveAt:Date;createdAt:Date;invalidatedAt:Date|null;reason:string;invalidationReason:string|null}){
    return {id:q.id,assetId:q.assetId,price:q.price.toFixed(12),currency:q.currency,effectiveAt:q.effectiveAt.toISOString(),createdAt:q.createdAt.toISOString(),invalidatedAt:q.invalidatedAt?.toISOString()??null,reason:q.reason,invalidationReason:q.invalidationReason};
  }
  async history(ownerId:string,assetId:string,page:number){
    await this.assertAsset(ownerId,assetId);
    const rows=await this.db.client.manualQuote.findMany({where:{ownerId,assetId},orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(page-1)*25,take:26});
    return {items:rows.slice(0,25).map(q=>this.manualWire(q)),nextPage:rows.length>25?page+1:null};
  }
  async invalidate(ownerId:string,id:string,reason:string){
    return this.db.client.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${ownerId}::uuid FOR UPDATE`;
      const quote=await tx.manualQuote.findFirst({where:{id,ownerId}});if(!quote)throw new NotFoundException();
      if(!quote.invalidatedAt)await tx.manualQuote.update({where:{id},data:{invalidatedAt:new Date(),invalidationReason:reason}});
      return {invalidated:true};
    });
  }
  async refresh(ownerId:string,assetId:string){
    const asset=await this.assertAsset(ownerId,assetId);
    const availability=this.availability();if(availability!=='READY')return {status:availability};
    if(!asset.active||asset.market!=='B3'||asset.currency!=='BRL')return {status:'NO_COVERAGE'};
    const reservation=await this.repository.reserve(assetId,asset.ticker,this.env.quoteTtlMinutes*60000,this.env.brapiBudget);
    if(reservation.status!=='RESERVED'||typeof reservation.leaseId!=='string'||typeof reservation.requestId!=='string')return {status:reservation.status};
    const result=await this.provider.quote(asset.ticker);
    await this.repository.settle(assetId,asset.ticker,reservation.leaseId,reservation.requestId,result);
    if(result.status!=='OK')this.logger.warn(JSON.stringify({event:'market_provider_unavailable',status:result.status}));
    return {status:result.status};
  }
  async references(ownerId:string,assets:readonly {id:string;ticker:string;currency:string}[]):Promise<ValuationQuote[]>{
    if(!assets.length)return [];
    const ids=assets.map(a=>a.id);
    const manual=await this.db.client.manualQuote.findMany({where:{ownerId,assetId:{in:ids},invalidatedAt:null}});
    // Revoked/absent authorization hides previously stored provider data too.
    const external=this.env.brapiAuthorized?await this.db.client.$queryRaw<MarketQuote[]>`SELECT DISTINCT ON (q."assetId") q.* FROM "MarketQuote" q JOIN "Asset" a ON a.id=q."assetId" AND a.ticker=q.ticker WHERE q."assetId"=ANY(${ids}::uuid[]) ORDER BY q."assetId",q."fetchedAt" DESC,q.id DESC`:[];
    const attempts=this.env.brapiAuthorized?await this.db.client.$queryRaw<MarketRequest[]>`SELECT DISTINCT ON (ticker) * FROM "MarketRequest" WHERE ticker=ANY(${assets.map(a=>a.ticker)}::text[]) ORDER BY ticker,"startedAt" DESC,id DESC`:[];
    const manuals=new Map(manual.map(m=>[m.assetId,m])),externals=new Map(external.map(q=>[q.assetId,q])),statuses=new Map(attempts.map(a=>[a.ticker,a.status]));
    const now=Date.now(),ttl=this.env.quoteTtlMinutes*60000;
    return assets.map(asset=>{
      const m=manuals.get(asset.id),q=externals.get(asset.id);
      const effective=m?.effectiveAt??q?.effectiveAt??null;
      const fetched=m?.createdAt??q?.fetchedAt??null;
      const exists=Boolean(m||q),stale=effective!==null&&(now-effective.getTime()>ttl||!m&&fetched!==null&&now-fetched.getTime()>ttl);
      return {assetId:asset.id,price:m?.price.toFixed(12)??q?.price.toFixed(12)??null,currency:m?.currency??q?.currency??asset.currency,
        source:m?'MANUAL':q?'BRAPI':null,priceType:m?'MANUAL':q?'DELAYED':null,effectiveAt:effective?.toISOString()??null,fetchedAt:fetched?.toISOString()??null,
        status:!exists?'UNAVAILABLE':!effective?'UNKNOWN_TIME':stale?'STALE':m?'MANUAL':'VALID',
        providerStatus:statuses.get(asset.ticker)??this.availability()};
    });
  }
}
