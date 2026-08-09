/**
 * The two spreadsheet screens: Data Entry and the Cash Book.
 *
 * They live in one file on purpose. A cash-book row can create a transaction
 * and a transaction can mirror into the cash book, so the two call each other.
 * Splitting them would mean a circular import; keeping them together is
 * honest about how they actually work.
 */
import { audit, save } from '../core/persist.js';
import { switchView } from '../core/router.js';
import { D } from '../core/store.js';
import { accColor, accountBalances, accountNames } from '../domain/accounts.js';
import { employeeHistory, employeeList, employeeStats, workList } from '../domain/employees.js';
import { accountPick, cbPickList, companyMatch } from '../domain/lists.js';
import { findRate } from '../domain/rates.js';
import { COL, SPARE, isBlankCB, isBlankTx, newCB, newTx } from '../domain/rows.js';
import { allCompanies, buildStatement, setSS } from '../domain/statement.js';
import { csv } from '../lib/csv.js';
import { daysAgo, fmtDate, parseAnyDate, today } from '../lib/dates.js';
import { $, $$, debounce, el } from '../lib/dom.js';
import { c, esc, m0, m2, n, uid } from '../lib/format.js';
import { bindAC } from '../ui/autocomplete.js';
import { dl } from '../ui/download.js';
import { field, input, mkBtn, pillControl } from '../ui/forms.js';
import { bindPaste, bindRowLock, focusCell, gridKey } from '../ui/grid.js';
import { modal } from '../ui/modal.js';
import { quickAddCompany, quickAddEmployee, quickAddWork } from '../ui/quick-add.js';
import { toast } from '../ui/toast.js';
import { gw, kpiRow } from '../ui/widgets.js';
import { accountHistory } from './accounts.js';
import { loadInvoice } from './invoice.js';

export let EF={from:'',to:'',q:''};

export function topUpBlanks(){
  let spare=D.transactions.filter(isBlankTx).length,added=false;
  while(spare<SPARE){D.transactions.push(newTx());spare++;added=true;}
  if(added)save();
  return added;
}

export function renderEntry(){
  topUpBlanks();
  $('#tools').innerHTML='';

  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);

  const rows=txRows();
  const real=rows.filter(r=>r.company||r.work||n(r.received)||n(r.expense));
  const S=k=>rows.reduce((a,r)=>a+n(r[k]),0);

  /* the whole top band is hidden here — everything lives in the body */
  $('#subbar').innerHTML='';
  document.body.classList.add('nobar');

  /* layout: [ accounts | search ]  over the sheet, cash book as a right rail */
  const layout=el('div','entrylayout');
  const main=el('div','entrymain');
  layout.append(main);
  wrap.append(layout);

  const top=el('div','entrytop');
  top.append(buildAccountPanel());
  top.append(buildSearchPanel(S));
  main.append(top);

  const gw=el('div','glass gridwrap');gw.id='entrygrid';gw.style.maxHeight='calc(100vh - 232px)';
  const tb=el('table','grid');
  tb.innerHTML=`<thead><tr>
    <th class="rn">#</th><th style="width:96px">Date</th><th style="min-width:200px">Company Name</th>
    <th style="min-width:160px">Employee Name</th><th style="min-width:190px">Work</th>
    <th class="c" style="width:100px">Received</th><th class="c" style="width:100px">Expense</th>
    <th class="c" style="width:96px">Profit</th><th class="c" style="width:132px">Paid From</th>
    <th style="width:34px"></th></tr></thead>`;
  const body=el('tbody');body.id='entrybody';
  if(!rows.length){
    const tr=el('tr'),td=el('td');td.colSpan=10;
    td.innerHTML='<div class="empty"><div class="e">▦</div>No entries match this filter.</div>';
    tr.append(td);body.append(tr);
  } else rows.forEach((r,i)=>body.append(txRow(r,i)));
  tb.append(body);
  const tf=el('tfoot');
  tf.innerHTML=`<tr><td colspan="5" class="l">TOTAL · ${real.length} ENTRIES</td>
    <td id="tRec">${m0(S('received'))}</td><td id="tExp">${m0(S('expense'))}</td>
    <td id="tPro" style="color:${S('profit')<0?'var(--neg)':'var(--pos)'}">${m0(S('profit'))}</td>
    <td colspan="2"></td></tr>`;
  tb.append(tf);gw.append(tb);main.append(gw);

  gw.addEventListener('keydown',ev=>gridKey(ev,gw,{onOverflow:growEntry}));

  /* Paste a block straight from Google Sheets.
     Columns map positionally from the cell you are standing in; the Profit column
     is skipped on the way through because it is always recalculated. */
  const FIELD={1:'date',2:'company',3:'employee',4:'work',5:'received',6:'expense',7:null,8:'paidFrom'};
  bindPaste(gw,{
    grow:()=>growEntry(true),
    apply:(ri,ci,val)=>{
      const key=FIELD[ci];
      if(!key)return false;                       // profit is computed
      const trg=gw.querySelector(`tbody tr:nth-child(${ri+1})`);
      if(!trg)return false;
      const rec=D.transactions.find(x=>x.id===trg.dataset.id);
      if(!rec)return false;
      if(key==='date'){const d=parseAnyDate(val);if(d)rec.date=d;}
      else if(key==='received'||key==='expense')rec[key]=n(val);
      else if(key==='paidFrom'){
        const hit=accountNames().find(a=>a.toUpperCase()===val.toUpperCase());
        rec.paidFrom=hit||val;
      }
      else{
        rec[key]=val;
        if(key==='company'&&val&&!D.companies.some(c=>c.toUpperCase()===val.toUpperCase()))
          {D.companies.push(val);D.companies.sort();}
      }
      rec.profit=Math.round((n(rec.received)-n(rec.expense))*100)/100;
      return true;
    },
    done:()=>{ensureSpare();save();renderEntry();}
  });

  main.append(el('div','hint',
    'Oldest at the top, newest at the bottom — exactly like the sheet. Five blank rows always wait at the end and a new one '+
    'appears as soon as you use the last. Arrow keys move between cells, Enter drops down a row, Tab moves across. '+
    'Picking a Company jumps to Employee Name; choosing a Work item fills Received and Expense from Rates Master.'));

  layout.append(buildCashbookPanel());

  /* Land on the first empty row ready to type — but never while the user is
     filtering, or the caret would be yanked out of the search box mid-keystroke. */
  requestAnimationFrame(()=>{
    if(SKIP_FOCUS){SKIP_FOCUS=false;return;}
    gw.scrollTop=gw.scrollHeight;
    const first=rows.findIndex(isBlankTx);
    focusCell(gw,first<0?rows.length-1:first,COL.company);
  });
}

