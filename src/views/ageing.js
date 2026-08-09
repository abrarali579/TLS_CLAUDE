/** Receivables Ageing. */
import { audit, save } from '../core/persist.js';
import { switchView } from '../core/router.js';
import { D } from '../core/store.js';
import { AGE_BUCKETS, ageAll } from '../domain/ageing.js';
import { buildStatement, setSS } from '../domain/statement.js';
import { csv } from '../lib/csv.js';
import { fmtDate, today } from '../lib/dates.js';
import { $, el } from '../lib/dom.js';
import { esc, m0 } from '../lib/format.js';
import { dl } from '../ui/download.js';
import { mkBtn } from '../ui/forms.js';
import { openPDF, pdfBank, pdfHeader } from '../ui/pdf.js';
import { toast } from '../ui/toast.js';
import { gw, kpiRow } from '../ui/widgets.js';

export function renderAgeing(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'↓ CSV','',()=>{
    const R=ageAll();
    dl(new Blob([csv([['COMPANY','CURRENT','31-60','61-90','OVER 90','TOTAL OWED','OLDEST ITEM','DAYS'],
      ...R.map(r=>[r.company,r.buckets.current,r.buckets.b30,r.buckets.b60,r.buckets.b90,
        r.owed,r.oldest||'',r.oldestDays])])],
      {type:'text/csv'}),`receivables-ageing-${today()}.csv`);});
  mkBtn(T,'Statements for all','p',batchStatements);

  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const R=ageAll();
  const tot=k=>R.reduce((a,r)=>a+r.buckets[k],0);
  const grand=R.reduce((a,r)=>a+r.owed,0);

  wrap.append(kpiRow([
    {t:'Total Receivable',v:m0(grand),s:`${R.length} companies`,g:'indigo'},
    {t:'Current',v:m0(tot('current')),s:'within 30 days',g:'teal'},
    {t:'31–90 Days',v:m0(tot('b30')+tot('b60')),s:'chase these',g:'amber'},
    {t:'Over 90 Days',v:m0(tot('b90')),s:'at risk',g:'rose'}
  ]));

  /* proportion bar */
  const bar=el('div','glass card');
  bar.append(el('h3',null,'How old is the money owed'));
  const strip=el('div');
  strip.style.cssText='display:flex;height:30px;border-radius:10px;overflow:hidden;border:1px solid var(--stroke-2)';
  AGE_BUCKETS.forEach(b=>{
    const val=tot(b.key);if(!val)return;
    const d=el('div');
    d.style.cssText=`width:${(val/Math.max(1,grand)*100).toFixed(2)}%;background:${b.color};
      display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;
      font-weight:800;white-space:nowrap;overflow:hidden`;
    d.textContent=m0(val);d.title=`${b.label}: ${m0(val)}`;
    strip.append(d);
  });
  if(!grand)strip.append(el('div','',''));
  bar.append(strip);
  const lg=el('div','lgd');
  lg.innerHTML=AGE_BUCKETS.map(b=>
    `<span><i style="background:${b.color}"></i>${b.label} · ${m0(tot(b.key))}</span>`).join('');
  bar.append(lg);
  wrap.append(bar);

  const card=el('div','glass card');
  const h=el('div','ah');
  h.append(el('h3',null,'By Company'));
  h.append(el('span','hint','oldest debt first'));
  card.append(h);
  const gw=el('div','gridwrap');gw.style.maxHeight='calc(100vh - 470px)';
  const t=el('table','list');
  t.innerHTML=`<thead><tr><th style="min-width:200px">Company</th>
    <th style="width:110px;text-align:right">Current</th>
    <th style="width:110px;text-align:right">31–60</th>
    <th style="width:110px;text-align:right">61–90</th>
    <th style="width:110px;text-align:right">Over 90</th>
    <th style="width:120px;text-align:right">Total</th>
    <th style="width:110px">Oldest</th>
    <th style="width:110px"></th></tr></thead>`;
  const tb=el('tbody');
  if(!R.length){
    const tr=el('tr'),td=el('td');td.colSpan=8;
    td.innerHTML='<div class="empty"><div class="e">✓</div>Nothing outstanding — every company is settled or in advance.</div>';
    tr.append(td);tb.append(tr);
  }
  R.forEach(r=>{
    const tr=el('tr');
    const cell=(k,col)=>r.buckets[k]?`<b style="color:${col}">${m0(r.buckets[k])}</b>`:'<span style="color:var(--ink-3)">—</span>';
    tr.innerHTML=`<td><b>${esc(r.company)}</b></td>
      <td class="n">${cell('current','var(--pos)')}</td>
      <td class="n">${cell('b30','#d97706')}</td>
      <td class="n">${cell('b60','#ea580c')}</td>
      <td class="n">${cell('b90','var(--neg)')}</td>
      <td class="n"><b>${m0(r.owed)}</b></td>
      <td style="font-size:11.5px">${r.oldest?fmtDate(r.oldest)+`<div style="font-size:10px;color:var(--ink-3)">${r.oldestDays} days</div>`:'—'}</td>
      <td class="c"></td>`;
    const b=el('button','btn sm','Statement');
    b.onclick=()=>{setSS({company:r.company,from:'',to:''});switchView('statement');};
    tr.lastChild.append(b);
    tb.append(tr);
  });
  const tf=el('tfoot');
  tf.innerHTML=`<tr><td class="l">TOTAL · ${R.length} COMPANIES</td>
    <td>${m0(tot('current'))}</td><td>${m0(tot('b30'))}</td>
    <td>${m0(tot('b60'))}</td><td>${m0(tot('b90'))}</td>
    <td>${m0(grand)}</td><td colspan="2"></td></tr>`;
  t.append(tb,tf);gw.append(t);card.append(gw);
  card.append(el('div','hint','Payments are applied to the oldest work first, so whatever is left unpaid keeps the date of the work it belongs to. Companies holding an advance are not listed.'));
  wrap.append(card);
}

