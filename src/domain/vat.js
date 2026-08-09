/** VAT return: output tax on service fees, grouped into filing periods. */
import { D } from '../core/store.js';
import { normDate } from './invoices.js';
import { csv } from '../lib/csv.js';
import { MON, fmtDate } from '../lib/dates.js';
import { el } from '../lib/dom.js';
import { esc, m0, m2, n } from '../lib/format.js';
import { dl } from '../ui/download.js';
import { modal } from '../ui/modal.js';

export function vatRate(){return n(D.settings.vatRate)||0.05;}

export function vatRows(){
  return D.invoices.filter(v=>{
    const t=(v.DocType||'TAX INVOICE').toUpperCase();
    return t==='TAX INVOICE';
  }).map(v=>{
    const date=normDate(v.InvoiceDate);
    const fee=n(v.ServiceFee);
    /* recompute rather than trust the stored figure — a few sheet rows
       carry a VAT value that does not match their own service fee */
    const vat=Math.round(fee*vatRate()*100)/100;
    return{no:v.InvoiceNo,date,billTo:v.BillTo||'',fee,vat,
      govt:n(v.GovtSubtotal),grand:n(v.GrandTotal),
      stored:n(v.VAT),drift:Math.abs(n(v.VAT)-vat)>0.011};
  }).filter(r=>r.date);
}

export function quarterOf(iso){
  const m=+String(iso).slice(5,7);
  return{y:String(iso).slice(0,4),q:Math.ceil(m/3)};
}

export function vatPeriods(mode){
  const rows=vatRows(),out={};
  rows.forEach(r=>{
    const key=mode==='month'?r.date.slice(0,7)
      :`${quarterOf(r.date).y}-Q${quarterOf(r.date).q}`;
    if(!out[key])out[key]={key,count:0,fee:0,vat:0,govt:0,grand:0,rows:[]};
    const b=out[key];
    b.count++;b.fee+=r.fee;b.vat+=r.vat;b.govt+=r.govt;b.grand+=r.grand;b.rows.push(r);
  });
  return Object.values(out).sort((a,b)=>b.key.localeCompare(a.key))
    .map(b=>({...b,fee:Math.round(b.fee*100)/100,vat:Math.round(b.vat*100)/100,
      govt:Math.round(b.govt*100)/100,grand:Math.round(b.grand*100)/100}));
}

export function periodLabel(key){
  if(key.includes('Q'))return key.replace('-',' ');
  const[y,m]=key.split('-');
  return `${MON[+m-1]} ${y}`;
}

export function vatDetail(p){
  const body=el('div');
  const s=el('div','achead');
  s.style.setProperty('--ac','#f43f5e');
  s.innerHTML=`<div class="l"><div class="k">Output VAT payable</div><div class="b">${m2(p.vat)}</div></div>
    <div class="r">
      <div><span>Invoices</span><b>${p.count}</b></div>
      <div><span>Service fees</span><b>${m0(p.fee)}</b></div>
      <div><span>Out of scope</span><b>${m0(p.govt)}</b></div>
    </div>`;
  body.append(s);

  const box=el('div','glass gridwrap');box.style.cssText='max-height:52vh;margin-top:12px';
  const t=el('table','list');
  t.innerHTML=`<thead><tr><th style="width:110px">Invoice</th><th style="width:104px">Date</th>
    <th>Bill To</th><th style="width:120px;text-align:right">Service Fee</th>
    <th style="width:110px;text-align:right">VAT</th>
    <th style="width:130px;text-align:right">Govt Charges</th></tr></thead>`;
  const tb=el('tbody');
  p.rows.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(r=>{
    const tr=el('tr');
    tr.innerHTML=`<td style="font-family:var(--mono);font-weight:700;color:var(--gold)">${esc(r.no)}</td>
      <td>${fmtDate(r.date)}</td><td>${esc(r.billTo)}</td>
      <td class="n">${m2(r.fee)}</td>
      <td class="n" style="font-weight:700">${m2(r.vat)}${r.drift?' <span class="badge w" title="Stored '+m2(r.stored)+'">!</span>':''}</td>
      <td class="n" style="color:var(--ink-3)">${m2(r.govt)}</td>`;
    tb.append(tr);
  });
  t.append(tb);box.append(t);body.append(box);

  const csvb=el('div');csvb.style.marginTop='10px';
  const b=el('button','btn sm','↓ CSV');
  b.onclick=()=>dl(new Blob([csv([['INVOICE','DATE','BILL TO','SERVICE FEE','VAT','GOVT CHARGES'],
    ...p.rows.map(r=>[r.no,r.date,r.billTo,r.fee,r.vat,r.govt])])],
    {type:'text/csv'}),`vat-${p.key}.csv`);
  csvb.append(b);body.append(csvb);

  modal(`VAT — ${periodLabel(p.key)}`,body,[{label:'Close'}]);
}