export function growEntry(quiet){
  const gw=$('#entrygrid'),body=$('#entrybody');
  if(!gw||!body)return;
  const r=newTx();
  D.transactions.push(r);save();
  const idx=body.querySelectorAll('tr').length;
  body.append(txRow(r,idx));
  if(quiet)return;
  gw.scrollTop=gw.scrollHeight;
  focusCell(gw,idx,COL.company);
}

export function ensureSpare(){
  const body=$('#entrybody');if(!body)return;
  const shown=[...body.querySelectorAll('tr[data-id]')];
  const spare=shown.filter(tr=>{
    const r=D.transactions.find(x=>x.id===tr.dataset.id);
    return r&&isBlankTx(r);
  }).length;
  for(let i=spare;i<SPARE;i++){
    const r=newTx();D.transactions.push(r);
    body.append(txRow(r,body.querySelectorAll('tr').length));
  }
  if(spare<SPARE)save();
}

export function refreshEntryTotals(){
  const rows=txRows();const S=k=>rows.reduce((a,r)=>a+n(r[k]),0);
  const set=(id,val,col)=>{const e=document.getElementById(id);if(e){e.textContent=m0(val);if(col)e.style.color=col;}};
  set('tRec',S('received'));set('tExp',S('expense'));
  set('tPro',S('profit'),S('profit')<0?'var(--neg)':'var(--pos)');
  // keep the header strip in step with the footer
  const st=$$('.searchpanel .stat');
  if(st.length>=3){
    st[0].querySelector('.sv').textContent=m0(S('received'));
    st[1].querySelector('.sv').textContent=m0(S('expense'));
    st[2].querySelector('.sv').textContent=m0(S('profit'));
    st[2].classList.toggle('neg',S('profit')<0);
    st[2].classList.toggle('pos',S('profit')>=0);
  }
  // and the account cards, since a Paid From change moves a balance
  const bals=accountBalances();
  $$('.acard').forEach(c=>{
    const a=bals.find(x=>x.name===c.dataset.acct);if(!a)return;
    c.querySelector('.av').textContent=m0(a.balance);
    c.querySelector('.ak').textContent=
      (a.type==='credit'?'outstanding on card':'available balance')+` · ${m0(a.in)} in, ${m0(a.out)} out`;
  });
}

export let SKIP_FOCUS=false;

export const HEAD_ACCOUNTS=['ADCB','NOQODI','ABRAR CARD','IRFAN CARD','COUNTER CASH'];

export const PANEL_HIDDEN=['RAHIM WPS','CUSTOMER CARD','IRFAN ACCOUNT','MASHREQ',
  'OFFICE EXPENSES','WITHDRAWN PROFIT','RESERVES'];