export function batchStatements(){
  const R=ageAll();
  if(!R.length){toast('Nothing outstanding to chase',1);return;}
  if(!confirm(`Build statements for all ${R.length} companies with a balance?\n\nThey open in one print view — use your browser's Save as PDF.`))return;

  const S=D.settings;
  const pages=R.map((r,idx)=>{
    const st=buildStatement(r.company,'','');
    const rows=st.lines.map((x,i)=>
      `<tr class="${x.received>0?'pay':(i%2?'alt':'')}"><td class="c">${fmtDate(x.date)}</td>
       <td>${esc(x.employee)}</td><td>${esc(x.work)}</td>
       <td class="r">${x.cost?m0(x.cost):'—'}</td><td class="r">${x.received?m0(x.received):'—'}</td>
       <td class="r">${m0(x.balance)}</td></tr>`).join('');
    return `<div class="sheet" style="${idx?'page-break-before:always':''}">
      ${pdfHeader()}
      <div class="ttl">STATEMENT OF ACCOUNT<small>${esc(r.company.toUpperCase())}</small></div>
      <div class="rule"></div>
      <div class="meta"><span>Generated ${fmtDate(today())}</span>
        <span>Oldest item ${r.oldest?fmtDate(r.oldest)+` (${r.oldestDays} days)`:'—'}</span></div>
      <table style="margin-bottom:10px"><tr>
        <th>Current</th><th>31–60</th><th>61–90</th><th>Over 90</th><th>Total Due</th></tr>
        <tr><td class="r">${m0(r.buckets.current)}</td><td class="r">${m0(r.buckets.b30)}</td>
        <td class="r">${m0(r.buckets.b60)}</td><td class="r">${m0(r.buckets.b90)}</td>
        <td class="r"><b>${m0(r.owed)}</b></td></tr></table>
      <table><thead><tr><th style="width:66px">Date</th><th>Employee</th><th>Work</th>
        <th style="width:56px;text-align:right">Cost</th><th style="width:60px;text-align:right">Received</th>
        <th style="width:66px;text-align:right">Balance</th></tr></thead>
        <tbody>${rows}
        <tr class="tot"><td colspan="3">TOTAL</td><td class="r">${m0(st.totalCost)}</td>
        <td class="r">${m0(st.totalRec)}</td><td class="r">${m0(st.closing)}</td></tr></tbody></table>
      ${pdfBank()}
      <div class="foot">For any questions concerning this statement, please contact our Accounts Department —
        Call/WhatsApp ${esc(S.phone)}, Landline 04 575 5373, or email Contact@timelink.ae.</div>
      <div class="ty">Thank you for your continued business!</div>
    </div>`;
  }).join('');

  openPDF(`Statements — ${R.length} companies`,pages);
  audit('export','statements',`${R.length} companies`);save();
}
