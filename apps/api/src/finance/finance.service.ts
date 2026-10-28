import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { replay, eventValues, normalizeDecimal, calendar } from '@valunium/financial-core';
import type { FinancialEvent } from '@valunium/financial-core';
import { Database } from '../core/database';
import type { Prisma, LedgerEvent } from '../generated/prisma/client';
import type { EventDto, CancelDto } from './dto';
export function wire(e: LedgerEvent) {
 return { ...e, sequence: e.sequence.toString(), date: e.date.toISOString().slice(0,10), quantity: e.quantity.toFixed(12), unitPrice: e.unitPrice.toFixed(12), fees: e.fees.toFixed(12), gross: e.gross.toFixed(12), withholding: e.withholding.toFixed(12), createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString() };
}
const core = (e: LedgerEvent) => ({ ...wire(e), kind: e.kind as FinancialEvent['kind'] });
@Injectable()
export class FinanceService {
 constructor(private readonly db: Database) {}
 async owned(ownerId: string, id: string) {
  const p = await this.db.client.portfolio.findFirst({where:{id,ownerId}}); if(!p) throw new NotFoundException(); return p;
 }
 private async lock(tx: Prisma.TransactionClient, ownerId: string, id: string) {
  const result = await tx.portfolio.updateMany({where:{id,ownerId,archivedAt:null},data:{updatedAt:new Date()}});
  if(!result.count) { const p=await tx.portfolio.findFirst({where:{id,ownerId}}); if(!p) throw new NotFoundException(); throw new BadRequestException('Carteira arquivada'); }
 }
 private validate(input: EventDto) {
  try {
   calendar(input.date); if(input.date>new Date().toISOString().slice(0,10)) throw new Error('FUTURE_DATE');
   for(const key of ['quantity','unitPrice','fees','gross','withholding'] as const) input[key]=normalizeDecimal(input[key]);
   const trade=['BUY','SELL'].includes(input.kind);
   if(trade && (input.gross!=='0.000000000000'||input.withholding!=='0.000000000000')) throw new Error('CALCULATED_FIELD');
   if(!trade && [input.quantity,input.unitPrice,input.fees].some(x=>x!=='0.000000000000')) throw new Error('INVALID_INCOME');
   if(input.kind==='OTHER'&&!input.note.trim()) throw new Error('DOCUMENTATION_REQUIRED');
   eventValues({...input,kind:input.kind as FinancialEvent['kind']});
  } catch { throw new BadRequestException('Confira valores, data e observação.'); }
 }
 async mutate(ownerId: string, portfolioId: string, input: EventDto, income: boolean, id?: string) {
  this.validate(input);
  if(income === ['BUY','SELL'].includes(input.kind)) throw new BadRequestException();
  const payload={assetId:input.assetId,kind:input.kind,date:new Date(input.date+'T00:00:00Z'),quantity:input.quantity,unitPrice:input.unitPrice,fees:input.fees,gross:input.gross,withholding:input.withholding,note:input.note};
  const fingerprint=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return this.db.client.$transaction(async tx=>{
   await this.lock(tx,ownerId,portfolioId);
   const previous=id?await tx.ledgerEvent.findFirst({where:{id,portfolioId,kind:{in:income?['DIVIDEND','JCP','OTHER']:['BUY','SELL']}}}):null;
   if(id&&!previous) throw new NotFoundException();
   if(previous&&(previous.cancelled||previous.version!==input.version||!input.reason?.trim()||previous.requestKey!==input.requestKey)) throw new ConflictException();
   if(!id) { const duplicate=await tx.ledgerEvent.findUnique({where:{portfolioId_requestKey:{portfolioId,requestKey:input.requestKey}}}); if(duplicate){if(duplicate.fingerprint!==fingerprint)throw new ConflictException();return {...wire(duplicate),...eventValues(core(duplicate))};} }
   const asset=await tx.asset.findUnique({where:{id:input.assetId}});
   if(!asset||(!asset.active&&(!previous||previous.assetId!==asset.id))||asset.currency!=='BRL') throw new BadRequestException();
   const event=previous?await tx.ledgerEvent.update({where:{id:previous.id},data:{...payload,version:{increment:1}}}):await tx.ledgerEvent.create({data:{...payload,portfolioId,requestKey:input.requestKey,fingerprint}});
   await this.check(tx,portfolioId);
   await tx.ledgerRevision.create({data:{portfolioId,actorId:ownerId,resourceId:event.id,reason:input.reason??'Registro histórico',before:previous?wire(previous):{},after:wire(event)}});
   return {...wire(event),...eventValues(core(event))};
  },{timeout:20000});
 }
 private async check(tx: Prisma.TransactionClient,portfolioId: string) {
  const events=await tx.ledgerEvent.findMany({where:{portfolioId,cancelled:false},take:10001});
  try { replay(events.map(core)); } catch { throw new BadRequestException('O histórico resultaria em venda sem quantidade disponível ou excede o limite suportado.'); }
 }
 async cancel(ownerId: string,portfolioId: string,id: string,input: CancelDto,income: boolean) {
  return this.db.client.$transaction(async tx=>{
   await this.lock(tx,ownerId,portfolioId);
   const previous=await tx.ledgerEvent.findFirst({where:{id,portfolioId,kind:{in:income?['DIVIDEND','JCP','OTHER']:['BUY','SELL']}}});
   if(!previous)throw new NotFoundException(); if(previous.version!==input.version||previous.cancelled)throw new ConflictException();
   const event=await tx.ledgerEvent.update({where:{id},data:{cancelled:true,version:{increment:1}}});await this.check(tx,portfolioId);
   await tx.ledgerRevision.create({data:{portfolioId,actorId:ownerId,resourceId:id,reason:input.reason,before:wire(previous),after:wire(event)}});return {...wire(event),...eventValues(core(event))};
  },{timeout:20000});
 }
 async list(ownerId:string,portfolioId:string,income:boolean,query:Record<string,string>) {
  await this.owned(ownerId,portfolioId);
  if(Object.keys(query).some(k=>!['page','assetId','from','to','kind','cancelled'].includes(k))) throw new BadRequestException();
  const page=query.page??'1'; if(!/^[1-9]\d{0,5}$/.test(page))throw new BadRequestException();
  try{if(query.from)calendar(query.from);if(query.to)calendar(query.to);}catch{throw new BadRequestException();}
  if(query.assetId&&!/^[0-9a-f-]{36}$/.test(query.assetId))throw new BadRequestException();
  const kinds=income?['DIVIDEND','JCP','OTHER']:['BUY','SELL'];if(query.kind&&!kinds.includes(query.kind))throw new BadRequestException();
  const where: Prisma.LedgerEventWhereInput={portfolioId,kind:{in:query.kind?[query.kind]:kinds},...(query.assetId?{assetId:query.assetId}:{}),...(query.cancelled==='true'?{}:{cancelled:false}),...(query.from||query.to?{date:{...(query.from?{gte:new Date(query.from)}:{}),...(query.to?{lte:new Date(query.to)}:{})}}:{})};
  const rows=await this.db.client.ledgerEvent.findMany({where,orderBy:[{date:'asc'},{sequence:'asc'}],skip:(Number(page)-1)*25,take:26});
  return {items:rows.slice(0,25).map(e=>({...wire(e),...eventValues(core(e))})),nextPage:rows.length>25?Number(page)+1:null};
 }
 async positions(ownerId:string,portfolioId:string) {
  const p=await this.owned(ownerId,portfolioId);
  if(p.historyIncomplete)return {status:'INCOMPLETE_HISTORY',items:[],quoteStatus:'UNAVAILABLE'};
  const events=await this.db.client.ledgerEvent.findMany({where:{portfolioId,cancelled:false},take:10001});
  return {status:'SUPPORTED_HISTORY',items:replay(events.map(core)),quoteStatus:'UNAVAILABLE'};
 }
 async revisions(ownerId:string,portfolioId:string,id:string) {await this.owned(ownerId,portfolioId);return this.db.client.ledgerRevision.findMany({where:{portfolioId,resourceId:id},orderBy:{createdAt:'asc'},take:100});}
 async limitation(ownerId:string,portfolioId:string,incomplete:boolean,reason:string) {
  return this.db.client.$transaction(async tx=>{await this.lock(tx,ownerId,portfolioId);const old=await tx.portfolio.findUniqueOrThrow({where:{id:portfolioId}});await tx.portfolio.update({where:{id:portfolioId},data:{historyIncomplete:incomplete}});await tx.ledgerRevision.create({data:{portfolioId,actorId:ownerId,resourceId:portfolioId,reason,before:{incomplete:old.historyIncomplete},after:{incomplete}}});return {incomplete};});
 }
}
