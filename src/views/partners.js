/** Partner Shares — the profit split and withdrawals. */
import { audit, save } from '../core/persist.js';
import { D } from '../core/store.js';
import { accSettleNames } from '../domain/accounts.js';
import { partnerData } from '../domain/partners.js';
import { csv } from '../lib/csv.js';
import { today } from '../lib/dates.js';
import { $, el } from '../lib/dom.js';
import { esc, m0, n } from '../lib/format.js';
import { dl } from '../ui/download.js';
import { field, input, mkBtn } from '../ui/forms.js';
import { modal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { kpiRow } from '../ui/widgets.js';

export function renderPartners(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'+ Partner','p',()=>partnerDialog(null));
  mkBtn(T,'↓ CSV','',()=>{const d=partnerData();
    dl(new Blob([csv([['PARTNER','SHARE %','ENTITLED','DRAWN','OUTSTANDING'],
      ...d.rows.map(r=>[r.name,(r.share*100).toFixed(1),r.entitled,r.drawn,r.outstanding])])],
      {type:'text/csv'}),`partner-shares-${today()}.csv`);});

  const d=partnerData();
  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  wrap.append(kpiRow([
    {t:'Gross Profit',v:m0(d.grossProfit),s:'all entries',c:d.grossProfit<0?'neg':'pos'},
    {t:'Office Expenses',v:m0(d.office),s:'deducted'},
    {t:'Reserves',v:m0(d.reserves),s:'held back'},
    {t:'Distributable',v:m0(d.distributable),s:'after deductions',a:1,c:d.distributable<0?'neg':'pos'}
  ]));

  if(Math.abs(d.totalShare-1)>0.001){
    const nb=el('div','note w');
    nb.innerHTML=`<b>⚠ Shares total ${(d.totalShare*100).toFixed(1)}%</b> — they should add up to 100%. Edit a partner to correct it.`;
    wrap.append(nb);
  }

  const g=el('div','dash');
  const card=el('div','glass card c8');
  card.append(el('h3',null,'Partner Positions'));
  if(!d.rows.length)card.append(el('div','empty','No partners configured yet. Add one to split the profit.'));
  const t=el('table','list');
  if(d.rows.length){
    t.innerHTML=`<thead><tr><th>Partner</th><th style="width:80px;text-align:center">Share</th>
      <th style="width:110px;text-align:right">Entitled</th><th style="width:110px;text-align:right">Withdrawn</th>
      <th style="width:120px;text-align:right">Outstanding</th><th style="width:150px"></th></tr></thead>`;
    const tb=el('tbody');
    d.rows.forEach(r=>{
      const tr=el('tr');
      tr.innerHTML=`<td><b>${esc(r.name)}</b><div style="font-size:10px;color:var(--ink-3)">draws via ${esc(r.drawAccount||'—')}</div></td>
        <td class="c"><b>${(r.share*100).toFixed(1)}%</b></td>
        <td class="n">${m0(r.entitled)}</td><td class="n">${m0(r.drawn)}</td>
        <td class="n"><b style="color:${r.outstanding<0?'var(--neg)':'var(--pos)'}">${m0(r.outstanding)}</b></td>
        <td class="c"></td>`;
      const cell=tr.lastChild;
      const b1=el('button','btn sm','Withdraw');
      b1.onclick=()=>withdrawDialog(r);
      const b2=el('button','btn sm','Edit');b2.style.marginLeft='5px';
      b2.onclick=()=>partnerDialog(D.settings.partners.find(p=>p.name===r.name));
      cell.append(b1,b2);tb.append(tr);
    });
    t.append(tb);card.append(t);
  }
  card.append(el('div','hint','Entitled = (gross profit − office expenses − reserves) × share. Withdrawn is read from each partner\'s draw account in the cash ledger, so it always matches the accounts page.'));
  g.append(card);

  const sc=el('div','glass card c4');
  sc.append(el('h3',null,'Split'));
  if(d.rows.length){
    const bar=el('div');
    bar.style.cssText='display:flex;height:28px;border-radius:9px;overflow:hidden;border:1px solid var(--stroke);margin-bottom:12px';
    const cols=['#14b8a6','#fbbf24','#38bdf8','#a855f7','#f43f5e'];
    d.rows.forEach((r,i)=>{const s=el('div');
      s.style.cssText=`width:${(r.share*100).toFixed(2)}%;background:${cols[i%cols.length]}`;
      s.title=`${r.name}: ${(r.share*100).toFixed(1)}%`;bar.append(s);});
    sc.append(bar);
    d.rows.forEach((r,i)=>{
      const row=el('div','rankrow');
      row.innerHTML=`<div class="i" style="background:${cols[i%cols.length]}"></div>
        <div class="nm">${esc(r.name)}</div><div class="v">${(r.share*100).toFixed(1)}%</div>`;
      sc.append(row);
    });
  } else sc.append(el('div','empty','—'));
  g.append(sc);
  wrap.append(g);
}

