/** Statement of Account, with PDF and WhatsApp sharing. */
import { audit, save } from '../core/persist.js';
import { D } from '../core/store.js';
import { SS, allCompanies, buildStatement, setSS } from '../domain/statement.js';
import { waNumber } from '../domain/whatsapp.js';
import { csv } from '../lib/csv.js';
import { daysAgo, fmtDate, today } from '../lib/dates.js';
import { $, el } from '../lib/dom.js';
import { esc, m0 } from '../lib/format.js';
import { bindAC } from '../ui/autocomplete.js';
import { dl } from '../ui/download.js';
import { field, input, mkBtn } from '../ui/forms.js';
import { openPDF, pdfBank, pdfHeader } from '../ui/pdf.js';
import { toast } from '../ui/toast.js';
import { gw, kpiRow } from '../ui/widgets.js';

export function renderStatement(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'↓ Export PDF','p',exportStatementPDF);
  mkBtn(T,'WhatsApp','g',shareStatementWA);
  mkBtn(T,'↓ CSV','',exportStatementCSV);

  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const c=el('div','glass card noprint');
  const r=el('div','row');
  const ci=input(SS.company,'text','start typing a company…');
  bindAC(ci,allCompanies,{
    onPick:()=>setTimeout(go,10),
    onKey:e=>{if(e.key==='Enter')go();}
  });
  const fc=field('Company',ci);fc.style.minWidth='260px';fc.style.flex='2';
  const q=el('select','fld');
  [['','Lifetime'],['7','Last 7 days'],['15','Last 15 days'],['30','Last 30 days'],['90','Last 90 days'],['180','Last 6 months'],['365','Last 12 months']]
    .forEach(([val,l])=>q.append(new Option(l,val)));
  const a=input(SS.from,'date'),b=input(SS.to,'date');
  q.onchange=()=>{if(!q.value){a.value='';b.value='';}else{a.value=daysAgo(+q.value);b.value=today();}go();};
  const fq=field('Range',q);fq.style.flex='0 0 160px';
  const fa=field('From',a);fa.style.flex='0 0 150px';
  const fb=field('To',b);fb.style.flex='0 0 150px';
  r.append(fc,fq,fa,fb);
  const g=el('button','btn p','Generate');g.onclick=go;
  const rs=el('button','btn','Reset');rs.onclick=()=>{setSS({company:'',from:'',to:''});renderStatement();};
  r.append(g,rs);c.append(r);wrap.append(c);
  const out=el('div');out.id='stout';wrap.append(out);
  function go(){setSS({company:ci.value.trim(),from:a.value,to:b.value});drawStatement();}
  if(SS.company)drawStatement();else drawStatement();
}

