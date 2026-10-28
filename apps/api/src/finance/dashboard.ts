import { Injectable, Controller, Get, Req, Query, UseGuards, Module, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionAuthGuard } from '../auth/guards';
import type { IdentityRequest } from '../auth/types';
import { Database } from '../core/database';
import { summarizeDashboard, calendar } from '@valunium/financial-core';
import type { FinancialEvent } from '@valunium/financial-core';
import { wire } from './finance.service';
@Injectable()
export class DashboardService {
 constructor(private readonly db:Database){}
 async read(ownerId:string,query:Record<string,string>){
  if(Object.keys(query).some(k=>!['portfolioId','from','to'].includes(k)))throw new BadRequestException();
  const to=query.to??new Date().toISOString().slice(0,10);
  const baseline=new Date(to+'T00:00:00Z');baseline.setUTCFullYear(baseline.getUTCFullYear()-1);
  const from=query.from??(Number.isNaN(baseline.getTime())?'invalid':baseline.toISOString().slice(0,10));
  try{calendar(from);calendar(to);if(from>to||(new Date(to).getTime()-new Date(from).getTime())/86400000>3660)throw new Error();}catch{throw new BadRequestException();}
  if(query.portfolioId&&!/^[0-9a-f-]{36}$/.test(query.portfolioId))throw new BadRequestException();
  return this.db.client.$transaction(async tx=>{
   const portfolios=await tx.portfolio.findMany({where:{ownerId,...(query.portfolioId?{id:query.portfolioId}:{})},orderBy:{createdAt:'asc'},take:501});
   if(query.portfolioId&&!portfolios.length)throw new NotFoundException();if(portfolios.length>500)throw new ServiceUnavailableException();
   const events=await tx.ledgerEvent.findMany({where:{portfolio:{ownerId},portfolioId:{in:portfolios.map(p=>p.id)},cancelled:false,date:{lte:new Date(to+'T00:00:00Z')}},include:{asset:{select:{id:true,ticker:true,assetClass:true}}},orderBy:[{date:'asc'},{sequence:'asc'}],take:50001});
   if(events.length>50000)throw new ServiceUnavailableException();
   const grouped=new Map<string,FinancialEvent[]>();for(const e of events){const list=grouped.get(e.portfolioId)??[];list.push({...wire(e),kind:e.kind as FinancialEvent['kind']});grouped.set(e.portfolioId,list);}
   try{return summarizeDashboard(portfolios.map(p=>({id:p.id,name:p.name,currency:p.baseCurrency,incomplete:p.historyIncomplete,events:grouped.get(p.id)??[]})),events.map(e=>e.asset),from,to);}catch{throw new ServiceUnavailableException();}
  },{isolationLevel:'RepeatableRead',timeout:20000});
 }
}
@Controller({path:'dashboard',version:'1'}) @UseGuards(SessionAuthGuard)
class DashboardController {
 constructor(private readonly dashboard:DashboardService){}
 @Get()async read(@Req()req:IdentityRequest,@Query()query:Record<string,string>){return {data:await this.dashboard.read(req.user.id,query)};}
}
@Module({imports:[AuthModule],controllers:[DashboardController],providers:[DashboardService],exports:[DashboardService]})export class DashboardModule{}
