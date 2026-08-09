/**
 * Statement of account for one company: every entry, what was paid, what is
 * still owed, and the running balance.
 */
import { D } from '../core/store.js';
import { c, n } from '../lib/format.js';

export let SS={company:'',from:'',to:''};

export function companyEntries(c){
  const out=[];
  D.transactions.forEach((t,i)=>{
    if((t.company||'').trim()!==c)return;
    const cost=n(t.received),work=(t.work||'').trim();
    if(!work&&cost===0)return;
    out.push({date:t.date,employee:(t.employee||'COMPANY WORK').trim()||'COMPANY WORK',work,cost,received:0,seq:i});
  });
  D.payments.forEach((p,i)=>{
    if((p.company||'').trim()!==c)return;
    const rec=n(p.amount);if(!rec)return;
    out.push({date:p.date,employee:'PAYMENT RECEIVED',work:(p.remark||'PAYMENT RECEIVED').trim(),cost:0,received:rec,seq:1e5+i});
  });
  out.sort((a,b)=>a.date===b.date?a.seq-b.seq:String(a.date).localeCompare(String(b.date)));
  return out;
}

export function buildStatement(c,from,to){
  const all=companyEntries(c);let rows,opening=null;
  if(from&&to){
    opening=all.filter(x=>x.date<from).reduce((a,x)=>a+x.received-x.cost,0);
    rows=all.filter(x=>x.date>=from&&x.date<=to);
  } else rows=all;
  let bal=opening===null?0:opening;
  const lines=rows.map(x=>{bal+=x.received-x.cost;return{...x,balance:Math.round(bal*100)/100};});
  return{opening,lines,totalCost:rows.reduce((a,x)=>a+x.cost,0),
    totalRec:rows.reduce((a,x)=>a+x.received,0),closing:Math.round(bal*100)/100};
}

export function allCompanies(){
  return [...new Set([...D.transactions.map(t=>t.company),...D.payments.map(p=>p.company)])].filter(Boolean).sort();
}

/** Replace SS — imported bindings cannot be assigned directly. */
export function setSS(v) {
  SS = v;
  return SS;
}
