/** Receivables ageing: who owes money, and how long it has been outstanding. */
import { allCompanies, companyEntries } from './statement.js';
import { today } from '../lib/dates.js';
import { c } from '../lib/format.js';

export const AGE_BUCKETS=[
  {key:'current',label:'Current',max:30,color:'#22c55e'},
  {key:'b30',label:'31–60 days',max:60,color:'#fbbf24'},
  {key:'b60',label:'61–90 days',max:90,color:'#fb923c'},
  {key:'b90',label:'Over 90 days',max:Infinity,color:'#f43f5e'}
];

export function daysBetween(iso,ref){
  if(!iso)return 0;
  return Math.floor((new Date(ref||today())-new Date(iso))/864e5);
}

export function ageCompany(company,ref){
  const entries=companyEntries(company);
  const open=[];          // unsettled work, oldest first
  let credit=0;           // payments waiting to be applied
  entries.forEach(x=>{
    if(x.received>0){credit+=x.received;return;}
    /* A negative receipt is a refund back to the customer — it increases what
       they owe, so it joins the queue as a charge rather than being skipped. */
    if(x.received<0){open.push({date:x.date,left:-x.received,
      work:x.work||'REFUND',employee:x.employee});return;}
    if(x.cost>0)open.push({date:x.date,left:x.cost,work:x.work,employee:x.employee});
  });
  // apply every payment against the oldest outstanding work
  for(const item of open){
    if(credit<=0)break;
    const take=Math.min(credit,item.left);
    item.left-=take;credit-=take;
  }
  const buckets={current:0,b30:0,b60:0,b90:0};
  let oldest=null;
  open.filter(i=>i.left>0.005).forEach(i=>{
    const age=daysBetween(i.date,ref);
    const b=AGE_BUCKETS.find(x=>age<=x.max)||AGE_BUCKETS[AGE_BUCKETS.length-1];
    buckets[b.key]+=i.left;
    if(!oldest||i.date<oldest)oldest=i.date;
  });
  const owed=Object.values(buckets).reduce((a,x)=>a+x,0);
  return{company,buckets,owed:Math.round(owed*100)/100,
    advance:Math.round(credit*100)/100,
    oldest,oldestDays:oldest?daysBetween(oldest,ref):0};
}

export function ageAll(ref){
  return allCompanies().map(c=>ageCompany(c,ref))
    .filter(r=>r.owed>0.005)
    .sort((a,b)=>b.buckets.b90-a.buckets.b90||b.owed-a.owed);
}