export function buildAccountPanel(){
  const card=el('div','glass card noprint acctpanel');
  const grid=el('div','acctgrid');grid.id='acctgrid';
  const bals=accountBalances();
  const names=[...HEAD_ACCOUNTS,
    ...bals.map(a=>a.name).filter(nm=>!HEAD_ACCOUNTS.includes(nm)&&!PANEL_HIDDEN.includes(nm))];
  names.forEach(nm=>{
    const a=bals.find(x=>x.name===nm);if(!a)return;
    const owed=a.type==='credit';
    const c=el('div','acard');c.dataset.acct=a.name;
    c.style.setProperty('--ac',a.color);
    c.innerHTML=`<div class="an">${esc(a.name)}</div>
      <div class="av">${m0(a.balance)}</div>
      <div class="ak">${owed?'outstanding on card':'available balance'} · ${m0(a.in)} in, ${m0(a.out)} out</div>
      ${owed&&a.balance>0?'<span class="flag">to settle</span>':''}
      ${!owed&&a.balance<0?'<span class="flag">overdrawn</span>':''}`;
    c.onclick=()=>accountHistory(a.name);
    grid.append(c);
  });
  card.append(grid);
  return card;
}

export function buildSearchPanel(S){
  const card=el('div','glass card noprint searchpanel');

  const ge=el('button','btn srchbtn','Search Everything');
  ge.onclick=openSearch;
  card.append(ge);

  const q=input(EF.q,'text','Search sales');
  q.className='fld search';
  q.oninput=debounce(()=>{
    const caret=q.selectionStart;
    EF.q=q.value;SKIP_FOCUS=true;renderEntry();
    const e=$('.searchpanel .search');
    if(e){e.focus();try{e.setSelectionRange(caret,caret);}catch(x){}}
  },280);
  card.append(q);

  const row=el('div','sprow');
  const active=!!(EF.from||EF.to);
  const df=el('button','btn sm dfbtn'+(active?' act':''));
  df.textContent=active
    ? `${EF.from?fmtDate(EF.from):'start'} → ${EF.to?fmtDate(EF.to):'today'}`
    : 'All dates';
  df.onclick=dateFilterDialog;
  const clr=el('button','btn sm'+(EF.from||EF.to||EF.q?' d':''),'Clear');
  clr.onclick=()=>{EF={from:'',to:'',q:''};renderEntry();};
  const csvb=el('button','btn sm','↓ CSV');
  csvb.onclick=exportTxCSV;
  row.append(df,clr,csvb);
  card.append(row);

  const strip=el('div','statstrip');
  const stat=(label,val,cls)=>{
    const d=el('div','stat'+(cls?' '+cls:''));
    d.innerHTML=`<span class="sl">${label}</span><span class="sv">${val}</span>`;
    return d;
  };
  strip.append(stat('Received',m0(S('received'))));
  strip.append(stat('Expense',m0(S('expense'))));
  strip.append(stat('Profit',m0(S('profit')),S('profit')<0?'neg':'pos'));
  card.append(strip);
  return card;
}

export function dateFilterDialog(){
  const body=el('div');
  const g=el('div','invhead');
  const a=input(EF.from,'date'),b=input(EF.to,'date');
  g.append(field('From',a),field('To',b));
  body.append(g);

  const quick=el('div');
  quick.style.cssText='display:flex;gap:7px;flex-wrap:wrap;margin-top:12px';
  [['Today',0],['Last 7 days',7],['Last 15 days',15],['Last 30 days',30],
   ['Last 90 days',90],['This year',365]].forEach(([label,days])=>{
    const q=el('button','btn sm',label);
    q.onclick=()=>{a.value=days?daysAgo(days):today();b.value=today();};
    quick.append(q);
  });
  body.append(quick);
  body.append(el('div','hint','Leave both blank to show every entry.'));

  modal('Filter by Date',body,[
    {label:'All dates',fn:()=>{EF.from='';EF.to='';renderEntry();}},
    {label:'Cancel'},
    {label:'Apply',cls:'p',fn:()=>{
      EF.from=a.value;EF.to=b.value;
      if(EF.from&&EF.to&&EF.from>EF.to){const t=EF.from;EF.from=EF.to;EF.to=t;}
      renderEntry();
    }}
  ]);
}

export function txRows(){
  let r=D.transactions.slice();
  if(EF.from)r=r.filter(x=>isBlankTx(x)||x.date>=EF.from);
  if(EF.to)r=r.filter(x=>isBlankTx(x)||x.date<=EF.to);
  if(EF.q){const q=EF.q.toUpperCase();
    r=r.filter(x=>`${x.company} ${x.employee} ${x.work} ${x.paidFrom||''}`.toUpperCase().includes(q));}
  // oldest first, newest at the bottom, blanks last — the sheet's own order
  return r.sort((a,b)=>{
    const ba=isBlankTx(a),bb=isBlankTx(b);
    if(ba!==bb)return ba?1:-1;
    if(a.date!==b.date)return String(a.date).localeCompare(String(b.date));
    return (a._s||0)-(b._s||0);
  });
}