export function partnerDialog(existing){
  const isNew=!existing;
  const p=existing||{name:'',share:0.5,drawAccount:''};
  const body=el('div'),g=el('div','invhead');
  const nm=input(p.name,'text','partner name');
  const sh=input((n(p.share)*100).toFixed(1),'text','percentage, e.g. 50');
  const da=el('select','fld');
  da.append(new Option('— none —',''));
  accSettleNames().forEach(x=>da.append(new Option(x,x)));
  da.value=p.drawAccount||'';
  g.append(field('Partner Name',nm),field('Share (%)',sh),field('Draw Account',da));
  body.append(g);
  body.append(el('div','hint','The draw account is the ledger name used when this partner takes money out — your sheet uses IRFAN and ABRAR.'));
  modal(isNew?'Add Partner':'Edit Partner',body,[
    {label:'Cancel'},
    ...(isNew?[]:[{label:'Remove',cls:'d',fn:()=>{
      D.settings.partners=D.settings.partners.filter(x=>x!==existing);
      audit('remove','partner',existing.name);save();renderPartners();toast('Partner removed');}}]),
    {label:isNew?'Add':'Save',cls:'p',fn:()=>{
      if(!nm.value.trim()){toast('Name is required',1);return false;}
      const rec={name:nm.value.trim(),share:n(sh.value)/100,drawAccount:da.value};
      D.settings.partners=D.settings.partners||[];
      if(isNew)D.settings.partners.push(rec);else Object.assign(existing,rec);
      audit(isNew?'add':'edit','partner',rec.name);save();renderPartners();toast('Saved');
    }}
  ]);
}

export function withdrawDialog(r){
  const body=el('div'),g=el('div','invhead');
  const dt=input(today(),'date'),amt=input('','text','amount'),rem=input('','text','note');
  g.append(field('Date',dt),field('Amount (AED)',amt),field('Note',rem));
  body.append(g);
  const live=el('div','hint');
  const upd=()=>live.innerHTML=`Outstanding <b>${m0(r.outstanding)}</b> → <b style="color:var(--brand2)">${m0(r.outstanding-n(amt.value))}</b> after this withdrawal`;
  amt.oninput=upd;upd();body.append(live);
  modal(`${r.name} — Withdraw Profit`,body,[
    {label:'Cancel'},
    {label:'Record Withdrawal',cls:'p',fn:()=>{
      if(!n(amt.value)){toast('Enter an amount',1);return false;}
      if(!r.drawAccount){toast('Set a draw account for this partner first',1);return false;}
      D.ledger.unshift({date:dt.value||today(),account:r.drawAccount,amount:n(amt.value),
        remark:rem.value.trim()||`PROFIT WITHDRAWAL — ${r.name}`});
      audit('withdraw','partner',`${r.name} ${m0(amt.value)}`);save();renderPartners();
      toast(`${m0(amt.value)} recorded for ${r.name}`);
    }}
  ]);
}