export function drawStatement(){
  const out=$('#stout');out.innerHTML='';
  const{company,from,to}=SS;
  if(!company){
    out.innerHTML='<div class="glass card"><div class="empty"><div class="e">▤</div>Choose a company to generate its statement of account.</div></div>';
    return;
  }
  const s=buildStatement(company,from,to);
  if(!s.lines.length&&s.opening===null){
    out.innerHTML='<div class="glass card"><div class="empty"><div class="e">∅</div>No transactions found for <b>'+esc(company)+'</b>.</div></div>';
    return;
  }
  out.append(kpiRow([
    {t:'Total Cost',v:m0(s.totalCost),s:'billed to client'},
    {t:'Total Received',v:m0(s.totalRec),s:'payments in',c:'pos'},
    {t:s.closing<0?'Balance Due':'Advance Held',v:m0(Math.abs(s.closing)),s:'AED',c:s.closing<0?'neg':'pos',a:1},
    {t:'Entries',v:s.lines.length+(s.opening!==null?1:0),s:from&&to?`${fmtDate(from)} → ${fmtDate(to)}`:'lifetime'}
  ]));

  const card=el('div','glass card');
  const h=el('div');h.style.marginBottom='12px';
  h.innerHTML=`<div style="font-size:16px;font-weight:800;letter-spacing:.3px">${esc(company)}</div>
    <div class="hint" style="padding:3px 0 0">Statement of account · ${from&&to?`${fmtDate(from)} to ${fmtDate(to)}`:'lifetime'}</div>`;
  card.append(h);
  const gw=el('div','gridwrap');gw.style.maxHeight='calc(100vh - 380px)';
  const t=el('table','st');
  t.innerHTML=`<thead><tr><th style="width:110px">Date</th><th style="min-width:150px">Employee</th>
    <th style="min-width:170px">Work / Remark</th><th style="width:96px;text-align:center">Cost</th>
    <th style="width:96px;text-align:center">Received</th><th style="width:110px;text-align:center">Balance</th>
    <th style="width:64px;text-align:center">Type</th></tr></thead>`;
  const tb=el('tbody');
  if(s.opening!==null){
    const tr=el('tr','open');
    tr.innerHTML=`<td class="c">${fmtDate(from)}</td><td>PREVIOUS BALANCE</td><td>OPENING BALANCE</td>
      <td class="c">—</td><td class="c">—</td><td class="c">${m0(s.opening)}</td>
      <td class="c"><span class="badge ${s.opening<0?'bal':'adv'}">${s.opening<0?'Bal':'Adv'}</span></td>`;
    tb.append(tr);
  }
  s.lines.forEach(x=>{
    const tr=el('tr',x.received>0?'pay':null);
    tr.innerHTML=`<td class="c">${fmtDate(x.date)}</td><td>${esc(x.employee)}</td><td>${esc(x.work)}</td>
      <td class="c">${x.cost?m0(x.cost):'—'}</td><td class="c">${x.received?m0(x.received):'—'}</td>
      <td class="c" style="font-weight:700;color:${x.balance<0?'var(--neg)':'var(--pos)'}">${m0(x.balance)}</td>
      <td class="c"><span class="badge ${x.balance<0?'bal':'adv'}">${x.balance<0?'Bal':'Adv'}</span></td>`;
    tb.append(tr);
  });
  const tr=el('tr','tot');
  tr.innerHTML=`<td colspan="3" style="text-align:right;letter-spacing:1px">TOTAL</td>
    <td class="c">${m0(s.totalCost)}</td><td class="c">${m0(s.totalRec)}</td>
    <td class="c">${m0(s.closing)}</td><td class="c">${s.closing<0?'Bal':'Adv'}</td>`;
  tb.append(tr);t.append(tb);gw.append(t);card.append(gw);out.append(card);
}

export function exportStatementCSV(){
  if(!SS.company){toast('Select a company first',1);return;}
  const s=buildStatement(SS.company,SS.from,SS.to);
  const rows=[['DATE','EMPLOYEE','WORK','COST','RECEIVED','BALANCE','TYPE']];
  if(s.opening!==null)rows.push([SS.from,'PREVIOUS BALANCE','OPENING BALANCE',0,0,s.opening,s.opening<0?'Bal':'Adv']);
  s.lines.forEach(x=>rows.push([x.date,x.employee,x.work,x.cost,x.received,x.balance,x.balance<0?'Bal':'Adv']));
  rows.push(['','','TOTAL',s.totalCost,s.totalRec,s.closing,s.closing<0?'Bal':'Adv']);
  dl(new Blob([csv(rows)],{type:'text/csv'}),`statement-${SS.company.replace(/[^\w]+/g,'_')}-${today()}.csv`);
}