export function txRow(r,rowIdx){
  const tr=el('tr');tr.dataset.id=r.id;
  const rn=el('td','rn',isBlankTx(r)?'·':String(rowIdx+1));
  if(isBlankTx(r))tr.classList.add('blank');
  tr.append(rn);

  const cells={};
  const mk=(val,key,kind,listFn,acOpts)=>{
    const td=el('td',kind==='num'?'num':null);
    const inp=el('input','cell');inp.type=key==='date'?'date':'text';inp.value=val??'';
    inp.dataset.k=key;inp.dataset.nav='1';inp.dataset.r=rowIdx;inp.dataset.c=COL[key];
    if(kind==='num')inp.inputMode='decimal';
    cells[key]=inp;
    if(listFn)bindAC(inp,listFn,acOpts||{});
    inp.addEventListener('input',()=>{
      r[key]=kind==='num'?n(inp.value):inp.value;
      if(key==='received'||key==='expense'){
        r.profit=Math.round((n(r.received)-n(r.expense))*100)/100;paintProfit(tr,r);}
      touchRow(tr,r,rn,rowIdx);
      save();
    });
    if(key==='work')inp.addEventListener('change',()=>applyWorkRate(r,cells,tr,rn,rowIdx));
    inp.addEventListener('focus',()=>tr.classList.add('sel'));
    inp.addEventListener('blur',()=>tr.classList.remove('sel'));
    td.append(inp);return td;
  };

  tr.append(mk(r.date,'date','txt'));
  // picking a company jumps straight to Employee Name on the same row
  tr.append(mk(r.company,'company','txt',()=>D.companies,
    {onAdd:quickAddCompany,onPick:()=>focusCell($('#entrygrid'),rowIdx,COL.employee)}));
  tr.append(mk(r.employee,'employee','txt',()=>employeeList(),
    {onAdd:v=>quickAddEmployee(v,r.company),onPick:()=>focusCell($('#entrygrid'),rowIdx,COL.work)}));
  tr.append(mk(r.work,'work','txt',()=>workList(),
    {fullList:true,onAdd:quickAddWork,onPick:()=>{applyWorkRate(r,cells,tr,rn,rowIdx);
      focusCell($('#entrygrid'),rowIdx,COL.paidFrom);}}));
  tr.append(mk(r.received,'received','num'));
  tr.append(mk(r.expense,'expense','num'));

  const pt=el('td','num profit'+(n(r.profit)<0?' neg':''));
  const pi=el('input','cell');pi.readOnly=true;pi.tabIndex=-1;pi.value=m0(r.profit);
  pt.append(pi);tr.append(pt);

  /* Paid From — a fixed-height button, not a native <select>.
     The native control was what stretched blank rows out of line. */
  const ptd=el('td');
  const sel=pillControl();sel.value=r.paidFrom||'';
  sel.dataset.nav='1';sel.dataset.r=rowIdx;sel.dataset.c=COL.paidFrom;
  const paint=()=>{
    const col=r.paidFrom?accColor(r.paidFrom):null;
    sel.value=r.paidFrom||'—';
    if(col){sel.classList.remove('empty');sel.style.background=col;sel.style.color='#fff';
      sel.style.borderColor='transparent';sel.style.boxShadow='0 2px 8px '+col+'55';}
    else{sel.classList.add('empty');sel.style.background='';sel.style.color='';sel.style.boxShadow='';}};
  paint();
  bindAC(sel,()=>['— none —',...accountNames()],{fullList:true,onPick:val=>{
    r.paidFrom=(val==='— none —')?'':val;paint();touchRow(tr,r,rn,rowIdx);save();
  }});
  ptd.append(sel);tr.append(ptd);

  const at=el('td','act');const db=el('button','del','×');db.title='Delete row';db.tabIndex=-1;
  db.onclick=()=>{if(confirm('Delete this entry?')){D.transactions=D.transactions.filter(x=>x.id!==r.id);
    save();renderEntry();toast('Row deleted');}};
  at.append(db);tr.append(at);
  bindRowLock(tr,!isBlankTx(r));      // saved rows need a double-click to edit
  return tr;
}

export function touchRow(tr,r,rn,rowIdx){
  const blank=isBlankTx(r);
  tr.classList.toggle('blank',blank);
  rn.textContent=blank?'·':String(rowIdx+1);
  if(!blank)ensureSpare();
  refreshEntryTotals();
}

export function applyWorkRate(r,cells,tr,rn,rowIdx){
  const hit=findRate(r.work);
  if(!hit)return;
  let touched=false;
  if(!n(r.received)){r.received=hit.rate;if(cells.received)cells.received.value=hit.rate;touched=true;}
  if(!n(r.expense)){r.expense=hit.fee;if(cells.expense)cells.expense.value=hit.fee;touched=true;}
  if(touched){
    r.profit=Math.round((n(r.received)-n(r.expense))*100)/100;
    paintProfit(tr,r);
    if(rn)touchRow(tr,r,rn,rowIdx);
    save();
    toast(`${r.work} · received ${m0(hit.rate)} − expense ${m0(hit.fee)} = ${m0(hit.rate-hit.fee)}`);
  }
}

