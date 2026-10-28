import { Inject, Injectable } from '@nestjs/common';
import { ENVIRONMENT } from '../core/environment.token';
import type { Environment } from '../config/environment';

export const PERSONAL_REVIEW='brapi-personal-local-2026-10-28';
const evidence=[
  'https://brapi.dev/legal/terms-of-use',
  'https://brapi.dev/faq/o-plano-gratuito-tem-limitacoes-importantes',
  'https://brapi.dev/faq/a-brapi-e-distribuidora-licenciada-da-b3',
];
export interface ProviderPolicyView {
  provider:'BRAPI';state:string;requestedMode:string;effectiveMode:'DISABLED'|'PERSONAL_MEMORY'|'FIXTURE_POSTGRES';
  tokenConfigured:boolean;storage:'NONE'|'MEMORY'|'POSTGRES_FIXTURE';sharing:boolean;
  ttlMinutes:number|null;reviewReference:string|null;attribution:string;sources:readonly string[];
}
/** Reviewed capabilities are code, not arbitrary operator claims in an environment variable. */
@Injectable()
export class MarketProviderPolicy {
  constructor(@Inject(ENVIRONMENT)private readonly env:Environment){}
  resolve(ownerId:string|undefined,origin:'BRAPI'|'FIXTURE'='BRAPI'):ProviderPolicyView {
    const base:ProviderPolicyView={provider:'BRAPI',state:'PROVIDER_DISABLED',requestedMode:this.env.brapiMode,effectiveMode:'DISABLED',tokenConfigured:Boolean(this.env.brapiToken),storage:'NONE',sharing:false,ttlMinutes:null,reviewReference:null,attribution:'brapi.dev — referência de preço com atraso',sources:evidence};
    if(!this.env.brapiEnabled||this.env.brapiMode==='disabled')return base;
    if(!this.env.brapiToken)return {...base,state:'NO_TOKEN'};
    if(!this.env.brapiAuthorized)return {...base,state:'TERMS_BLOCKED'};
    // Fixtures require code-level provider replacement AND the existing isolated native test database.
    let isolated=false;
    try{const u=new URL(this.env.databaseUrl??'');isolated=this.env.nodeEnv==='test'&&u.pathname==='/valunium_stage02_disposable'&&Boolean(u.searchParams.get('host')?.startsWith('/tmp/valunium-stage02-'));}catch{/* deny */}
    if(origin==='FIXTURE'&&isolated&&this.env.brapiTermsReference==='synthetic-disposable-fixtures')return {...base,state:'READY',effectiveMode:'FIXTURE_POSTGRES',storage:'POSTGRES_FIXTURE',sharing:true,ttlMinutes:this.env.quoteTtlMinutes,reviewReference:'synthetic-disposable-fixtures',attribution:'Fixtures sintéticas em banco descartável',sources:[]};
    // No reviewed grant for shared Postgres/retention/SaaS: flags and a URL cannot enable that mode.
    if(this.env.brapiMode!=='personal-memory'||this.env.brapiTermsReference!==PERSONAL_REVIEW)return {...base,state:'TERMS_BLOCKED'};
    const localOrigins=['localhost','127.0.0.1','[::1]'];
    if(this.env.nodeEnv==='production'||!['127.0.0.1','::1'].includes(this.env.host)||!localOrigins.includes(new URL(this.env.webOrigin).hostname))return {...base,state:'LOCAL_ONLY'};
    if(!this.env.brapiPersonalUserId)return {...base,state:'PERSONAL_OWNER_REQUIRED'};
    if(this.env.quoteTtlMinutes>60)return {...base,state:'POLICY_TTL_EXCEEDED'};
    if(ownerId!==this.env.brapiPersonalUserId)return {...base,state:'PERSONAL_ACCESS_ONLY'};
    return {...base,state:'READY',effectiveMode:'PERSONAL_MEMORY',storage:'MEMORY',sharing:false,ttlMinutes:this.env.quoteTtlMinutes,reviewReference:PERSONAL_REVIEW};
  }
}
