const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {BrapiProvider,parseBrapi,parseBrapiText,providerPrice}=require('../dist/market/brapi.provider');
const {readEnvironment}=require('../dist/config/environment');
const original=global.fetch;after(()=>{global.fetch=original;});
const now=new Date('2026-10-28T12:00:00.000Z');
// Shape from official /api/v2/stocks/quote documentation; all fixture values are synthetic.
const fixture=(data={})=>({results:[{requestedSymbol:'PETR4',symbol:'PETR4',changed:false,data:{currency:'BRL',regularMarketPrice:20.25,regularMarketTime:'2026-10-28T11:30:00.000Z',...data}}],requestedAt:now.toISOString(),took:0});
const environment=readEnvironment({NODE_ENV:'test',BRAPI_API_TOKEN:'SYNTHETIC_TOKEN'});
test('v2 parser validates identity, precision, currency and effective time without inventing recency',()=>{
 assert.equal(parseBrapi(fixture(),'PETR4',now).quote.price,'20.250000000000');
 assert.equal(parseBrapi(fixture({regularMarketTime:null}),'PETR4',now).quote.effectiveAt,null);
 for(const invalid of [{}, {results:[]}, fixture({currency:'USD'}),fixture({regularMarketPrice:0}),fixture({regularMarketPrice:1.123456789}),fixture({regularMarketTime:'2027-01-01T00:00:00Z'}),fixture({regularMarketTime:123})])assert.equal(parseBrapi(invalid,'PETR4',now).status,'MALFORMED');
 assert.throws(()=>parseBrapiText(JSON.stringify(fixture()).replace('20.25','20.2500000000000000001'),'PETR4',now));
 const changed=fixture();changed.results[0].changed=true;assert.equal(parseBrapi(changed,'PETR4',now).status,'TICKER_CHANGED');
 for(const invalid of [NaN,Infinity,-1,0,'20',1e10,0.000000001])assert.throws(()=>providerPrice(invalid));
});
test('one ticker, Bearer only, fixed HTTPS origin, no query credential and no automatic retry',async()=>{
 let count=0;global.fetch=async(url,options)=>{count++;assert.equal(new URL(url).origin,'https://brapi.dev');assert.equal(new URL(url).pathname,'/api/v2/stocks/quote');assert.equal(new URL(url).search,'?symbols=PETR4');assert.equal(options.headers.Authorization,'Bearer SYNTHETIC_TOKEN');assert.equal(options.redirect,'error');return Response.json(fixture({regularMarketTime:null}));};
 const result=await new BrapiProvider(environment).quote('PETR4');assert.equal(result.status,'OK');assert.equal(count,1);
});
test('no token prevents HTTP; invalid token/coverage/429/5xx/malformed payloads have safe statuses',async()=>{
 global.fetch=()=>{throw new Error('must not fetch');};assert.equal((await new BrapiProvider(readEnvironment({NODE_ENV:'test'})).quote('PETR4')).status,'NO_TOKEN');
 for(const [code,status]of [[401,'INVALID_TOKEN'],[403,'ACCESS_DENIED'],[404,'NO_COVERAGE'],[429,'RATE_LIMIT'],[500,'PROVIDER_ERROR'],[503,'PROVIDER_ERROR']]){
  let count=0;global.fetch=async()=>{count++;return new Response('private provider details',{status:code,headers:{'Retry-After':'120'}});};
  const result=await new BrapiProvider(environment).quote('PETR4');assert.equal(result.status,status);assert.equal(count,1);if(code===429)assert.equal(result.retryAfterSeconds,120);assert.ok(!JSON.stringify(result).includes('private'));
 }
 global.fetch=async()=>new Response('not JSON');assert.equal((await new BrapiProvider(environment).quote('PETR4')).status,'MALFORMED');
 global.fetch=async()=>new Response('x'.repeat(70000));assert.equal((await new BrapiProvider(environment).quote('PETR4')).status,'MALFORMED');
 global.fetch=async()=>new Response(JSON.stringify(fixture()).replace('20.25','20.2500000000000000001'));assert.equal((await new BrapiProvider(environment).quote('PETR4')).status,'MALFORMED');
});
test('timeout aborts once and returns a bounded failure',async()=>{
 global.fetch=async(_url,options)=>new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});});
 const keepAlive=setInterval(()=>{},1000);
 try{assert.equal((await new BrapiProvider(environment).quote('PETR4')).status,'TIMEOUT');}finally{clearInterval(keepAlive);}
});
test('market configuration refuses unsafe budget/TTL and authorization without a separate grant reference',()=>{
 for(const e of [{BRAPI_REQUEST_BUDGET:'15000'},{QUOTE_TTL_MINUTES:'1'},{BRAPI_PROVIDER_ENABLED:'yes'},{BRAPI_DATA_USE_AUTHORIZED:'yes'},{BRAPI_API_TOKEN:'unsafe\ncredential'}])assert.throws(()=>readEnvironment(e));
});