export function paintProfit(tr,r){const td=tr.children[7];td.classList.toggle('neg',n(r.profit)<0);
  td.querySelector('.cell').value=m0(r.profit);}

export function exportTxCSV(){
  const rows=txRows().map(t=>[t.date,t.company,t.employee,t.work,t.received,t.expense,t.profit,t.paidFrom]);
  dl(new Blob([csv([['DATE','COMPANY NAME','EMPLOYEE NAME','WORK','RECEIVED','EXPENSE','PROFIT','PAID FROM'],...rows])],
    {type:'text/csv'}),`timelink-entries-${today()}.csv`);
}

export function openSearch(){
  const body=el('div');
  const q=input('','text','Search companies, employees, invoices, work items, accounts…');
  q.style.fontSize='15px';q.style.padding='11px 13px';
  body.append(q);
  const res=el('div');res.style.cssText='margin-top:12px;max-height:52vh;overflow:auto';
  body.append(res);
  const m=modal('Search Everything',body,[{label:'Close'}]);

  const go=fn=>{m.close();fn();};
  const draw=debounce(()=>{
    const term=q.value.trim();res.innerHTML='';
    if(term.length<2){res.innerHTML='<div class="hint">Type at least two characters. Press Ctrl+K anywhere to open this.</div>';return;}
    const U=term.toUpperCase();
    const groups=[];
    const comp=allCompanies().filter(c=>c.toUpperCase().includes(U)).slice(0,6);
    if(comp.length)groups.push({t:'Companies',i:'◎',items:comp.map(c=>{
      const b=buildStatement(c,'','');
      return{l:c,r:`${m0(b.closing)} ${b.closing<0?'due':'adv'}`,go:()=>{setSS({company:c,from:'',to:''});switchView('statement');}};})});
    const emp=employeeStats().filter(e=>e.name.toUpperCase().includes(U)).slice(0,6);
    if(emp.length)groups.push({t:'Employees',i:'☺',items:emp.map(e=>
      ({l:e.name,r:`${e.jobs} jobs · ${m0(e.profit)}`,go:()=>{switchView('employees');setTimeout(()=>employeeHistory(e.name),120);}}))});
    const inv=D.invoices.filter(v=>`${v.InvoiceNo} ${v.BillTo} ${v.Applicant}`.toUpperCase().includes(U)).slice(0,6);
    if(inv.length)groups.push({t:'Invoices',i:'🧾',items:inv.map(v=>
      ({l:`${v.InvoiceNo} — ${v.BillTo}`,r:m2(v.GrandTotal),go:()=>loadInvoice(v.InvoiceNo)}))});
    const wk=(D.rates||[]).filter(r=>r.item.toUpperCase().includes(U)).slice(0,6);
    if(wk.length)groups.push({t:'Work Items',i:'₤',items:wk.map(r=>
      ({l:r.item,r:`rec ${m0(r.rate)} · exp ${m0(r.fee)}`,go:()=>switchView('rates')}))});
    const ac=accountBalances().filter(a=>a.name.toUpperCase().includes(U)).slice(0,5);
    if(ac.length)groups.push({t:'Accounts',i:'▧',items:ac.map(a=>
      ({l:a.name,r:m0(a.balance),go:()=>switchView('accounts')}))});
    const ins=D.insurance.filter(x=>`${x.worker} ${x.company} ${x.eid}`.toUpperCase().includes(U)).slice(0,5);
    if(ins.length)groups.push({t:'Insurance',i:'⛨',items:ins.map(x=>
      ({l:`${x.worker} — ${x.company}`,r:fmtDate(x.expiry),go:()=>switchView('insurance')}))});

    if(!groups.length){res.innerHTML='<div class="empty"><div class="e">∅</div>Nothing found for "'+esc(term)+'".</div>';return;}
    groups.forEach(g=>{
      res.append(el('div','ngrp',g.t));
      g.items.forEach(it=>{
        const r=el('div','rankrow');r.style.cursor='pointer';
        r.innerHTML=`<div class="i">${g.i}</div><div class="nm">${esc(it.l)}</div><div class="v">${esc(it.r)}</div>`;
        r.onclick=()=>go(it.go);
        res.append(r);
      });
    });
  },180);
  q.addEventListener('input',draw);
  q.addEventListener('keydown',e=>{
    if(e.key==='Enter'){const first=res.querySelector('.rankrow');if(first)first.click();}
  });
  draw();
}

export const CB={left:'COUNTER CASH',right:'ADCB',rail:'COUNTER CASH'};

