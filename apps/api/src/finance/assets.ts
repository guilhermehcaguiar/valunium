import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards, Module, Injectable, NotFoundException, ConflictException, ParseUUIDPipe } from '@nestjs/common';
import { Database } from '../core/database';
import { AuthModule } from '../auth/auth.module';
import { SessionAuthGuard } from '../auth/guards';
import type { IdentityRequest } from '../auth/types';
import { AssetDto, AssetUpdateDto } from './dto';
const select={id:true,ticker:true,name:true,assetClass:true,market:true,currency:true,active:true,source:true} as const;
@Injectable()
export class AssetsService {
 constructor(private readonly db:Database){}
 list(){return this.db.client.asset.findMany({select,orderBy:{ticker:'asc'},take:1000});}
 async save(ownerId:string,input:AssetDto|AssetUpdateDto,id?:string){
  try{return await this.db.client.$transaction(async tx=>{
   if(id){await tx.asset.updateMany({where:{id,creatorId:ownerId},data:{updatedAt:new Date()}});const previous=await tx.asset.findFirst({where:{id,creatorId:ownerId}});if(!previous)throw new NotFoundException();
    const alias=await tx.assetAlias.findUnique({where:{market_ticker:{market:'B3',ticker:input.ticker}}});
    if(alias&&alias.assetId!==id)throw new ConflictException();
    if(!alias)await tx.assetAlias.create({data:{assetId:id,market:'B3',ticker:input.ticker}});
    const asset=await tx.asset.update({where:{id},data:{ticker:input.ticker,name:input.name,source:input.source,active:(input as AssetUpdateDto).active},select});
    await tx.assetChange.create({data:{assetId:id,snapshot:{actorId:ownerId,before:{ticker:previous.ticker,name:previous.name,source:previous.source,active:previous.active},after:asset}}});return asset;
   }
   const asset=await tx.asset.create({data:{...input as AssetDto,creatorId:ownerId},select});await tx.assetAlias.create({data:{assetId:asset.id,market:'B3',ticker:input.ticker}});await tx.assetChange.create({data:{assetId:asset.id,snapshot:{actorId:ownerId,after:asset}}});return asset;
  });}catch(error){if(typeof error==='object'&&error!==null&&'code'in error&&error.code==='P2002')throw new ConflictException();throw error;}
 }
}
@Controller({path:'assets',version:'1'}) @UseGuards(SessionAuthGuard)
class AssetsController {
 constructor(private readonly assets:AssetsService){}
 @Get() async list(){return {data:await this.assets.list()};}
 @Post() async create(@Req()req:IdentityRequest,@Body()input:AssetDto){return {data:await this.assets.save(req.user.id,input)};}
 @Patch(':id')async update(@Req()req:IdentityRequest,@Param('id',ParseUUIDPipe)id:string,@Body()input:AssetUpdateDto){return {data:await this.assets.save(req.user.id,input,id)};}
}
@Module({imports:[AuthModule],controllers:[AssetsController],providers:[AssetsService]})export class AssetsModule{}
