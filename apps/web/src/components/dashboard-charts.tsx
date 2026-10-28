 'use client';
import { useEffect,useRef } from 'react';
import { init,use } from 'echarts/core';
import { BarChart,LineChart } from 'echarts/charts';
import { GridComponent,TooltipComponent,LegendComponent,AriaComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { DashboardRow } from '@valunium/shared';
import { visualNumber,dateLabel } from '../lib/display';
use([BarChart,LineChart,GridComponent,TooltipComponent,LegendComponent,AriaComponent,SVGRenderer]);
export default function DashboardChart({rows,series,line=false}:{rows:DashboardRow[];series:{key:string;name:string}[];line?:boolean}){
 const element=useRef<HTMLDivElement>(null);
 const supported=rows.every(r=>series.every(s=>visualNumber(r[s.key]??'')!==null));
 useEffect(()=>{
  if(!element.current||!supported)return;
  const chart=init(element.current,undefined,{renderer:'svg'});
  chart.setOption({animation:false,color:['#C9A646','#E5D3A1','#7EA4BF','#C45555'],aria:{enabled:true},
   textStyle:{fontFamily:'Inter,system-ui,sans-serif',color:'#C8C2B8'},grid:{left:64,right:14,top:20,bottom:78},
   tooltip:{trigger:'axis',renderMode:'richText',confine:true,backgroundColor:'#121315',borderColor:'#C9A646',textStyle:{color:'#F5F3EF'},valueFormatter:(v:unknown)=>typeof v==='number'?new Intl.NumberFormat('pt-BR',{maximumFractionDigits:6}).format(v):String(v)},
   legend:{bottom:0,textStyle:{color:'#C8C2B8',fontSize:10},type:'scroll'},
   xAxis:{type:'category',data:rows.map(r=>dateLabel(r.label)),axisLabel:{color:'#C8C2B8',fontSize:11,hideOverlap:true},axisLine:{lineStyle:{color:'#77716A'}}},
   yAxis:{type:'value',axisLabel:{color:'#C8C2B8',fontSize:11,formatter:(v:number)=>new Intl.NumberFormat('pt-BR',{notation:'compact'}).format(v)},splitLine:{lineStyle:{color:'#303136'}}},
   series:series.map((s,i)=>({name:s.name,type:line?'line':'bar',...(line?{step:'end',showSymbol:false,lineStyle:{width:2,type:i===1?'dashed':'solid'}}:{barMaxWidth:44}),data:rows.map(r=>visualNumber(r[s.key]??''))}))});
  const observer=new ResizeObserver(()=>chart.resize());observer.observe(element.current);
  return()=>{observer.disconnect();chart.dispose();};
 },[rows,series,line,supported]);
 if(!supported)return <p className="chart-note">Gráfico indisponível nesta faixa de precisão. Consulte os valores exatos na tabela.</p>;
 return <div ref={element} className="chart-canvas" role="img" aria-label="Gráfico em moeda de negociação; representação aproximada. Valores exatos na tabela abaixo."/>;
}
