import { Module, Controller, Get, Post, Patch, Body, Param, Req, Query, UseGuards, ParseUUIDPipe, HttpCode } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionAuthGuard } from '../auth/guards';
import type { IdentityRequest } from '../auth/types';
import { FinanceService } from './finance.service';
import { EventDto, CancelDto, LimitationDto } from './dto';

@Controller({path:'portfolios/:portfolioId/transactions',version:'1'}) @UseGuards(SessionAuthGuard)
class TransactionsController {
 constructor(private readonly finance:FinanceService){}
 @Get()async list(@Req()r:IdentityRequest,@Param('portfolioId',ParseUUIDPipe)p:string,@Query()q:Record<string,string>){return {data:await this.finance.list(r.user.id,p,false,q)};}
 @Post()async create(@Req()r:IdentityRequest,@Param('portfolioId',ParseUUIDPipe)p:string,@Body()input:EventDto){return {data:await this.finance.mutate(r.user.id,p,input,false)};}
 @Patch(':id')async update(@Req()r:IdentityRequest,@Param('portfolioId',ParseUUIDPipe)p:string,@Param('id',ParseUUIDPipe)id:string,@Body()input:EventDto){return {data:await this.finance.mutate(r.user.id,p,input,false,id)};}
 @Post(':id/cancel') @HttpCode(200)async cancel(@Req()r:IdentityRequest,@Param('portfolioId',ParseUUIDPipe)p:string,@Param('id',ParseUUIDPipe)id:string,@Body()input:CancelDto){return {data:await this.finance.cancel(r.user.id,p,id,input,false)};}
 @Get(':id/revisions')async audit(@Req()r:IdentityRequest,@Param('portfolioId',ParseUUIDPipe)p:string,@Param('id',ParseUUIDPipe)id:string){return {data:await this.finance.revisions(r.user.id,p,id)};}
}
@Module({imports:[AuthModule],controllers:[TransactionsController],providers:[FinanceService]})export class TransactionsModule{}

@Controller({path:'portfolios/:portfolioId/income',version:'1'}) @UseGuards(SessionAuthGuard)
class IncomeEventsController {
 constructor(private readonly finance:FinanceService){}
 @Get()async list(@Req()r:IdentityRequest,@Param('portfolioId',ParseUUIDPipe)p:string,@Query()q:Record<string,string>){return {data:await this.finance.list(r.user.id,p,true,q)};}
 @Post()async create(@Req()r:IdentityRequest,@Param('portfolioId',ParseUUIDPipe)p:string,@Body()input:EventDto){return {data:await this.finance.mutate(r.user.id,p,input,true)};}
 @Patch(':id')async update(@Req()r:IdentityRequest,@Param('portfolioId',ParseUUIDPipe)p:string,@Param('id',ParseUUIDPipe)id:string,@Body()input:EventDto){return {data:await this.finance.mutate(r.user.id,p,input,true,id)};}
 @Post(':id/cancel') @HttpCode(200)async cancel(@Req()r:IdentityRequest,@Param('portfolioId',ParseUUIDPipe)p:string,@Param('id',ParseUUIDPipe)id:string,@Body()input:CancelDto){return {data:await this.finance.cancel(r.user.id,p,id,input,true)};}
 @Get(':id/revisions')async audit(@Req()r:IdentityRequest,@Param('portfolioId',ParseUUIDPipe)p:string,@Param('id',ParseUUIDPipe)id:string){return {data:await this.finance.revisions(r.user.id,p,id)};}
}
@Module({imports:[AuthModule],controllers:[IncomeEventsController],providers:[FinanceService]})export class IncomeEventsModule{}

@Controller({path:'portfolios/:portfolioId/positions',version:'1'}) @UseGuards(SessionAuthGuard)
class PositionsController {
 constructor(private readonly finance:FinanceService){}
 @Get()async list(@Req()r:IdentityRequest,@Param('portfolioId',ParseUUIDPipe)p:string){return {data:await this.finance.positions(r.user.id,p)};}
 @Post('limitation')async limitation(@Req()r:IdentityRequest,@Param('portfolioId',ParseUUIDPipe)p:string,@Body()input:LimitationDto){return {data:await this.finance.limitation(r.user.id,p,input.incomplete,input.reason)};}
}
@Module({imports:[AuthModule],controllers:[PositionsController],providers:[FinanceService]})export class PositionsModule{}