export function exportStatementPDF(){
  if(!SS.company){toast('Select a company first',1);return;}
  const{company,from,to}=SS,s=buildStatement(company,from,to);
  let i=0;const R=[];
  if(s.opening!==null)R.push(`<tr class="open"><td class="c">${fmtDate(from)}</td><td>PREVIOUS BALANCE</td>
    <td>OPENING BALANCE</td><td class="r">—</td><td class="r">—</td><td class="r">${m0(s.opening)}</td>
    <td class="c">${s.opening<0?'Bal':'Adv'}</td></tr>`);
  s.lines.forEach(x=>{i++;
    R.push(`<tr class="${x.received>0?'pay':(i%2?'alt':'')}"><td class="c">${fmtDate(x.date)}</td>
      <td>${esc(x.employee)}</td><td>${esc(x.work)}</td>
      <td class="r">${x.cost?m0(x.cost):'—'}</td><td class="r">${x.received?m0(x.received):'—'}</td>
      <td class="r">${m0(x.balance)}</td><td class="c">${x.balance<0?'Bal':'Adv'}</td></tr>`);});
  const due=s.closing<0;
  const inner=`${pdfHeader()}
    <div class="ttl">STATEMENT OF ACCOUNT<small>${esc(company.toUpperCase())}</small></div>
    <div class="rule"></div>
    <div class="meta"><span>${from&&to?`Period: ${fmtDate(from)} — ${fmtDate(to)}`:'Period: Lifetime'}</span>
      <span>Generated ${fmtDate(today())}</span></div>
    <div class="stamp" style="color:${due?'#b91c1c':'#0f766e'};border-color:${due?'#b91c1c':'#0f766e'}">${due?'BALANCE DUE':'IN ADVANCE'}</div>
    <table><thead><tr><th style="width:66px">Date</th><th>Employee</th><th>Work / Remark</th>
      <th style="width:56px;text-align:right">Cost</th><th style="width:60px;text-align:right">Received</th>
      <th style="width:66px;text-align:right">Balance</th><th style="width:34px;text-align:center"></th></tr></thead>
      <tbody>${R.join('')}
      <tr class="tot"><td colspan="3" style="text-align:right">TOTAL</td><td class="r">${m0(s.totalCost)}</td>
      <td class="r">${m0(s.totalRec)}</td><td class="r">${m0(s.closing)}</td><td class="c">${due?'Bal':'Adv'}</td></tr>
      </tbody></table>
    ${pdfBank()}
    <div class="foot">For any questions concerning this statement, please contact our Accounts Department —
      Call/WhatsApp ${esc(D.settings.phone)}, Landline 04 575 5373, or email Contact@timelink.ae.<br>
      This is a computer-generated statement and does not require a signature.</div>
    <div class="ty">Thank you for your continued business!</div>`;
  openPDF(`STATEMENT - ${company}`,inner);
}

export function shareStatementWA(){
  if(!SS.company){toast('Select a company first',1);return;}
  const s=buildStatement(SS.company,SS.from,SS.to);
  const c=D.contacts.find(x=>x.name.toUpperCase()===SS.company.toUpperCase());
  const due=s.closing<0;
  const msg=[
    `*${D.settings.companyName}*`,'',
    `Statement of account — *${SS.company}*`,
    SS.from&&SS.to?`Period: ${fmtDate(SS.from)} to ${fmtDate(SS.to)}`:'Period: Lifetime',
    `Entries: ${s.lines.length}`,
    `Total cost: AED ${m0(s.totalCost)}`,
    `Total received: AED ${m0(s.totalRec)}`,'',
    due?`*Balance due: AED ${m0(-s.closing)}*`:`*Advance with us: AED ${m0(s.closing)}*`,'',
    due?`Bank: ${D.settings.bank.name}\nIBAN: ${D.settings.bank.iban}\nAccount: ${D.settings.bank.acc}`:'',
    '',`Thank you for your business.\n${D.settings.phone}`
  ].filter(x=>x!==undefined).join('\n');
  const num=waNumber(c&&c.phone);
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`,'_blank');
  audit('share','statement',SS.company);save();
  toast(num?`Opening WhatsApp for ${SS.company}`:'Opening WhatsApp — no number on file, pick a contact');
}