export const CBCOL={date:1,amount:2,desc:3};

export function cbRows(account){
  return D.ledger.filter(l=>l.account===account)
    .sort((a,b)=>{
      const ba=isBlankCB(a),bb=isBlankCB(b);
      if(ba!==bb)return ba?1:-1;
      return String(a.date||'').localeCompare(String(b.date||''));
    });
}

export function topUpCB(account,keep){
  keep=keep||3;
  let spare=D.ledger.filter(l=>l.account===account&&isBlankCB(l)).length,added=false;
  while(spare<keep){D.ledger.push(newCB(account));spare++;added=true;}
  if(added)save();
}

export function syncLinkedTransfer(l){
  const to=l.xferTo;
  const mirror=D.ledger.find(x=>x.srcXfer===l.id);
  if(!to||!n(l.amount)||to===l.account){
    if(mirror){D.ledger=D.ledger.filter(x=>x.srcXfer!==l.id);return 'removed';}
    return null;
  }
  const note=(l.account===to)?'':`TRANSFER ${n(l.amount)<0?'TO':'FROM'} ${l.account}`;
  if(mirror){
    mirror.account=to;mirror.date=l.date;mirror.amount=-n(l.amount);mirror.remark=note;
    return 'updated';
  }
  D.ledger.push({id:uid(),srcXfer:l.id,account:to,date:l.date,
    amount:-n(l.amount),remark:note,company:''});
  audit('add','transfer',`${l.account} ${n(l.amount)<0?'to':'from'} ${to} ${m0(Math.abs(n(l.amount)))}`);
  return 'created';
}

export function syncLinkedPayment(l){
  if(l.srcXfer)return null;                     // the far side of a transfer
  const company=l.xferTo?'':(l.company||companyMatch(l.remark));
  const shouldLink=!!company&&n(l.amount)>0;
  const existing=D.payments.find(p=>p.srcLedger===l.id);

  if(!shouldLink){
    if(existing){
      D.payments=D.payments.filter(p=>p.srcLedger!==l.id);
      audit('remove','linked payment',`${l.remark||''} ${m0(l.amount)}`);
      return 'removed';
    }
    return null;
  }
  if(existing){
    existing.date=l.date;existing.amount=n(l.amount);
    existing.company=company;existing.account=l.account;
    existing.remark=l.remark&&l.remark.toUpperCase()!==company.toUpperCase()
      ? l.remark : 'CASH BOOK — '+l.account;
    return 'updated';
  }
  D.payments.push({date:l.date,amount:n(l.amount),company,account:l.account,
    remark:l.remark&&l.remark.toUpperCase()!==company.toUpperCase()
      ? l.remark : 'CASH BOOK — '+l.account,
    srcLedger:l.id});
  audit('add','linked payment',`${company} ${m0(l.amount)}`);
  return 'created';
}

