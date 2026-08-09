/** VAT Return. */
import { periodLabel, vatDetail, vatPeriods, vatRate, vatRows } from '../domain/vat.js';
import { csv } from '../lib/csv.js';
import { today } from '../lib/dates.js';
import { $, el } from '../lib/dom.js';
import { esc, m0, m2 } from '../lib/format.js';
import { dl } from '../ui/download.js';
import { mkBtn } from '../ui/forms.js';
import { gw, kpiRow } from '../ui/widgets.js';

export let VATMODE='quarter';

export function renderVAT(){
  const T=$('#tools');T.innerHTML='';
  const sel=el('select','fld');sel.style.width='auto';
  sel.append(new Option('By quarter','quarter'),new Option('By month','month'));
  sel.value=VATMODE;
  sel.onchange=()=>{VATMODE=sel.value;renderVAT();};
  T.append(sel);
  mkBtn(T,'↓ CSV','',()=>{
    const P=vatPeriods(VATMODE);
    dl(new Blob([csv([['PERIOD','INVOICES','SERVICE FEES (TAXABLE)','OUTPUT VAT','GOVT CHARGES (OUT OF SCOPE)','INVOICED TOTAL'],
      ...P.map(p=>[periodLabel(p.key),p.count,p.fee,p.vat,p.govt,p.grand])])],
      {type:'text/csv'}),`vat-return-${today()}.csv`);});

  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const P=vatPeriods(VATMODE);
  const all=vatRows();
  const totFee=all.reduce((a,r)=>a+r.fee,0);
  const totVat=all.reduce((a,r)=>a+r.vat,0);
  const totGovt=all.reduce((a,r)=>a+r.govt,0);
  const cur=P[0];

  wrap.append(kpiRow([
    {t:cur?periodLabel(cur.key)+' VAT':'VAT due',v:m2(cur?cur.vat:0),s:'output tax payable',g:'rose'},
    {t:'Taxable Service Fees',v:m0(totFee),s:'all periods',g:'indigo'},
    {t:'Total Output VAT',v:m2(totVat),s:`${Math.round(vatRate()*100)}% of fees`,g:'amber'},
    {t:'Out of Scope',v:m0(totGovt),s:'government charges',g:'teal'}
  ]));

  const nb=el('div','note i');
  nb.innerHTML=`<b>Basis:</b> tax invoices by invoice date. VAT is ${Math.round(vatRate()*100)}% of the
    <b>service fee only</b> — government charges are disbursements and are outside the scope of VAT.
    Quotations and payment receipts are excluded.`;
  wrap.append(nb);

  const drift=all.filter(r=>r.drift);
  if(drift.length){
    const w=el('div','note w');
    w.innerHTML=`<b>${drift.length} invoices carry a VAT figure that does not match their own service fee.</b>
      The figures below are recalculated at ${Math.round(vatRate()*100)}%, so this return is correct — but the
      stored values came across that way from the sheet: ${drift.slice(0,6).map(r=>esc(r.no)).join(', ')}${drift.length>6?'…':''}`;
    wrap.append(w);
  }

  const card=el('div','glass card');
  const h=el('div','ah');
  h.append(el('h3',null,VATMODE==='quarter'?'VAT by Quarter':'VAT by Month'));
  h.append(el('span','hint',`${P.length} periods · ${all.length} tax invoices`));
  card.append(h);

  const gw=el('div','gridwrap');gw.style.maxHeight='calc(100vh - 400px)';
  const t=el('table','list');
  t.innerHTML=`<thead><tr><th style="width:130px">Period</th>
    <th style="width:90px;text-align:center">Invoices</th>
    <th style="width:150px;text-align:right">Service Fees</th>
    <th style="width:140px;text-align:right">Output VAT</th>
    <th style="width:160px;text-align:right">Govt (out of scope)</th>
    <th style="width:150px;text-align:right">Invoiced Total</th>
    <th style="width:90px"></th></tr></thead>`;
  const tb=el('tbody');
  if(!P.length){
    const tr=el('tr'),td=el('td');td.colSpan=7;
    td.innerHTML='<div class="empty"><div class="e">∅</div>No tax invoices yet.</div>';
    tr.append(td);tb.append(tr);
  }
  P.forEach((p,i)=>{
    const tr=el('tr');
    tr.innerHTML=`<td><b>${periodLabel(p.key)}</b>${i===0?' <span class="badge i">latest</span>':''}</td>
      <td class="c">${p.count}</td>
      <td class="n">${m2(p.fee)}</td>
      <td class="n"><b style="color:var(--neg)">${m2(p.vat)}</b></td>
      <td class="n" style="color:var(--ink-3)">${m2(p.govt)}</td>
      <td class="n">${m2(p.grand)}</td><td class="c"></td>`;
    const b=el('button','btn sm','Detail');
    b.onclick=()=>vatDetail(p);
    tr.lastChild.append(b);
    tb.append(tr);
  });
  const tf=el('tfoot');
  tf.innerHTML=`<tr><td class="l">ALL PERIODS</td><td>${all.length}</td>
    <td>${m2(totFee)}</td><td>${m2(totVat)}</td><td>${m2(totGovt)}</td>
    <td>${m2(all.reduce((a,r)=>a+r.grand,0))}</td><td></td></tr>`;
  t.append(tb,tf);gw.append(t);card.append(gw);
  wrap.append(card);
}
