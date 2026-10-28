const {test}=require('node:test');
const assert=require('node:assert/strict');
const {valuePositions,replay}=require('../dist');
const p={portfolioId:'p',assetId:'a',ticker:'SYN05',currency:'BRL',quantity:'12',cost:'212',averagePrice:'17.666666666667'};
const q={assetId:'a',price:'20',currency:'BRL',source:'MANUAL',priceType:'MANUAL',effectiveAt:'2026-10-28T00:00:00Z',fetchedAt:'2026-10-28T00:00:00Z',status:'MANUAL',providerStatus:'NO_TOKEN'};
test('valuation preserves accounting and computes positive/negative unrealized values with Decimal',()=>{
 const g=valuePositions([p],[q])[0];assert.equal(g.marketValue,'240.000000000000');assert.equal(g.unrealized,'28.000000000000');assert.equal(g.unrealizedPercent,'13.207547169811');assert.equal(g.coveredPositions,1);
 assert.deepEqual(g.byAsset,[{label:'SYN05',value:'240.000000000000'}]);
 assert.equal(valuePositions([p],[{...q,price:'10'}])[0].unrealized,'-92.000000000000');assert.equal(p.cost,'212');
});
test('missing, stale, unknown timestamps, invalid prices, mixed currency and incomplete histories are excluded',()=>{
 for(const quote of [undefined,{...q,status:'STALE'},{...q,status:'UNKNOWN_TIME'},{...q,price:'0'},{...q,price:'-1'},{...q,price:'NaN'},{...q,currency:'USD'}]){
  const result=valuePositions([p],quote?[quote]:[])[0];assert.equal(result.complete,false);assert.equal(result.marketValue,null);assert.equal(result.partialMarketValue,null);assert.equal(result.coveredPositions,0);
 }
 const incomplete=valuePositions([p],[q],true)[0];assert.equal(incomplete.marketValue,null);assert.equal(incomplete.rows[0].status,'INCOMPLETE_HISTORY');
});
test('partial coverage is explicit and currencies are never converted or summed',()=>{
 const other={...p,assetId:'b',ticker:'OTHER'};
 const g=valuePositions([p,other],[q])[0];assert.equal(g.totalPositions,2);assert.equal(g.coveredPositions,1);assert.equal(g.marketValue,null);assert.equal(g.partialMarketValue,'240.000000000000');assert.equal(g.partialUnrealized,'28.000000000000');
 assert.deepEqual(g.byAsset,[]);assert.equal(valuePositions([p,{...p,portfolioId:'p2'}],[q])[0].byAsset[0].value,'480.000000000000');
 const groups=valuePositions([p,{...p,currency:'USD',assetId:'usd'}],[q,{...q,assetId:'usd',currency:'USD'}]);assert.equal(groups.length,2);assert.equal(groups[1].currency,'USD');
});
test('zero positions and zero cost have mathematically defined behavior',()=>{
 const empty=valuePositions([{...p,quantity:'0',cost:'0'}],[])[0];assert.equal(empty.marketValue,'0.000000000000');assert.equal(empty.totalPositions,0);assert.equal(empty.unrealizedPercent,null);
 assert.equal(valuePositions([{...p,cost:'0'}],[q])[0].unrealizedPercent,null);
 assert.deepEqual(valuePositions([],[]),[]);assert.throws(()=>valuePositions([{...p,quantity:'0'}],[]));
});
test('large/very small decimals do not round intermediates or use Number',()=>{
 const large=valuePositions([{...p,quantity:'9007199254740993.123456789012',cost:'1'}],[{...q,price:'0.000000000001'}])[0];assert.equal(large.marketValue,'9007.199254740993');
 const small={...p,quantity:'0.000000000001',cost:'0'};
 const exact=valuePositions([small,{...small,portfolioId:'p2'}],[{...q,price:'0.5'}])[0];assert.equal(exact.marketValue,'0.000000000001'); // aggregate before output rounding
 const derived=valuePositions([{...p,quantity:'100000000000000000000000000',cost:'10000000000000000000000000000'}],[{...q,price:'100'}])[0];assert.equal(derived.unrealized,'0.000000000000');
});
test('partial sale with fees keeps realized and income independent of market variation',()=>{
 const event=(id,kind,quantity,unitPrice,fees='0',gross='0')=>({id,assetId:'a',kind,date:'2026-01-01',sequence:id,quantity,unitPrice,fees,gross,withholding:'0'});
 const accounting=replay([event('1','BUY','10','20'),event('2','SELL','5','25','1'),event('3','DIVIDEND','0','0','0','10')])[0];
 const market=valuePositions([{...p,...accounting}],[{...q,price:'30'}])[0];assert.equal(accounting.realized,'24.000000000000');assert.equal(accounting.income,'10.000000000000');assert.equal(market.unrealized,'50.000000000000');assert.equal(market.marketValue,'150.000000000000');
});
