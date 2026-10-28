/** Presentation only. Never used as input to accounting calculations. */
export function money(value:string|null,currency='BRL'):string {
 if(value===null)return 'Indisponível';
 if(!/^-?\d+\.\d{12}$/.test(value))return 'Indisponível';
 const negative=value.startsWith('-'),[whole='0',fraction='']=value.replace('-','').split('.');
 let cents=BigInt(whole)*100n+BigInt(fraction.slice(0,2));
 const tail=BigInt(fraction.slice(2)),half=5000000000n;
 if(tail>half||(tail===half&&cents%2n===1n))cents++;
 const integer=new Intl.NumberFormat('pt-BR').format(cents/100n);
 return `${negative&&cents!==0n?'−':''}${currency==='BRL'?'R$':currency} ${integer},${(cents%100n).toString().padStart(2,'0')}`;
}
export const exact=(value:string)=>value.replace('.',',');
/** Bounded approximate projection exclusively for SVG coordinates. */
export function visualNumber(value:string):number|null {
 if(!/^-?\d+\.\d{12}$/.test(value))return null;
 const n=Number(value);
 return Number.isFinite(n)&&Math.abs(n)<=1e12&&(n===0||Math.abs(n)>=1e-8)?n:null;
}

export function dateLabel(value:string):string {const classes:Record<string,string>={STOCK:'Ações',FII:'FIIs',ETF:'ETFs',BDR:'BDRs',OTHER:'Outras'};if(classes[value])return classes[value];return /^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('/'):/^\d{4}-\d{2}$/.test(value)?value.slice(5)+'/'+value.slice(0,4):value;}