export function cbColumn(account,side,compact){
  topUpCB(account);
  const a=accountBalances().find(x=>x.name===account);
  const col=el('div','glass card cbcol'+(compact?' cbmini':''));
  col.style.setProperty('--ac',accColor(account));

  /* header, styled like the coloured banner in the sheet */
  const h=el('div','cbhead');
  h.innerHTML=`<div class="nm">${esc(account)}</div>
    <div class="bal">${m0(a?a.balance:0)}</div>`;
  const pick=el('select','fld cbpick');
  accountNames().forEach(x=>pick.append(new Option(x,x)));
  pick.value=account;
  pick.onchange=()=>{CB[side]=pick.value;cbRefresh(compact);};
  h.append(pick);
  col.append(h);

  const gw=el('div','gridwrap cbgrid');gw.dataset.account=account;

  const t=el('table','grid');
  t.innerHTML=`<thead><tr>${compact?'':'<th class="rn">#</th>'}
    <th style="width:${compact?'74px':'104px'}">Date</th>
    <th class="c" style="width:${compact?'86px':'104px'}">Amount</th>
    <th>${compact?'Description':'Description / Company'}</th>
    <th style="width:30px"></th></tr></thead>`;
  const tb=el('tbody');

  const row=(l,i)=>{
    const tr=el('tr');tr.dataset.id=l.id;
    if(i%2)tr.classList.add('alt');
    let rn=null;
    if(!compact){
      rn=el('td','rn',isBlankCB(l)?'·':String(i+1));
      tr.append(rn);
    }
    if(isBlankCB(l))tr.classList.add('blank');

    const refresh=()=>{
      const b=isBlankCB(l);
      tr.classList.toggle('blank',b);
      if(rn)rn.textContent=b?'·':String(i+1);
      if(!b)ensureCBSpare(tb,account,row);
    };

    /* date */
    const dtd=el('td');const di=el('input','cell');di.type='date';di.value=l.date||'';
    di.dataset.nav='1';di.dataset.r=i;di.dataset.c=CBCOL.date;
    di.addEventListener('input',()=>{l.date=di.value;syncLinkedPayment(l);refresh();save();});
    dtd.append(di);tr.append(dtd);

    /* amount — positive is money in, negative is money out */
    const atd=el('td','num');const ai=el('input','cell');
    ai.inputMode='decimal';ai.value=l.amount||'';
    ai.dataset.nav='1';ai.dataset.r=i;ai.dataset.c=CBCOL.amount;
    const paintAmt=()=>{ai.style.color=n(l.amount)<0?'var(--neg)':(n(l.amount)>0?'var(--pos)':'');
      ai.style.fontWeight=n(l.amount)?'700':'';};
    paintAmt();
    ai.addEventListener('input',()=>{
      l.amount=n(ai.value);paintAmt();
      syncLinkedTransfer(l);
      const r2=syncLinkedPayment(l);paintLink(r2);
      refresh();save();refreshCBTotals();
      if(typeof refreshEntryTotals==='function')refreshEntryTotals();
    });
    atd.append(ai);tr.append(atd);

    /* description doubles as the company picker */
    const rtd=el('td');rtd.style.position='relative';
    const ri=el('input','cell');ri.value=l.remark||'';
    ri.placeholder=compact?'note, company or account':'note, a company to log a payment, or an account to transfer';
    ri.dataset.nav='1';ri.dataset.r=i;ri.dataset.c=CBCOL.desc;
    const link=el('span','cblink');rtd.append(ri,link);
    const paintLink=(action)=>{
      if(l.xferTo){
        link.className='cblink xfer';
        link.textContent=n(l.amount)<0?'→':'←';
        link.title=`Mirrored in ${l.xferTo} as ${m0(-n(l.amount))} so the transfer nets to zero`;
        if(action==='xfer')toast(`Transfer mirrored in ${l.xferTo}`);
        return;
      }
      const c=l.company||companyMatch(l.remark);
      if(c&&n(l.amount)>0){
        link.className='cblink on';link.textContent='✓';link.title=
          `A payment of ${m0(l.amount)} from ${c} is recorded against their statement`;
      } else if(c&&n(l.amount)<0){
        link.className='cblink out';link.textContent='↑';link.title=
          'Negative amounts are treated as money leaving the account, so no customer payment is created';
      } else {link.className='cblink';link.textContent='';link.title='';}
      if(action==='created')toast(`Payment logged for ${c} · ${m0(l.amount)}`);
    };
    const applyDesc=(raw,fromPick)=>{
      const acct=fromPick?accountPick(raw):'';
      if(acct){
        l.xferTo=acct;l.company='';
        l.remark=`${n(l.amount)<0?'TO':'FROM'} ${acct}`;
        ri.value=l.remark;
        syncLinkedPayment(l);
        const r3=syncLinkedTransfer(l);
        paintLink(r3==='created'?'xfer':null);
      } else {
        l.remark=raw;
        l.xferTo='';syncLinkedTransfer(l);
        l.company=companyMatch(raw);
        const r2=syncLinkedPayment(l);paintLink(r2);
      }
      refresh();save();refreshCBTotals();
      if(typeof refreshEntryTotals==='function')refreshEntryTotals();
    };
    bindAC(ri,()=>cbPickList(account),{
      onAdd:quickAddCompany,
      onPick:val=>applyDesc(val,true)
    });
    ri.addEventListener('input',()=>applyDesc(ri.value,false));
    paintLink();
    tr.append(rtd);

    const act=el('td','act');const d=el('button','del','×');d.tabIndex=-1;
    d.onclick=()=>{
      // this row IS the mirror side of a transfer — deleting it directly would
      // desync the pair (the originating row would still show xferTo pointing
      // at a mirror that no longer exists). Must be deleted from the origin.
      if(l.srcXfer){toast('This is the mirrored side of a transfer — delete it from the originating account instead.',1);return;}
      const linked=D.payments.some(p=>p.srcLedger===l.id)||D.ledger.some(x=>x.srcXfer===l.id);
      if(!confirm(linked
        ? 'Delete this entry? Its linked payment or transfer will be removed too.'
        : 'Delete this entry?'))return;
      D.payments=D.payments.filter(p=>p.srcLedger!==l.id);
      D.ledger=D.ledger.filter(x=>x.id!==l.id&&x.srcXfer!==l.id);
      save();cbRefresh(compact);toast('Entry deleted');
    };
    act.append(d);tr.append(act);
    if(l.srcXfer){
      tr.classList.add('mirror');
      tr.title='The other side of a transfer — edit or delete it on the originating account';
      tr.querySelectorAll('.cell').forEach(i=>i.readOnly=true);
    } else bindRowLock(tr,!isBlankCB(l));
    return tr;
  };

  const rows=cbRows(account);
  rows.forEach((l,i)=>tb.append(row(l,i)));
  tb._row=row;tb.dataset.account=account;
  t.append(tb);

  const real=rows.filter(l=>!isBlankCB(l));
  const inSum=real.filter(l=>n(l.amount)>0).reduce((s,l)=>s+n(l.amount),0);
  const outSum=-real.filter(l=>n(l.amount)<0).reduce((s,l)=>s+n(l.amount),0);
  const tf=el('tfoot');
  tf.innerHTML=`<tr><td${compact?'':' colspan="2"'} class="l">${real.length} ENTRIES</td>
    <td class="cbin">+${m0(inSum)}</td><td class="cbout" style="text-align:left">−${m0(outSum)}</td><td></td></tr>`;
  t.append(tf);
  gw.append(t);col.append(gw);

  gw.addEventListener('keydown',ev=>gridKey(ev,gw,{onOverflow:()=>growCB(tb,gw,account,row)}));

  const foot=el('div');foot.style.cssText='display:flex;gap:8px;margin-top:10px;flex-wrap:wrap';
  const ab=el('button','btn sm p','+ Add Entry');
  ab.onclick=()=>growCB(tb,gw,account,row);
  const hb=el('button','btn sm','History');
  hb.onclick=()=>accountHistory(account);
  foot.append(ab,hb);
  if(compact){
    const fb=el('button','btn sm','Open Cash Book');
    fb.onclick=()=>switchView('cashbook');
    foot.append(fb);
  }
  col.append(foot);

  requestAnimationFrame(()=>{gw.scrollTop=gw.scrollHeight;});
  return col;
}

