import { Injectable, Controller, Get, Post, Req, Query, Body, Param, UseGuards, Module, BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Equals, IsISO8601, IsString, IsUUID, Length, Matches } from 'class-validator';
import { valuePositions } from '@valunium/financial-core';
import { AuthModule } from '../auth/auth.module';
import { SessionAuthGuard } from '../auth/guards';
import type { IdentityRequest } from '../auth/types';
import { DashboardModule, DashboardService } from '../finance/dashboard';
import { QuoteService } from './quote.service';
import { QuoteRepository } from './quote.repository';
import { BrapiProvider, MarketDataProvider } from './brapi.provider';

class ManualDto {
  @IsUUID() assetId!: string;
  @IsString() @Matches(/^(0|[1-9]\d{0,25})(\.\d{1,12})?$/) price!: string;
  @IsISO8601({strict:true}) effectiveAt!: string;
  @Transform(({value}:{value:unknown})=>typeof value==='string'?value.trim():value)
  @IsString() @Length(1,500) reason!: string;
  @IsUUID() requestKey!: string;
  @Equals(true) confirmed!: true;
}
class ReasonDto {
  @Transform(({value}:{value:unknown})=>typeof value==='string'?value.trim():value)
  @IsString() @Length(1,500) reason!:string;
}
class RefreshDto { @IsUUID() assetId!:string }

@Injectable()
export class MarketValuationService {
  constructor(private readonly dashboard:DashboardService,private readonly quotes:QuoteService){}
  async read(ownerId:string,query:Record<string,string>){
    if(Object.keys(query).some(k=>!['portfolioId','to'].includes(k)))throw new BadRequestException();
    const today=new Date().toISOString().slice(0,10);
    const accounting=await this.dashboard.read(ownerId,query);
    if(accounting.to!==today)return {status:'HISTORICAL_VIEW',asOf:today,providerStatus:this.quotes.availability(),groups:[],manualAssets:[]};
    const positions=accounting.groups.flatMap(g=>g.positions.map(p=>({...p,currency:g.currency})));
    const assets=[...new Map(positions.map(p=>[p.assetId,{id:p.assetId,ticker:p.ticker,currency:p.currency}])).values()];
    const quotes=await this.quotes.references(ownerId,assets);
    const valued=valuePositions(positions,quotes);
    const groups=accounting.groups.map(g=>!g.complete?{currency:g.currency,complete:false,totalPositions:null,coveredPositions:null,marketValue:null,unrealized:null,unrealizedPercent:null,partialMarketValue:null,partialUnrealized:null,byAsset:[],rows:[]}:valued.find(v=>v.currency===g.currency)??{currency:g.currency,complete:true,totalPositions:0,coveredPositions:0,marketValue:'0.000000000000',unrealized:'0.000000000000',unrealizedPercent:null,partialMarketValue:'0.000000000000',partialUnrealized:'0.000000000000',byAsset:[],rows:[]});
    return {status:accounting.status,asOf:today,providerStatus:this.quotes.availability(),groups,manualAssets:assets};
  }
}
@Controller({path:'market',version:'1'}) @UseGuards(SessionAuthGuard)
class MarketController {
  constructor(private readonly quotes:QuoteService,private readonly valuation:MarketValuationService){}
  @Get('valuation')async read(@Req()req:IdentityRequest,@Query()q:Record<string,string>){return {data:await this.valuation.read(req.user.id,q)};}
  @Post('refresh')async refresh(@Req()req:IdentityRequest,@Body()input:RefreshDto){return {data:await this.quotes.refresh(req.user.id,input.assetId)};}
  @Post('manual')async manual(@Req()req:IdentityRequest,@Body()input:ManualDto){return {data:await this.quotes.manual(req.user.id,input)};}
  @Post('manual/:id/invalidate')async invalidate(@Req()req:IdentityRequest,@Param('id',ParseUUIDPipe)id:string,@Body()input:ReasonDto){return {data:await this.quotes.invalidate(req.user.id,id,input.reason)};}
  @Get('manual/:assetId')async history(@Req()req:IdentityRequest,@Param('assetId',ParseUUIDPipe)assetId:string,@Query()q:Record<string,string>){
    if(Object.keys(q).some(k=>k!=='page')||q.page&&!/^[1-9]\d{0,3}$/.test(q.page))throw new BadRequestException();
    return {data:await this.quotes.history(req.user.id,assetId,Number(q.page??'1'))};
  }
}
@Module({imports:[AuthModule,DashboardModule],controllers:[MarketController],providers:[QuoteService,QuoteRepository,MarketValuationService,{provide:MarketDataProvider,useClass:BrapiProvider}]})
export class MarketDataModule {}
