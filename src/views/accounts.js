/** Cash & Bank — account cards, movements, adjustments and transfers. */
import { save } from '../core/persist.js';
import { D } from '../core/store.js';
import { PALETTE, accSettleNames, accountBalances, accountMovements, accountNames } from '../domain/accounts.js';
import { AF, setAF } from '../domain/dashboard.js';
import { csv } from '../lib/csv.js';
import { daysAgo, fmtDate, today } from '../lib/dates.js';
import { $, el } from '../lib/dom.js';
import { esc, m0, n } from '../lib/format.js';
import { dl } from '../ui/download.js';
import { field, input, mkBtn } from '../ui/forms.js';
import { modal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { kpiRow } from '../ui/widgets.js';

export function accountDialog(existing){
  const isNew=!existing;
  const a=existing||{name:'',type:'asset',color:PALETTE[(D.settings.accounts||[]).length%PALETTE.length],settle:'',adjust:0};
  const body=el('div');
  const g=el('div','invhead');
  const nm=input(a.name,'text','e.g. EMIRATES NBD');
  const ty=el('select','fld');
  [['asset','Bank / Cash — top-ups minus spend'],
   ['credit','Credit card — spend minus repayments (amount owed)'],
   ['tally','Tally — running total only (e.g. Office Expenses)']]
   .forEach(([v,l])=>ty.append(new Option(l,v)));
  ty.value=a.type||'asset';
  const st=input(a.settle||'','text','ledger name used for repayments (optional)');
  const adj=input(a.adjust||0,'text','opening / manual adjustment');
  const col=el('div');col.style.cssText='display:flex;gap:6px;flex-wrap:wrap;padding-top:2px';
  let chosen=a.color;
  PALETTE.forEach(c=>{
    const b=el('button');b.type='button';
    b.style.cssText=`width:26px;height:26px;border-radius:8px;background:${c};cursor:pointer;border:2px solid ${c===chosen?'var(--ink)':'transparent'}`;
    b.onclick=()=>{chosen=c;[...col.children].forEach(x=>x.style.borderColor='transparent');b.style.borderColor='var(--ink)';};
    col.append(b);
  });
  g.append(field('Account Name',nm),field('Type',ty),field('Repayment Ledger Name',st),
           field('Manual Adjustment (AED)',adj),field('Colour',col));
  body.append(g);
  const hint=el('div','hint');
  hint.textContent='Repayment ledger name only applies to credit cards — it is the name used when you record a repayment movement (your sheet uses ABRAR for ABRAR CARD). Manual adjustment carries an opening balance or a one-off correction.';
  body.append(hint);

  modal(isNew?'Add Account':'Edit Account',body,[
    {label:'Cancel'},
    {label:isNew?'Add Account':'Save',cls:'p',fn:()=>{
      const name=nm.value.trim().toUpperCase();
      if(!name){toast('Account name is required',1);return false;}
      if(isNew&&(D.settings.accounts||[]).some(x=>x.name===name)){toast('That account already exists',1);return false;}
      const rec={name,type:ty.value,color:chosen,settle:st.value.trim().toUpperCase()||undefined,adjust:n(adj.value)||undefined};
      D.settings.accounts=D.settings.accounts||[];
      if(isNew)D.settings.accounts.push(rec);
      else Object.assign(existing,rec);
      save();renderAccounts();toast(isNew?`${name} added`:`${name} updated`);
    }}
  ]);
}

export function adjustDialog(acc){
  const body=el('div');
  const cur=accountBalances().find(x=>x.name===acc.name)||{balance:0};
  const g=el('div','invhead');
  const dt=input(today(),'date');
  const amt=input('','text','+ money in, − money out');
  const rem=input('','text','reason for the adjustment');
  g.append(field('Date',dt),field('Amount (AED)',amt),field('Remark',rem));
  body.append(g);
  const live=el('div','hint');
  const upd=()=>{live.innerHTML=`Current balance <b>${m0(cur.balance)}</b> → new balance <b style="color:var(--brand2)">${m0(cur.balance+n(amt.value)*(acc.type==='credit'?-1:1))}</b>`;};
  amt.oninput=upd;upd();body.append(live);
  modal(`Adjust ${acc.name}`,body,[
    {label:'Cancel'},
    {label:'Post Adjustment',cls:'p',fn:()=>{
      if(!n(amt.value)){toast('Enter an amount',1);return false;}
      D.ledger.unshift({date:dt.value||today(),account:acc.settle||acc.name,
        amount:n(amt.value),remark:rem.value.trim()||'MANUAL ADJUSTMENT'});
      save();renderAccounts();toast(`${acc.name} adjusted by ${m0(amt.value)}`);
    }}
  ]);
}

export function transferDialog(){
  const body=el('div');
  const names=accountNames();
  const g=el('div','invhead');
  const from=el('select','fld'),to=el('select','fld');
  names.forEach(x=>{from.append(new Option(x,x));to.append(new Option(x,x));});
  if(names[1])to.value=names[1];
  const dt=input(today(),'date');
  const amt=input('','text','amount to move');
  const rem=input('','text','optional note');
  g.append(field('From Account',from),field('To Account',to),
           field('Date',dt),field('Amount (AED)',amt),field('Note',rem));
  body.append(g);
  const prev=el('div','hint');
  const upd=()=>{
    const b=accountBalances();
    const f=b.find(x=>x.name===from.value),t=b.find(x=>x.name===to.value);
    const v=n(amt.value);
    prev.innerHTML=`<b>${esc(from.value)}</b> ${m0(f?f.balance:0)} → <b style="color:var(--neg)">${m0((f?f.balance:0)-v)}</b>
      &nbsp;·&nbsp; <b>${esc(to.value)}</b> ${m0(t?t.balance:0)} → <b style="color:var(--pos)">${m0((t?t.balance:0)+v)}</b>`;
  };
  amt.oninput=upd;from.onchange=upd;to.onchange=upd;upd();
  body.append(prev);
  modal('Transfer Between Accounts',body,[
    {label:'Cancel'},
    {label:'Transfer',cls:'p',fn:()=>{
      const v=n(amt.value);
      if(!v){toast('Enter an amount',1);return false;}
      if(from.value===to.value){toast('Pick two different accounts',1);return false;}
      const note=rem.value.trim();
      const d=dt.value||today();
      const src=(D.settings.accounts||[]).find(a=>a.name===from.value)||{};
      const dst=(D.settings.accounts||[]).find(a=>a.name===to.value)||{};
      D.ledger.unshift({date:d,account:src.settle||from.value,amount:-v,
        remark:`TRANSFER TO ${to.value}${note?' · '+note:''}`});
      D.ledger.unshift({date:d,account:dst.settle||to.value,amount:v,
        remark:`TRANSFER FROM ${from.value}${note?' · '+note:''}`});
      save();renderAccounts();toast(`${m0(v)} moved from ${from.value} to ${to.value}`);
    }}
  ]);
}

export function renderAccounts(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'⇆ Transfer','p',transferDialog);
  mkBtn(T,'+ Account','',()=>accountDialog(null));
  mkBtn(T,'+ Movement','',()=>{
    D.ledger.unshift({date:today(),account:accSettleNames()[0]||'COUNTER CASH',amount:0,remark:''});
    save();renderAccounts();});
  mkBtn(T,'↓ CSV','',()=>{
    dl(new Blob([csv([['DATE','ACCOUNT','AMOUNT','REMARK'],
      ...D.ledger.map(l=>[l.date,l.account,l.amount,l.remark])])],{type:'text/csv'}),`accounts-${today()}.csv`);});

  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const accs=accountBalances();
  const cash=accs.filter(a=>a.type==='asset').reduce((a,x)=>a+x.balance,0);
  const owed=accs.filter(a=>a.type==='credit').reduce((a,x)=>a+Math.max(0,x.balance),0);
  const totalOut=accs.reduce((a,x)=>a+x.out,0);
  wrap.append(kpiRow([
    {t:'Accounts',v:accs.length,s:'tracked'},
    {t:'Cash & Bank Available',v:m0(cash),s:'AED across asset accounts',a:1,c:cash<0?'neg':'pos'},
    {t:'Outstanding on Cards',v:m0(owed),s:'to be settled',c:owed>0?'gold':''},
    {t:'Expenses Allocated',v:m0(totalOut),s:'tagged in data entry'}
  ]));

  const g=el('div','dash');
  const panel=el('div','glass card c4');
  renderAccountsBalancesOnly(panel,true);
  g.append(panel);

  /* ---- money flow, in place of a raw movement list ---- */
  const flow=el('div','glass card c8');
  const fh=el('div','ah');
  fh.append(el('h3',null,'Money Flow'));
  const per=el('select','fld');per.style.width='auto';
  [['0','All time'],['30','Last 30 days'],['90','Last 90 days'],['365','Last 12 months']]
    .forEach(([val,l])=>per.append(new Option(l,val)));
  per.value=String(AF);
  per.onchange=()=>{setAF(+per.value);renderAccounts();};
  fh.append(per);
  flow.append(fh);

  const inRng=iso=>!AF||(iso&&iso>=daysAgo(AF));

  /* money in */
  const inflow={};
  (D.payments||[]).forEach(p=>{if(!n(p.amount)||!inRng(p.date)||p.srcLedger)return;
    inflow['Customer payments']=(inflow['Customer payments']||0)+n(p.amount);});
  D.ledger.forEach(l=>{if(n(l.amount)<=0||!inRng(l.date))return;
    const k=/TRANSFER/i.test(l.remark||'')?'Transfers in':'Top-ups & deposits';
    inflow[k]=(inflow[k]||0)+n(l.amount);});

  /* money out */
  const outflow={};
  D.transactions.forEach(t=>{if(!t.paidFrom||!n(t.expense)||!inRng(t.date))return;
    outflow['Work expenses']=(outflow['Work expenses']||0)+n(t.expense);});
  (D.expenses||[]).forEach(x=>{if(!n(x.amount)||!inRng(x.date))return;
    outflow['Office overheads']=(outflow['Office overheads']||0)+n(x.amount);});
  D.ledger.forEach(l=>{if(n(l.amount)>=0||!inRng(l.date))return;
    const partner=(D.settings.partners||[]).some(p=>p.drawAccount===l.account);
    const k=/TRANSFER/i.test(l.remark||'')?'Transfers out':(partner?'Partner withdrawals':'Other payments out');
    outflow[k]=(outflow[k]||0)+Math.abs(n(l.amount));});

  const totIn=Object.values(inflow).reduce((a,x)=>a+x,0);
  const totOut=Object.values(outflow).reduce((a,x)=>a+x,0);

  const bar=el('div');
  bar.style.cssText='display:flex;height:30px;border-radius:10px;overflow:hidden;margin-bottom:14px;border:1px solid var(--stroke-2)';
  const total=Math.max(1,totIn+totOut);
  const seg=(w,col,label)=>{const d=el('div');
    d.style.cssText=`width:${(w/total*100).toFixed(2)}%;background:${col};display:flex;align-items:center;
      justify-content:center;color:#fff;font-size:10px;font-weight:800;letter-spacing:.5px;white-space:nowrap;overflow:hidden`;
    d.textContent=label;d.title=label;return d;};
  if(totIn)bar.append(seg(totIn,'linear-gradient(90deg,#34d399,#059669)',`IN ${m0(totIn)}`));
  if(totOut)bar.append(seg(totOut,'linear-gradient(90deg,#fb7185,#e11d48)',`OUT ${m0(totOut)}`));
  if(!totIn&&!totOut)bar.append(seg(1,'var(--field)',''));
  flow.append(bar);

  const cols=el('div');
  cols.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:20px';
  const side=(title,map,tot,colour)=>{
    const box=el('div');
    const hh=el('div');
    hh.style.cssText='display:flex;align-items:baseline;gap:8px;margin-bottom:8px';
    hh.innerHTML=`<span style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--ink-3)">${title}</span>
      <b style="margin-left:auto;font-size:16px;font-variant-numeric:tabular-nums;color:${colour}">${m0(tot)}</b>`;
    box.append(hh);
    const entries=Object.entries(map).sort((a,b)=>b[1]-a[1]);
    if(!entries.length)box.append(el('div','hint','Nothing in this period.'));
    const mx=Math.max(1,...entries.map(([,v2])=>v2));
    entries.forEach(([k,v2])=>{
      const r=el('div');
      r.style.cssText='margin-bottom:9px';
      r.innerHTML=`<div style="display:flex;font-size:12.2px;margin-bottom:3px">
          <span>${esc(k)}</span>
          <b style="margin-left:auto;font-variant-numeric:tabular-nums">${m0(v2)}</b>
          <span style="color:var(--ink-3);margin-left:7px;font-size:11px">${(v2/Math.max(1,tot)*100).toFixed(0)}%</span></div>
        <div class="bar"><i style="width:${(v2/mx*100).toFixed(1)}%;background:${colour}"></i></div>`;
      box.append(r);
    });
    return box;
  };
  cols.append(side('Money in',inflow,totIn,'var(--pos)'));
  cols.append(side('Money out',outflow,totOut,'var(--neg)'));
  flow.append(cols);

  const net=totIn-totOut;
  const nr=el('div');
  nr.style.cssText='margin-top:14px;padding-top:12px;border-top:1px solid var(--stroke-2);display:flex;align-items:baseline';
  nr.innerHTML=`<span style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--ink-3)">Net movement</span>
    <b style="margin-left:auto;font-size:19px;font-variant-numeric:tabular-nums;color:${net<0?'var(--neg)':'var(--pos)'}">${net>0?'+':''}${m0(net)}</b>`;
  flow.append(nr);
  g.append(flow);

  /* ---- per-account activity, click through to full history ---- */
  const act=el('div','glass card c12');
  act.append(el('h3',null,'Activity by Account'));
  const at=el('table','list');
  at.innerHTML=`<thead><tr><th>Account</th><th style="width:90px">Type</th>
    <th style="width:80px;text-align:center">Moves</th>
    <th style="width:110px;text-align:right">In</th><th style="width:110px;text-align:right">Out</th>
    <th style="width:120px;text-align:right">Balance</th><th style="width:150px"></th></tr></thead>`;
  const atb=el('tbody');
  accs.forEach(a=>{
    const tr=el('tr');
    tr.innerHTML=`<td><span style="display:inline-block;width:9px;height:9px;border-radius:99px;
        background:${a.color};margin-right:8px;vertical-align:middle"></span><b>${esc(a.name)}</b></td>
      <td><span class="badge ${a.type==='credit'?'w':a.type==='tally'?'i':'adv'}">${a.type}</span></td>
      <td class="c">${a.moves}</td>
      <td class="n" style="color:var(--pos)">${m0(a.in)}</td>
      <td class="n" style="color:var(--neg)">${m0(a.out)}</td>
      <td class="n"><b style="color:${a.type==='credit'?(a.balance>0?'var(--warn)':'var(--pos)'):(a.balance<0?'var(--neg)':'var(--ink)')}">${m0(a.balance)}</b></td>
      <td class="c"></td>`;
    const cell=tr.lastChild;
    const h1=el('button','btn sm','History');h1.onclick=()=>accountHistory(a.name);
    const h2=el('button','btn sm','±');h2.style.marginLeft='5px';h2.title='Adjust balance';
    const cfg=(D.settings.accounts||[]).find(x=>x.name===a.name);
    h2.onclick=()=>cfg&&adjustDialog(cfg);
    cell.append(h1,h2);
    atb.append(tr);
  });
  at.append(atb);
  const agw=el('div','gridwrap');agw.style.maxHeight='340px';agw.append(at);
  act.append(agw);
  act.append(el('div','hint','Click History on any account to see every movement with a running balance.'));
  g.append(act);
  wrap.append(g);
}

