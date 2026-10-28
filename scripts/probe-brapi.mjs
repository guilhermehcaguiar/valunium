// Explicit one-shot diagnostic. No quote storage, dashboard display or raw provider body logging.
import 'dotenv/config';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {parseBrapiText}=require('../apps/api/dist/market/brapi.provider');
const candidates=[['PETR4','STOCK'],['VALE3','STOCK'],['ITUB4','STOCK'],['BBAS3','STOCK'],['ABEV3','STOCK'],['CMIG4','STOCK'],['HGLG11','FII'],['MXRF11','FII'],['BOVA11','ETF'],['IVVB11','ETF'],['NASD11','ETF'],['AAPL34','BDR'],['MSFT34','BDR'],['GOGL34','BDR']];
const token=process.env.BRAPI_API_TOKEN?.trim();
if(!process.argv.includes('--live')){console.log(JSON.stringify({status:'NOT RUN',reason:'Use --live for the explicit bounded diagnostic; this consumes up to 28 requests.'}));process.exit(0);}
if(!token){console.log(JSON.stringify({status:'BLOCKED',reason:'NO_TOKEN',tokenPresent:false}));process.exit(2);}
if(!/^[\x21-\x7e]+$/.test(token)||token.length>1024){console.log(JSON.stringify({status:'BLOCKED',reason:'INVALID_TOKEN_FORMAT'}));process.exit(2);}
let attempts=0,stop=null;
const rows=[];
async function get(path){
 if(attempts>=28)throw new Error('PROBE_BUDGET');attempts++;
 const response=await fetch('https://brapi.dev'+path,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6000)});
 if(!response.body)return {response,body:null};
 const reader=response.body.getReader();let text='',bytes=0;const decoder=new TextDecoder();
 try{for(;;){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.length;if(bytes>65536){await reader.cancel();throw new Error('OVERSIZED');}text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
 let body;try{body=JSON.parse(text);}catch{body=null;}
 return {response,body,text};
}
for(const [ticker,expectedClass]of candidates){
 const row={ticker,expectedClass,identityStatus:'NOT RUN',coverageHttp:null,quoteHttp:null,status:'NOT RUN',validPrice:false,effectiveAt:null,source:'BRAPI',quoteEndpoint:'/api/v2/stocks/quote',plan:'UNVERIFIED',requiredPlan:'UNVERIFIED'};
 if(stop){rows.push({...row,status:'BLOCKED',limitation:stop});continue;}
 try{
  const coverage=await get('/api/v2/tickers/coverage?symbols='+ticker);row.coverageHttp=coverage.response.status;
  if([401,429].includes(coverage.response.status)){stop=coverage.response.status===401?'INVALID_TOKEN':'RATE_LIMIT';rows.push({...row,status:'BLOCKED',limitation:stop});continue;}
  const identity=Array.isArray(coverage.body?.results)?coverage.body.results[0]:null;
  const actualClass=identity?.subType==='fii'?'FII':identity?.subType==='etf'?'ETF':identity?.subType==='bdr'?'BDR':identity?.subType==='stock'?'STOCK':null;
  row.actualClass=actualClass;
  const identified=coverage.response.ok&&identity?.requestedSymbol===ticker&&identity.symbol===ticker&&identity.changed===false&&identity.status==='available'&&actualClass===expectedClass;
  row.identityStatus=identified?'PASS':'BLOCKED';
  if(!identified||identity.availableData?.quote!==true||(identity.recommendedEndpoints?.quote!==undefined&&identity.recommendedEndpoints.quote!=='/api/v2/stocks/quote?symbols='+ticker)){rows.push({...row,status:'BLOCKED',limitation:'Identity/coverage not confirmed; no quote requested'});continue;}
  const result=await get('/api/v2/stocks/quote?symbols='+ticker);row.quoteHttp=result.response.status;
  const limit=result.response.headers.get('ratelimit-limit');if(limit==='15000')row.plan='FREE_LIMIT_OBSERVED';
  if(result.response.status===401){stop='INVALID_TOKEN';rows.push({...row,status:'BLOCKED',limitation:stop});continue;}
  if(result.response.status===429){stop='RATE_LIMIT';rows.push({...row,status:'BLOCKED',limitation:stop});continue;}
  if(result.response.status===403){row.requiredPlan=/\bpro\b/i.test(String(result.body?.message))?'PRO':/startup/i.test(String(result.body?.message))?'STARTUP':'NOT_GRANTED';rows.push({...row,status:row.plan==='FREE_LIMIT_OBSERVED'?'UNSUPPORTED_ON_FREE_PLAN':'ACCESS_DENIED',limitation:'403: no retry, no alternate endpoint or plan upgrade'});continue;}
  const parsed=parseBrapiText(result.text??'null',ticker,new Date());row.validPrice=result.response.ok&&parsed.status==='OK';row.effectiveAt=parsed.status==='OK'?parsed.quote.effectiveAt?.toISOString()??null:null;
  row.status=row.validPrice?'PASS':'FAIL';row.requiredPlan=row.validPrice&&row.plan==='FREE_LIMIT_OBSERVED'?'FREE_OBSERVED':'UNVERIFIED';
  rows.push(row);
 }catch{rows.push({...row,status:'BLOCKED',limitation:'Provider transport/schema failure; no retry'});}
 // Sequential, one symbol per call; this is not polling or a retry loop.
 await new Promise(resolve=>setTimeout(resolve,1100));
}
console.log(JSON.stringify({checkedAt:new Date().toISOString(),tokenPresent:true,attempts,mode:'DIAGNOSTIC_NO_QUOTE_STORAGE',rows},null,2));
