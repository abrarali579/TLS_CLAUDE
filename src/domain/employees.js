/** Per-employee work history and the profit each one brought in. */
import { D } from '../core/store.js';
import { fmtDate } from '../lib/dates.js';
import { el } from '../lib/dom.js';
import { esc, m0, n } from '../lib/format.js';
import { modal } from '../ui/modal.js';

export function employeeList(){return [...new Set([...(D.employees||[]).map(e=>e.name),
  ...D.transactions.map(t=>t.employee).filter(Boolean)])].sort();}

export function workList(){return [...new Set([...(D.rates||[]).map(r=>r.item),
  ...D.transactions.map(t=>t.work).filter(Boolean)])].sort();}

export function employeeStats(){
  const map={};
  const touch=nm=>{if(!map[nm])map[nm]={name:nm,companies:new Set(),jobs:0,received:0,expense:0,
    profit:0,first:'',last:'',works:{}};return map[nm];};
  (D.employees||[]).forEach(e=>{const a=touch(e.name);if(e.company)a.companies.add(e.company);a.note=e.note;});
  D.transactions.forEach(t=>{
    const nm=(t.employee||'').trim();if(!nm)return;
    const a=touch(nm);
    if(t.company)a.companies.add(t.company);
    a.jobs++;a.received+=n(t.received);a.expense+=n(t.expense);a.profit+=n(t.profit);
    if(t.work)a.works[t.work]=(a.works[t.work]||0)+1;
    if(t.date){if(!a.first||t.date<a.first)a.first=t.date;if(!a.last||t.date>a.last)a.last=t.date;}
  });
  // visa progress
  D.visa.forEach(v=>{
    const nm=(v.employee||'').trim();if(!nm||!map[nm])return;
    const steps=Object.keys(v.steps);
    map[nm].visaDone=steps.filter(s=>v.steps[s]).length;
    map[nm].visaTotal=steps.length;
  });
  // insurance
  D.insurance.forEach(i=>{
    const nm=(i.worker||'').trim().toUpperCase();
    // exact match only — a startsWith match here would attribute "ALI KHAN"'s
    // insurance to an unrelated employee simply named "ALI"
    const hit=Object.keys(map).find(k=>k.toUpperCase()===nm);
    if(hit&&i.expiry){if(!map[hit].insExpiry||i.expiry>map[hit].insExpiry)map[hit].insExpiry=i.expiry;}
  });
  return Object.values(map).map(a=>({...a,
    companies:[...a.companies],
    topWork:Object.entries(a.works).sort((x,y)=>y[1]-x[1])[0]||null
  })).sort((a,b)=>b.profit-a.profit);
}

export function employeeHistory(name){
  const rows=D.transactions.filter(t=>(t.employee||'').trim()===name)
    .sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const body=el('div');
  const tot=rows.reduce((a,t)=>({r:a.r+n(t.received),e:a.e+n(t.expense),p:a.p+n(t.profit)}),{r:0,e:0,p:0});
  const s=el('div','hint');
  s.innerHTML=`<b style="color:var(--ink)">${rows.length}</b> jobs &nbsp;·&nbsp; received <b style="color:var(--ink)">${m0(tot.r)}</b>
    &nbsp;·&nbsp; expense <b style="color:var(--ink)">${m0(tot.e)}</b>
    &nbsp;·&nbsp; profit <b style="color:${tot.p<0?'var(--neg)':'var(--pos)'}">${m0(tot.p)}</b>`;
  body.append(s);
  const t=el('table','list');
  t.innerHTML='<thead><tr><th style="width:104px">Date</th><th>Company</th><th>Work</th>'+
    '<th style="width:80px;text-align:right">Rec</th><th style="width:80px;text-align:right">Exp</th>'+
    '<th style="width:80px;text-align:right">Profit</th></tr></thead>';
  const tb=el('tbody');
  rows.slice(0,200).forEach(x=>{const tr=el('tr');
    tr.innerHTML=`<td>${fmtDate(x.date)}</td><td>${esc(x.company)}</td><td>${esc(x.work)}</td>
      <td class="n">${m0(x.received)}</td><td class="n">${m0(x.expense)}</td>
      <td class="n" style="color:${n(x.profit)<0?'var(--neg)':'var(--pos)'}">${m0(x.profit)}</td>`;
    tb.append(tr);});
  t.append(tb);
  const box=el('div');box.style.cssText='max-height:52vh;overflow:auto;margin-top:10px';
  box.append(t);body.append(box);
  modal(name,body,[{label:'Close'}]);
}