export function renderAccountsBalancesOnly(panel,manage){
  const accs=accountBalances();
  panel.innerHTML='';
  panel.append(el('h3',null,manage?'Balances & Management':'Balances'));
  const LBL={credit:'spent − repaid = owed',tally:'running total',asset:'top-ups − spend'};
  accs.forEach(a=>{
    const cfg=(D.settings.accounts||[]).find(x=>x.name===a.name);
    const r=el('div','acct');
    const sw=el('div','sw');sw.style.background=a.color;sw.style.boxShadow='0 0 12px '+a.color+'66';
    const nm=el('div','nm');
    nm.innerHTML=`<b>${esc(a.name)}</b><span>${m0(a.in)} in · ${m0(a.out)} out · ${LBL[a.type]||''}${a.adjust?` · adj ${m0(a.adjust)}`:''}</span>`;
    const am=el('div','amt');am.textContent=m0(a.balance);
    am.style.color=a.type==='credit'?(a.balance>0?'var(--warn)':'var(--pos)'):(a.balance<0?'var(--neg)':'var(--pos)');
    r.append(sw,nm,am);
    if(manage&&cfg){
      const box=el('div');box.style.cssText='display:flex;gap:4px;flex:0 0 auto';
      const b1=el('button','btn sm','±');b1.title='Adjust balance';b1.onclick=()=>adjustDialog(cfg);
      const b2=el('button','btn sm','Edit');b2.title='Edit account';b2.onclick=()=>accountDialog(cfg);
      const b3=el('button','btn sm d','×');b3.title='Remove account';
      b3.onclick=()=>{
        const used=D.transactions.filter(t=>t.paidFrom===a.name).length
                 + D.ledger.filter(l=>l.account===a.name||l.account===cfg.settle).length;
        if(!confirm(`Remove ${a.name}?\n\n${used} existing movements/entries reference it. They are kept, but the account stops appearing in dropdowns and balances.`))return;
        D.settings.accounts=D.settings.accounts.filter(x=>x.name!==a.name);
        save();renderAccounts();toast(`${a.name} removed`);
      };
      box.append(b1,b2,b3);r.append(box);
    }
    panel.append(r);
  });
  const lg=el('div','hint');
  lg.innerHTML='<b>Bank / cash</b> accounts show money available. <b>Card</b> accounts show the amount still owed. These reproduce the balance formulas in row 2 of your sheet.'+
    (manage?' Use <b>±</b> to adjust, <b>Edit</b> to edit, <b>×</b> to remove.':'');
  panel.append(lg);
}

