const {test}=require('node:test');
const assert=require('node:assert/strict');
const {MarketProviderPolicy,PERSONAL_REVIEW}=require('../dist/market/provider-policy');
const {PersonalQuoteCache}=require('../dist/market/personal-quote-cache');
const {readEnvironment}=require('../dist/config/environment');
const owner='11111111-1111-4111-8111-111111111111';
const personal={NODE_ENV:'development',BRAPI_API_TOKEN:'SYNTHETIC',BRAPI_PROVIDER_ENABLED:'true',BRAPI_MODE:'personal-memory',BRAPI_PERSONAL_USER_ID:owner,BRAPI_DATA_USE_AUTHORIZED:'true',BRAPI_TERMS_REFERENCE:PERSONAL_REVIEW};
const policy=(config)=>new MarketProviderPolicy(readEnvironment(config));
test('flags, arbitrary references and shared mode cannot grant shared storage or display',()=>{
 for(const reference of ['', 'https://brapi.dev/legal/terms-of-use','I approve',PERSONAL_REVIEW,'synthetic-disposable-fixtures']){
  const result=policy({...personal,BRAPI_MODE:'shared-postgres',BRAPI_TERMS_REFERENCE:reference}).resolve(owner);
  assert.equal(result.state,'TERMS_BLOCKED');assert.equal(result.storage,'NONE');assert.equal(result.sharing,false);
 }
 assert.equal(policy({BRAPI_API_TOKEN:'SYNTHETIC',BRAPI_DATA_USE_AUTHORIZED:'true'}).resolve(owner).state,'PROVIDER_DISABLED');
 assert.equal(policy({...personal,BRAPI_API_TOKEN:''}).resolve(owner).state,'NO_TOKEN');
});
test('reviewed personal mode binds the owner, loopback, purpose, TTL and volatile storage',()=>{
 const p=policy(personal);assert.equal(p.resolve(owner).effectiveMode,'PERSONAL_MEMORY');assert.equal(p.resolve(owner).storage,'MEMORY');assert.equal(p.resolve(owner).sharing,false);
 assert.equal(p.resolve('another-owner').state,'PERSONAL_ACCESS_ONLY');
 assert.equal(policy({...personal,HOST:'0.0.0.0'}).resolve(owner).state,'LOCAL_ONLY');
 assert.equal(policy({...personal,WEB_ORIGIN:'https://public.example'}).resolve(owner).state,'LOCAL_ONLY');
 assert.equal(policy({...personal,BRAPI_PERSONAL_USER_ID:''}).resolve(owner).state,'PERSONAL_OWNER_REQUIRED');
 assert.equal(policy({...personal,QUOTE_TTL_MINUTES:'61'}).resolve(owner).state,'POLICY_TTL_EXCEEDED');
 assert.equal(policy({...personal,BRAPI_TERMS_REFERENCE:'unreviewed'}).resolve(owner).state,'TERMS_BLOCKED');
});
test('NODE_ENV=test is not an operational licensing bypass and fixture policy rejects valunium_dev',()=>{
 const p=policy({...personal,NODE_ENV:'test',BRAPI_MODE:'shared-postgres',BRAPI_TERMS_REFERENCE:'synthetic-disposable-fixtures'});
 assert.equal(p.resolve(owner).state,'TERMS_BLOCKED');assert.equal(p.resolve(owner,'FIXTURE').state,'TERMS_BLOCKED');
 const real=policy({...personal,NODE_ENV:'test',DATABASE_URL:'postgresql://localhost/valunium_dev',SESSION_SECRET:'s'.repeat(48),BRAPI_MODE:'shared-postgres',BRAPI_TERMS_REFERENCE:'synthetic-disposable-fixtures'});
 assert.equal(real.resolve(owner,'FIXTURE').state,'TERMS_BLOCKED');
});
test('personal quote memory is isolated, expires, and clears on application shutdown',async()=>{
 const cache=new PersonalQuoteCache();const quote={price:'10.000000000000',currency:'BRL',effectiveAt:new Date(),fetchedAt:new Date()};
 cache.put(owner,'a','SYN05',quote,25);assert.equal(cache.get(owner,'a','SYN05').price,quote.price);assert.equal(cache.get('other','a','SYN05'),null);assert.equal(cache.get(owner,'a','RENAMED'),null);
 await new Promise(resolve=>setTimeout(resolve,50));assert.equal(cache.get(owner,'a','SYN05'),null);
 cache.put(owner,'a','SYN05',{...quote,fetchedAt:new Date()},10000);cache.onModuleDestroy();assert.equal(cache.get(owner,'a','SYN05'),null);
});