export function ensureCBSpare(tb,account,row){
  const ids=[...tb.querySelectorAll('tr')].map(tr=>tr.dataset.id);
  const spare=ids.filter(id=>{const l=D.ledger.find(x=>x.id===id);return l&&isBlankCB(l);}).length;
  for(let i=spare;i<3;i++){
    const l=newCB(account);D.ledger.push(l);
    tb.append(row(l,tb.querySelectorAll('tr').length));
  }
  if(spare<3)save();
}

export function growCB(tb,gw,account,row){
  const l=newCB(account);D.ledger.push(l);save();
  const idx=tb.querySelectorAll('tr').length;
  tb.append(row(l,idx));
  gw.scrollTop=gw.scrollHeight;
  focusCell(gw,idx,CBCOL.amount);
}

export function cbRefresh(compact){
  if(compact)renderEntry();else renderCashbook();
}

export function refreshCBTotals(){
  const bals=accountBalances();
  $$('.cbcol').forEach(col=>{
    const nm=col.querySelector('.cbhead .nm').textContent;
    const a=bals.find(x=>x.name===nm);
    if(a)col.querySelector('.cbhead .bal').textContent=m0(a.balance);
  });
}

export function renderCashbook(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'↓ CSV','',()=>{
    const rows=D.ledger.filter(l=>!isBlankCB(l))
      .sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    dl(new Blob([csv([['DATE','ACCOUNT','AMOUNT','DESCRIPTION','LINKED COMPANY'],
      ...rows.map(l=>[l.date,l.account,l.amount,l.remark,l.company||companyMatch(l.remark)||''])])],
      {type:'text/csv'}),`cashbook-${today()}.csv`);
  });
  mkBtn(T,'Manage accounts','',()=>switchView('accounts'));

  const v=$('#view');v.innerHTML='';
  const wrap=el('div','fade');v.append(wrap);

  const linked=D.payments.filter(p=>p.srcLedger).length;
  const manual=D.ledger.filter(l=>!isBlankCB(l)).length;
  const bals=accountBalances();
  const l1=bals.find(x=>x.name===CB.left),l2=bals.find(x=>x.name===CB.right);
  wrap.append(kpiRow([
    {t:CB.left,v:m0(l1?l1.balance:0),s:'current balance',g:'teal'},
    {t:CB.right,v:m0(l2?l2.balance:0),s:'current balance',g:'rose'},
    {t:'Manual Entries',v:manual,s:'across all accounts',g:'indigo'},
    {t:'Payments Logged',v:linked,s:'from the cash book',g:'amber'}
  ]));

  const nb=el('div','note i');
  nb.innerHTML='Type a <b>positive</b> amount for money coming in and a <b>negative</b> one for money going out. '+
    'If the description names a company, the entry is also written to <b>Payments</b> and appears on that customer\'s '+
    'statement — edit or delete it here and the payment follows.';
  wrap.append(nb);

  const grid=el('div','cbwrap');
  grid.append(cbColumn(CB.left,'left'),cbColumn(CB.right,'right'));
  wrap.append(grid);
}

export function buildCashbookPanel(){
  const panel=el('div','cbpanel solo');
  panel.append(cbColumn(CB.rail,'rail',true));
  return panel;
}