export function accountHistory(name){
  const a=accountBalances().find(x=>x.name===name);
  const{rows,cfg,opening}=accountMovements(name);
  const credit=cfg.type==='credit';
  let shown=10;

  const body=el('div');
  const head=el('div','achead');
  head.style.setProperty('--ac',(a&&a.color)||'#6366f1');
  head.innerHTML=`<div class="l">
      <div class="k">${credit?'Outstanding on card':'Available balance'}</div>
      <div class="b">${m0(a?a.balance:0)}</div>
    </div>
    <div class="r">
      <div><span>Movements</span><b>${rows.length}</b></div>
      <div><span>Money in</span><b>${m0(rows.filter(x=>x.amount>0).reduce((s,x)=>s+x.amount,0))}</b></div>
      <div><span>Money out</span><b>${m0(-rows.filter(x=>x.amount<0).reduce((s,x)=>s+x.amount,0))}</b></div>
    </div>`;
  body.append(head);

  const box=el('div','glass gridwrap');box.style.cssText='max-height:50vh;margin-top:12px';
  const t=el('table','list');
  t.innerHTML=`<thead><tr><th style="width:104px">Date</th><th style="width:118px">Type</th>
    <th style="min-width:150px">Company / Category</th><th>Detail</th>
    <th style="width:100px;text-align:right">Amount</th>
    <th style="width:110px;text-align:right">Balance</th></tr></thead>`;
  const tb=el('tbody');t.append(tb);box.append(t);body.append(box);

  const foot=el('div');
  foot.style.cssText='display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap';
  const info=el('div','hint');info.style.padding='0';
  const more=el('button','btn sm','Show 20 more');
  const all=el('button','btn sm','Show all');
  const csvb=el('button','btn sm','↓ CSV');
  csvb.onclick=()=>dl(new Blob([csv([['DATE','TYPE','COMPANY/CATEGORY','DETAIL','AMOUNT','BALANCE'],
    ...rows.map(r=>[r.date,r.kind,r.who,r.what,r.amount,r.balance])])],
    {type:'text/csv'}),`account-${name.replace(/[^\w]+/g,'_')}-${today()}.csv`);
  foot.append(info,more,all,csvb);
  body.append(foot);

  const KIND={'Payment received':'adv','Work expense':'bal','Overhead':'w','Repayment':'adv','Movement':'i'};
  const draw=()=>{
    tb.innerHTML='';
    const slice=rows.slice(Math.max(0,rows.length-shown));
    if(opening&&rows.length<=shown){
      const tr=el('tr');
      tr.innerHTML=`<td colspan="4" style="color:var(--ink-3)">Opening adjustment</td>
        <td class="n">${m0(opening)}</td><td class="n">${m0(opening)}</td>`;
      tb.append(tr);
    }
    if(!slice.length){
      const tr=el('tr'),td=el('td');td.colSpan=6;
      td.innerHTML='<div class="empty"><div class="e">∅</div>No movements on this account yet.</div>';
      tr.append(td);tb.append(tr);
    }
    slice.forEach(r=>{
      const tr=el('tr');
      tr.innerHTML=`<td>${fmtDate(r.date)}</td>
        <td><span class="badge ${KIND[r.kind]||'i'}">${esc(r.kind)}</span></td>
        <td>${esc(r.who||'—')}</td><td style="font-size:11.8px">${esc(r.what)}</td>
        <td class="n" style="color:${r.amount<0?'var(--neg)':'var(--pos)'};font-weight:700">${r.amount>0?'+':''}${m0(r.amount)}</td>
        <td class="n" style="font-weight:800">${m0(r.balance)}</td>`;
      tb.append(tr);
    });
    info.textContent=`Showing the latest ${Math.min(shown,rows.length)} of ${rows.length} movements · oldest first, newest at the bottom`;
    more.style.display=all.style.display=(shown>=rows.length?'none':'');
    requestAnimationFrame(()=>{box.scrollTop=box.scrollHeight;});
  };
  more.onclick=()=>{shown+=20;draw();};
  all.onclick=()=>{shown=rows.length;draw();};
  draw();

  modal(`${name} — Transaction History`,body,[{label:'Close'}]);
}
