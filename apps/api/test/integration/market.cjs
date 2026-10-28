const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {createApplication}=require('../../dist/application');
const {readEnvironment}=require('../../dist/config/environment');
const {Database}=require('../../dist/core/database');
const {MarketDataProvider}=require('../../dist/market/brapi.provider');
const {QuoteRepository}=require('../../dist/market/quote.repository');
const {QuoteService}=require('../../dist/market/quote.service');
let app,second,base,db,assetId,otherAsset,portfolioId,calls=0,manualId;
const origin='http://localhost:3000',password='Synthetic market password 05!';
const fixture=()=>({status:'OK',quote:{price:'20.000000000000',currency:'BRL',effectiveAt:new Date(Date.now()-10*60000),fetchedAt:new Date()}});
let provider=async()=>{calls++;return fixture();};
function client(){return {cookie:'',token:'',async request(path,method='GET',body){const r=await fetch(base+'/api/v1/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:this.cookie,'X-CSRF-Token':this.token},...(body?{body:JSON.stringify(body)}:{})});for(const c of r.headers.getSetCookie())if(c.startsWith('valunium.sid='))this.cookie=c.split(';')[0];return {status:r.status,data:(await r.json()).data};},async csrf(){this.token=(await this.request('auth/csrf')).data.csrfToken;},async register(email){await this.csrf();assert.equal((await this.request('auth/register','POST',{name:'Synthetic market user',email,password})).status,202);assert.equal((await this.request('auth/login','POST',{email,password})).status,200);await this.csrf();}};}
const a=client(),b=client();
const manual=(price='25')=>({assetId,price,effectiveAt:new Date(Date.now()-60000).toISOString(),reason:'Synthetic manually confirmed price',confirmed:true,requestKey:randomUUID()});
before(async()=>{
 assert.match(process.env.INTEGRATION_DATABASE_URL??'',/valunium_stage02_disposable/);assert.equal(process.env.DATABASE_URL,process.env.INTEGRATION_DATABASE_URL);
 const environment=readEnvironment({...process.env,BRAPI_API_TOKEN:'SYNTHETIC_FIXTURE_ONLY',BRAPI_DATA_USE_AUTHORIZED:'true',BRAPI_TERMS_REFERENCE:'Synthetic fixtures only; no external data',BRAPI_REQUEST_BUDGET:'10'});
 app=await createApplication(environment,false);second=await createApplication(environment,false);
 for(const instance of [app,second])instance.get(MarketDataProvider).quote=(...args)=>provider(...args);
 await app.listen(0,'127.0.0.1');base=await app.getUrl();await second.init();db=app.get(Database).client;
 await a.register('market.a@example.test');await b.register('market.b@example.test');
 assetId=(await a.request('assets','POST',{ticker:'SYN05',name:'Synthetic quote asset',assetClass:'STOCK',source:'Synthetic fixture'})).data.id;
 otherAsset=(await a.request('assets','POST',{ticker:'ALT05',name:'Synthetic second asset',assetClass:'ETF',source:'Synthetic fixture'})).data.id;
 portfolioId=(await a.request('portfolios','POST',{name:'Synthetic market portfolio'})).data.id;
 const trade=(id,q,p)=>({assetId:id,kind:'BUY',date:'2026-01-01',quantity:q,unitPrice:p,fees:'0',gross:'0',withholding:'0',note:'Synthetic fixture',requestKey:randomUUID()});
 assert.equal((await a.request(`portfolios/${portfolioId}/transactions`,'POST',trade(assetId,'12','17'))).status,201);
});
after(async()=>{await second?.close();await app?.close();});
test('private valuation requires a session, excludes other users and never calls provider during reads',async()=>{
 assert.equal((await client().request('market/valuation')).status,401);
 assert.equal((await b.request('market/valuation?portfolioId='+portfolioId)).status,404);
 const result=(await a.request('market/valuation?portfolioId='+portfolioId)).data;
 assert.equal(result.groups[0].marketValue,null);assert.equal(result.groups[0].coveredPositions,0);assert.equal(calls,0);
 assert.ok(!JSON.stringify(result).includes('market.a@example.test'));assert.ok(!JSON.stringify(result).includes('SYNTHETIC_FIXTURE_ONLY'));
 assert.equal((await b.request('market/refresh','POST',{assetId})).status,404);
 assert.equal((await a.request('market/refresh','POST',{assetId:otherAsset})).status,404);
});
test('confirmed private manual price persists, is idempotent and values only its owner positions',async()=>{
 const input=manual();const result=await a.request('market/manual','POST',input);assert.equal(result.status,201);manualId=result.data.id;
 assert.equal((await a.request('market/manual','POST',input)).data.id,manualId);
 assert.equal((await a.request('market/manual','POST',{...input,price:'26'})).status,409);
 assert.equal((await a.request('market/manual','POST',{...input,requestKey:randomUUID(),confirmed:false})).status,400);
 for(const price of ['0','-1','1.1234567890123','NaN'])assert.equal((await a.request('market/manual','POST',{...input,price,requestKey:randomUUID()})).status,400);
 assert.equal((await a.request('market/manual','POST',{...input,effectiveAt:'2099-01-01T00:00:00Z',requestKey:randomUUID()})).status,400);
 assert.equal((await b.request('market/manual','POST',manual())).status,404);
 assert.equal((await b.request('market/manual/'+assetId)).status,404);
 assert.equal((await b.request(`market/manual/${manualId}/invalidate`,'POST',{reason:'Attack'})).status,404);
 const theirs=(await b.request('portfolios','POST',{name:'Synthetic second owner'})).data.id;
 assert.equal((await b.request(`portfolios/${theirs}/transactions`,'POST',{assetId,kind:'BUY',date:'2026-01-01',quantity:'1',unitPrice:'10',fees:'0',gross:'0',withholding:'0',note:'Synthetic fixture',requestKey:randomUUID()})).status,201);
 assert.deepEqual((await b.request('market/manual/'+assetId)).data.items,[]);
 assert.equal((await b.request('market/valuation')).data.groups[0].rows[0].quote.price,null);
 const g=(await a.request('market/valuation')).data.groups[0];assert.equal(g.marketValue,'300.000000000000');assert.equal(g.unrealized,'96.000000000000');assert.equal(g.rows[0].quote.source,'MANUAL');
 const row=await db.manualQuote.findUniqueOrThrow({where:{id:manualId}});await assert.rejects(()=>db.manualQuote.update({where:{id:row.id},data:{price:'999'}}));await assert.rejects(()=>db.manualQuote.delete({where:{id:row.id}}));
});
test('concurrent manual replacements keep one active reference with preserved history, pagination and invalidation',async()=>{
 const results=await Promise.all([a.request('market/manual','POST',manual('26')),a.request('market/manual','POST',manual('27'))]);assert.ok(results.every(r=>r.status===201));
 const owner=(await a.request('auth/me')).data.id;assert.equal(await db.manualQuote.count({where:{ownerId:owner,assetId,invalidatedAt:null}}),1);
 const history=(await a.request('market/manual/'+assetId)).data;assert.equal(history.items.length,3);assert.equal(history.items.filter(q=>q.invalidatedAt).length,2);
 const active=history.items.find(q=>!q.invalidatedAt);assert.equal((await a.request(`market/manual/${active.id}/invalidate`,'POST',{reason:'Synthetic invalidation'})).status,201);assert.equal((await a.request('market/valuation')).data.groups[0].marketValue,null);
 for(let i=0;i<24;i++)await a.request('market/manual','POST',manual());
 assert.equal((await a.request('market/manual/'+assetId)).data.nextPage,2);assert.equal((await a.request('market/manual/'+assetId+'?page=2')).data.items.length,2);
 const last=await db.manualQuote.findFirst({where:{ownerId:owner,assetId,invalidatedAt:null}});await a.request(`market/manual/${last.id}/invalidate`,'POST',{reason:'Use external synthetic fixture'});
 const stale=await a.request('market/manual','POST',{...manual(),effectiveAt:new Date(Date.now()-2*3600000).toISOString()});
 const expired=(await a.request('market/valuation')).data.groups[0];assert.equal(expired.marketValue,null);assert.equal(expired.rows[0].status,'STALE');
 await a.request(`market/manual/${stale.data.id}/invalidate`,'POST',{reason:'Expired manual reference invalidated'});
});
test('single-flight across two Nest instances persists shared cache and reuses it without spending budget',async()=>{
 let release;provider=async()=>{calls++;await new Promise(resolve=>{release=resolve;});return fixture();};
 const first=a.request('market/refresh','POST',{assetId});
 for(let i=0;i<100&&!release;i++)await new Promise(resolve=>setTimeout(resolve,10));assert.ok(release);
 const owner=(await a.request('auth/me')).data.id;
 const concurrent=await second.get(QuoteService).refresh(owner,assetId);assert.equal(concurrent.status,'IN_PROGRESS');release();assert.equal((await first).data.status,'OK');
 const count=calls;assert.equal((await a.request('market/refresh','POST',{assetId})).data.status,'CACHED');assert.equal(calls,count);
 assert.equal((await a.request('market/valuation')).data.groups[0].marketValue,'240.000000000000');
 assert.equal(await db.marketRequest.count({where:{ticker:'SYN05'}}),1);assert.equal(await db.marketQuote.count({where:{assetId}}),1);
});
test('stale/missing effective times and historical filters suppress totals while retaining quote provenance',async()=>{
 await db.marketQuote.create({data:{assetId,ticker:'SYN05',price:'21',currency:'BRL',effectiveAt:new Date(Date.now()-2*3600000)}});
 let g=(await a.request('market/valuation')).data.groups[0];assert.equal(g.marketValue,null);assert.equal(g.rows[0].status,'STALE');assert.equal(g.rows[0].quote.price,'21.000000000000');
 await db.marketQuote.create({data:{assetId,ticker:'SYN05',price:'22',currency:'BRL'}});
 g=(await a.request('market/valuation')).data.groups[0];assert.equal(g.marketValue,null);assert.equal(g.rows[0].status,'UNKNOWN_TIME');
 assert.equal((await a.request('market/valuation?to=2026-01-01')).data.status,'HISTORICAL_VIEW');
 await a.request(`portfolios/${portfolioId}/positions/limitation`,'POST',{incomplete:true,reason:'Synthetic unsupported split'});
 g=(await a.request('market/valuation')).data.groups[0];assert.equal(g.totalPositions,null);assert.equal(g.marketValue,null);assert.deepEqual(g.rows,[]);
 await a.request(`portfolios/${portfolioId}/positions/limitation`,'POST',{incomplete:false,reason:'Synthetic reconciled history'});
});
test('429 cooldown and rolling budget survive service instances; existing prices and accounting are preserved',async()=>{
 // New owned asset has no cache, enabling a controlled provider error without rewriting immutable prices.
 const trade={assetId:otherAsset,kind:'BUY',date:'2026-01-01',quantity:'1',unitPrice:'10',fees:'0',gross:'0',withholding:'0',note:'Synthetic fixture',requestKey:randomUUID()};
 await a.request(`portfolios/${portfolioId}/transactions`,'POST',trade);
 provider=async()=>{calls++;return {status:'RATE_LIMIT',retryAfterSeconds:3600};};
 assert.equal((await a.request('market/refresh','POST',{assetId:otherAsset})).data.status,'RATE_LIMIT');const count=calls;
 assert.equal((await a.request('market/refresh','POST',{assetId:otherAsset})).data.status,'COOLDOWN');assert.equal(calls,count);
 const accounting=(await a.request('dashboard')).data;assert.equal(accounting.groups[0].cost,'214.000000000000');
 const repo=app.get(QuoteRepository);const reservation=await repo.reserve(otherAsset,'NEW05',3600000,1);assert.equal(reservation.status,'COOLDOWN');
 await db.marketProviderState.update({where:{id:'BRAPI'},data:{blockedUntil:null}});
 assert.equal((await repo.reserve(otherAsset,'NEW05',3600000,1)).status,'LOCAL_BUDGET');assert.equal(calls,count);
 const expiredAsset=await db.asset.create({data:{creatorId:(await a.request('auth/me')).data.id,ticker:'EXP05',name:'Synthetic expired cache',assetClass:'STOCK',source:'Synthetic fixture'}});
 await db.marketQuote.create({data:{assetId:expiredAsset.id,ticker:'EXP05',price:'10',currency:'BRL',effectiveAt:new Date(Date.now()-2*3600000),fetchedAt:new Date(Date.now()-2*3600000)}});
 const expiredReservation=await repo.reserve(expiredAsset.id,'EXP05',3600000,100);assert.equal(expiredReservation.status,'RESERVED');
 await repo.settle(expiredAsset.id,'EXP05',expiredReservation.leaseId,expiredReservation.requestId,fixture());
 assert.equal((await repo.reserve(expiredAsset.id,'EXP05',3600000,100)).status,'CACHED');assert.equal(await db.marketQuote.count({where:{assetId:expiredAsset.id}}),2);
});
test('missing token and absent provider permission block network independently without blocking manual valuation',async()=>{
 const owner=(await a.request('auth/me')).data.id;
 for(const config of [{BRAPI_DATA_USE_AUTHORIZED:'false',BRAPI_API_TOKEN:'SYNTHETIC'},{BRAPI_DATA_USE_AUTHORIZED:'false',BRAPI_API_TOKEN:''}]){
  const instance=await createApplication(readEnvironment({...process.env,...config}),false);
  try{await instance.init();const service=instance.get(QuoteService);assert.equal((await service.refresh(owner,assetId)).status,config.BRAPI_API_TOKEN?'TERMS_BLOCKED':'NO_TOKEN');assert.equal((await service.references(owner,[{id:assetId,ticker:'SYN05',currency:'BRL'}]))[0].price,null);
   const created=await service.manual(owner,manual('30'));const reference=(await service.references(owner,[{id:assetId,ticker:'SYN05',currency:'BRL'}]))[0];assert.equal(reference.status,'MANUAL');assert.equal(reference.price,'30.000000000000');await service.invalidate(owner,created.id,'Synthetic fallback test completed');
  }finally{await instance.close();}
 }
});
