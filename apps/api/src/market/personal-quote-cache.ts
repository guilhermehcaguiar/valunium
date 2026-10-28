import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import type { ProviderQuote } from './brapi.provider';

@Injectable()
export class PersonalQuoteCache implements OnModuleDestroy {
  private readonly values=new Map<string,{quote:ProviderQuote;expires:number;timer:ReturnType<typeof setTimeout>}>();
  private key(ownerId:string,assetId:string,ticker:string){return `${ownerId}:${assetId}:${ticker}`;}
  get(ownerId:string,assetId:string,ticker:string):ProviderQuote|null {
    const key=this.key(ownerId,assetId,ticker),entry=this.values.get(key);
    if(!entry)return null;if(entry.expires<=Date.now()){clearTimeout(entry.timer);this.values.delete(key);return null;}
    return entry.quote;
  }
  put(ownerId:string,assetId:string,ticker:string,quote:ProviderQuote,ttlMs:number):void {
    const key=this.key(ownerId,assetId,ticker),previous=this.values.get(key);if(previous)clearTimeout(previous.timer);
    const expires=quote.fetchedAt.getTime()+ttlMs,delay=Math.max(0,expires-Date.now());
    if(delay===0){this.values.delete(key);return;}
    const timer=setTimeout(()=>this.values.delete(key),delay);timer.unref();
    this.values.set(key,{quote,expires,timer});
  }
  onModuleDestroy(){for(const entry of this.values.values())clearTimeout(entry.timer);this.values.clear();}
}
