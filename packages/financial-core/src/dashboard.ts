import Decimal from 'decimal.js';
import { replay, eventValues } from './index';
import type { FinancialEvent, ReplayPosition } from './index';
const D = Decimal.clone({ precision: 80, rounding: Decimal.ROUND_HALF_EVEN });
const zero=()=>new D('0');
const out=(x:Decimal)=>x.isZero()?'0.000000000000':x.toFixed(12);
export interface DashboardHistory {id:string;name:string;currency:string;incomplete:boolean;events:FinancialEvent[]}
export interface DashboardAsset {id:string;ticker:string;assetClass:string}
export function summarizeDashboard(histories:DashboardHistory[],assets:DashboardAsset[],from:string,to:string){
 const assetMap=new Map(assets.map(a=>[a.id,a]));
 const currencies=[...new Set(histories.map(p=>p.currency))].sort();
 const portfolios=histories.map(p=>({id:p.id,name:p.name,currency:p.currency,incomplete:p.incomplete,eventCount:p.events.filter(e=>e.date>=from&&e.date<=to).length}));
 const groups=currencies.map(currency=>{
  const selected=histories.filter(p=>p.currency===currency),complete=selected.every(p=>!p.incomplete);
  if(!complete)return {currency,complete,cost:null,realized:null,income:null,openAssets:null,positions:[],byClass:[],byAsset:[],capital:[],incomeSeries:[],realizedSeries:[]};
  let cost=zero(),realized=zero(),income=zero();
  const positions:{portfolioId:string;assetId:string;ticker:string;assetClass:string;quantity:string;cost:string;averagePrice:string}[]=[];
  const classCosts=new Map<string,Decimal>(),assetCosts=new Map<string,Decimal>();
  const daily=new Map<string,{cost:Decimal;realized:Decimal;buys:Decimal;sales:Decimal}>();
  const monthly=new Map<string,{DIVIDEND:Decimal;JCP:Decimal;OTHER:Decimal}>();
  for(const p of selected){
   let finalStates: ReadonlyMap<string,Readonly<ReplayPosition>>=new Map();
   const prior=new Map<string,{cost:Decimal;realized:Decimal}>();
   replay(p.events.filter(e=>e.date<=to),(e,states)=>{
    const current=states.get(e.assetId)!;const previous=prior.get(e.assetId)??{cost:zero(),realized:zero()};
    const day=daily.get(e.date)??{cost:zero(),realized:zero(),buys:zero(),sales:zero()};
    day.cost=day.cost.add(current.cost.sub(previous.cost));day.realized=day.realized.add(current.realized.sub(previous.realized));
    prior.set(e.assetId,{cost:current.cost,realized:current.realized});
    if(e.kind==='BUY')day.buys=day.buys.add(new D(e.quantity).mul(e.unitPrice).add(e.fees));
    else if(e.kind==='SELL')day.sales=day.sales.add(new D(e.quantity).mul(e.unitPrice).sub(e.fees));
    else if(e.date>=from){const month=e.date.slice(0,7),m=monthly.get(month)??{DIVIDEND:zero(),JCP:zero(),OTHER:zero()};m[e.kind]=m[e.kind].add(new D(e.gross).sub(e.withholding));monthly.set(month,m);}
    daily.set(e.date,day);
    finalStates=states;
   });
   for(const [assetId,s] of finalStates){
    cost=cost.add(s.cost);realized=realized.add(s.realized);income=income.add(s.income);
    if(!s.quantity.isZero()){
     const a=assetMap.get(assetId);const ticker=a?.ticker??assetId,assetClass=a?.assetClass??'OTHER';
     positions.push({portfolioId:p.id,assetId,ticker,assetClass,quantity:out(s.quantity),cost:out(s.cost),averagePrice:out(s.cost.div(s.quantity))});
     classCosts.set(assetClass,(classCosts.get(assetClass)??zero()).add(s.cost));assetCosts.set(assetId,(assetCosts.get(assetId)??zero()).add(s.cost));
    }
   }
   finalStates=new Map();
  }
  let running=zero();const capital:{label:string;cost:string;buys:string;sales:string}[]=[],realizedSeries:{label:string;realized:string}[]=[];
  for(const [date,day] of [...daily].sort(([a],[b])=>a<b?-1:a>b?1:0)){
   running=running.add(day.cost);if(date>=from){capital.push({label:date,cost:out(running),buys:out(day.buys),sales:out(day.sales)});realizedSeries.push({label:date,realized:out(day.realized)});}
  }
  return {currency,complete,cost:out(cost),realized:out(realized),income:out(income),openAssets:new Set(positions.map(p=>p.assetId)).size,positions,
   byClass:[...classCosts].sort(([a],[b])=>a<b?-1:1).map(([label,value])=>({label,value:out(value)})),
   byAsset:[...assetCosts].sort(([a],[b])=>a<b?-1:1).map(([id,value])=>({label:assetMap.get(id)?.ticker??id,value:out(value)})),capital,realizedSeries,
   incomeSeries:[...monthly].sort(([a],[b])=>a<b?-1:1).map(([label,m])=>({label,DIVIDEND:out(m.DIVIDEND),JCP:out(m.JCP),OTHER:out(m.OTHER)}))};
 });
 const recent=histories.flatMap(p=>p.events.filter(e=>e.date>=from&&e.date<=to).map(e=>({id:e.id,portfolioId:p.id,portfolio:p.name,currency:p.currency,assetId:e.assetId,ticker:assetMap.get(e.assetId)?.ticker??e.assetId,date:e.date,sequence:e.sequence,kind:e.kind,...eventValues(e)}))).sort((a,b)=>a.date>b.date?-1:a.date<b.date?1:BigInt(a.sequence)>BigInt(b.sequence)?-1:1);
 return {portfolios,totalPortfolios:histories.length,eventCount:portfolios.reduce((n,p)=>n+p.eventCount,0),status:groups.some(g=>!g.complete)?'INCOMPLETE_HISTORY':groups.length>1?'MIXED_CURRENCIES':'COMPLETE',groups,
  recentTransactions:recent.filter(e=>['BUY','SELL'].includes(e.kind)).slice(0,8),recentIncome:recent.filter(e=>!['BUY','SELL'].includes(e.kind)).slice(0,8),from,to,quoteStatus:'UNAVAILABLE' as const};
}
