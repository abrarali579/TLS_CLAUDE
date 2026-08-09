/** Dashboard. */
import { switchView } from '../core/router.js';
import { D } from '../core/store.js';
import { companyBalances } from '../domain/accounts.js';
import { insuranceSoon } from '../domain/alerts.js';
import { DR, autoRange, dayspan, inRange, setDR, trendPoints } from '../domain/dashboard.js';
import { isBlankTx } from '../domain/rows.js';
import { setSS } from '../domain/statement.js';
import { fmtDate } from '../lib/dates.js';
import { $, el } from '../lib/dom.js';
import { esc, m0, n } from '../lib/format.js';
import { mkBtn } from '../ui/forms.js';
import { accentFor } from '../ui/theme.js';
import { kpiRow, svgLine } from '../ui/widgets.js';

export function renderDash(){
  const switched=autoRange();
  const T=$('#tools');T.innerHTML='';
  const sel=el('select','fld');sel.style.width='auto';
  [['0','All time'],['7','Last 7 days'],['30','Last 30 days'],['90','Last 90 days'],['365','Last 12 months']]
    .forEach(([v,l])=>sel.append(new Option(l,v)));
  sel.value=String(DR);
  sel.onchange=()=>{setDR(+sel.value);renderDash();};
  T.append(sel);
  mkBtn(T,'Print','',()=>print());

  const v=$('#view');v.innerHTML='';
  const wrap=el('div','fade dash');v.append(wrap);
  if(switched){
    const nb=el('div','note i c12');
    nb.innerHTML='<b>Showing all time.</b> There were no entries inside the period you picked, so the range was widened rather than showing you an empty dashboard.';
    wrap.append(nb);
  }

  const tx=D.transactions.filter(t=>inRange(t.date)&&!isBlankTx(t));
  const pay=D.payments.filter(p=>inRange(p.date));
  const rec=tx.reduce((a,t)=>a+n(t.received),0);
  const exp=tx.reduce((a,t)=>a+n(t.expense),0);
  const pro=rec-exp;
  const margin=rec?(pro/rec*100):0;
  const collected=pay.reduce((a,p)=>a+n(p.amount),0);

  /* ---- KPI band ---- */
  const k=el('div','c12');
  k.append(kpiRow([
    {t:'Sales / Received',v:m0(rec),s:`${tx.length} entries`,g:'indigo'},
    {t:'Work Expense',v:m0(exp),s:'cost of service',g:'rose'},
    {t:'Gross Profit',v:m0(pro),s:`${margin.toFixed(1)}% margin`,g:'teal'},
    {t:'Payments Collected',v:m0(collected),s:`${pay.length} receipts`,g:'amber'},
    {t:'Avg Daily Profit',v:m0(pro/Math.max(1,DR||dayspan())),s:'AED / day',g:'violet'}
  ]));
  wrap.append(k);

  /* ---- profit trend ---- (full width now that Cash & Bank has moved off the dashboard) */
  const trend=el('div','glass card c12');
  const th=el('div','ah');
  th.append(el('h3',null,'Profit Trend'));
  trend.append(th);
  const byDay={};
  tx.forEach(t=>{if(t.date)byDay[t.date]=(byDay[t.date]||0)+n(t.profit);});
  const days=Object.keys(byDay).sort();
  if(days.length>1){
    const pts=trendPoints(byDay);
    const grouped=pts.length<days.length;
    th.append(el('span','hint',grouped?`grouped by month · ${pts.length} months`:`${pts.length} days`));
    const box=el('div');box.style.color='var(--ink)';
    box.innerHTML=svgLine(pts,1200,270,'#6366f1','#6366f1');
    trend.append(box);
    const best=pts.reduce((a,p)=>p.v>a.v?p:a,pts[0]);
    const worst=pts.reduce((a,p)=>p.v<a.v?p:a,pts[0]);
    const lg=el('div','lgd');
    lg.innerHTML=`<span><i style="background:#22c55e"></i>Best ${esc(best.d)} · ${m0(best.v)}</span>
      <span><i style="background:#f43f5e"></i>Weakest ${esc(worst.d)} · ${m0(worst.v)}</span>
      <span style="margin-left:auto;color:var(--ink-3)">${esc(pts[0].d)} → ${esc(pts[pts.length-1].d)}</span>`;
    trend.append(lg);
  } else if(days.length===1){
    trend.append(el('div','empty',`Only one day of entries so far (${fmtDate(days[0])} · ${m0(byDay[days[0]])}). Add entries on another date and the trend line appears.`));
  } else {
    const e=el('div','empty');
    e.innerHTML='<div class="e">◔</div>No dated entries yet. Add rows on the Data Entry sheet and the trend builds itself.';
    trend.append(e);
  }
  wrap.append(trend);

  /* ---- receivables / advances ---- */
  const bals=companyBalances();
  const dueAll=bals.filter(x=>x.balance<0);
  const due=dueAll.slice(0,10);
  const advAll=bals.filter(x=>x.balance>0).sort((a,b)=>b.balance-a.balance);
  const adv=advAll.slice(0,10);

  const c1=el('div','glass card c4');
  const h1=el('div','ah');
  h1.append(el('h3',null,'Outstanding'));
  h1.append(el('span','hint',`${dueAll.length} companies · ${m0(dueAll.reduce((a,x)=>a-x.balance,0))} total`));
  c1.append(h1);
  if(!due.length)c1.append(el('div','empty','Every company is settled or in advance.'));
  const maxDue=Math.max(1,...due.map(x=>-x.balance));
  due.forEach((x,i)=>{
    const r=el('div','rankrow');r.style.cursor='pointer';
    r.innerHTML=`<div class="i">${i+1}</div><div class="nm">${esc(x.company)}
      <div class="bar"><i style="width:${(-x.balance/maxDue*100).toFixed(1)}%;background:linear-gradient(90deg,#9f1239,#f43f5e)"></i></div></div>
      <div class="v" style="color:var(--neg)">${m0(-x.balance)}</div>`;
    r.onclick=()=>{setSS({company:x.company,from:'',to:''});switchView('statement');};
    c1.append(r);
  });
  wrap.append(c1);

  const c2=el('div','glass card c4');
  const h2=el('div','ah');
  h2.append(el('h3',null,'Advances Held'));
  h2.append(el('span','hint',`${advAll.length} companies · ${m0(advAll.reduce((a,x)=>a+x.balance,0))} total`));
  c2.append(h2);
  if(!adv.length)c2.append(el('div','empty','No advances on file.'));
  const maxAdv=Math.max(1,...adv.map(x=>x.balance));
  adv.forEach((x,i)=>{
    const r=el('div','rankrow');r.style.cursor='pointer';
    r.innerHTML=`<div class="i">${i+1}</div><div class="nm">${esc(x.company)}
      <div class="bar"><i style="width:${(x.balance/maxAdv*100).toFixed(1)}%"></i></div></div>
      <div class="v" style="color:var(--pos)">${m0(x.balance)}</div>`;
    r.onclick=()=>{setSS({company:x.company,from:'',to:''});switchView('statement');};
    c2.append(r);
  });
  wrap.append(c2);

  /* ---- top work items ---- */
  const c3=el('div','glass card c4');
  const h3b=el('div','ah');
  h3b.append(el('h3',null,'Most Profitable Work'));
  c3.append(h3b);
  const byWork={};
  tx.forEach(t=>{const w=(t.work||'—').trim()||'—';
    if(!byWork[w])byWork[w]={c:0,p:0,r:0};
    byWork[w].c++;byWork[w].p+=n(t.profit);byWork[w].r+=n(t.received);});
  const tw=Object.entries(byWork).sort((a,b)=>b[1].p-a[1].p).slice(0,8);
  if(!tw.length)c3.append(el('div','empty','No work recorded in this range.'));
  const maxP=Math.max(1,...tw.map(([,x])=>x.p));
  tw.forEach(([w,x],i)=>{
    const r=el('div','rankrow');
    r.innerHTML=`<div class="i">${i+1}</div><div class="nm">${esc(w)}
      <div style="font-size:10px;color:var(--ink-3)">${x.c}× · ${m0(x.r)} received</div>
      <div class="bar"><i style="width:${(Math.max(0,x.p)/maxP*100).toFixed(1)}%"></i></div></div>
      <div class="v" style="color:${x.p<0?'var(--neg)':'var(--pos)'}">${m0(x.p)}</div>`;
    c3.append(r);
  });
  wrap.append(c3);

  /* ---- payment mix ---- */
  const c4=el('div','glass card c6');
  c4.append(el('h3',null,'Paid From — Volume Mix'));
  const mix={};
  tx.forEach(t=>{const p=t.paidFrom||'UNASSIGNED';mix[p]=(mix[p]||0)+n(t.expense);});
  const mixArr=Object.entries(mix).sort((a,b)=>b[1]-a[1]);
  const tot=mixArr.reduce((a,[,x])=>a+x,0)||1;
  const bar=el('div');bar.style.cssText='display:flex;height:26px;border-radius:8px;overflow:hidden;margin-bottom:11px;border:1px solid var(--stroke)';
  mixArr.forEach(([lbl,val])=>{
    const o=accentFor(lbl);const seg=el('div');
    seg.style.cssText=`width:${(val/tot*100).toFixed(2)}%;background:${o?o.color:'var(--field)'}`;
    seg.title=`${lbl}: ${m0(val)}`;bar.append(seg);
  });
  c4.append(bar);
  mixArr.slice(0,8).forEach(([lbl,val])=>{
    const o=accentFor(lbl);const r=el('div','rankrow');
    r.innerHTML=`<div class="i" style="background:${o?o.color:'var(--field)'}"></div>
      <div class="nm">${esc(lbl)}</div>
      <div class="v">${m0(val)} <span style="color:var(--ink-3);font-weight:600">${(val/tot*100).toFixed(1)}%</span></div>`;
    c4.append(r);
  });
  wrap.append(c4);

  /* ---- alerts ---- */
  const c5=el('div','glass card c6');
  c5.append(el('h3',null,'Attention Required'));
  const soon=insuranceSoon(30);
  const openVisa=D.visa.filter(x=>{const s=Object.values(x.steps);return s.some(Boolean)&&!s.every(Boolean);});
  const noPaid=D.transactions.filter(t=>!t.paidFrom&&n(t.expense)>0);
  const items=[
    {i:'⛨',t:`${soon.length} insurance policies expiring within 30 days`,c:soon.length?'w':'',go:'insurance'},
    {i:'✓',t:`${openVisa.length} visa files in progress`,c:'i',go:'visa'},
    {i:'₳',t:`${bals.filter(x=>x.balance<0).length} companies with an outstanding balance`,c:'bal',go:'companies'},
    {i:'⚠',t:`${noPaid.length} entries have an expense but no "Paid From" account`,c:noPaid.length?'w':'',go:'entry'}
  ];
  items.forEach(x=>{
    const r=el('div','rankrow');r.style.cursor='pointer';
    r.innerHTML=`<div class="i">${x.i}</div><div class="nm">${x.t}</div>
      <div class="v"><span class="badge ${x.c||'adv'}">open</span></div>`;
    r.onclick=()=>switchView(x.go);
    c5.append(r);
  });
  wrap.append(c5);
}
