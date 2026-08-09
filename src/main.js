import { n, m0, m2, uid, esc } from './lib/format.js';
import { MON, fmtDate, today, daysAgo, parseClipTable, parseAnyDate } from './lib/dates.js';
import { D, setD } from './core/store.js';
import { rateMap, rateBust, findRate, invoiceRate } from './domain/rates.js';

import { $, $$, debounce, el } from './lib/dom.js';
import { csv } from './lib/csv.js';
import { accentFor, setTheme } from './ui/theme.js';
import { toast, toastUndo } from './ui/toast.js';
import { dl } from './ui/download.js';
import { field, input, mkBtn, pillControl } from './ui/forms.js';
import { modal } from './ui/modal.js';
import { DB, FILE_STORE, MAX_FILE, ST, _saveWarned, _t, audit, fdb, fileDel, fileGet, filePut, idb, kvGet, kvSet, publishD, save } from './core/persist.js';
import { AC_ADD, acAdd, acHide, acI, acKeys, acNav, acOpen, acPick, acPicking, acPlace, acShow, acT, acX, bindAC } from './ui/autocomplete.js';
import { bindPaste, bindRowLock, focusCell, gridCells, gridKey, lockRow, maxRow, unlockRow } from './ui/grid.js';
import { SS, allCompanies, buildStatement, companyEntries, setSS } from './domain/statement.js';
import { DOC_TYPES, LINE_ROWS, blankInvoice, docCfg, docPrefix, findInvoice, invMismatch, invTotals, nextInvNo, normDate, parseInvNo, yymm } from './domain/invoices.js';
import { partnerData } from './domain/partners.js';
import { FREQ, advanceDate, dueRecurring, newRecurring, postAllDue, postRecurring } from './domain/recurring.js';
import { employeeHistory, employeeList, employeeStats, workList } from './domain/employees.js';
import { ACC_FALLBACK, PALETTE, accColor, accMeta, accSettleNames, accountBalances, accountMovements, accountNames, companyBalances } from './domain/accounts.js';
import { periodLabel, quarterOf, vatDetail, vatPeriods, vatRate, vatRows } from './domain/vat.js';
import { AGE_BUCKETS, ageAll, ageCompany, daysBetween } from './domain/ageing.js';
import { SEED, freshSeed, migrate } from './core/seed.js';
import { COL, SPARE, isBlankCB, isBlankExp, isBlankPay, isBlankTx, monthKey, newCB, newExp, newPay, newTx } from './domain/rows.js';
import { XFER_PREFIX, accountPick, cbPickList, companyMatch, customerNames, expCategories, itemNames, serviceTypes } from './domain/lists.js';
import { attachCount, attachmentsFor } from './domain/attachments.js';
import { waNumber } from './domain/whatsapp.js';
import { PDF_CSS, PDF_LOGO, openPDF, pdfBank, pdfHeader } from './ui/pdf.js';
import { AF, DR, autoRange, dayspan, inRange, setAF, setDR, trendPoints } from './domain/dashboard.js';
/* =========================================================
   TIME LINK Business Suite — Phases 1-3
   Ported from the TimeLink Google Sheet + Apps Script modules
   ========================================================= */



/* mirrored onto window so tooling and tests can inspect state */


/* ---------- IndexedDB ---------- */
/* Both stores live in one database, opened at the SAME version everywhere (2).
   fdb() in pB_recurring.js used to open version 2 to add the attachments store
   while this function opened version 1 — once a browser had ever upgraded to 2,
   every later open(DB,1) call here threw VersionError and silently broke save()
   and boot() for good. Stores are created idempotently so both a fresh database
   and one upgraded from the old version-1 shape end up with everything present. */






/* ---------- audit trail (Phase 6) ---------- */


/* ---------- utils ---------- */













/* toast with an Undo button, used by quick-add */


/* =========================================================
   QUICK ADD — a typed value that is not in the master list
   ========================================================= */
function quickAddCompany(name){
  const v=name.trim();if(!v)return;
  if(D.companies.some(x=>x.toUpperCase()===v.toUpperCase()))return;
  D.companies.push(v);D.companies.sort();
  if(!D.contacts.some(c=>c.name.toUpperCase()===v.toUpperCase()))D.contacts.push({name:v,phone:''});
  audit('add','company',v);save();
  toastUndo(`Added company "${v}"`,()=>{
    D.companies=D.companies.filter(x=>x!==v);
    D.contacts=D.contacts.filter(c=>c.name!==v||c.phone);
    save();toast(`Removed "${v}"`);
  });
}
function quickAddWork(name){
  const v=name.trim();if(!v)return;
  if((D.rates||[]).some(r=>r.item.toUpperCase()===v.toUpperCase()))return;
  D.rates.push({item:v,rate:0,fee:0});rateBust();
  audit('add','work item',v);save();
  toastUndo(`Added work item "${v}" — set its rate in Rates Master`,()=>{
    D.rates=D.rates.filter(r=>r.item!==v);rateBust();save();toast(`Removed "${v}"`);
  });
}
function quickAddEmployee(name,company){
  const v=name.trim();if(!v)return;
  D.employees=D.employees||[];
  if(D.employees.some(e=>e.name.toUpperCase()===v.toUpperCase()))return;
  D.employees.push({name:v,company:company||'',note:''});
  audit('add','employee',v);save();
  toastUndo(`Added employee "${v}"`,()=>{
    D.employees=D.employees.filter(e=>e.name!==v);save();toast(`Removed "${v}"`);
  });
}



/* ---------- theme ---------- */

$('#tbtn').onclick=()=>{
  const cur=document.documentElement.getAttribute('data-theme');
  setTheme(cur==='dark'?'light':'dark');
};

/* ---------- autocomplete ---------- */
   // sentinel row meaning "create this value"

/* position the panel against its anchor; called on open AND on every scroll */







/* returns true when the keystroke was consumed by the dropdown */

/* Binds an autocomplete. IMPORTANT: this attaches the ONLY keydown listener that
   talks to the dropdown — callers must not also call acKeys, or every arrow press
   advances the highlight twice. Extra key handling goes in onKey. */

/* keep the panel glued to its field while any container scrolls */
document.addEventListener('scroll',()=>{if(acOpen())acPlace();},true);
addEventListener('resize',()=>{if(acOpen())acPlace();});

/* ---------- shared field builders ---------- */



/* A pill that behaves like an input for the autocomplete but is a plain span,
   so its height is entirely ours. An <input> carries intrinsic sizing that was
   stretching grid rows whenever the pill was empty. */


/* =========================================================
   GRID KEYBOARD NAVIGATION
   Every focusable cell carries data-r (row index) and data-c (column index).
   ========================================================= */




/* =========================================================
   ROW LOCKING
   A row that already holds data is read-only until you double-click it.
   Blank spare rows stay immediately typeable so entry is never slowed down.
   ========================================================= */


/* Applies locking to a row and wires the double-click that releases it. */

/* Handles arrows / Enter / Home / End inside a grid. Returns true if consumed. */


/* =========================================================
   CLIPBOARD — paste a block of cells straight out of Google Sheets
   ========================================================= */

/* Accepts 2026-01-03, 03/01/2026, 3-1-2026, "3 Jan 2026", "Jan 3, 2026" */

/* Wire paste onto a grid. cols: ordered field descriptors from column index 1.
   applyFn(rowIndex, colIndex, value) writes one cell; growFn() adds a row. */


/* =========================================================
   RATE ENGINE
   RATES MASTER mirrors the work sheet exactly:
       rate = RECEIVED  (what the client is charged)
       fee  = EXPENSE   (what it costs us)
       profit = rate − fee
   e.g. EMIRATES ID → received 390, expense 370, profit 20.
   ========================================================= */



/* exact match, then a forgiving match ignoring punctuation and any non-latin suffix */

/* invoice pricing: the service template's own price wins,
   Rates Master fills in only where the template has no price */


/* ---------- modal ---------- */


/* ---------- brand PDF chrome (shared by statement + invoice) ---------- */







/* =========================================================
   DATA ENTRY  (mirrors FROM JAN 2026 sheet, cols A–H)
   Newest entries first, always five spare rows at the top.
   ========================================================= */
let EF={from:'',to:'',q:''};





/* keep exactly SPARE blank rows at the end of the sheet */
function topUpBlanks(){
  let spare=D.transactions.filter(isBlankTx).length,added=false;
  while(spare<SPARE){D.transactions.push(newTx());spare++;added=true;}
  if(added)save();
  return added;
}

function renderEntry(){
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

/* Append one more blank row live, without redrawing the whole grid. */
function growEntry(quiet){
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
/* Called whenever a row is edited: makes sure spare rows never run out. */
function ensureSpare(){
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
function refreshEntryTotals(){
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

let SKIP_FOCUS=false;

/* The headline cash and bank accounts, shown as their own panel above the sheet. */
const HEAD_ACCOUNTS=['ADCB','NOQODI','ABRAR CARD','IRFAN CARD','COUNTER CASH'];
/* Kept in the data and on the Cash & Bank page, just not on this panel. */
const PANEL_HIDDEN=['RAHIM WPS','CUSTOMER CARD','IRFAN ACCOUNT','MASHREQ',
  'OFFICE EXPENSES','WITHDRAWN PROFIT','RESERVES'];

function buildAccountPanel(){
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

/* The small search block on the right of the top row. */
function buildSearchPanel(S){
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

/* Date range lives in a popup — it is set rarely and was eating a whole row. */
function dateFilterDialog(){
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

function txRows(){
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

/* column order used by the keyboard navigator */


function txRow(r,rowIdx){
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

/* A blank row just became a real entry: number it and top the spare rows back up. */
function touchRow(tr,r,rn,rowIdx){
  const blank=isBlankTx(r);
  tr.classList.toggle('blank',blank);
  rn.textContent=blank?'·':String(rowIdx+1);
  if(!blank)ensureSpare();
  refreshEntryTotals();
}

/* Pull a Work item's figures from Rates Master.
   In the master, rate = RECEIVED (client price) and fee = EXPENSE (our cost) —
   e.g. EMIRATES ID → received 390, expense 370, profit 20.
   Never overwrites a number you typed yourself. */
function applyWorkRate(r,cells,tr,rn,rowIdx){
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
function paintProfit(tr,r){const td=tr.children[7];td.classList.toggle('neg',n(r.profit)<0);
  td.querySelector('.cell').value=m0(r.profit);}



function addRow(){growEntry();}
function exportTxCSV(){
  const rows=txRows().map(t=>[t.date,t.company,t.employee,t.work,t.received,t.expense,t.profit,t.paidFrom]);
  dl(new Blob([csv([['DATE','COMPANY NAME','EMPLOYEE NAME','WORK','RECEIVED','EXPENSE','PROFIT','PAID FROM'],...rows])],
    {type:'text/csv'}),`timelink-entries-${today()}.csv`);
}

/* ---------- shared UI helpers ---------- */

function kpiRow(items){
  const k=el('div','kpis');
  items.forEach(o=>{
    const c=el('div','glass kpi'+(o.a?' accent':'')+(o.g?' g-'+o.g:''));
    c.append(el('div','t',o.t));
    c.append(el('div','v '+(o.c||''),String(o.v)));
    if(o.s)c.append(el('div','s',o.s));
    k.append(c);
  });
  return k;
}



/* =========================================================
   STATEMENTS  (port of Apps Script #1)
   ========================================================= */






function renderStatement(){
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

function drawStatement(){
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

function exportStatementCSV(){
  if(!SS.company){toast('Select a company first',1);return;}
  const s=buildStatement(SS.company,SS.from,SS.to);
  const rows=[['DATE','EMPLOYEE','WORK','COST','RECEIVED','BALANCE','TYPE']];
  if(s.opening!==null)rows.push([SS.from,'PREVIOUS BALANCE','OPENING BALANCE',0,0,s.opening,s.opening<0?'Bal':'Adv']);
  s.lines.forEach(x=>rows.push([x.date,x.employee,x.work,x.cost,x.received,x.balance,x.balance<0?'Bal':'Adv']));
  rows.push(['','','TOTAL',s.totalCost,s.totalRec,s.closing,s.closing<0?'Bal':'Adv']);
  dl(new Blob([csv(rows)],{type:'text/csv'}),`statement-${SS.company.replace(/[^\w]+/g,'_')}-${today()}.csv`);
}

function exportStatementPDF(){
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

/* =========================================================
   PHASE 2 — INVOICING  (port of Apps Script #2)
   TL + YYMM + NN numbering, task templates, rate lookup,
   govt subtotal / service fee / VAT / grand total, PDF.
   ========================================================= */

let INV=null;          // working invoice in the builder

/* The three documents this builder can produce. Only a tax invoice carries VAT
   wording; a quotation is an offer and a receipt confirms money already taken. */







/* invoice lines are billed at the government rate; our margin is the separate Service Fee */
function lookupRate(desc){const r=findRate(desc);return r?r.rate:0;}

/* ---------- invoice number: TL + YYMM + NN ---------- */

/* NN is normally 2 digits, but the sheet already contains TL2606100 (NN rolled past 99),
   so the parser accepts 2 or more digits and the generator widens only when it must. */



/* stored header totals vs the sum of the saved line items */



/* ---------- totals ---------- */


/* =========================================================
   BUILDER VIEW
   ========================================================= */
function renderInvoice(){
  if(!INV)INV=blankInvoice();
  if(!INV.InvoiceNo)INV.InvoiceNo=nextInvNo(INV.InvoiceDate,INV);

  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'+ New','',()=>{const dt=INV.DocType;INV=blankInvoice();INV.DocType=dt;INV.InvoiceNo=nextInvNo(INV.InvoiceDate,INV);renderInvoice();toast('New '+dt.toLowerCase()+' '+INV.InvoiceNo);});
  mkBtn(T,'< Prev','',()=>navInv(-1));
  mkBtn(T,'Next >','',()=>navInv(1));
  mkBtn(T,'↓ PDF','',()=>{if(validateInv())exportInvoicePDF(INV);});
  mkBtn(T,'WhatsApp','g',()=>{if(validateInv())shareInvoiceWA(INV);});
  T.append(attachButton('inv:'+INV.InvoiceNo,INV.InvoiceNo));
  mkBtn(T,'✓ Save Invoice','p',saveInvoice);

  const v=$('#view');v.innerHTML='';
  const wrap=el('div','fade invgrid');v.append(wrap);
  const left=el('div'),right=el('div');
  wrap.append(left,right);

  /* ---- header card ---- */
  const hc=el('div','glass card');
  hc.append(el('h3',null,'Invoice Details'));
  const hg=el('div','invhead');

  const fillContact=()=>{
    const c=D.contacts.find(x=>x.name.toUpperCase()===INV.BillTo.toUpperCase());
    if(c&&c.phone&&!INV.ContactInfo){INV.ContactInfo=c.phone;cont.value=c.phone;}
  };
  const bill=input(INV.BillTo,'text','customer / company name');
  bindAC(bill,customerNames,{onAdd:quickAddCompany,
    onPick:()=>{INV.BillTo=bill.value.trim();fillContact();appl.focus();}});
  bill.addEventListener('input',()=>INV.BillTo=bill.value);
  bill.addEventListener('change',()=>{INV.BillTo=bill.value.trim();fillContact();});

  const appl=input(INV.Applicant,'text','applicant / employee name');
  appl.oninput=()=>INV.Applicant=appl.value;
  const cont=input(INV.ContactInfo,'text','phone or email');
  cont.oninput=()=>INV.ContactInfo=cont.value;

  /* Service type — focusing or clicking reveals the whole list and selects the current
     value, so a wrong pick is replaced by choosing another; no need to clear it first. */
  const svc=input(INV.ServiceType,'text','click to choose a service template…');
  svc.style.cursor='pointer';
  bindAC(svc,()=>['NEW (MANUAL ENTRY)',...serviceTypes()],
    {fullList:true,onPick:val=>{INV.ServiceType=val;applyTemplate(val);}});
  svc.addEventListener('input',()=>INV.ServiceType=svc.value);
  svc.addEventListener('change',()=>{INV.ServiceType=svc.value.trim();
    if(INV.ServiceType)applyTemplate(INV.ServiceType);});

  const no=el('input','invno');no.value=INV.InvoiceNo;
  no.addEventListener('change',()=>{
    const val=no.value.trim().toUpperCase();
    const found=findInvoice(val);
    if(found){loadInvoice(val);toast('Loaded '+val);}
    else{INV.InvoiceNo=val;toast('New number '+val);}
  });

  const dt=input(INV.InvoiceDate,'date');
  dt.onchange=()=>{INV.InvoiceDate=dt.value;
    if(!findInvoice(INV.InvoiceNo)){INV.InvoiceNo=nextInvNo(dt.value,INV);renderInvoice();}};

  const ctrn=input(INV.CustomerTRN,'text');ctrn.oninput=()=>INV.CustomerTRN=ctrn.value;
  const ttrn=input(INV.TimeLinkTRN,'text');ttrn.readOnly=true;

  const dtype=el('select','fld');
  Object.keys(DOC_TYPES).forEach(k=>dtype.append(new Option(k,k)));
  dtype.value=INV.DocType||'TAX INVOICE';
  dtype.onchange=()=>{
    INV.DocType=dtype.value;
    if(!findInvoice(INV.InvoiceNo))INV.InvoiceNo=nextInvNo(INV.InvoiceDate,INV);
    renderInvoice();toast('Document type: '+INV.DocType);
  };

  hg.append(field('Document Type',dtype),field('Invoice No.',no),
            field('Bill To',bill),
            field('Invoice Date',dt),
            field('Applicant',appl),field('Customer TRN',ctrn),
            field('Contact Info',cont),field('TimeLink TRN',ttrn),
            field('Service Type',svc));
  hc.append(hg);left.append(hc);

  /* ---- line items ---- */
  const lc=el('div','glass card');
  const lh=el('div');lh.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:10px';
  lh.append(el('h3',null,'Line Items'));
  lh.querySelector('h3').style.margin='0';
  const sp=el('div');sp.style.flex='1';lh.append(sp);
  const ab=el('button','btn sm','+ Add Line');ab.onclick=()=>{INV.items.push({desc:'',qty:1,rate:0});renderInvoice();};
  const cb=el('button','btn sm d','Clear All');cb.onclick=()=>{if(confirm('Clear all line items?')){INV.items=[];renderInvoice();}};
  lh.append(ab,cb);lc.append(lh);

  const lg=el('div','gridwrap');lg.id='invlines';lg.style.maxHeight='none';
  const t=el('table','inv');
  t.innerHTML=`<thead><tr><th style="width:44px;text-align:center">Sr</th><th>Description</th>
    <th style="width:66px;text-align:center">Qty</th><th style="width:96px;text-align:center">Rate</th>
    <th style="width:104px;text-align:center">Amount</th><th style="width:80px;text-align:center">Source</th>
    <th style="width:36px"></th></tr></thead>`;
  const tb=el('tbody');
  if(!INV.items.length){
    const tr=el('tr'),td=el('td');td.colSpan=7;
    td.innerHTML='<div class="empty" style="padding:26px"><div class="e">🧾</div>Pick a Service Type above and the lines fill in automatically, priced from Rates Master.</div>';
    tr.append(td);tb.append(tr);
  }
  INV.items.forEach((it,i)=>tb.append(invLine(it,i)));
  t.append(tb);lg.append(t);lc.append(lg);
  lg.addEventListener('keydown',ev=>gridKey(ev,lg,{onOverflow:()=>{
    INV.items.push({desc:'',qty:1,rate:0});renderInvoice();
    requestAnimationFrame(()=>focusCell(gw(),INV.items.length-1,ICOL.desc));}}));
  lc.append(el('div','hint',''));
  lc.lastChild.innerHTML='Service template rates win. <b>template</b> = the package price &nbsp;·&nbsp; '+
    '<b>master</b> = template had no price so Rates Master supplied it &nbsp;·&nbsp; <b>manual</b> = you typed it. '+
    'Arrow keys and Enter move between cells.';
  left.append(lc);

  /* ---- note ---- */
  const nc=el('div','glass card');
  nc.append(el('h3',null,'Note on Invoice'));
  const nt=input(INV.Note,'text','e.g. PAID BY SHAHIRYAR CARD');
  nt.oninput=()=>INV.Note=nt.value;
  nc.append(nt);left.append(nc);

  /* ---- totals panel ---- */
  const tc=el('div','glass card');
  tc.append(el('h3',null,'Summary'));
  const tt=invTotals(INV);
  const add=(lbl,val,cls)=>{const r=el('div','tot-row'+(cls?' '+cls:''));
    r.append(el('div','lbl',lbl));r.append(el('div','val',val));tc.append(r);return r;};
  add('Sub Total — Govt. Charges (non-taxable)','AED '+m2(tt.govt));
  const fr=el('div','tot-row');fr.append(el('div','lbl','Service Fee (taxable)'));
  const fi=el('input');fi.type='text';fi.value=INV.ServiceFee||0;fi.inputMode='decimal';
  fi.oninput=()=>{INV.ServiceFee=n(fi.value);refreshTotals();};
  fr.append(fi);tc.append(fr);
  add(`VAT @ ${Math.round(n(D.settings.vatRate)*100)}% on Service Fee`,'AED '+m2(tt.vat));
  add('Service Fee Inc. VAT','AED '+m2(tt.feeInc));
  add('Invoice Total','AED '+m2(tt.grand));
  const ar=el('div','tot-row');
  ar.append(el('div','lbl','Less: Advance Received'));
  const ai=el('input');ai.type='text';ai.value=INV.Advance||0;ai.inputMode='decimal';
  ai.style.color='var(--pos)';
  ai.oninput=()=>{INV.Advance=n(ai.value);refreshTotals();};
  ar.append(ai);tc.append(ar);
  add('BALANCE DUE (AED)',m2(tt.balance),'grand');
  right.append(tc);

  /* ---- info ---- */
  const ic=el('div','glass card');
  ic.append(el('h3',null,'Status'));
  const exists=findInvoice(INV.InvoiceNo);
  ic.innerHTML+=`<div class="hint" style="padding:0;line-height:1.9">
    <b style="color:var(--ink)">${esc(INV.InvoiceNo)}</b>
    <span class="badge ${exists?'i':'w'}" style="margin-left:6px">${exists?'SAVED — editing':'NEW — unsaved'}</span><br>
    ${INV.items.length} line item${INV.items.length===1?'':'s'} ·
    Next free number this month: <b style="color:var(--gold)">${esc(nextInvNo(INV.InvoiceDate,INV))}</b><br>
    <span style="color:var(--ink-3)">Government fees are collected as a disbursement and are out of scope of VAT. VAT applies only to the service fee.</span></div>`;
  right.append(ic);

  /* ---- recent ---- */
  const rc=el('div','glass card');
  rc.append(el('h3',null,'Recent Invoices'));
  const recent=D.invoices.slice().sort((a,b)=>String(b.InvoiceNo).localeCompare(String(a.InvoiceNo))).slice(0,10);
  recent.forEach(x=>{
    const r=el('div','rankrow');r.style.cursor='pointer';
    r.innerHTML=`<div class="i">🧾</div><div class="nm">${esc(x.BillTo||'—')}<div style="font-size:10px;color:var(--ink-3);font-family:var(--mono)">${esc(x.InvoiceNo)}</div></div>
      <div class="v">${m0(x.GrandTotal)}</div>`;
    r.onclick=()=>{loadInvoice(x.InvoiceNo);};
    rc.append(r);
  });
  right.append(rc);

  function refreshTotals(){
    const t2=invTotals(INV);const rows=tc.querySelectorAll('.tot-row');
    rows[0].querySelector('.val').textContent='AED '+m2(t2.govt);
    rows[2].querySelector('.val').textContent='AED '+m2(t2.vat);
    rows[3].querySelector('.val').textContent='AED '+m2(t2.feeInc);
    rows[4].querySelector('.val').textContent='AED '+m2(t2.grand);
    rows[6].querySelector('.val').textContent=m2(t2.balance);
  }
  renderInvoice._refresh=refreshTotals;
}

const ICOL={desc:1,qty:2,rate:3};
function invLine(it,i){
  const tr=el('tr');
  tr.append(el('td','rn',String(i+1)));
  const cells={};

  const dtd=el('td');const di=el('input','cell');di.value=it.desc||'';
  di.dataset.nav='1';di.dataset.r=i;di.dataset.c=ICOL.desc;cells.desc=di;
  const priceIt=()=>{
    it.desc=di.value.trim();
    if(!n(it.rate)){
      const hit=findRate(it.desc);
      if(hit){
        it.rate=hit.rate;it.src='master';
        if(cells.rate)cells.rate.value=hit.rate;
        amt.textContent=m2(n(it.qty)*n(it.rate));
        toast(`${it.desc} · ${m0(hit.rate)} from Rates Master`);
      }
    }
    tag.innerHTML=srcTag(it);
    renderInvoice._refresh&&renderInvoice._refresh();
  };
  bindAC(di,itemNames,{onPick:()=>{priceIt();focusCell(gw(),i,ICOL.qty);}});
  di.addEventListener('input',()=>it.desc=di.value);
  di.addEventListener('change',priceIt);
  dtd.append(di);tr.append(dtd);

  const mkNum=(key)=>{const td=el('td','num');const inp=el('input','cell');
    inp.style.textAlign='center';inp.inputMode='decimal';inp.value=it[key]??0;
    inp.dataset.nav='1';inp.dataset.r=i;inp.dataset.c=ICOL[key];cells[key]=inp;
    inp.addEventListener('input',()=>{it[key]=n(inp.value);
      if(key==='rate')it.src='manual';
      amt.textContent=m2(n(it.qty)*n(it.rate));
      tag.innerHTML=srcTag(it);
      renderInvoice._refresh&&renderInvoice._refresh();});
    td.append(inp);return td;};
  tr.append(mkNum('qty'),mkNum('rate'));

  const atd=el('td','num');
  const amt=el('div');
  amt.style.cssText='padding:8px 9px;text-align:center;font-family:var(--mono);font-weight:700;font-size:12.2px';
  amt.textContent=m2(n(it.qty)*n(it.rate));atd.append(amt);tr.append(atd);

  const ttd=el('td','c');const tag=el('div');tag.innerHTML=srcTag(it);ttd.append(tag);tr.append(ttd);

  const act=el('td','act');const d=el('button','del','×');d.tabIndex=-1;
  d.onclick=()=>{INV.items.splice(i,1);renderInvoice();};
  act.append(d);tr.append(act);
  return tr;
}
function gw(){return $('#invlines');}
function srcTag(it){
  if(!it.desc)return '';
  if(it.src==='template')return '<span class="badge i" title="Priced by the service template">template</span>';
  if(it.src==='master')return '<span class="badge adv" title="Template had no price — taken from Rates Master">master</span>';
  if(it.src==='saved')return '<span class="badge" style="background:var(--field);color:var(--ink-3)" title="Saved on this invoice">saved</span>';
  if(!n(it.rate))return '<span class="badge w" title="No price found — enter one">no price</span>';
  return '<span class="badge" style="background:var(--field);color:var(--ink-3)" title="Typed manually">manual</span>';
}

/* Populate the line items for a service type.
   Pricing precedence (your call): RATES MASTER wins, the template price fills any gap. */
function applyTemplate(name){
  const key=String(name||'').trim().toUpperCase();
  if(!key)return;
  if(['NEW (MANUAL ENTRY)','NEW(MANUAL ENTRY)','MANUAL','NEW'].includes(key)){
    INV.items=[];renderInvoice();toast('Manual entry — lines cleared');return;
  }
  const tpl=D.taskTemplates.filter(t=>t.serviceType.trim().toUpperCase()===key)
    .sort((a,b)=>(a.sr||0)-(b.sr||0));
  if(!tpl.length){
    renderInvoice();
    toast(`No template found for "${name}"`,1);
    return;
  }
  let fromTemplate=0,fromMaster=0,unpriced=0;
  INV.items=tpl.map(t=>{
    const r=invoiceRate(t.desc,t.rate);
    if(r.src==='template')fromTemplate++;else if(r.src==='master')fromMaster++;else unpriced++;
    return{desc:t.desc,qty:n(t.qty)||1,rate:r.rate,src:r.src};
  });
  renderInvoice();
  const bits=[`${INV.items.length} lines`];
  if(fromTemplate)bits.push(`${fromTemplate} at template rates`);
  if(fromMaster)bits.push(`${fromMaster} from Rates Master`);
  if(unpriced)bits.push(`${unpriced} need a price`);
  toast(`${name} · ${bits.join(' · ')}`);
}

function validateInv(){
  if(!INV.BillTo.trim()){toast('BILL TO is required',1);return false;}
  if(!INV.items.some(x=>x.desc.trim()&&n(x.qty)*n(x.rate)>0)){toast('Add at least one line item',1);return false;}
  return true;
}

function saveInvoice(){
  if(!validateInv())return;
  const t=invTotals(INV);
  let no=INV.InvoiceNo.trim();
  const p=parseInvNo(no,INV);
  if(!no||!p||p.yymm!==yymm(INV.InvoiceDate)){
    if(!findInvoice(no)) no=nextInvNo(INV.InvoiceDate,INV);
  }
  INV.InvoiceNo=no;
  const rec={InvoiceNo:no,DocType:INV.DocType||'TAX INVOICE',InvoiceDate:INV.InvoiceDate,BillTo:INV.BillTo.trim(),
    Applicant:INV.Applicant.trim(),ContactInfo:INV.ContactInfo.trim(),ServiceType:INV.ServiceType.trim(),
    CustomerTRN:INV.CustomerTRN.trim(),TimeLinkTRN:INV.TimeLinkTRN,
    GovtSubtotal:t.govt,ServiceFee:t.fee,VAT:t.vat,ServiceFeeIncVat:t.feeInc,GrandTotal:t.grand,
    Advance:t.advance,BalanceDue:t.balance,
    Note:INV.Note||'',PDF_Link:'',CreatedAt:new Date().toISOString()};
  const ex=D.invoices.findIndex(v=>String(v.InvoiceNo).trim()===no);
  if(ex>=0){rec.CreatedAt=D.invoices[ex].CreatedAt||rec.CreatedAt;D.invoices[ex]=rec;}
  else D.invoices.push(rec);
  D.invoiceItems=D.invoiceItems.filter(x=>String(x.invoiceNo).trim()!==no);
  INV.items.filter(x=>x.desc.trim()).forEach((x,i)=>D.invoiceItems.push({
    invoiceNo:no,sr:i+1,desc:x.desc.trim(),qty:n(x.qty),rate:n(x.rate),amount:Math.round(n(x.qty)*n(x.rate)*100)/100}));
  save();
  toast(`Invoice ${no} saved · AED ${m2(t.grand)}`);
  renderInvoice();
}

function loadInvoice(no){
  const v=findInvoice(no);
  if(!v){toast('Invoice '+no+' not found',1);return;}
  const items=D.invoiceItems.filter(x=>String(x.invoiceNo).trim()===String(no).trim())
    .sort((a,b)=>(a.sr||0)-(b.sr||0)).map(x=>({desc:x.desc,qty:n(x.qty)||1,rate:n(x.rate),src:'saved'}));
  INV={InvoiceNo:v.InvoiceNo,DocType:v.DocType||'TAX INVOICE',InvoiceDate:normDate(v.InvoiceDate),BillTo:v.BillTo||'',Applicant:v.Applicant||'',
    ContactInfo:v.ContactInfo||'',ServiceType:v.ServiceType||'',CustomerTRN:v.CustomerTRN||'',
    TimeLinkTRN:v.TimeLinkTRN||D.settings.trn,ServiceFee:n(v.ServiceFee),Advance:n(v.Advance),
    Note:v.Note||'',items};
  switchView('invoice');
}

function navInv(step){
  const list=D.invoices.map(v=>v.InvoiceNo).filter(x=>parseInvNo(x))
    .sort((a,b)=>parseInvNo(a).num6-parseInvNo(b).num6);
  if(!list.length){toast('No saved invoices',1);return;}
  const cur=parseInvNo(INV.InvoiceNo);
  const c6=cur?cur.num6:Infinity;
  if(step>0){const nx=list.find(x=>parseInvNo(x).num6>c6);
    if(nx)loadInvoice(nx);else toast('Already at the newest invoice');}
  else{let prev=null;for(let i=list.length-1;i>=0;i--){if(parseInvNo(list[i]).num6<c6){prev=list[i];break;}}
    if(prev)loadInvoice(prev);else toast('Already at the oldest invoice');}
}

/* ---------- invoice PDF ---------- */
function exportInvoicePDF(inv){
  const t=invTotals(inv);
  const rows=inv.items.filter(x=>x.desc.trim()).map((x,i)=>
    `<tr class="${i%2?'alt':''}"><td class="c">${i+1}</td><td>${esc(x.desc)}</td>
     <td class="c">${n(x.qty)}</td><td class="r">${m2(x.rate)}</td>
     <td class="r">${m2(n(x.qty)*n(x.rate))}</td></tr>`).join('');
  const inner=`${pdfHeader()}
    <div class="ttl">${esc(inv.DocType||'TAX INVOICE')}<small>${esc(inv.InvoiceNo)}</small></div>
    ${docCfg(inv).stamp?`<div class="stamp" style="color:#0f766e;border-color:#0f766e">${docCfg(inv).stamp}</div>`:''}
    <div class="rule"></div>
    <table style="margin-bottom:12px;border:1px solid #d8e5e3">
      <tr><td class="k" style="width:110px;background:#f5faf9;font-weight:700;color:#0f766e">BILL TO</td>
          <td style="font-weight:700">${esc(inv.BillTo)}</td>
          <td class="k" style="width:110px;background:#f5faf9;font-weight:700;color:#0f766e">INVOICE NO.</td>
          <td style="font-family:'Courier New',monospace;font-weight:700">${esc(inv.InvoiceNo)}</td></tr>
      <tr><td style="background:#f5faf9;font-weight:700;color:#0f766e">APPLICANT</td><td>${esc(inv.Applicant||'—')}</td>
          <td style="background:#f5faf9;font-weight:700;color:#0f766e">DATE</td><td>${fmtDate(inv.InvoiceDate)}</td></tr>
      <tr><td style="background:#f5faf9;font-weight:700;color:#0f766e">CONTACT</td><td>${esc(inv.ContactInfo||'—')}</td>
          <td style="background:#f5faf9;font-weight:700;color:#0f766e">CUSTOMER TRN</td><td>${esc(inv.CustomerTRN||'NOT REGISTERED')}</td></tr>
      <tr><td style="background:#f5faf9;font-weight:700;color:#0f766e">SERVICE TYPE</td><td>${esc(inv.ServiceType||'—')}</td>
          <td style="background:#f5faf9;font-weight:700;color:#0f766e">TIMELINK TRN</td><td>${esc(inv.TimeLinkTRN)}</td></tr>
    </table>
    <table><thead><tr><th style="width:34px;text-align:center">Sr</th><th>Description</th>
      <th style="width:44px;text-align:center">Qty</th><th style="width:70px;text-align:right">Rate</th>
      <th style="width:82px;text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <table style="margin-top:12px;width:58%;margin-left:auto;border:1px solid #d8e5e3">
      <tr><td>Sub Total — Govt. Charges (non-taxable)</td><td class="r" style="width:96px">${m2(t.govt)}</td></tr>
      <tr class="alt"><td>Service Fee (taxable)</td><td class="r">${m2(t.fee)}</td></tr>
      <tr><td>VAT @ ${Math.round(n(D.settings.vatRate)*100)}% on Service Fee</td><td class="r">${m2(t.vat)}</td></tr>
      <tr class="alt"><td>Service Fee Inc. VAT</td><td class="r">${m2(t.feeInc)}</td></tr>
      <tr><td><b>${docCfg(inv).totalLabel==='GRAND TOTAL'?'Invoice Total':docCfg(inv).totalLabel}</b></td><td class="r"><b>${m2(t.grand)}</b></td></tr>
      ${t.advance?`<tr style="background:#e6f7f2"><td>Less: Advance Received</td><td class="r">− ${m2(t.advance)}</td></tr>`:''}
      <tr class="tot"><td style="text-align:right">${t.advance?docCfg(inv).dueLabel:docCfg(inv).totalLabel} (AED)</td><td class="r">${m2(t.balance)}</td></tr>
    </table>
    ${inv.Note?`<div style="margin-top:10px;font-size:9px"><b style="color:#0f766e">NOTE:</b> ${esc(inv.Note)}</div>`:''}
    ${pdfBank()}
    <table style="margin-top:16px;border:0"><tr>
      <td style="border:0;font-size:8.4px;color:#5a6d6c;width:60%;line-height:1.7">
        Government fees are collected as a disbursement and are out of scope of VAT.<br>
        VAT is applied only on service fees.<br>
        ${docCfg(inv).foot}</td>
      <td style="border:0;text-align:right;font-size:9px">
        <div style="height:34px"></div>
        <div style="border-top:1px solid #0f766e;display:inline-block;padding-top:5px;min-width:150px">
          <b>Authorized Signatory</b><br>Abrar Ali · +971 55 978 5637</div></td></tr></table>
    <div class="ty">${docCfg(inv).thanks}</div>`;
  openPDF(`${inv.DocType||'INVOICE'} ${inv.InvoiceNo} - ${inv.BillTo}`,inner);
}

/* =========================================================
   INVOICE REGISTER (list view)
   ========================================================= */
function renderInvoiceList(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'+ New Invoice','p',()=>{INV=blankInvoice();INV.InvoiceNo=nextInvNo(INV.InvoiceDate);switchView('invoice');});
  mkBtn(T,'↓ CSV','',()=>{
    const rows=D.invoices.map(v=>[v.InvoiceNo,v.InvoiceDate,v.BillTo,v.Applicant,v.ServiceType,
      v.GovtSubtotal,v.ServiceFee,v.VAT,v.GrandTotal]);
    dl(new Blob([csv([['InvoiceNo','Date','BillTo','Applicant','ServiceType','Govt','Fee','VAT','GrandTotal'],...rows])],
      {type:'text/csv'}),`invoices-${today()}.csv`);});

  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const list=D.invoices;
  const gt=list.reduce((a,x)=>a+n(x.GrandTotal),0);
  // VAT is only a real liability on tax invoices — quotations and receipts
  // carry a VAT figure too (for display) but must not count toward what's
  // actually payable, or this KPI disagrees with the VAT Return page.
  const vt=list.filter(x=>(x.DocType||'TAX INVOICE').toUpperCase()==='TAX INVOICE')
    .reduce((a,x)=>a+Math.round(n(x.ServiceFee)*vatRate()*100)/100,0);
  const ft=list.reduce((a,x)=>a+n(x.ServiceFee),0);
  wrap.append(kpiRow([
    {t:'Invoices',v:list.length,s:'all time'},
    {t:'Invoiced Value',v:m0(gt),s:'AED',a:1},
    {t:'Service Fees',v:m0(ft),s:'AED',c:'pos'},
    {t:'VAT Collected',v:m0(vt),s:'tax invoices only',c:'gold'}
  ]));

  const flagged=list.filter(invMismatch);
  if(flagged.length){
    const nb=el('div','note w');
    nb.innerHTML=`<b>⚠ ${flagged.length} invoices do not reconcile</b> — the header total stored in your sheet
      differs from the sum of that invoice's saved line items (${flagged.slice(0,4).map(v=>esc(v.InvoiceNo)).join(', ')}${flagged.length>4?'…':''}).
      This came across from the spreadsheet, where a total was edited after the lines were saved. Open one and hit
      <b>Save Invoice</b> to recompute it from the lines.`;
    wrap.append(nb);
  }

  const c=el('div','glass card noprint');
  const q=input('','text','search invoice no, customer, applicant or service…');
  c.append(q);wrap.append(c);
  const out=el('div');wrap.append(out);

  const draw=(term='')=>{
    out.innerHTML='';
    const f=list.filter(x=>!term||`${x.InvoiceNo} ${x.BillTo} ${x.Applicant} ${x.ServiceType}`.toUpperCase().includes(term.toUpperCase()))
      .sort((a,b)=>String(b.InvoiceNo).localeCompare(String(a.InvoiceNo)));
    const gw=el('div','glass gridwrap');
    const t=el('table','list');
    t.innerHTML=`<thead><tr><th style="width:106px">Number</th><th style="width:108px">Type</th><th style="width:104px">Date</th>
      <th>Bill To</th><th>Applicant</th><th>Service Type</th>
      <th style="width:92px;text-align:right">Govt</th><th style="width:82px;text-align:right">Fee</th>
      <th style="width:72px;text-align:right">VAT</th><th style="width:100px;text-align:right">Total</th>
      <th style="width:120px"></th></tr></thead>`;
    const tb=el('tbody');
    f.slice(0,500).forEach(x=>{
      const tr=el('tr');
      const mm=invMismatch(x);
      const dtp=x.DocType||'TAX INVOICE';
      tr.innerHTML=`<td style="font-family:var(--mono);font-weight:700;color:var(--gold)">${esc(x.InvoiceNo)}${mm?' <span class="badge w" title="Header total '+m2(mm.stored)+' vs lines '+m2(mm.govt)+'">!</span>':''}</td>
        <td><span class="badge ${dtp==='QUOTATION'?'w':dtp==='PAYMENT RECEIPT'?'adv':'i'}">${esc(dtp.replace('PAYMENT ',''))}</span></td>
        <td>${fmtDate(normDate(x.InvoiceDate))}</td><td><b>${esc(x.BillTo)}</b></td>
        <td>${esc(x.Applicant||'—')}</td><td style="font-size:11.6px;color:var(--ink-2)">${esc(x.ServiceType||'—')}</td>
        <td class="n">${m2(x.GovtSubtotal)}</td><td class="n">${m2(x.ServiceFee)}</td>
        <td class="n">${m2(x.VAT)}</td><td class="n" style="font-weight:800;color:var(--brand2)">${m2(x.GrandTotal)}</td><td class="c"></td>`;
      const cell=tr.lastChild;
      const e=el('button','btn sm','Edit');e.onclick=()=>loadInvoice(x.InvoiceNo);
      const p=el('button','btn sm','PDF');p.style.marginLeft='5px';
      p.onclick=()=>{const items=D.invoiceItems.filter(i=>String(i.invoiceNo).trim()===String(x.InvoiceNo).trim())
          .sort((a,b)=>(a.sr||0)-(b.sr||0)).map(i=>({desc:i.desc,qty:n(i.qty),rate:n(i.rate)}));
        exportInvoicePDF({...x,InvoiceDate:normDate(x.InvoiceDate),items,ServiceFee:n(x.ServiceFee)});};
      cell.append(e,p);tb.append(tr);
    });
    t.append(tb);gw.append(t);out.append(gw);
    out.append(el('div','hint',f.length>500?`Showing 500 of ${f.length} invoices — narrow with search.`:`${f.length} invoices`));
  };
  q.oninput=debounce(()=>draw(q.value),260);
  draw();
}

/* =========================================================
   PHASE 3 — DASHBOARD + CASH / BANK ACCOUNTS
   ========================================================= */
   // dashboard range in days, 0 = all time
   // cash & bank money-flow range


/* If the chosen window holds no entries, fall back to all-time so the
   dashboard is never blank just because the data is older than the filter. */

function svgLine(points,w,h,color,fill){
  if(points.length<2)return '';
  const vals=points.map(p=>p.v);
  const mx=Math.max(...vals,0),mn=Math.min(...vals,0);
  const rng=(mx-mn)||1;
  const padT=14,padB=20,padL=0;
  const xs=points.map((p,i)=>padL+i/(points.length-1)*(w-padL));
  const ys=points.map(p=>h-padB-((p.v-mn)/rng)*(h-padT-padB));
  const d=xs.map((x,i)=>`${i?'L':'M'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const area=`${d} L${w},${h-padB} L${padL},${h-padB} Z`;
  const zeroY=h-padB-((0-mn)/rng)*(h-padT-padB);
  /* three reference lines so the shape can be read against real numbers */
  const ticks=[mx,(mx+mn)/2,mn].map(v=>({v,y:h-padB-((v-mn)/rng)*(h-padT-padB)}));
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"
      style="width:100%;height:${h}px;display:block;overflow:visible">
    <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${fill}" stop-opacity=".38"/>
      <stop offset="1" stop-color="${fill}" stop-opacity="0"/>
    </linearGradient></defs>
    ${ticks.map(t=>`<line x1="0" y1="${t.y.toFixed(1)}" x2="${w}" y2="${t.y.toFixed(1)}"
        stroke="currentColor" stroke-opacity=".13" stroke-dasharray="3 5"/>
      <text x="2" y="${(t.y-4).toFixed(1)}" font-size="9" fill="currentColor"
        fill-opacity=".45" font-family="inherit">${Math.round(t.v).toLocaleString('en-US')}</text>`).join('')}
    <line x1="0" y1="${zeroY.toFixed(1)}" x2="${w}" y2="${zeroY.toFixed(1)}"
      stroke="currentColor" stroke-opacity=".28"/>
    <path d="${area}" fill="url(#ag)"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.4"
      stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    ${xs.map((x,i)=>`<circle cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="2.6" fill="${color}">
      <title>${esc(points[i].d)} · ${Math.round(points[i].v).toLocaleString('en-US')}</title></circle>`).join('')}
  </svg>`;
}

/* Daily points get noisy over a long window, so group into months past ~45 days. */


function renderDash(){
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



/* ---------- accounts ----------
   Mirrors the balance formulas in row 2 of the FROM JAN 2026 sheet:
     asset  → ledger top-ups  −  expenses tagged to this account   (ADCB, NOQODI, Counter Cash…)
     credit → expenses tagged to this account  −  repayments        (cards, AMER) = amount owed
     tally  → straight sum of the ledger column                     (Office Expenses, Withdrawn Profit)
   ------------------------------------------------------------- */










/* ---- add / edit an account ---- */
function accountDialog(existing){
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

/* ---- adjust balance: posts a dated movement ---- */
function adjustDialog(acc){
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

/* ---- transfer between accounts: writes a matched pair ---- */
function transferDialog(){
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

function renderAccounts(){
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

function renderAccountsBalancesOnly(panel,manage){
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
function insuranceSoon(days){
  const t=new Date();
  return D.insurance.filter(x=>{if(!x.expiry)return false;
    const d=(new Date(x.expiry)-t)/864e5;return d>=0&&d<=days;});
}

/* =========================================================
   PHASE 4 — EMPLOYEES REGISTER
   ========================================================= */


function renderEmployees(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'+ Add Employee','p',()=>{
    const body=el('div'),g=el('div','invhead');
    const nm=input('','text','full name'),co=input('','text','company'),nt=input('','text','note (optional)');
    bindAC(co,()=>D.companies,{onAdd:quickAddCompany});
    g.append(field('Employee Name',nm),field('Company',co),field('Note',nt));
    body.append(g);
    modal('Add Employee',body,[{label:'Cancel'},{label:'Add',cls:'p',fn:()=>{
      if(!nm.value.trim()){toast('Name is required',1);return false;}
      D.employees=D.employees||[];
      D.employees.push({name:nm.value.trim(),company:co.value.trim(),note:nt.value.trim()});
      audit('add','employee',nm.value.trim());save();renderEmployees();toast('Employee added');
    }}]);
  });
  mkBtn(T,'↓ CSV','',()=>dl(new Blob([csv([['EMPLOYEE','COMPANIES','JOBS','RECEIVED','EXPENSE','PROFIT','FIRST','LAST'],
    ...employeeStats().map(e=>[e.name,e.companies.join('; '),e.jobs,e.received,e.expense,e.profit,e.first,e.last])])],
    {type:'text/csv'}),`employees-${today()}.csv`));

  const rows=employeeStats();
  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const active=rows.filter(e=>e.visaTotal&&e.visaDone<e.visaTotal);
  wrap.append(kpiRow([
    {t:'Employees',v:rows.length,s:'seen in entries'},
    {t:'Total Profit',v:m0(rows.reduce((a,e)=>a+e.profit,0)),s:'across all staff',c:'pos',a:1},
    {t:'Visa Files Open',v:active.length,s:'partially complete',c:'gold'},
    {t:'Avg Profit / Employee',v:m0(rows.reduce((a,e)=>a+e.profit,0)/Math.max(1,rows.length)),s:'AED'}
  ]));

  const c=el('div','glass card noprint');
  const q=input('','text','search employee, company or work…');c.append(q);wrap.append(c);
  const out=el('div');wrap.append(out);
  const draw=(term='')=>{
    out.innerHTML='';
    const f=rows.filter(e=>!term||
      `${e.name} ${e.companies.join(' ')} ${Object.keys(e.works).join(' ')}`.toUpperCase().includes(term.toUpperCase()));
    const gw=el('div','glass gridwrap');const t=el('table','list');
    t.innerHTML=`<thead><tr><th style="min-width:170px">Employee</th><th style="min-width:170px">Company</th>
      <th style="width:60px;text-align:center">Jobs</th><th style="width:100px;text-align:right">Received</th>
      <th style="width:100px;text-align:right">Expense</th><th style="width:100px;text-align:right">Profit</th>
      <th style="min-width:150px">Most Frequent Work</th><th style="width:110px">Visa</th>
      <th style="width:118px">Insurance</th><th style="width:96px"></th></tr></thead>`;
    const tb=el('tbody');
    f.slice(0,600).forEach(e=>{
      const tr=el('tr');
      const insD=e.insExpiry?(new Date(e.insExpiry)-new Date())/864e5:null;
      const insTxt=e.insExpiry
        ? `<span style="color:${insD<0?'var(--neg)':insD<=30?'var(--warn)':'var(--ink-2)'}">${fmtDate(e.insExpiry)}</span>`
        : '<span style="color:var(--ink-3)">—</span>';
      const visa=e.visaTotal
        ? `<div style="font-family:var(--mono);font-size:11px;font-weight:700">${e.visaDone}/${e.visaTotal}</div>
           <div class="bar"><i style="width:${(e.visaDone/e.visaTotal*100).toFixed(0)}%"></i></div>`
        : '<span style="color:var(--ink-3)">—</span>';
      tr.innerHTML=`<td><b>${esc(e.name)}</b><div style="font-size:10px;color:var(--ink-3)">${e.first?fmtDate(e.first)+' → '+fmtDate(e.last):''}</div></td>
        <td style="font-size:11.8px">${esc(e.companies.slice(0,2).join(', ')||'—')}${e.companies.length>2?` +${e.companies.length-2}`:''}</td>
        <td class="c">${e.jobs}</td><td class="n">${m0(e.received)}</td><td class="n">${m0(e.expense)}</td>
        <td class="n"><b style="color:${e.profit<0?'var(--neg)':'var(--pos)'}">${m0(e.profit)}</b></td>
        <td style="font-size:11.8px">${e.topWork?esc(e.topWork[0])+` <span style="color:var(--ink-3)">×${e.topWork[1]}</span>`:'—'}</td>
        <td>${visa}</td><td style="font-size:11.5px">${insTxt}</td><td class="c"></td>`;
      const b=el('button','btn sm','History');
      b.onclick=()=>employeeHistory(e.name);
      tr.lastChild.append(b);tb.append(tr);
    });
    if(!f.length){const tr=el('tr'),td=el('td');td.colSpan=10;
      td.innerHTML='<div class="empty"><div class="e">∅</div>No employees match.</div>';tr.append(td);tb.append(tr);}
    t.append(tb);gw.append(t);out.append(gw);
    out.append(el('div','hint',`${f.length} employees`));
  };
  q.oninput=debounce(()=>draw(q.value),260);
  draw();
}



/* =========================================================
   PHASE 4 — GLOBAL SEARCH  (Ctrl/Cmd + K)
   ========================================================= */
function openSearch(){
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
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}
});

/* =========================================================
   PHASE 5 — PARTNER SHARES
   ========================================================= */


function renderPartners(){
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

function partnerDialog(existing){
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
function withdrawDialog(r){
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

/* =========================================================
   PHASE 5 — ALERTS CENTRE
   ========================================================= */
function allAlerts(){
  const A=[];
  insuranceSoon(3).forEach(x=>A.push({sev:'high',i:'⛨',t:`Insurance expires ${fmtDate(x.expiry)}`,
    d:`${x.worker} · ${x.company}`,go:'insurance'}));
  insuranceSoon(30).filter(x=>(new Date(x.expiry)-new Date())/864e5>3).forEach(x=>
    A.push({sev:'med',i:'⛨',t:`Insurance expires ${fmtDate(x.expiry)}`,d:`${x.worker} · ${x.company}`,go:'insurance'}));
  D.insurance.filter(x=>x.expiry&&new Date(x.expiry)<new Date()).slice(0,40).forEach(x=>
    A.push({sev:'high',i:'⛨',t:`Insurance EXPIRED ${fmtDate(x.expiry)}`,d:`${x.worker} · ${x.company}`,go:'insurance'}));
  const steps=Object.keys((D.visa[0]||{}).steps||{});
  D.visa.filter(v=>steps.some(s=>v.steps[s])&&!steps.every(s=>v.steps[s])).slice(0,40).forEach(v=>{
    const done=steps.filter(s=>v.steps[s]).length;
    A.push({sev:'low',i:'✓',t:`Visa file ${done}/${steps.length} complete`,d:`${v.employee} · ${v.company}`,go:'visa'});});
  companyBalances().filter(x=>x.balance<-1000).slice(0,25).forEach(x=>
    A.push({sev:'med',i:'₳',t:`${m0(-x.balance)} outstanding`,d:x.company,go:'companies',
      act:()=>{setSS({company:x.company,from:'',to:''});switchView('statement');}}));
  const untagged=D.transactions.filter(t=>!t.paidFrom&&n(t.expense)>0);
  if(untagged.length)A.push({sev:'med',i:'⚠',t:`${untagged.length} entries have an expense but no Paid From account`,
    d:`${m0(untagged.reduce((a,t)=>a+n(t.expense),0))} unallocated`,go:'entry'});
  const noRate=(D.rates||[]).filter(r=>!n(r.rate)&&!n(r.fee));
  if(noRate.length)A.push({sev:'low',i:'₤',t:`${noRate.length} work items have no rate set`,
    d:noRate.slice(0,3).map(r=>r.item).join(', '),go:'rates'});
  const loss=(D.rates||[]).filter(r=>n(r.rate)-n(r.fee)<0);
  loss.forEach(r=>A.push({sev:'high',i:'₤',t:`${r.item} is priced below cost`,
    d:`received ${m0(r.rate)}, expense ${m0(r.fee)}`,go:'rates'}));
  const mism=D.invoices.filter(invMismatch);
  if(mism.length)A.push({sev:'med',i:'🧾',t:`${mism.length} invoices do not reconcile with their line items`,
    d:mism.slice(0,4).map(v=>v.InvoiceNo).join(', '),go:'invoices'});
  const order={high:0,med:1,low:2};
  return A.sort((a,b)=>order[a.sev]-order[b.sev]);
}
function renderAlerts(){
  const T=$('#tools');T.innerHTML='';
  const A=allAlerts();
  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  wrap.append(kpiRow([
    {t:'Total Alerts',v:A.length,s:'needing attention',a:1},
    {t:'Urgent',v:A.filter(x=>x.sev==='high').length,s:'act today',c:'neg'},
    {t:'Soon',v:A.filter(x=>x.sev==='med').length,s:'this month',c:'gold'},
    {t:'Informational',v:A.filter(x=>x.sev==='low').length,s:'when you can'}
  ]));
  if(!A.length){
    wrap.innerHTML+='<div class="glass card"><div class="empty"><div class="e">✓</div>Nothing needs your attention. Everything is up to date.</div></div>';
    return;
  }
  const LBL={high:['Urgent','bal'],med:['Soon','w'],low:['Info','i']};
  ['high','med','low'].forEach(sev=>{
    const list=A.filter(x=>x.sev===sev);
    if(!list.length)return;
    const card=el('div','glass card');
    const h=el('h3',null,`${LBL[sev][0]} · ${list.length}`);card.append(h);
    list.slice(0,60).forEach(x=>{
      const r=el('div','rankrow');r.style.cursor='pointer';
      r.innerHTML=`<div class="i">${x.i}</div>
        <div class="nm">${esc(x.t)}<div style="font-size:10.5px;color:var(--ink-3)">${esc(x.d)}</div></div>
        <div class="v"><span class="badge ${LBL[sev][1]}">${LBL[sev][0]}</span></div>`;
      r.onclick=()=>x.act?x.act():switchView(x.go);
      card.append(r);
    });
    if(list.length>60)card.append(el('div','hint',`+${list.length-60} more`));
    wrap.append(card);
  });
}

/* =========================================================
   PHASE 6 — AUDIT TRAIL
   ========================================================= */
function renderAudit(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'↓ CSV','',()=>dl(new Blob([csv([['WHEN','ACTION','TYPE','DETAIL'],
    ...(D.audit||[]).map(a=>[a.ts,a.action,a.what,a.detail])])],{type:'text/csv'}),`audit-${today()}.csv`));
  mkBtn(T,'Clear Log','d',()=>{if(confirm('Clear the activity log? Your data is not affected.')){
    D.audit=[];save();renderAudit();toast('Log cleared');}});

  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const A=D.audit||[];
  wrap.append(kpiRow([
    {t:'Logged Events',v:A.length,s:'most recent 800'},
    {t:'Additions',v:A.filter(a=>a.action==='add').length,s:'new records',c:'pos'},
    {t:'Edits',v:A.filter(a=>a.action==='edit').length,s:'changes'},
    {t:'Removals',v:A.filter(a=>a.action==='remove').length,s:'deleted',c:'neg'}
  ]));
  if(!A.length){
    wrap.innerHTML+='<div class="glass card"><div class="empty"><div class="e">☰</div>Nothing logged yet. Adding a company, employee, work item or partner will appear here.</div></div>';
    return;
  }
  const card=el('div','glass card');
  const t=el('table','list');
  t.innerHTML='<thead><tr><th style="width:170px">When</th><th style="width:100px">Action</th>'+
    '<th style="width:120px">Type</th><th>Detail</th></tr></thead>';
  const tb=el('tbody');
  const CL={add:'adv',edit:'i',remove:'bal',withdraw:'w'};
  A.slice(0,400).forEach(a=>{
    const tr=el('tr');
    const d=new Date(a.ts);
    tr.innerHTML=`<td style="font-size:11.5px">${isNaN(d)?esc(a.ts):fmtDate(a.ts.slice(0,10))+' '+d.toTimeString().slice(0,5)}</td>
      <td><span class="badge ${CL[a.action]||'i'}">${esc(a.action)}</span></td>
      <td style="font-size:11.8px">${esc(a.what)}</td><td>${esc(a.detail)}</td>`;
    tb.append(tr);
  });
  t.append(tb);card.append(t);wrap.append(card);
}

/* =========================================================
   PHASE 6 — SHARE VIA WHATSAPP
   ========================================================= */

function shareStatementWA(){
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
function shareInvoiceWA(inv){
  const t=invTotals(inv);
  const msg=[
    `*${D.settings.companyName}*`,'',
    `Tax Invoice *${inv.InvoiceNo}*`,
    `Date: ${fmtDate(inv.InvoiceDate)}`,
    `Bill to: ${inv.BillTo}`,
    inv.Applicant?`Applicant: ${inv.Applicant}`:'',
    inv.ServiceType?`Service: ${inv.ServiceType}`:'','',
    `Government charges: AED ${m2(t.govt)}`,
    `Service fee: AED ${m2(t.fee)}`,
    `VAT: AED ${m2(t.vat)}`,
    `Invoice total: AED ${m2(t.grand)}`,
    t.advance?`Advance received: AED ${m2(t.advance)}`:'',
    `*${t.advance?'Balance due':'Amount due'}: AED ${m2(t.balance)}*`,'',
    `Bank: ${D.settings.bank.name}\nIBAN: ${D.settings.bank.iban}`,'',
    `Thank you for your business.\n${D.settings.phone}`
  ].filter(Boolean).join('\n');
  const num=waNumber(inv.ContactInfo);
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`,'_blank');
  audit('share','invoice',inv.InvoiceNo);save();
  toast('Opening WhatsApp');
}

/* =========================================================
   ACCOUNT TRANSACTION HISTORY
   Every movement that touches one account, oldest first so the
   running balance reads downward and the latest sits at the bottom.
   ========================================================= */


function accountHistory(name){
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

/* =========================================================
   EXPENSES — office and business overheads
   ========================================================= */
const XCOL={date:1,category:2,desc:3,amount:4,account:5};



function topUpExpenses(){
  D.expenses=D.expenses||[];
  let spare=D.expenses.filter(isBlankExp).length,added=false;
  while(spare<5){D.expenses.push(newExp());spare++;added=true;}
  if(added)save();
}


function renderExpenses(){
  topUpExpenses();
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'+ Add Expense','p',()=>growExpenses());
  mkBtn(T,'↓ CSV','',()=>dl(new Blob([csv([['DATE','CATEGORY','DESCRIPTION','AMOUNT','PAID FROM'],
    ...D.expenses.filter(x=>!isBlankExp(x)).map(x=>[x.date,x.category,x.desc,x.amount,x.account])])],
    {type:'text/csv'}),`expenses-${today()}.csv`));

  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const real=D.expenses.filter(x=>!isBlankExp(x));
  const total=real.reduce((a,x)=>a+n(x.amount),0);
  const thisMonth=real.filter(x=>monthKey(x.date)===monthKey(today())).reduce((a,x)=>a+n(x.amount),0);
  const months=[...new Set(real.map(x=>monthKey(x.date)).filter(Boolean))];
  wrap.append(kpiRow([
    {t:'Total Overheads',v:m0(total),s:`${real.length} entries`,g:'rose'},
    {t:'This Month',v:m0(thisMonth),s:monthKey(today()),g:'amber'},
    {t:'Monthly Average',v:m0(total/Math.max(1,months.length)),s:`${months.length} months`,g:'indigo'},
    {t:'Categories',v:expCategories().length,s:'in use',g:'violet'}
  ]));

  /* ---- category breakdown ---- */
  const byCat={};
  real.forEach(x=>{const c=x.category||'UNCATEGORISED';byCat[c]=(byCat[c]||0)+n(x.amount);});
  const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const g=el('div','dash');

  const cc=el('div','glass card c5');cc.style.gridColumn='span 5';
  cc.append(el('h3',null,'Where the money goes'));
  if(!cats.length)cc.append(el('div','empty','No overheads recorded yet.'));
  const maxCat=Math.max(1,...cats.map(([,v2])=>v2));
  cats.slice(0,10).forEach(([c,val])=>{
    const r=el('div','rankrow');
    r.innerHTML=`<div class="i">${esc(c.slice(0,2))}</div>
      <div class="nm">${esc(c)}
        <div class="bar"><i style="width:${(val/maxCat*100).toFixed(1)}%"></i></div></div>
      <div class="v">${m0(val)} <span style="color:var(--ink-3);font-weight:600">${(val/Math.max(1,total)*100).toFixed(0)}%</span></div>`;
    cc.append(r);
  });
  g.append(cc);

  /* ---- monthly trend ---- */
  const mc=el('div','glass card c7');mc.style.gridColumn='span 7';
  mc.append(el('h3',null,'Monthly Overheads'));
  const byMonth={};
  real.forEach(x=>{const k=monthKey(x.date);if(k)byMonth[k]=(byMonth[k]||0)+n(x.amount);});
  const mk2=Object.keys(byMonth).sort();
  if(mk2.length>1){
    const box=el('div');box.style.color='var(--ink)';
    box.innerHTML=svgLine(mk2.map(k=>({d:k,v:byMonth[k]})),600,150,'#f43f5e','#f43f5e');
    mc.append(box);
    const lg=el('div','lgd');
    lg.innerHTML=`<span><i style="background:#f43f5e"></i>Overheads per month</span>
      <span style="margin-left:auto;color:var(--ink-3)">${mk2[0]} → ${mk2[mk2.length-1]}</span>`;
    mc.append(lg);
  } else mc.append(el('div','empty','Record overheads across two or more months to see the trend.'));
  g.append(mc);
  wrap.append(g);

  /* ---- ledger ---- */
  const c=el('div','glass card noprint');
  const q=input('','text','search category, description or account…');c.append(q);wrap.append(c);
  const out=el('div');wrap.append(out);

  const draw=(term='')=>{
    out.innerHTML='';
    const all=D.expenses.filter(x=>!term||
      `${x.category} ${x.desc} ${x.account}`.toUpperCase().includes(term.toUpperCase()))
      .sort((a,b)=>{const ba=isBlankExp(a),bb=isBlankExp(b);
        if(ba!==bb)return ba?1:-1;
        return String(a.date||'').localeCompare(String(b.date||''));});
    const gw=el('div','glass gridwrap');gw.id='expgrid';
    const t=el('table','grid');
    t.innerHTML=`<thead><tr><th class="rn">#</th><th style="width:110px">Date</th>
      <th style="min-width:170px">Category</th><th>Description</th>
      <th class="c" style="width:110px">Amount</th>
      <th class="c" style="width:140px">Paid From</th><th style="width:78px"></th></tr></thead>`;
    const tb=el('tbody');tb.id='expbody';
    const row=(x,i)=>{
      const tr=el('tr');tr.dataset.id=x.id;
      const rn=el('td','rn',isBlankExp(x)?'·':String(i+1));
      if(isBlankExp(x))tr.classList.add('blank');
      tr.append(rn);
      const mk=(val,key,kind,listFn,acOpts)=>{
        const td=el('td',kind==='num'?'num':null);
        const inp=el('input','cell');inp.type=key==='date'?'date':'text';inp.value=val??'';
        inp.dataset.nav='1';inp.dataset.r=i;inp.dataset.c=XCOL[key];inp.dataset.k=key;
        if(kind==='num')inp.inputMode='decimal';
        if(listFn)bindAC(inp,listFn,acOpts||{});
        inp.addEventListener('input',()=>{
          x[key]=kind==='num'?n(inp.value):inp.value;
          const b=isBlankExp(x);tr.classList.toggle('blank',b);rn.textContent=b?'·':String(i+1);
          if(!b)ensureExpSpare(tb);
          save();});
        td.append(inp);return td;};
      tr.append(
        mk(x.date,'date','txt'),
        mk(x.category,'category','txt',expCategories,{fullList:true,onAdd:v2=>{
          D.settings.expenseCategories=D.settings.expenseCategories||[];
          if(!D.settings.expenseCategories.includes(v2)){
            D.settings.expenseCategories.push(v2);audit('add','expense category',v2);save();
            toastUndo(`Added category "${v2}"`,()=>{
              D.settings.expenseCategories=D.settings.expenseCategories.filter(z=>z!==v2);
              save();toast(`Removed "${v2}"`);});
          }
        }}),
        mk(x.desc,'desc','txt'),
        mk(x.amount,'amount','num'));

      const atd=el('td');
      const acc=pillControl();
      acc.dataset.nav='1';acc.dataset.r=i;acc.dataset.c=XCOL.account;
      const paint=()=>{
        const col=x.account?accColor(x.account):null;
        acc.value=x.account||'—';
        if(col){acc.classList.remove('empty');acc.style.background=col;acc.style.color='#fff';
          acc.style.borderColor='transparent';acc.style.boxShadow='0 2px 8px '+col+'55';}
        else{acc.classList.add('empty');acc.style.background='';acc.style.color='';acc.style.boxShadow='';}};
      paint();
      bindAC(acc,()=>['— none —',...accountNames()],{fullList:true,onPick:val=>{
        x.account=(val==='— none —')?'':val;paint();
        const b=isBlankExp(x);tr.classList.toggle('blank',b);
        if(!b)ensureExpSpare(tb);
        save();}});
      atd.append(acc);tr.append(atd);

      const act=el('td','act');
      act.style.whiteSpace='nowrap';
      const at=attachButton('exp:'+x.id,x.desc||x.category);
      at.style.cssText='padding:2px 6px;font-size:10px;margin-right:3px';
      const d=el('button','del','×');d.tabIndex=-1;
      d.onclick=()=>{if(confirm('Delete this expense?')){
        D.expenses=D.expenses.filter(z=>z.id!==x.id);
        D.attachments=(D.attachments||[]).filter(a=>a.ref!=='exp:'+x.id);
        save();draw(term);}};
      act.append(at,d);tr.append(act);
      bindRowLock(tr,!isBlankExp(x));
      return tr;
    };
    all.slice(0,600).forEach((x,i)=>tb.append(row(x,i)));
    tb._row=row;
    t.append(tb);
    const tf=el('tfoot');
    const shownTotal=all.reduce((a,x)=>a+n(x.amount),0);
    tf.innerHTML=`<tr><td colspan="4" class="l">TOTAL · ${all.filter(x=>!isBlankExp(x)).length} EXPENSES</td>
      <td>${m0(shownTotal)}</td><td colspan="2"></td></tr>`;
    t.append(tf);
    gw.append(t);out.append(gw);
    gw.addEventListener('keydown',ev=>gridKey(ev,gw,{onOverflow:()=>growExpenses(tb,gw)}));
    out.append(el('div','hint','Overheads reduce the distributable profit on Partner Shares. Tagging one to an account also deducts it from that account balance. Double-click a saved row to edit it.'));
    requestAnimationFrame(()=>{gw.scrollTop=gw.scrollHeight;});
  };
  renderExpenses._draw=()=>draw(q.value);
  q.oninput=debounce(()=>draw(q.value),260);
  draw();
}
function ensureExpSpare(tb){
  const rows=[...tb.querySelectorAll('tr')];
  const spare=rows.filter(tr=>{const x=D.expenses.find(z=>z.id===tr.dataset.id);return x&&isBlankExp(x);}).length;
  for(let i=spare;i<5;i++){
    const x=newExp();D.expenses.push(x);
    tb.append(tb._row(x,tb.querySelectorAll('tr').length));
  }
  if(spare<5)save();
}
function growExpenses(tb,gw){
  tb=tb||$('#expbody');gw=gw||$('#expgrid');
  if(!tb||!tb._row){D.expenses=D.expenses||[];D.expenses.push(newExp());save();
    if(renderExpenses._draw)renderExpenses._draw();return;}
  const x=newExp();D.expenses.push(x);save();
  const idx=tb.querySelectorAll('tr').length;
  tb.append(tb._row(x,idx));
  gw.scrollTop=gw.scrollHeight;
  focusCell(gw,idx,XCOL.category);
}

/* =========================================================
   SERVICE TEMPLATE EDITOR
   ========================================================= */
function templateDialog(name){
  const isNew=!name;
  const lines=isNew?[{sr:1,desc:'',qty:1,rate:0}]
    :D.taskTemplates.filter(t=>t.serviceType===name).sort((a,b)=>(a.sr||0)-(b.sr||0))
      .map(t=>({sr:t.sr,desc:t.desc,qty:n(t.qty)||1,rate:n(t.rate)}));

  const body=el('div');
  const nm=input(name||'','text','e.g. HIGH PROFESSION - INSIDE COUNTRY');
  body.append(field('Service Type Name',nm));

  const tot=el('div','hint');
  const gw=el('div','glass gridwrap');
  gw.style.cssText='max-height:44vh;margin-top:12px';gw.id='tplgrid';
  const t=el('table','grid');
  t.innerHTML=`<thead><tr><th class="rn">#</th><th>Description</th>
    <th class="c" style="width:64px">Qty</th><th class="c" style="width:96px">Rate</th>
    <th class="c" style="width:100px">Amount</th><th style="width:34px"></th></tr></thead>`;
  const tb=el('tbody');t.append(tb);gw.append(t);body.append(gw);

  const foot=el('div');foot.style.cssText='display:flex;gap:9px;align-items:center;margin-top:10px';
  const addb=el('button','btn sm','+ Add Line');
  addb.onclick=()=>{lines.push({sr:lines.length+1,desc:'',qty:1,rate:0});draw();
    requestAnimationFrame(()=>focusCell(gw,lines.length-1,1));};
  foot.append(addb,tot);body.append(foot);

  const draw=()=>{
    tb.innerHTML='';
    lines.forEach((L,i)=>{
      const tr=el('tr');
      tr.append(el('td','rn',String(i+1)));
      const mk=(key,kind,listFn)=>{
        const td=el('td',kind==='num'?'num':null);
        const inp=el('input','cell');inp.value=L[key]??'';
        inp.dataset.nav='1';inp.dataset.r=i;inp.dataset.c=({desc:1,qty:2,rate:3})[key];
        if(kind==='num'){inp.inputMode='decimal';inp.style.textAlign='center';}
        if(listFn)bindAC(inp,listFn,{onPick:()=>{
          if(!n(L.rate)){const hit=findRate(L.desc);if(hit){L.rate=hit.rate;draw();}}
        }});
        inp.addEventListener('input',()=>{
          L[key]=kind==='num'?n(inp.value):inp.value;
          amt.textContent=m2(n(L.qty)*n(L.rate));
          sum();});
        td.append(inp);return td;};
      tr.append(mk('desc','txt',itemNames),mk('qty','num'),mk('rate','num'));
      const atd=el('td','num');const amt=el('div');
      amt.style.cssText='padding:8px;text-align:center;font-family:var(--mono);font-weight:700;font-size:12.2px';
      amt.textContent=m2(n(L.qty)*n(L.rate));atd.append(amt);tr.append(atd);
      const act=el('td','act');const d=el('button','del','×');d.tabIndex=-1;
      d.onclick=()=>{lines.splice(i,1);draw();};
      act.append(d);tr.append(act);
      tb.append(tr);
    });
    gw.onkeydown=ev=>gridKey(ev,gw,{onOverflow:()=>{lines.push({sr:lines.length+1,desc:'',qty:1,rate:0});draw();
      requestAnimationFrame(()=>focusCell(gw,lines.length-1,1));}});
    sum();
  };
  const sum=()=>{
    const v=lines.reduce((a,L)=>a+n(L.qty)*n(L.rate),0);
    tot.innerHTML=`<b style="color:var(--ink);font-size:14px">AED ${m2(v)}</b> &nbsp;package value · ${lines.length} lines`;
  };
  draw();

  modal(isNew?'New Service Template':`Edit Template — ${name}`,body,[
    {label:'Cancel'},
    ...(isNew?[]:[{label:'Delete Template',cls:'d',fn:()=>{
      if(!confirm(`Delete the "${name}" template and all its lines?`))return false;
      D.taskTemplates=D.taskTemplates.filter(t=>t.serviceType!==name);
      audit('remove','service template',name);save();renderTemplates();toast('Template deleted');
    }}]),
    {label:isNew?'Create Template':'Save Template',cls:'p',fn:()=>{
      const v=nm.value.trim().toUpperCase();
      if(!v){toast('Template name is required',1);return false;}
      const kept=lines.filter(L=>L.desc.trim());
      if(!kept.length){toast('Add at least one line',1);return false;}
      if(isNew&&D.taskTemplates.some(t=>t.serviceType===v)){toast('That template already exists',1);return false;}
      D.taskTemplates=D.taskTemplates.filter(t=>t.serviceType!==name&&t.serviceType!==v);
      kept.forEach((L,i)=>D.taskTemplates.push({serviceType:v,sr:i+1,desc:L.desc.trim(),
        qty:n(L.qty)||1,rate:n(L.rate)}));
      audit(isNew?'add':'edit','service template',v);save();renderTemplates();
      toast(`${v} saved · ${kept.length} lines`);
    }}
  ]);
}

/* =========================================================
   CASH BOOK — manual entries against a cash or bank account
   Mirrors columns J/K and L/M of the sheet: two ledgers side by
   side, each a running list of amount + description.

   If the description names a company and the amount is positive,
   the entry is mirrored into Payments so the customer statement
   picks it up. The two stay linked: edit or delete one and the
   other follows.
   ========================================================= */
const CB={left:'COUNTER CASH',right:'ADCB',rail:'COUNTER CASH'};
const CBCOL={date:1,amount:2,desc:3};




function cbRows(account){
  return D.ledger.filter(l=>l.account===account)
    .sort((a,b)=>{
      const ba=isBlankCB(a),bb=isBlankCB(b);
      if(ba!==bb)return ba?1:-1;
      return String(a.date||'').localeCompare(String(b.date||''));
    });
}
function topUpCB(account,keep){
  keep=keep||3;
  let spare=D.ledger.filter(l=>l.account===account&&isBlankCB(l)).length,added=false;
  while(spare<keep){D.ledger.push(newCB(account));spare++;added=true;}
  if(added)save();
}

/* The description offers accounts first (a transfer) then companies (a payment). */




/* ---------- linking a cash-book row to a customer payment ---------- */

/* A transfer writes the opposite entry into the other account, so the pair nets
   to zero across the business. The mirror is owned by this row and follows it. */
function syncLinkedTransfer(l){
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

/* Creates, updates or removes the Payments record mirroring this row. */
function syncLinkedPayment(l){
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

/* ---------- one account column ---------- */
function cbColumn(account,side,compact){
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

function ensureCBSpare(tb,account,row){
  const ids=[...tb.querySelectorAll('tr')].map(tr=>tr.dataset.id);
  const spare=ids.filter(id=>{const l=D.ledger.find(x=>x.id===id);return l&&isBlankCB(l);}).length;
  for(let i=spare;i<3;i++){
    const l=newCB(account);D.ledger.push(l);
    tb.append(row(l,tb.querySelectorAll('tr').length));
  }
  if(spare<3)save();
}
function growCB(tb,gw,account,row){
  const l=newCB(account);D.ledger.push(l);save();
  const idx=tb.querySelectorAll('tr').length;
  tb.append(row(l,idx));
  gw.scrollTop=gw.scrollHeight;
  focusCell(gw,idx,CBCOL.amount);
}
/* redraw whichever screen the ledger is currently shown on */
function cbRefresh(compact){
  if(compact)renderEntry();else renderCashbook();
}
function refreshCBTotals(){
  const bals=accountBalances();
  $$('.cbcol').forEach(col=>{
    const nm=col.querySelector('.cbhead .nm').textContent;
    const a=bals.find(x=>x.name===nm);
    if(a)col.querySelector('.cbhead .bal').textContent=m0(a.balance);
  });
}

function renderCashbook(){
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


/* The same two ledgers, sized to sit beside the work sheet on Data Entry. */
/* The Data Entry rail carries a single ledger, full height — this is where the
   day's payments in and out get typed. Swap the account from its own header. */
function buildCashbookPanel(){
  const panel=el('div','cbpanel solo');
  panel.append(cbColumn(CB.rail,'rail',true));
  return panel;
}

/* =========================================================
   VAT RETURN
   Output VAT is 5% of the service fee only. Government charges are
   collected as a disbursement and sit outside the scope of VAT, so
   they are reported separately and never taxed.
   Basis: tax invoices, by invoice date. Quotations and receipts are
   not tax documents and are excluded.
   ========================================================= */







let VATMODE='quarter';
function renderVAT(){
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



/* =========================================================
   RECEIVABLES AGEING
   Payments settle the oldest work first, so whatever is left unpaid
   keeps the date of the work it belongs to. That date decides its bucket.
   ========================================================= */


/* Returns the unpaid work for one company, aged. */



function renderAgeing(){
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

/* One print job containing a statement for every company that owes money. */
function batchStatements(){
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

/* =========================================================
   RECURRING ENTRIES
   A schedule that posts overheads or cash-book movements on a
   cadence — rent, salaries, renewals. Nothing posts silently:
   due items are listed on open and you confirm them.
   ========================================================= */


/* Advance a date by one cycle, keeping the day of month where possible. */


/* Posts one occurrence and rolls the schedule forward. */

/* Catch up anything overdue — a schedule missed for two months posts twice. */


function renderRecurring(){
  D.recurring=D.recurring||[];
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'+ New Schedule','p',()=>recurringDialog(null));
  const due=dueRecurring();
  if(due.length)mkBtn(T,`Post ${due.length} due`,'g',()=>{
    const c=postAllDue();renderRecurring();toast(`Posted ${c} entries`);});

  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const list=D.recurring;
  const active=list.filter(r=>r.active);
  const monthly=active.reduce((a,r)=>{
    const f=FREQ[r.freq]||FREQ.monthly;
    const perMonth=f.days?(30/f.days):(1/f.months);
    return a+n(r.amount)*perMonth;
  },0);

  wrap.append(kpiRow([
    {t:'Schedules',v:list.length,s:`${active.length} active`,g:'indigo'},
    {t:'Due Now',v:due.length,s:due.length?'waiting to post':'all up to date',g:due.length?'rose':'teal'},
    {t:'Monthly Commitment',v:m0(monthly),s:'average across schedules',g:'amber'},
    {t:'Posted To Date',v:list.reduce((a,r)=>a+(r.posted||0),0),s:'entries created',g:'violet'}
  ]));

  if(due.length){
    const nb=el('div','note w');
    nb.innerHTML=`<b>${due.length} schedule${due.length===1?'':'s'} due.</b> `+
      due.map(r=>`${esc(r.label||'Untitled')} (${fmtDate(r.next)}, ${m0(r.amount)})`).join(' · ')+
      `. Nothing posts on its own — use <b>Post ${due.length} due</b> above when you are ready.`;
    wrap.append(nb);
  }

  const card=el('div','glass card');
  const h=el('div','ah');
  h.append(el('h3',null,'Schedules'));
  h.append(el('span','hint','soonest first'));
  card.append(h);

  const t=el('table','list');
  t.innerHTML=`<thead><tr><th style="min-width:180px">What</th>
    <th style="width:110px">Type</th><th style="width:130px">Frequency</th>
    <th style="width:110px;text-align:right">Amount</th>
    <th style="width:140px">Paid From</th>
    <th style="width:120px">Next Due</th>
    <th style="width:80px;text-align:center">Posted</th>
    <th style="width:150px"></th></tr></thead>`;
  const tb=el('tbody');
  const sorted=list.slice().sort((a,b)=>
    (a.active===b.active?0:a.active?-1:1)||String(a.next).localeCompare(String(b.next)));
  if(!sorted.length){
    const tr=el('tr'),td=el('td');td.colSpan=8;
    td.innerHTML='<div class="empty"><div class="e">↻</div>No schedules yet. Add rent, salaries or renewals and they will remind you when due.</div>';
    tr.append(td);tb.append(tr);
  }
  sorted.forEach(r=>{
    const tr=el('tr');
    const isDue=r.active&&r.next<=today()&&n(r.amount);
    if(!r.active)tr.style.opacity='.55';
    tr.innerHTML=`<td><b>${esc(r.label||'Untitled')}</b>
        ${r.category?`<div style="font-size:10px;color:var(--ink-3)">${esc(r.category)}</div>`:''}</td>
      <td><span class="badge ${r.kind==='expense'?'w':'i'}">${r.kind==='expense'?'Overhead':'Cash book'}</span></td>
      <td style="font-size:11.8px">${(FREQ[r.freq]||{}).label||r.freq}</td>
      <td class="n"><b>${m0(r.amount)}</b></td>
      <td style="font-size:11.5px">${esc(r.account||'—')}</td>
      <td>${fmtDate(r.next)}${isDue?' <span class="badge bal">due</span>':''}</td>
      <td class="c">${r.posted||0}</td><td class="c"></td>`;
    const cell=tr.lastChild;
    if(isDue){
      const p=el('button','btn sm p','Post');
      p.onclick=()=>{postRecurring(r);save();renderRecurring();toast(`${r.label} posted`);};
      cell.append(p);
    }
    const e=el('button','btn sm','Edit');e.style.marginLeft='5px';
    e.onclick=()=>recurringDialog(r);
    cell.append(e);
    tb.append(tr);
  });
  t.append(tb);
  const gw=el('div','gridwrap');gw.style.maxHeight='calc(100vh - 380px)';gw.append(t);
  card.append(gw);
  card.append(el('div','hint','Overhead schedules write to Expenses; cash-book schedules write a movement against an account. A schedule missed for several cycles catches up each one separately so nothing is lost.'));
  wrap.append(card);
}

function recurringDialog(existing){
  const isNew=!existing;
  const r=existing||newRecurring();
  const body=el('div'),g=el('div','invhead');

  const lb=input(r.label,'text','e.g. Office rent');
  const kind=el('select','fld');
  kind.append(new Option('Overhead (Expenses)','expense'),
              new Option('Cash book movement','ledger'));
  kind.value=r.kind;
  const cat=input(r.category,'text','category');
  bindAC(cat,expCategories,{fullList:true});
  const amt=input(r.amount||'','text','amount');
  const acc=input(r.account,'text','account');
  bindAC(acc,accountNames,{fullList:true});
  const freq=el('select','fld');
  Object.keys(FREQ).forEach(k=>freq.append(new Option(FREQ[k].label,k)));
  freq.value=r.freq;
  const next=input(r.next,'date');
  const act=el('select','fld');
  act.append(new Option('Active','1'),new Option('Paused','0'));
  act.value=r.active?'1':'0';

  g.append(field('Description',lb),field('Type',kind),
           field('Amount (AED)',amt),field('Frequency',freq),
           field('Category',cat),field('Paid From',acc),
           field('Next Due',next),field('Status',act));
  body.append(g);

  const prev=el('div','hint');
  const upd=()=>{
    const nx=next.value||today();
    prev.innerHTML=`Next three: <b>${fmtDate(nx)}</b> → <b>${fmtDate(advanceDate(nx,freq.value))}</b> → `+
      `<b>${fmtDate(advanceDate(advanceDate(nx,freq.value),freq.value))}</b>`;
  };
  freq.onchange=upd;next.onchange=upd;upd();
  body.append(prev);
  body.append(el('div','hint','Cash-book schedules use a positive amount for money in and a negative one for money out. Overheads are always money out.'));

  modal(isNew?'New Schedule':'Edit Schedule',body,[
    {label:'Cancel'},
    ...(isNew?[]:[{label:'Delete',cls:'d',fn:()=>{
      if(!confirm(`Delete the "${r.label}" schedule? Entries already posted are kept.`))return false;
      D.recurring=D.recurring.filter(x=>x.id!==r.id);
      audit('remove','recurring',r.label);save();renderRecurring();toast('Schedule deleted');
    }}]),
    {label:isNew?'Create':'Save',cls:'p',fn:()=>{
      if(!lb.value.trim()){toast('Give the schedule a description',1);return false;}
      if(!n(amt.value)){toast('Enter an amount',1);return false;}
      Object.assign(r,{label:lb.value.trim(),kind:kind.value,category:cat.value.trim(),
        amount:n(amt.value),account:acc.value.trim(),freq:freq.value,
        next:next.value||today(),active:act.value==='1'});
      D.recurring=D.recurring||[];
      if(isNew)D.recurring.push(r);
      audit(isNew?'add':'edit','recurring',r.label);save();renderRecurring();
      toast(`${r.label} saved`);
    }}
  ]);
}

/* =========================================================
   ATTACHMENTS
   Files live in their own IndexedDB store so the main record stays
   small — the working data object is written on every keystroke and
   must not carry megabytes of images.
   ========================================================= */

   // 4 MB per file

/* Same database, same connection logic as idb() in p2_core.js — kept as one
   alias rather than a second indexedDB.open() so the version number and the
   set of stores created on upgrade can never drift apart again. */








/* A button that shows the count and opens the manager. */
function attachButton(ref,title){
  const b=el('button','btn sm attachbtn');
  const paint=()=>{
    const c=attachCount(ref);
    b.textContent=c?`📎 ${c}`:'📎 Attach';
    b.classList.toggle('has',!!c);
  };
  paint();
  b.onclick=()=>attachmentDialog(ref,title,paint);
  return b;
}

function attachmentDialog(ref,title,onChange){
  D.attachments=D.attachments||[];
  const body=el('div');
  const list=el('div');
  const drop=el('div','dropzone');
  drop.innerHTML='<b>Drop files here</b><span>or click to choose — images and PDFs, up to 4 MB each</span>';
  const picker=el('input');picker.type='file';picker.multiple=true;
  picker.accept='image/*,application/pdf';picker.style.display='none';
  drop.onclick=()=>picker.click();
  drop.ondragover=e=>{e.preventDefault();drop.classList.add('over');};
  drop.ondragleave=()=>drop.classList.remove('over');
  drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');take(e.dataTransfer.files);};
  picker.onchange=()=>take(picker.files);
  body.append(drop,picker,list);

  async function take(files){
    let added=0;
    for(const f of [...files]){
      if(f.size>MAX_FILE){toast(`${f.name} is over 4 MB — skipped`,1);continue;}
      const id=uid();
      await filePut(id,f);
      D.attachments.push({id,ref,name:f.name,type:f.type,size:f.size,
        added:new Date().toISOString()});
      added++;
    }
    if(added){save();draw();if(onChange)onChange();
      audit('add','attachment',`${added} file(s) on ${title||ref}`);
      toast(`${added} file${added===1?'':'s'} attached`);}
  }

  function draw(){
    list.innerHTML='';
    const items=attachmentsFor(ref);
    if(!items.length){
      list.append(el('div','hint','Nothing attached yet.'));
      return;
    }
    items.forEach(a=>{
      const row=el('div','attrow');
      const isImg=String(a.type).startsWith('image/');
      row.innerHTML=`<div class="ic">${isImg?'🖼':'📄'}</div>
        <div class="nm"><b>${esc(a.name)}</b>
          <span>${(a.size/1024).toFixed(0)} KB · ${fmtDate(String(a.added).slice(0,10))}</span></div>`;
      const open=el('button','btn sm','Open');
      open.onclick=async()=>{
        const blob=await fileGet(a.id);
        if(!blob){toast('File missing from storage',1);return;}
        const url=URL.createObjectURL(blob);
        window.open(url,'_blank');
        setTimeout(()=>URL.revokeObjectURL(url),60000);
      };
      const dl2=el('button','btn sm','Save');
      dl2.onclick=async()=>{
        const blob=await fileGet(a.id);if(!blob)return;
        const x=el('a');x.href=URL.createObjectURL(blob);x.download=a.name;x.click();
        setTimeout(()=>URL.revokeObjectURL(x.href),4000);
      };
      const del=el('button','btn sm d','×');
      del.onclick=async()=>{
        if(!confirm(`Remove ${a.name}?`))return;
        await fileDel(a.id);
        D.attachments=D.attachments.filter(x=>x.id!==a.id);
        save();draw();if(onChange)onChange();toast('Removed');
      };
      const acts=el('div','acts');acts.append(open,dl2,del);
      row.append(acts);
      list.append(row);
    });
  }
  draw();

  modal(`Attachments${title?' — '+title:''}`,body,[{label:'Close'}]);
}

/* =========================================================
   DATA REPAIR — the two known issues in the imported sheet
   ========================================================= */
function dataIssues(){
  const badInv=D.invoices.filter(invMismatch).map(v=>({
    type:'invoice',id:v.InvoiceNo,
    detail:`header ${m2(n(v.GovtSubtotal))} vs lines ${m2(invMismatch(v).govt)}`,
    fix:()=>{
      const items=D.invoiceItems.filter(i=>String(i.invoiceNo).trim()===String(v.InvoiceNo).trim());
      const govt=Math.round(items.reduce((a,x)=>a+n(x.qty)*n(x.rate),0)*100)/100;
      const fee=n(v.ServiceFee);
      const vat=Math.round(fee*n(D.settings.vatRate)*100)/100;
      v.GovtSubtotal=govt;v.VAT=vat;
      v.ServiceFeeIncVat=Math.round((fee+vat)*100)/100;
      v.GrandTotal=Math.round((govt+fee+vat)*100)/100;
      v.BalanceDue=Math.round((v.GrandTotal-n(v.Advance))*100)/100;
    }
  }));
  const badRate=(D.rates||[]).filter(r=>n(r.rate)-n(r.fee)<0).map(r=>({
    type:'rate',id:r.item,
    detail:`received ${m0(r.rate)} but expense ${m0(r.fee)} — loses ${m0(r.fee-r.rate)} each time`,
    fix:()=>{r.rate=n(r.fee);}      // at minimum, break even
  }));
  return[...badInv,...badRate];
}
function repairDialog(){
  const issues=dataIssues();
  const body=el('div');
  if(!issues.length){
    body.append(el('div','empty','Nothing to repair — every invoice reconciles and no item is priced below cost.'));
    modal('Data Check',body,[{label:'Close'}]);
    return;
  }
  const nb=el('div','note w');
  nb.innerHTML=`<b>${issues.length} issues found.</b> These came across from the spreadsheet.
    Repairing recalculates each invoice from its own line items, and lifts any below-cost rate up to break-even.
    Take a backup first if you want to be able to step back.`;
  body.append(nb);

  const t=el('table','list');
  t.innerHTML='<thead><tr><th style="width:110px">Type</th><th style="width:150px">Record</th><th>Problem</th></tr></thead>';
  const tb=el('tbody');
  issues.forEach(i=>{
    const tr=el('tr');
    tr.innerHTML=`<td><span class="badge ${i.type==='invoice'?'w':'bal'}">${i.type}</span></td>
      <td><b>${esc(i.id)}</b></td><td style="font-size:11.8px">${esc(i.detail)}</td>`;
    tb.append(tr);
  });
  t.append(tb);
  const box=el('div','glass gridwrap');box.style.cssText='max-height:44vh;margin-top:12px';
  box.append(t);body.append(box);

  modal('Data Check',body,[
    {label:'Close'},
    {label:`Repair all ${issues.length}`,cls:'p',fn:()=>{
      issues.forEach(i=>i.fix());
      rateBust();
      audit('repair','data',`${issues.length} records`);
      save();toast(`Repaired ${issues.length} records`);
      if(typeof renderData==='function')switchView('data');
    }}
  ]);
}

/* =========================================================
   AI ASSISTANT — TOOL LAYER
   The model never sees the raw dataset; it is far too large for a
   20b context and paraphrased numbers would be wrong. Instead it
   calls these functions, the app computes from the real records,
   and only compact results go back into the conversation.
   ========================================================= */

function aiCfg(){
  D.settings.ai=D.settings.ai||{};
  const a=D.settings.ai;
  if(!a.url)a.url='http://localhost:11434';
  if(!a.model)a.model='gpt-oss-large:latest';
  if(a.temperature===undefined)a.temperature=0.3;
  return a;
}

/* ---------- headline snapshot, always sent with the first message ---------- */
function aiSnapshot(){
  const tx=D.transactions.filter(t=>!isBlankTx(t));
  const rec=tx.reduce((a,t)=>a+n(t.received),0);
  const exp=tx.reduce((a,t)=>a+n(t.expense),0);
  const bals=companyBalances();
  const due=bals.filter(x=>x.balance<0);
  const accs=accountBalances();
  const vat=vatPeriods('quarter')[0];
  return{
    today:today(),
    business:D.settings.companyName,
    entries:tx.length,
    sales:Math.round(rec),
    work_expense:Math.round(exp),
    gross_profit:Math.round(rec-exp),
    payments_received:Math.round(D.payments.reduce((a,p)=>a+n(p.amount),0)),
    companies:bals.length,
    companies_owing:due.length,
    total_receivable:Math.round(due.reduce((a,x)=>a-x.balance,0)),
    cash_available:Math.round(accs.filter(a=>a.type==='asset').reduce((s,a)=>s+a.balance,0)),
    owed_on_cards:Math.round(accs.filter(a=>a.type==='credit').reduce((s,a)=>s+Math.max(0,a.balance),0)),
    invoices:D.invoices.length,
    latest_vat_period:vat?vat.key:null,
    latest_vat_due:vat?vat.vat:0,
    date_range:(()=>{const ds=tx.map(t=>t.date).filter(Boolean).sort();
      return ds.length?`${ds[0]} to ${ds[ds.length-1]}`:'no dated entries';})()
  };
}

/* ---------- the callable tools ---------- */
const AI_TOOLS={
  /* ------------- read ------------- */
  business_snapshot:{
    desc:'Headline figures for the whole business: sales, profit, cash, receivables, VAT.',
    params:{},
    run:()=>aiSnapshot()
  },
  find_company:{
    desc:'Find companies whose name contains the text. Use before any company-specific question.',
    params:{query:'part of the company name'},
    run:({query})=>{
      const q=String(query||'').toUpperCase();
      return{matches:allCompanies().filter(c=>c.toUpperCase().includes(q)).slice(0,15)};
    }
  },
  company_balance:{
    desc:'Statement position for one company: what they were charged, what they paid, and the closing balance. Negative closing means they owe you.',
    params:{company:'exact company name'},
    run:({company})=>{
      const name=allCompanies().find(c=>c.toUpperCase()===String(company||'').toUpperCase());
      if(!name)return{error:`No company named "${company}". Call find_company first.`};
      const s=buildStatement(name,'','');
      const a=ageCompany(name);
      return{company:name,total_charged:Math.round(s.totalCost),
        total_paid:Math.round(s.totalRec),closing_balance:Math.round(s.closing),
        status:s.closing<0?'owes us':'in advance',
        entries:s.lines.length,
        owed_now:Math.round(a.owed),oldest_unpaid:a.oldest||null,days_overdue:a.oldestDays};
    }
  },
  top_debtors:{
    desc:'Companies that owe money, largest first.',
    params:{limit:'how many, default 10'},
    run:({limit})=>({debtors:companyBalances().filter(x=>x.balance<0)
      .slice(0,+limit||10).map(x=>({company:x.company,owes:Math.round(-x.balance)}))})
  },
  receivables_ageing:{
    desc:'How old the money owed is, split into current / 31-60 / 61-90 / over 90 days.',
    params:{},
    run:()=>{
      const R=ageAll();
      const tot=k=>Math.round(R.reduce((a,r)=>a+r.buckets[k],0));
      return{companies:R.length,total_owed:Math.round(R.reduce((a,r)=>a+r.owed,0)),
        current:tot('current'),days_31_60:tot('b30'),days_61_90:tot('b60'),over_90:tot('b90'),
        worst:R.slice(0,5).map(r=>({company:r.company,owed:Math.round(r.owed),days:r.oldestDays}))};
    }
  },
  vat_return:{
    desc:'Output VAT by quarter or month. VAT is 5% of service fees only; government charges are out of scope.',
    params:{mode:'"quarter" or "month"',period:'optional, e.g. 2026-Q2'},
    run:({mode,period})=>{
      const P=vatPeriods(mode==='month'?'month':'quarter');
      if(period){
        const hit=P.find(p=>p.key.toUpperCase()===String(period).toUpperCase());
        if(!hit)return{error:`No period ${period}. Available: ${P.map(p=>p.key).join(', ')}`};
        return{period:hit.key,invoices:hit.count,service_fees:hit.fee,
          output_vat:hit.vat,govt_out_of_scope:hit.govt};
      }
      return{periods:P.map(p=>({period:p.key,invoices:p.count,
        service_fees:p.fee,output_vat:p.vat}))};
    }
  },
  profit_summary:{
    desc:'Sales, expense and profit over a date range.',
    params:{from:'YYYY-MM-DD, optional',to:'YYYY-MM-DD, optional'},
    run:({from,to})=>{
      const tx=D.transactions.filter(t=>!isBlankTx(t)&&
        (!from||t.date>=from)&&(!to||t.date<=to));
      const rec=tx.reduce((a,t)=>a+n(t.received),0);
      const exp=tx.reduce((a,t)=>a+n(t.expense),0);
      return{from:from||'start',to:to||'today',entries:tx.length,
        sales:Math.round(rec),expense:Math.round(exp),profit:Math.round(rec-exp),
        margin_pct:rec?+((rec-exp)/rec*100).toFixed(1):0};
    }
  },
  work_profitability:{
    desc:'Which work types earn the most, by total profit.',
    params:{limit:'how many, default 10'},
    run:({limit})=>{
      const by={};
      D.transactions.filter(t=>!isBlankTx(t)&&t.work).forEach(t=>{
        const w=t.work.trim();
        by[w]=by[w]||{count:0,received:0,profit:0};
        by[w].count++;by[w].received+=n(t.received);by[w].profit+=n(t.profit);
      });
      return{work:Object.entries(by).sort((a,b)=>b[1].profit-a[1].profit)
        .slice(0,+limit||10).map(([w,v])=>({work:w,jobs:v.count,
          received:Math.round(v.received),profit:Math.round(v.profit)}))};
    }
  },
  account_balances:{
    desc:'Cash, bank and card balances.',
    params:{},
    run:()=>({accounts:accountBalances().map(a=>({name:a.name,type:a.type,
      balance:Math.round(a.balance),meaning:a.type==='credit'?'amount owed on card':'money available'}))})
  },
  search_entries:{
    desc:'Search the work sheet by company, employee or work type.',
    params:{query:'text to look for',limit:'default 20'},
    run:({query,limit})=>{
      const q=String(query||'').toUpperCase();
      // sort by date before taking the tail — array order is insertion order,
      // not chronological order, so slice(-N) alone doesn't reliably mean
      // "the most recent" entries
      const hits=D.transactions.filter(t=>!isBlankTx(t)&&
        `${t.company} ${t.employee} ${t.work}`.toUpperCase().includes(q))
        .sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')))
        .slice(-(+limit||20));
      return{count:hits.length,entries:hits.map(t=>({date:t.date,company:t.company,
        employee:t.employee,work:t.work,received:n(t.received),
        expense:n(t.expense),profit:n(t.profit),paid_from:t.paidFrom||null}))};
    }
  },
  invoice_lookup:{
    desc:'Look up one invoice by number, or list recent invoices for a customer.',
    params:{number:'invoice number, optional',company:'customer name, optional'},
    run:({number,company})=>{
      if(number){
        const v=findInvoice(String(number).trim().toUpperCase());
        if(!v)return{error:`No invoice ${number}`};
        const items=D.invoiceItems.filter(i=>String(i.invoiceNo).trim()===String(v.InvoiceNo).trim());
        return{invoice:v.InvoiceNo,type:v.DocType||'TAX INVOICE',date:normDate(v.InvoiceDate),
          bill_to:v.BillTo,govt:n(v.GovtSubtotal),service_fee:n(v.ServiceFee),
          vat:n(v.VAT),total:n(v.GrandTotal),
          lines:items.map(i=>({desc:i.desc,qty:n(i.qty),rate:n(i.rate)}))};
      }
      const q=String(company||'').toUpperCase();
      return{invoices:D.invoices.filter(v=>String(v.BillTo).toUpperCase().includes(q))
        .sort((a,b)=>String(normDate(a.InvoiceDate)||'').localeCompare(String(normDate(b.InvoiceDate)||'')))
        .slice(-15).map(v=>({invoice:v.InvoiceNo,date:normDate(v.InvoiceDate),
          bill_to:v.BillTo,total:n(v.GrandTotal)}))};
    }
  },
  employee_summary:{
    desc:'What one employee has worked on and earned, or the top employees by profit.',
    params:{name:'employee name, optional'},
    run:({name})=>{
      const all=employeeStats();
      if(name){
        const q=String(name).toUpperCase();
        const e=all.find(x=>x.name.toUpperCase()===q)||all.find(x=>x.name.toUpperCase().includes(q));
        if(!e)return{error:`No employee matching "${name}"`};
        return{employee:e.name,companies:e.companies,jobs:e.jobs,
          received:Math.round(e.received),profit:Math.round(e.profit),
          most_frequent_work:e.topWork?e.topWork[0]:null,
          visa_progress:e.visaTotal?`${e.visaDone}/${e.visaTotal}`:null,
          insurance_expiry:e.insExpiry||null};
      }
      return{employees:all.slice(0,10).map(e=>({name:e.name,jobs:e.jobs,
        profit:Math.round(e.profit)}))};
    }
  },
  expense_summary:{
    desc:'Office overheads by category, optionally for one month (YYYY-MM).',
    params:{month:'YYYY-MM, optional'},
    run:({month})=>{
      const rows=(D.expenses||[]).filter(x=>!isBlankExp(x)&&(!month||monthKey(x.date)===month));
      const by={};
      rows.forEach(x=>{const c=x.category||'UNCATEGORISED';by[c]=(by[c]||0)+n(x.amount);});
      return{month:month||'all time',total:Math.round(rows.reduce((a,x)=>a+n(x.amount),0)),
        entries:rows.length,
        by_category:Object.entries(by).sort((a,b)=>b[1]-a[1])
          .map(([c,v])=>({category:c,amount:Math.round(v)}))};
    }
  },
  alerts:{
    desc:'Anything needing attention: expiring insurance, open visa files, overdue balances, data problems.',
    params:{},
    run:()=>({alerts:allAlerts().slice(0,20).map(a=>({severity:a.sev,what:a.t,detail:a.d}))})
  },
  partner_shares:{
    desc:'Profit split between partners, what each is entitled to and has withdrawn.',
    params:{},
    run:()=>{
      const p=partnerData();
      return{gross_profit:Math.round(p.grossProfit),office_expenses:Math.round(p.office),
        reserves:Math.round(p.reserves),distributable:Math.round(p.distributable),
        partners:p.rows.map(r=>({name:r.name,share_pct:+(r.share*100).toFixed(1),
          entitled:Math.round(r.entitled),withdrawn:Math.round(r.drawn),
          outstanding:Math.round(r.outstanding)}))};
    }
  },
  rate_lookup:{
    desc:'What we charge and what it costs for a work item.',
    params:{item:'work item name'},
    run:({item})=>{
      const hit=findRate(item);
      if(!hit)return{error:`No rate for "${item}"`,
        available:(D.rates||[]).slice(0,20).map(r=>r.item)};
      return{item,received:hit.rate,expense:hit.fee,profit:hit.rate-hit.fee};
    }
  },

  /* ------------- write ------------- */
  add_work_entry:{
    desc:'Add a row to the work sheet. Received is what the client pays, expense is our cost.',
    write:true,
    params:{date:'YYYY-MM-DD',company:'company name',employee:'employee name',
      work:'work item',received:'amount charged',expense:'our cost',paid_from:'account, optional'},
    run:(a)=>{
      const rec={id:uid(),date:parseAnyDate(a.date)||today(),
        company:String(a.company||'').trim(),employee:String(a.employee||'').trim(),
        work:String(a.work||'').trim(),received:n(a.received),expense:n(a.expense),
        profit:Math.round((n(a.received)-n(a.expense))*100)/100,
        paidFrom:String(a.paid_from||'').trim(),_s:Date.now()};
      if(rec.company&&!D.companies.some(c=>c.toUpperCase()===rec.company.toUpperCase())){
        D.companies.push(rec.company);D.companies.sort();
      }
      D.transactions.push(rec);
      aiRecord('add_work_entry',`${rec.company} · ${rec.work} · ${m0(rec.received)}`,
        ()=>{D.transactions=D.transactions.filter(x=>x.id!==rec.id);});
      return{added:true,id:rec.id,...rec};
    }
  },
  add_payment:{
    desc:'Record a payment received from a company.',
    write:true,
    params:{date:'YYYY-MM-DD',company:'company name',amount:'amount received',
      account:'which account it landed in, optional',remark:'note, optional'},
    run:(a)=>{
      const rec={date:parseAnyDate(a.date)||today(),amount:n(a.amount),
        company:String(a.company||'').trim(),account:String(a.account||'').trim(),
        remark:String(a.remark||'').trim(),_aiId:uid()};
      D.payments.push(rec);
      aiRecord('add_payment',`${rec.company} · ${m0(rec.amount)}`,
        ()=>{D.payments=D.payments.filter(x=>x._aiId!==rec._aiId);});
      return{added:true,...rec};
    }
  },
  add_expense:{
    desc:'Record an office or business overhead.',
    write:true,
    params:{date:'YYYY-MM-DD',category:'expense category',desc:'description',
      amount:'amount',account:'paid from which account, optional'},
    run:(a)=>{
      const rec={id:uid(),date:parseAnyDate(a.date)||today(),
        category:String(a.category||'MISCELLANEOUS').trim(),
        desc:String(a.desc||'').trim(),amount:n(a.amount),
        account:String(a.account||'').trim()};
      D.expenses=D.expenses||[];D.expenses.push(rec);
      aiRecord('add_expense',`${rec.category} · ${m0(rec.amount)}`,
        ()=>{D.expenses=D.expenses.filter(x=>x.id!==rec.id);});
      return{added:true,...rec};
    }
  },
  add_cashbook_entry:{
    desc:'Add a cash book movement. Positive is money in, negative is money out.',
    write:true,
    params:{date:'YYYY-MM-DD',account:'account name',amount:'positive in, negative out',
      description:'note, or a company name to log it as a payment'},
    run:(a)=>{
      const rec={id:uid(),date:parseAnyDate(a.date)||today(),
        account:String(a.account||'COUNTER CASH').trim(),amount:n(a.amount),
        remark:String(a.description||'').trim(),company:''};
      rec.company=companyMatch(rec.remark);
      D.ledger.push(rec);
      syncLinkedPayment(rec);
      aiRecord('add_cashbook_entry',`${rec.account} · ${m0(rec.amount)}`,()=>{
        D.payments=D.payments.filter(p=>p.srcLedger!==rec.id);
        D.ledger=D.ledger.filter(x=>x.id!==rec.id);
      });
      return{added:true,...rec,linked_payment:!!rec.company&&rec.amount>0};
    }
  },
  set_rate:{
    desc:'Set or update what a work item charges and costs.',
    write:true,
    params:{item:'work item name',received:'client price',expense:'our cost'},
    run:(a)=>{
      const item=String(a.item||'').trim();
      if(!item)return{error:'item is required'};
      const existing=(D.rates||[]).find(r=>r.item.toUpperCase()===item.toUpperCase());
      const before=existing?{...existing}:null;
      if(existing){existing.rate=n(a.received);existing.fee=n(a.expense);}
      else D.rates.push({item,rate:n(a.received),fee:n(a.expense)});
      rateBust();
      aiRecord('set_rate',`${item} · ${m0(a.received)}/${m0(a.expense)}`,()=>{
        if(before){const r=D.rates.find(x=>x.item===item);Object.assign(r,before);}
        else D.rates=D.rates.filter(x=>x.item!==item);
        rateBust();
      });
      return{saved:true,item,received:n(a.received),expense:n(a.expense),
        profit:n(a.received)-n(a.expense)};
    }
  }
};

/* ---------- undo stack for anything the assistant writes ---------- */
const AI_UNDO=[];
function aiRecord(tool,detail,undoFn){
  AI_UNDO.push({tool,detail,undoFn,at:new Date().toISOString()});
  if(AI_UNDO.length>50)AI_UNDO.shift();
  audit('ai',tool,detail);
  save();
}
function aiUndoLast(){
  const last=AI_UNDO.pop();
  if(!last)return null;
  last.undoFn();
  audit('undo','ai action',last.detail);
  save();
  return last;
}

/* ---------- run a tool safely ---------- */
function aiRunTool(name,args){
  const t=AI_TOOLS[name];
  if(!t)return{error:`Unknown tool "${name}". Available: ${Object.keys(AI_TOOLS).join(', ')}`};
  try{
    const out=t.run(args||{});
    if(t.write&&typeof refreshEntryTotals==='function'){
      try{refreshEntryTotals();}catch(e){}
    }
    return out;
  }catch(e){return{error:String(e.message||e)};}
}

/* Ollama's tool schema */
function aiToolSpecs(){
  return Object.entries(AI_TOOLS).map(([name,t])=>({
    type:'function',
    function:{
      name,
      description:t.desc+(t.write?' This writes to the records.':''),
      parameters:{
        type:'object',
        properties:Object.fromEntries(Object.entries(t.params).map(([k,v])=>
          [k,{type:/amount|received|expense|limit|rate/.test(k)?'number':'string',description:v}])),
        required:[]
      }
    }
  }));
}

/* =========================================================
   AI ASSISTANT — OLLAMA CLIENT, OFFLINE ENGINE AND CHAT
   ========================================================= */

const AI_SYSTEM=()=>`You are the assistant built into TIME LINK Business Suite, the system that runs
a business setup services company in Dubai. You know this business through the tools available to you.

Rules that matter:
- NEVER state a figure from memory. Call a tool and use what it returns. If a tool has not given you
  a number, say you need to look it up and call the tool.
- Amounts are in AED. Round to whole dirhams unless asked otherwise.
- A NEGATIVE closing balance means the customer OWES money. A positive one means they hold an advance.
- On the work sheet, "received" is what the client is charged and "expense" is our cost; profit is the difference.
- VAT is 5% and applies ONLY to service fees. Government charges are disbursements and are outside VAT scope.
- To answer anything about a specific company, call find_company first to get the exact name.
- You can write to the records. Do it when asked, then say plainly what you changed.
- Be brief. Give the number and one line of context, not an essay.

Current position: ${JSON.stringify(aiSnapshot())}`;

/* ---------- connection ---------- */
async function aiPing(){
  const cfg=aiCfg();
  try{
    const r=await fetch(cfg.url.replace(/\/$/,'')+'/api/tags',{method:'GET'});
    if(!r.ok)return{ok:false,reason:'http',detail:`Ollama answered ${r.status}`};
    const j=await r.json();
    const models=(j.models||[]).map(m=>m.name);
    return{ok:true,models,hasModel:models.some(m=>m.split(':')[0]===cfg.model.split(':')[0])};
  }catch(e){
    return{ok:false,reason:'blocked',detail:String(e.message||e)};
  }
}

/* ---------- streaming chat with tool calls ---------- */
async function aiChat(messages,onDelta,onTool){
  const cfg=aiCfg();
  const body={
    model:cfg.model,
    messages,
    stream:true,
    options:{temperature:n(cfg.temperature)},
    tools:aiToolSpecs()
  };
  const r=await fetch(cfg.url.replace(/\/$/,'')+'/api/chat',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
  });
  if(!r.ok)throw new Error(`Ollama returned ${r.status}. ${await r.text()}`);

  const reader=r.body.getReader(),dec=new TextDecoder();
  let buf='',content='',calls=[];
  while(true){
    const{done,value}=await reader.read();
    if(done)break;
    buf+=dec.decode(value,{stream:true});
    const lines=buf.split('\n');buf=lines.pop();
    for(const line of lines){
      if(!line.trim())continue;
      let j;try{j=JSON.parse(line);}catch(e){continue;}
      const m=j.message||{};
      if(m.content){content+=m.content;onDelta&&onDelta(m.content);}
      if(m.tool_calls&&m.tool_calls.length)calls.push(...m.tool_calls);
    }
  }
  return{content,calls};
}

/* One turn: ask, run any tools, ask again with the results. */
async function aiTurn(history,onDelta,onTool,depth){
  depth=depth||0;
  const{content,calls}=await aiChat(history,onDelta);
  if(!calls.length||depth>=4)return content;

  history.push({role:'assistant',content:content||'',tool_calls:calls});
  for(const c of calls){
    const name=c.function&&c.function.name;
    let args=c.function&&c.function.arguments;
    if(typeof args==='string'){try{args=JSON.parse(args);}catch(e){args={};}}
    const result=aiRunTool(name,args||{});
    onTool&&onTool(name,args||{},result);
    history.push({role:'tool',content:JSON.stringify(result),name});
  }
  return aiTurn(history,onDelta,onTool,depth+1);
}

/* =========================================================
   OFFLINE ENGINE
   Answers the questions that come up daily, straight from the
   data, so the assistant is useful even with Ollama stopped.
   ========================================================= */
function aiOffline(q){
  const Q=String(q||'').toLowerCase().trim();
  const has=(...w)=>w.some(x=>Q.includes(x));
  const money=v=>`AED ${m0(v)}`;

  /* An exact company name is checked first — otherwise a customer called
     "CASH CUSTOMER" would be swallowed by the cash-balance branch below. */
  const exact=allCompanies().find(c=>c.toLowerCase()===Q);
  if(exact){
    const s=buildStatement(exact,'','');
    return`${exact}: charged ${money(s.totalCost)}, paid ${money(s.totalRec)}, `+
      `closing ${money(Math.abs(s.closing))} ${s.closing<0?'owed to you':'held in advance'} `+
      `across ${s.lines.length} entries.`;
  }
  /* "most profitable work" is about work, not the profit summary — check it first */
  if(has('profitable work','best work','work earns','which work','which service','top work')||
     (has('work','service') && has('profitable','best','earn','top','popular'))){
    const by={};
    D.transactions.filter(t=>!isBlankTx(t)&&t.work).forEach(t=>{
      by[t.work]=by[t.work]||{c:0,p:0};by[t.work].c++;by[t.work].p+=n(t.profit);});
    const top=Object.entries(by).sort((a,b)=>b[1].p-a[1].p).slice(0,6);
    if(top.length)return`Most profitable work:\n\n`+top.map(([w,v])=>
      `• ${w} — ${money(v.p)} from ${v.c} job${v.c===1?'':'s'}`).join('\n');
  }
  if(has('owe','outstanding','receivable','debtor','chase')){
    const R=ageAll();
    if(!R.length)return'Nothing is outstanding — every company is settled or holds an advance.';
    const top=R.slice(0,5).map(r=>`• ${r.company} — ${money(r.owed)}${r.oldestDays?` (oldest ${r.oldestDays} days)`:''}`).join('\n');
    return`${R.length} companies owe you ${money(R.reduce((a,r)=>a+r.owed,0))} in total.\n\n${top}`;
  }
  if(has('vat','tax return')){
    const P=vatPeriods('quarter');
    if(!P.length)return'No tax invoices yet, so there is no VAT to report.';
    return`Output VAT by quarter (5% of service fees only):\n\n`+
      P.slice(0,6).map(p=>`• ${periodLabel(p.key)} — ${money(p.vat)} on ${money(p.fee)} of fees`).join('\n');
  }
  if(has('cash','bank','balance','account')){
    const A=accountBalances().filter(a=>a.balance||a.moves);
    return`Account balances:\n\n`+A.map(a=>
      `• ${a.name} — ${money(a.balance)}${a.type==='credit'?' owed on card':''}`).join('\n');
  }
  if(has('profit','earning','margin','made')){
    const tx=D.transactions.filter(t=>!isBlankTx(t));
    const rec=tx.reduce((a,t)=>a+n(t.received),0),exp=tx.reduce((a,t)=>a+n(t.expense),0);
    return`Across ${tx.length} entries: sales ${money(rec)}, cost ${money(exp)}, `+
      `profit ${money(rec-exp)} (${rec?((rec-exp)/rec*100).toFixed(1):0}% margin).`;
  }
  if(has('expense','overhead','spent')){
    const rows=(D.expenses||[]).filter(x=>!isBlankExp(x));
    if(!rows.length)return'No overheads recorded yet.';
    const by={};rows.forEach(x=>{by[x.category||'OTHER']=(by[x.category||'OTHER']||0)+n(x.amount);});
    return`Overheads total ${money(rows.reduce((a,x)=>a+n(x.amount),0))}:\n\n`+
      Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,8)
        .map(([c,v])=>`• ${c} — ${money(v)}`).join('\n');
  }
  if(has('partner','share','irfan','abrar')){
    const p=partnerData();
    return`Distributable profit ${money(p.distributable)} after ${money(p.office)} office expenses.\n\n`+
      p.rows.map(r=>`• ${r.name} — entitled ${money(r.entitled)}, withdrawn ${money(r.drawn)}, `+
        `outstanding ${money(r.outstanding)}`).join('\n');
  }
  if(has('alert','attention','expiring','due')){
    const A=allAlerts();
    if(!A.length)return'Nothing needs attention.';
    return`${A.length} items need attention:\n\n`+
      A.slice(0,8).map(a=>`• ${a.t} — ${a.d}`).join('\n');
  }
  if(has('work','service','profitable','popular')){
    const by={};
    D.transactions.filter(t=>!isBlankTx(t)&&t.work).forEach(t=>{
      by[t.work]=by[t.work]||{c:0,p:0};by[t.work].c++;by[t.work].p+=n(t.profit);});
    const top=Object.entries(by).sort((a,b)=>b[1].p-a[1].p).slice(0,6);
    if(!top.length)return'No work recorded yet.';
    return`Most profitable work:\n\n`+top.map(([w,v])=>
      `• ${w} — ${money(v.p)} from ${v.c} job${v.c===1?'':'s'}`).join('\n');
  }
  /* a company name mentioned anywhere in the question */
  const hit=allCompanies().find(c=>Q.includes(c.toLowerCase()))||
    allCompanies().find(c=>c.toLowerCase().split(' ')[0].length>4&&Q.includes(c.toLowerCase().split(' ')[0]));
  if(hit){
    const s=buildStatement(hit,'','');
    return`${hit}: charged ${money(s.totalCost)}, paid ${money(s.totalRec)}, `+
      `closing ${money(Math.abs(s.closing))} ${s.closing<0?'owed to you':'held in advance'} `+
      `across ${s.lines.length} entries.`;
  }
  const snap=aiSnapshot();
  return`Ollama is not connected, so I am answering from the records directly.\n\n`+
    `Sales ${money(snap.sales)} · profit ${money(snap.gross_profit)} · `+
    `cash ${money(snap.cash_available)} · ${snap.companies_owing} companies owe ${money(snap.total_receivable)}.\n\n`+
    `Try asking about: who owes money, VAT, account balances, profit, overheads, partner shares, `+
    `alerts, profitable work, or name a company.`;
}

/* =========================================================
   CHAT PANEL
   ========================================================= */
let AI_HISTORY=[];
let AI_BUSY=false;

function aiOpen(){
  let p=$('#aipanel');
  if(p){p.classList.add('on');$('#aiinput').focus();return;}

  p=el('div','aipanel');p.id='aipanel';
  p.innerHTML=`
    <div class="aihead">
      <div class="dot"></div>
      <div class="t"><b>Assistant</b><span id="aistatus">checking Ollama…</span></div>
      <button class="btn sm" id="aicfg">Setup</button>
      <button class="btn sm" id="aiclear">Clear</button>
      <button class="btn ico" id="aiclose">✕</button>
    </div>
    <div class="aibody" id="aibody"></div>
    <div class="aifoot">
      <textarea id="aiinput" rows="1" placeholder="Ask about your business…"></textarea>
      <button class="btn p" id="aisend">Send</button>
    </div>`;
  document.body.append(p);
  requestAnimationFrame(()=>p.classList.add('on'));

  $('#aiclose').onclick=()=>p.classList.remove('on');
  $('#aicfg').onclick=aiSettings;
  $('#aiclear').onclick=()=>{AI_HISTORY=[];$('#aibody').innerHTML='';aiGreet();};
  $('#aisend').onclick=aiSend;
  const ta=$('#aiinput');
  ta.addEventListener('input',()=>{ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,120)+'px';});
  ta.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();aiSend();}
  });

  aiGreet();
  aiCheck();
  ta.focus();
}
function aiCheck(){
  const st=$('#aistatus');if(!st)return;
  aiPing().then(r=>{
    if(!st.isConnected&&!$('#aistatus'))return;
    const s=$('#aistatus');if(!s)return;
    if(r.ok&&r.hasModel){s.textContent=`${aiCfg().model} · connected`;s.className='ok';}
    else if(r.ok){s.textContent=`connected, but ${aiCfg().model} is not installed`;s.className='warn';}
    else{s.textContent='Ollama not reachable — using built-in answers';s.className='warn';}
  });
}
function aiGreet(){
  const snap=aiSnapshot();
  aiBubble('assistant',
    `Ask me anything about the business — balances, VAT, who owes what, profit by service. `+
    `I can also add entries, payments and expenses for you.\n\n`+
    `Right now: ${snap.entries} work entries, ${snap.companies_owing} companies owing `+
    `AED ${m0(snap.total_receivable)}, cash AED ${m0(snap.cash_available)}.`);
  const sug=el('div','aisug');
  ['Who owes me the most?','VAT for the latest quarter','Which work earns best?','Account balances']
    .forEach(s=>{
      const b=el('button','btn sm',s);
      b.onclick=()=>{$('#aiinput').value=s;aiSend();};
      sug.append(b);
    });
  $('#aibody').append(sug);
}
function aiBubble(role,text){
  const b=el('div','aimsg '+role);
  b.textContent=text||'';
  $('#aibody').append(b);
  $('#aibody').scrollTop=$('#aibody').scrollHeight;
  return b;
}
function aiToolChip(name,args,result){
  const c=el('div','aitool');
  const w=AI_TOOLS[name]&&AI_TOOLS[name].write;
  c.className='aitool'+(w?' write':'');
  const argStr=Object.entries(args||{}).filter(([,v])=>v!==''&&v!==undefined)
    .map(([k,v])=>`${k}: ${v}`).join(', ');
  c.innerHTML=`<b>${w?'✎':'⌕'} ${esc(name)}</b>${argStr?`<span>${esc(argStr)}</span>`:''}`;
  if(result&&result.error)c.innerHTML+=`<span class="err">${esc(result.error)}</span>`;
  if(w){
    const u=el('button','btn sm','Undo');
    u.onclick=()=>{
      const done=aiUndoLast();
      if(done){toast(`Undone: ${done.detail}`);u.remove();c.classList.add('undone');}
      else toast('Nothing left to undo',1);
    };
    c.append(u);
  }
  $('#aibody').append(c);
  $('#aibody').scrollTop=$('#aibody').scrollHeight;
}

async function aiSend(){
  if(AI_BUSY)return;
  const ta=$('#aiinput');
  const q=ta.value.trim();
  if(!q)return;
  ta.value='';ta.style.height='auto';
  const sug=$('#aibody .aisug');if(sug)sug.remove();
  aiBubble('user',q);
  AI_BUSY=true;$('#aisend').textContent='…';

  const ping=await aiPing();
  if(!ping.ok||!ping.hasModel){
    aiBubble('assistant',aiOffline(q));
    if(!ping.ok)aiSetupHint(ping);
    else aiBubble('note',`Ollama is running but ${aiCfg().model} is not installed. `+
      `Run:  ollama pull ${aiCfg().model}`);
    AI_BUSY=false;$('#aisend').textContent='Send';
    return;
  }

  if(!AI_HISTORY.length)AI_HISTORY.push({role:'system',content:AI_SYSTEM()});
  AI_HISTORY.push({role:'user',content:q});

  const bubble=aiBubble('assistant','');
  let got='';
  try{
    const out=await aiTurn(AI_HISTORY,
      d=>{got+=d;bubble.textContent=got;$('#aibody').scrollTop=$('#aibody').scrollHeight;},
      (name,args,result)=>aiToolChip(name,args,result));
    if(out&&out!==got)bubble.textContent=out;
    if(!bubble.textContent.trim())bubble.textContent='(no answer returned)';
    AI_HISTORY.push({role:'assistant',content:bubble.textContent});
    if(AI_HISTORY.length>24)AI_HISTORY=[AI_HISTORY[0],...AI_HISTORY.slice(-20)];
  }catch(e){
    bubble.remove();
    aiBubble('assistant',aiOffline(q));
    aiBubble('note',`The model call failed: ${e.message}`);
  }
  AI_BUSY=false;$('#aisend').textContent='Send';
  aiCheck();
}

function aiSetupHint(ping){
  const b=el('div','aimsg note');
  b.innerHTML=`<b>Ollama is not reachable at ${esc(aiCfg().url)}.</b><br><br>
    Most often this is the browser being blocked rather than Ollama being down.
    Start Ollama with browser access allowed:<br>
    <code>OLLAMA_ORIGINS=* ollama serve</code><br>
    On Windows, set <code>OLLAMA_ORIGINS</code> to <code>*</code> in system environment variables, then restart Ollama.<br><br>
    Then pull the model once:<br><code>ollama pull ${esc(aiCfg().model)}</code>`;
  $('#aibody').append(b);
  $('#aibody').scrollTop=$('#aibody').scrollHeight;
}

function aiSettings(){
  const cfg=aiCfg();
  const body=el('div'),g=el('div','invhead');
  const url=input(cfg.url,'text','http://localhost:11434');
  const model=input(cfg.model,'text','gpt-oss-large:latest');
  const temp=input(cfg.temperature,'text','0.3');
  g.append(field('Ollama URL',url),field('Model',model),field('Temperature',temp));
  body.append(g);

  const status=el('div','hint');
  status.textContent='Checking…';
  body.append(status);
  const test=el('button','btn sm','Test connection');
  test.onclick=async()=>{
    status.textContent='Checking…';
    const saved=cfg.url;cfg.url=url.value.trim();
    const r=await aiPing();cfg.url=saved;
    status.innerHTML=r.ok
      ? `<b style="color:var(--pos)">Connected.</b> Models installed: ${r.models.join(', ')||'none'}`
      : `<b style="color:var(--neg)">Not reachable.</b> ${esc(r.detail)}`;
  };
  body.append(test);

  const help=el('div','note i');
  help.innerHTML=`The assistant runs entirely on your machine — nothing leaves it.
    Ollama must allow browser requests, so start it with <code>OLLAMA_ORIGINS=*</code>.
    Larger models like <b>${esc(cfg.model)}</b> answer better but need more disk and RAM;
    if that is tight, <code>llama3.2:3b</code> or <code>qwen2.5:7b</code> work with the
    same tools, just less fluently.`;
  body.append(help);

  modal('Assistant Setup',body,[
    {label:'Cancel'},
    {label:'Save',cls:'p',fn:()=>{
      cfg.url=url.value.trim()||'http://localhost:11434';
      cfg.model=model.value.trim()||'gpt-oss-large:latest';
      cfg.temperature=n(temp.value);
      save();AI_HISTORY=[];aiCheck();toast('Assistant settings saved');
    }}
  ]);
}

/* full-page view, for longer sessions */
function renderAssistant(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'Setup','',aiSettings);
  mkBtn(T,'Open chat panel','p',aiOpen);

  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const snap=aiSnapshot();
  wrap.append(kpiRow([
    {t:'Model',v:aiCfg().model.split(':')[0],s:aiCfg().model,g:'indigo'},
    {t:'Runs',v:'Locally',s:'nothing leaves this machine',g:'teal'},
    {t:'Tools Available',v:Object.keys(AI_TOOLS).length,s:'live queries over your data',g:'violet'},
    {t:'Records Reachable',v:m0(snap.entries+D.payments.length+D.invoices.length),s:'entries, payments, invoices',g:'amber'}
  ]));

  const card=el('div','glass card');
  card.append(el('h3',null,'What it can do'));
  const grid=el('div');
  grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px';
  Object.entries(AI_TOOLS).forEach(([name,t])=>{
    const d=el('div');
    d.style.cssText='padding:10px 12px;border-radius:12px;background:var(--field);border:1px solid var(--stroke-2)';
    d.innerHTML=`<b style="font-size:11.5px;font-family:var(--mono)">${esc(name)}</b>
      ${t.write?'<span class="badge w" style="margin-left:6px">writes</span>':''}
      <div style="font-size:11.5px;color:var(--ink-2);margin-top:4px">${esc(t.desc)}</div>`;
    grid.append(d);
  });
  card.append(grid);
  wrap.append(card);

  const setup=el('div','glass card');
  setup.append(el('h3',null,'Setting up Ollama'));
  const st=el('div','hint');
  st.innerHTML=`<ol style="margin:0;padding-left:18px;line-height:2">
    <li>Install Ollama from <b>ollama.com</b></li>
    <li>Allow browser access — set <code>OLLAMA_ORIGINS</code> to <code>*</code>, then restart Ollama.
        On Windows this goes in system environment variables; on Mac or Linux run
        <code>OLLAMA_ORIGINS=* ollama serve</code></li>
    <li>Pull the model: <code>ollama pull ${esc(aiCfg().model)}</code></li>
    <li>Come back here and press <b>Open chat panel</b></li>
  </ol>`;
  setup.append(st);
  const btn=el('button','btn sm','Test connection now');
  const res=el('div','hint');
  btn.onclick=async()=>{
    res.textContent='Checking…';
    const r=await aiPing();
    res.innerHTML=r.ok
      ?`<b style="color:var(--pos)">Connected.</b> Installed: ${esc(r.models.join(', ')||'none')}`
      :`<b style="color:var(--neg)">Not reachable.</b> ${esc(r.detail)} — this is almost always the CORS setting in step 2.`;
  };
  setup.append(btn,res);
  wrap.append(setup);
}

/* =========================================================
   REMAINING VIEWS
   ========================================================= */
function listView(cols,rows,keys,opts){
  opts=opts||{};
  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  if(opts.kpis)wrap.append(kpiRow(opts.kpis));
  if(opts.note){const nb=el('div','note '+(opts.noteType||'i'));nb.innerHTML=opts.note;wrap.append(nb);}
  const c=el('div','glass card noprint');
  const q=input('','text',opts.placeholder||'Search…');
  c.append(q);wrap.append(c);
  const out=el('div');wrap.append(out);
  const draw=(term='')=>{
    out.innerHTML='';
    const f=rows.filter(r=>!term||keys.some(k=>String(r[k]??'').toUpperCase().includes(term.toUpperCase())));
    const gw=el('div','glass gridwrap');
    const t=el('table','list');
    t.innerHTML='<thead><tr>'+cols.map(c=>`<th${c.w?` style="width:${c.w}"`:''}>${c.t}</th>`).join('')+'</tr></thead>';
    const tb=el('tbody');
    f.slice(0,600).forEach(r=>{
      const tr=el('tr');
      tr.innerHTML=cols.map(c=>`<td class="${c.cls||''}">${c.f?c.f(r):esc(r[c.k]??'')}</td>`).join('');
      if(opts.onRow)opts.onRow(tr,r);
      tb.append(tr);
    });
    if(!f.length){const tr=el('tr'),td=el('td');td.colSpan=cols.length;
      td.innerHTML='<div class="empty"><div class="e">∅</div>Nothing matches that search.</div>';tr.append(td);tb.append(tr);}
    t.append(tb);gw.append(t);out.append(gw);
    out.append(el('div','hint',f.length>600?`Showing 600 of ${f.length} records — narrow with search.`:`${f.length} records`));
  };
  q.oninput=debounce(()=>draw(q.value),260);
  draw();
  return {redraw:draw};
}

/* ---------- PAYMENTS ---------- */
const PCOL={date:1,company:2,amount:3,account:4,remark:5};


function topUpPayments(){
  let spare=D.payments.filter(isBlankPay).length,added=false;
  while(spare<5){D.payments.push(newPay());spare++;added=true;}
  if(added)save();
}
function renderPayments(){
  topUpPayments();
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'+ Add Payment','p',()=>growPayments());
  mkBtn(T,'↓ CSV','',()=>dl(new Blob([csv([['DATE','AMOUNT','COMPANY NAME','RECEIVED INTO','REMARKS'],
    ...D.payments.map(p=>[p.date,p.amount,p.company,p.account||'',p.remark])])],{type:'text/csv'}),`payments-${today()}.csv`));

  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const tot=D.payments.reduce((a,p)=>a+n(p.amount),0);
  const y=D.payments.filter(p=>p.date>=daysAgo(30)).reduce((a,p)=>a+n(p.amount),0);
  wrap.append(kpiRow([
    {t:'Receipts',v:D.payments.length,s:'all time'},
    {t:'Total Received',v:m0(tot),s:'AED',a:1,c:'pos'},
    {t:'Last 30 Days',v:m0(y),s:'AED',c:'gold'},
    {t:'Companies Paying',v:new Set(D.payments.map(p=>p.company)).size,s:'unique'}
  ]));
  const c=el('div','glass card noprint');
  const q=input('','text','search company or remark…');c.append(q);wrap.append(c);
  const out=el('div');wrap.append(out);
  const draw=(term='')=>{
    out.innerHTML='';
    const all=D.payments.filter(p=>!term||`${p.company} ${p.remark}`.toUpperCase().includes(term.toUpperCase()))
      .sort((a,b)=>{const ba=isBlankPay(a),bb=isBlankPay(b);
        if(ba!==bb)return ba?1:-1;
        return String(a.date||'').localeCompare(String(b.date||''));});
    // keep the newest 600 so the bottom of the list is always the live end
    const list=all.length>600?all.slice(all.length-600):all;
    const offset=all.length-list.length;
    const gw=el('div','glass gridwrap');gw.id='paygrid';
    const t=el('table','grid');
    t.innerHTML=`<thead><tr><th class="rn">#</th><th style="width:118px">Date</th>
      <th style="min-width:190px">Company Name</th><th class="c" style="width:110px">Amount</th>
      <th class="c" style="width:140px">Received Into</th>
      <th>Remarks</th><th style="width:34px"></th></tr></thead>`;
    const tb=el('tbody');tb.id='paybody';
    const row=(p,i)=>{
      const tr=el('tr');tr.dataset.pi=D.payments.indexOf(p);
      const rn=el('td','rn',isBlankPay(p)?'·':String(offset+i+1));
      if(isBlankPay(p))tr.classList.add('blank');
      tr.append(rn);
      const mk=(val,key,kind,listFn,acOpts)=>{const td=el('td',kind==='num'?'num':null);
        const inp=el('input','cell');inp.type=key==='date'?'date':'text';inp.value=val??'';
        inp.dataset.nav='1';inp.dataset.r=i;inp.dataset.c=PCOL[key];
        if(kind==='num')inp.inputMode='decimal';
        if(listFn)bindAC(inp,listFn,acOpts||{});
        inp.addEventListener('input',()=>{
          p[key]=kind==='num'?n(inp.value):inp.value;
          const b=isBlankPay(p);tr.classList.toggle('blank',b);rn.textContent=b?'·':String(offset+i+1);
          if(!b)ensurePaySpare(tb,offset);
          save();});
        td.append(inp);return td;};
      tr.append(
        mk(p.date,'date','txt'),
        mk(p.company,'company','txt',()=>allCompanies(),{onAdd:quickAddCompany,onPick:()=>focusCell(gw,i,PCOL.amount)}),
        mk(p.amount,'amount','num'));

      /* which bank or cash account the money landed in */
      const atd=el('td');
      const acc=pillControl();acc.value=p.account||'';
      acc.dataset.nav='1';acc.dataset.r=i;acc.dataset.c=PCOL.account;
      const paintAcc=()=>{
        const col=p.account?accColor(p.account):null;
        acc.value=p.account||'—';
        if(col){acc.classList.remove('empty');acc.style.background=col;acc.style.color='#fff';
          acc.style.borderColor='transparent';acc.style.boxShadow='0 2px 8px '+col+'55';}
        else{acc.classList.add('empty');acc.style.background='';acc.style.color='';acc.style.boxShadow='';}
      };
      paintAcc();
      bindAC(acc,()=>['— none —',...accountNames()],{fullList:true,onPick:val=>{
        p.account=(val==='— none —')?'':val;paintAcc();
        const b=isBlankPay(p);tr.classList.toggle('blank',b);
        if(!b)ensurePaySpare(tb,offset);
        save();
      }});
      atd.append(acc);tr.append(atd);

      tr.append(mk(p.remark,'remark','txt'));
      const act=el('td','act');const d=el('button','del','×');d.tabIndex=-1;
      d.onclick=()=>{
        if(p.srcLedger){toast('This payment comes from the Cash Book — delete it there',1);return;}
        if(confirm('Delete this payment?')){D.payments.splice(D.payments.indexOf(p),1);save();draw(term);}};
      act.append(d);tr.append(act);
      if(p.srcLedger){
        tr.classList.add('fromcb');
        tr.title='Created from the Cash Book — edit it there';
        tr.querySelectorAll('.cell,.pf').forEach(i=>i.readOnly=true);
      } else bindRowLock(tr,!isBlankPay(p));
      return tr;
    };
    list.forEach((p,i)=>tb.append(row(p,i)));
    tb._row=row;
    t.append(tb);gw.append(t);out.append(gw);
    gw.addEventListener('keydown',ev=>gridKey(ev,gw,{onOverflow:()=>growPayments(tb,gw,offset)}));
    out.append(el('div','hint',(all.length>600?`Showing the most recent 600 of ${all.length} — search to reach older receipts. `:`${all.length} receipts. `)+
      'Oldest at the top, newest at the bottom, five blank rows always waiting at the end.'));
    requestAnimationFrame(()=>{
      gw.scrollTop=gw.scrollHeight;
      const first=list.findIndex(isBlankPay);
      focusCell(gw,first<0?list.length-1:first,PCOL.company);
    });
  };
  renderPayments._draw=()=>draw(q.value);
  q.oninput=debounce(()=>draw(q.value),260);
  draw();
}
function ensurePaySpare(tb,offset){
  const rows=[...tb.querySelectorAll('tr')];
  const spare=rows.filter(tr=>{const p=D.payments[+tr.dataset.pi];return p&&isBlankPay(p);}).length;
  for(let i=spare;i<5;i++){
    const p=newPay();D.payments.push(p);
    tb.append(tb._row(p,tb.querySelectorAll('tr').length));
  }
  if(spare<5)save();
}
function growPayments(tb,gw,offset){
  tb=tb||$('#paybody');gw=gw||$('#paygrid');
  if(!tb||!tb._row){D.payments.push(newPay());save();
    if(renderPayments._draw)renderPayments._draw();return;}
  const p=newPay();D.payments.push(p);save();
  const idx=tb.querySelectorAll('tr').length;
  tb.append(tb._row(p,idx));
  gw.scrollTop=gw.scrollHeight;
  focusCell(gw,idx,PCOL.company);
}

/* ---------- COMPANIES ---------- */
function companyDialog(){
  const body=el('div'),g=el('div','invhead');
  const nm=input('','text','company or customer name');
  const ph=input('','text','contact number, e.g. 0521234567');
  const op=input('','text','leave blank to start at zero');
  g.append(field('Company Name',nm),field('Contact Number',ph),field('Opening Balance (optional)',op));
  body.append(g);
  body.append(el('div','hint','A positive opening balance is money they have already paid you (advance). A negative one is money they owe you.'));
  modal('New Company',body,[
    {label:'Cancel'},
    {label:'Add Company',cls:'p',fn:()=>{
      const v=nm.value.trim();
      if(!v){toast('Company name is required',1);return false;}
      if(D.companies.some(x=>x.toUpperCase()===v.toUpperCase())){toast('That company already exists',1);return false;}
      D.companies.push(v);D.companies.sort();
      const ex=D.contacts.find(c=>c.name.toUpperCase()===v.toUpperCase());
      if(ex)ex.phone=ph.value.trim()||ex.phone;
      else D.contacts.push({name:v,phone:ph.value.trim()});
      const ob=n(op.value);
      if(ob>0)D.payments.push({date:today(),amount:ob,company:v,remark:'OPENING BALANCE'});
      else if(ob<0)D.transactions.push({id:uid(),date:today(),company:v,employee:'OPENING',
        work:'OPENING BALANCE',received:-ob,expense:0,profit:-ob,paidFrom:'',_s:Date.now()});
      audit('add','company',v);save();renderCompanies();toast(v+' added');
    }}
  ]);
}

function renderCompanies(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'+ New Company','p',companyDialog);
  mkBtn(T,'↓ CSV','',()=>dl(new Blob([csv([['COMPANY','COST','RECEIVED','BALANCE','STATUS'],
    ...companyBalances().map(x=>[x.company,x.cost,x.received,x.balance,x.balance<0?'Bal':'Adv'])])],
    {type:'text/csv'}),`company-balances-${today()}.csv`));

  const data=companyBalances();
  const due=data.filter(x=>x.balance<0),adv=data.filter(x=>x.balance>0);
  listView([
    {t:'Company',k:'company',f:r=>`<b>${esc(r.company)}</b>`},
    {t:'Total Cost',k:'cost',w:'120px',cls:'n',f:r=>m0(r.cost)},
    {t:'Received',k:'received',w:'120px',cls:'n',f:r=>m0(r.received)},
    {t:'Balance',k:'balance',w:'120px',cls:'n',
      f:r=>`<b style="color:${r.balance<0?'var(--neg)':'var(--pos)'}">${m0(r.balance)}</b>`},
    {t:'Status',w:'86px',cls:'c',f:r=>`<span class="badge ${r.balance<0?'bal':'adv'}">${r.balance<0?'Bal':'Adv'}</span>`},
    {t:'',w:'110px',cls:'c',f:()=>''}
  ],data,['company'],{
    placeholder:'search company…',
    kpis:[{t:'Companies',v:data.length,s:'with activity'},
      {t:'Total Receivable',v:m0(due.reduce((a,x)=>a-x.balance,0)),s:`${due.length} companies`,c:'neg',a:1},
      {t:'Total Advance',v:m0(adv.reduce((a,x)=>a+x.balance,0)),s:`${adv.length} companies`,c:'pos'},
      {t:'Net Position',v:m0(data.reduce((a,x)=>a+x.balance,0)),s:'AED'}],
    onRow:(tr,r)=>{
      const b=el('button','btn sm','Statement');
      b.onclick=()=>{setSS({company:r.company,from:'',to:''});switchView('statement');};
      tr.lastChild.append(b);
    }
  });
}

/* ---------- RATES ---------- */
function rateDialog(existing){
  const isNew=!existing;
  const r=existing||{item:'',rate:0,fee:0};
  const body=el('div'),g=el('div','invhead');
  const it=input(r.item,'text','e.g. EMIRATES ID');
  const rc=input(r.rate||'','text','what the client pays');
  const fe=input(r.fee||'','text','what it costs us');
  g.append(field('Work Item',it),field('Received (client price)',rc),field('Expense (our cost)',fe));
  body.append(g);
  const live=el('div','hint');
  const upd=()=>{const p=n(rc.value)-n(fe.value);
    live.innerHTML=`Profit per job: <b style="color:${p<0?'var(--neg)':'var(--pos)'};font-size:14px">${m2(p)}</b>`+
      (p<0?' &nbsp;<span class="badge bal">below cost</span>':'');};
  rc.oninput=upd;fe.oninput=upd;upd();
  body.append(live);
  body.append(el('div','hint','Data Entry uses these two figures to fill a row automatically when you pick this work item.'));
  modal(isNew?'Add Work Item':'Edit Work Item',body,[
    {label:'Cancel'},
    ...(isNew?[]:[{label:'Delete',cls:'d',fn:()=>{
      D.rates=D.rates.filter(x=>x!==existing);rateBust();
      audit('remove','work item',existing.item);save();renderRates();toast('Deleted');}}]),
    {label:isNew?'Add Item':'Save',cls:'p',fn:()=>{
      const v=it.value.trim();
      if(!v){toast('Work item name is required',1);return false;}
      const clash=D.rates.find(x=>x!==existing&&x.item.toUpperCase()===v.toUpperCase());
      if(clash){toast('That work item already exists',1);return false;}
      const rec={item:v,rate:n(rc.value),fee:n(fe.value)};
      if(isNew)D.rates.push(rec);else Object.assign(existing,rec);
      rateBust();audit(isNew?'add':'edit','work item',v);save();renderRates();
      toast(`${v} · received ${m0(rec.rate)} − expense ${m0(rec.fee)} = ${m0(rec.rate-rec.fee)}`);
    }}
  ]);
}

function renderRates(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'+ Add Work Item','p',()=>rateDialog(null));
  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const avgP=D.rates.reduce((a,r)=>a+(n(r.rate)-n(r.fee)),0)/Math.max(1,D.rates.length);
  wrap.append(kpiRow([
    {t:'Work Items',v:D.rates.length,s:'in rates master'},
    {t:'Avg Received',v:m0(D.rates.reduce((a,r)=>a+n(r.rate),0)/Math.max(1,D.rates.length)),s:'charged to client'},
    {t:'Avg Expense',v:m0(D.rates.reduce((a,r)=>a+n(r.fee),0)/Math.max(1,D.rates.length)),s:'our cost'},
    {t:'Avg Profit',v:m0(avgP),s:'per item',c:avgP<0?'neg':'pos',a:1}
  ]));
  const loss=D.rates.filter(r=>n(r.rate)-n(r.fee)<0);
  if(loss.length){
    const nb=el('div','note w');
    nb.innerHTML=`<b>⚠ ${loss.length} item${loss.length===1?'':'s'} priced below cost</b> — `+
      loss.slice(0,4).map(r=>`${esc(r.item)} (received ${m0(r.rate)}, expense ${m0(r.fee)})`).join(', ')+
      `. Auto-fill will use these figures as-is, so they lose money on every entry.`;
    wrap.append(nb);
  }
  const c=el('div','glass card noprint');
  const q=input('','text','search work item…');c.append(q);wrap.append(c);
  const out=el('div');wrap.append(out);
  const draw=(term='')=>{
    out.innerHTML='';
    const list=D.rates.filter(r=>!term||r.item.toUpperCase().includes(term.toUpperCase()))
      .sort((a,b)=>a.item.localeCompare(b.item));
    const gw=el('div','glass gridwrap');const t=el('table','grid');
    t.innerHTML=`<thead><tr><th class="rn">#</th><th>Work Item</th>
      <th class="c" style="width:120px">Received</th><th class="c" style="width:120px">Expense</th>
      <th class="c" style="width:120px">Profit</th><th style="width:52px"></th></tr></thead>`;
    const tb=el('tbody');
    list.slice(0,600).forEach((r,i)=>{
      const tr=el('tr');tr.append(el('td','rn',String(i+1)));
      const mk=(key,kind)=>{const td=el('td',kind==='num'?'num':null);const inp=el('input','cell');
        inp.value=r[key]??'';if(kind==='num')inp.inputMode='decimal';
        inp.addEventListener('input',()=>{r[key]=kind==='num'?n(inp.value):inp.value;
          paintTot();rateBust();save();});
        td.append(inp);return td;};
      tr.append(mk('item'),mk('rate','num'),mk('fee','num'));
      const ttd=el('td','num');const tot=el('div');
      tot.style.cssText='padding:8px;text-align:center;font-family:var(--mono);font-weight:800';
      const paintTot=()=>{const p=n(r.rate)-n(r.fee);
        tot.textContent=m2(p);tot.style.color=p<0?'var(--neg)':'var(--pos)';};
      paintTot();ttd.append(tot);tr.append(ttd);
      const act=el('td','act');
      const e=el('button','del','Edit');e.title='Edit this work item';e.tabIndex=-1;
      e.style.cssText='font-size:10.5px;font-weight:800;color:var(--brand3);opacity:.75';
      e.onclick=()=>rateDialog(r);
      act.append(e);tr.append(act);tb.append(tr);
    });
    t.append(tb);gw.append(t);out.append(gw);
    out.append(el('div','hint','Profit = Received − Expense. Data Entry uses these figures to auto-fill a row when you choose a Work item — e.g. EMIRATES ID fills Received 390, Expense 370, Profit 20.'));
  };
  q.oninput=debounce(()=>draw(q.value),260);
  draw();
}

/* ---------- VISA ---------- */
function renderVisa(){
  const T=$('#tools');T.innerHTML='';
  const steps=Object.keys((D.visa[0]||{}).steps||{});
  mkBtn(T,'+ Add File','p',()=>{
    const s={};steps.forEach(k=>s[k]=false);
    D.visa.unshift({company:'',employee:'',steps:s});save();renderVisa();});

  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const done=D.visa.filter(x=>steps.every(k=>x.steps[k]));
  const active=D.visa.filter(x=>steps.some(k=>x.steps[k])&&!steps.every(k=>x.steps[k]));
  wrap.append(kpiRow([
    {t:'Visa Files',v:D.visa.length,s:'tracked'},
    {t:'In Progress',v:active.length,s:'partially complete',c:'gold',a:1},
    {t:'Completed',v:done.length,s:'all steps done',c:'pos'},
    {t:'Not Started',v:D.visa.length-done.length-active.length,s:'no steps ticked'}
  ]));
  const c=el('div','glass card noprint');
  const q=input('','text','search company or employee…');c.append(q);wrap.append(c);
  const out=el('div');wrap.append(out);
  const draw=(term='')=>{
    out.innerHTML='';
    const list=D.visa.filter(x=>!term||`${x.company} ${x.employee}`.toUpperCase().includes(term.toUpperCase()));
    const gw=el('div','glass gridwrap');const t=el('table','list');
    t.innerHTML='<thead><tr><th style="min-width:170px">Company</th><th style="min-width:140px">Employee</th>'+
      steps.map(s=>`<th style="width:48px;text-align:center" title="${s}">${s.split(' ').map(w=>w[0]).join('')}</th>`).join('')+
      '<th style="width:110px">Progress</th></tr></thead>';
    const tb=el('tbody');
    list.slice(0,600).forEach(x=>{
      const tr=el('tr');
      const ctd=el('td');const ci=el('input','cell');ci.value=x.company;
      bindAC(ci,()=>D.companies);ci.addEventListener('input',()=>{x.company=ci.value;save();});
      ctd.append(ci);tr.append(ctd);
      const etd=el('td');const ei=el('input','cell');ei.value=x.employee;
      ei.addEventListener('input',()=>{x.employee=ei.value;save();});etd.append(ei);tr.append(etd);
      const bar=el('td');
      steps.forEach(s=>{
        const td=el('td','c');const p=el('span','pill'+(x.steps[s]?' on':''));
        p.style.cursor='pointer';p.title=s;
        p.onclick=()=>{x.steps[s]=!x.steps[s];save();draw(term);};
        td.append(p);tr.append(td);
      });
      const d=steps.filter(s=>x.steps[s]).length;
      const ptd=el('td');
      ptd.innerHTML=`<div style="font-family:var(--mono);font-weight:800;font-size:11.5px">${d}/${steps.length}</div>
        <div class="bar"><i style="width:${(d/steps.length*100).toFixed(0)}%"></i></div>`;
      tr.append(ptd);tb.append(tr);
    });
    t.append(tb);gw.append(t);out.append(gw);
    const lg=el('div','lgd');
    lg.innerHTML=steps.map(s=>`<span><b>${s.split(' ').map(w=>w[0]).join('')}</b> ${s}</span>`).join('');
    out.append(lg);
  };
  q.oninput=debounce(()=>draw(q.value),260);
  draw();
}

/* ---------- INSURANCE ---------- */
function renderInsurance(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'↓ CSV','',()=>dl(new Blob([csv([['COMPANY','WORKER','EID','COVERAGE','INCEPTION','EXPIRY','PREMIUM'],
    ...D.insurance.map(x=>[x.company,x.worker,x.eid,x.coverage,x.inception,x.expiry,x.total])])],
    {type:'text/csv'}),`insurance-${today()}.csv`));

  const s30=insuranceSoon(30),s3=insuranceSoon(3);
  const expired=D.insurance.filter(x=>x.expiry&&new Date(x.expiry)<new Date());
  listView([
    {t:'Company',k:'company',f:r=>`<b>${esc(r.company)}</b>`},
    {t:'Worker',k:'worker'},
    {t:'EID / UID',k:'eid',w:'150px',cls:'n'},
    {t:'Coverage',k:'coverage',w:'86px'},
    {t:'Inception',w:'110px',f:r=>fmtDate(r.inception)},
    {t:'Expiry',w:'128px',f:r=>{
      const d=r.expiry?(new Date(r.expiry)-new Date())/864e5:9999;
      const col=d<0?'var(--neg)':d<=30?'var(--warn)':'var(--ink)';
      const tag=d<0?'<span class="badge bal" style="margin-left:5px">expired</span>':
        d<=30?`<span class="badge w" style="margin-left:5px">${Math.ceil(d)}d</span>`:'';
      return `<span style="color:${col};font-weight:${d<=30?700:500}">${fmtDate(r.expiry)}</span>${tag}`;}},
    {t:'Premium',k:'total',w:'100px',cls:'n',f:r=>m2(r.total)}
  ],D.insurance,['company','worker','eid'],{
    placeholder:'search company, worker or EID…',
    kpis:[{t:'Policies',v:D.insurance.length,s:'on file'},
      {t:'Expiring ≤ 3 Days',v:s3.length,s:'urgent',c:s3.length?'neg':'',a:1},
      {t:'Expiring ≤ 30 Days',v:s30.length,s:'renew soon',c:'gold'},
      {t:'Already Expired',v:expired.length,s:'needs action',c:expired.length?'neg':''}],
    note: s30.length?`<b>⚠ ${s30.length} policies expire within 30 days</b> — ${s3.length} of them within 3 days.
      The original sheet emailed this alert daily at 11:00; in the web app it surfaces here and on the Dashboard.`:null,
    noteType:'w'
  });
}

/* ---------- CONTACTS ---------- */
function renderContacts(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'+ Add Contact','p',()=>{D.contacts.unshift({name:'',phone:''});save();renderContacts();});
  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const c=el('div','glass card noprint');
  const q=input('','text','search name or number…');c.append(q);wrap.append(c);
  const out=el('div');wrap.append(out);
  const draw=(term='')=>{
    out.innerHTML='';
    const list=D.contacts.filter(x=>!term||`${x.name} ${x.phone}`.toUpperCase().includes(term.toUpperCase()))
      .sort((a,b)=>a.name.localeCompare(b.name));
    const gw=el('div','glass gridwrap');const t=el('table','grid');
    t.innerHTML='<thead><tr><th class="rn">#</th><th>Name</th><th style="width:190px">Contact No.</th><th style="width:110px">WhatsApp</th><th style="width:36px"></th></tr></thead>';
    const tb=el('tbody');
    list.slice(0,600).forEach((x,i)=>{
      const tr=el('tr');tr.append(el('td','rn',String(i+1)));
      const mk=key=>{const td=el('td');const inp=el('input','cell');inp.value=x[key]??'';
        inp.addEventListener('input',()=>{x[key]=inp.value;save();});td.append(inp);return td;};
      tr.append(mk('name'),mk('phone'));
      const wtd=el('td','c');
      if(x.phone){const a=el('a','btn sm','Message');
        a.href='https://wa.me/'+String(x.phone).replace(/\D/g,'').replace(/^0+/,'').replace(/^(?!971)/,'971');
        a.target='_blank';a.style.textDecoration='none';wtd.append(a);}
      tr.append(wtd);
      const act=el('td','act');const d=el('button','del','×');
      d.onclick=()=>{if(confirm('Delete contact?')){D.contacts.splice(D.contacts.indexOf(x),1);save();draw(term);}};
      act.append(d);tr.append(act);tb.append(tr);
    });
    t.append(tb);gw.append(t);out.append(gw);
    out.append(el('div','hint',`${list.length} contacts`));
  };
  q.oninput=debounce(()=>draw(q.value),260);
  draw();
}

/* ---------- TEMPLATES ---------- */
function renderTemplates(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'+ New Template','p',()=>templateDialog(null));
  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const types=serviceTypes();
  wrap.append(kpiRow([
    {t:'Service Templates',v:types.length,s:'packages'},
    {t:'Template Lines',v:D.taskTemplates.length,s:'total rows'},
    {t:'Avg Lines',v:(D.taskTemplates.length/Math.max(1,types.length)).toFixed(1),s:'per package'},
    {t:'Avg Package Value',v:m0(D.taskTemplates.reduce((a,t)=>a+n(t.qty)*n(t.rate),0)/Math.max(1,types.length)),s:'AED govt cost',a:1}
  ]));
  const c=el('div','glass card noprint');
  const q=input('','text','search service type or line description…');c.append(q);wrap.append(c);
  const out=el('div');wrap.append(out);
  const draw=(term='')=>{
    out.innerHTML='';
    const shown=types.filter(t=>{
      if(!term)return true;
      const u=term.toUpperCase();
      return t.toUpperCase().includes(u)||D.taskTemplates.some(x=>x.serviceType===t&&x.desc.toUpperCase().includes(u));
    });
    shown.slice(0,60).forEach(t=>{
      const lines=D.taskTemplates.filter(x=>x.serviceType===t).sort((a,b)=>(a.sr||0)-(b.sr||0));
      const tot=lines.reduce((a,x)=>a+n(x.qty)*n(x.rate),0);
      const card=el('div','glass card');
      const h=el('div');h.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:9px';
      h.innerHTML=`<div style="flex:1"><b style="font-size:13.5px">${esc(t)}</b>
        <div class="hint" style="padding:2px 0 0">${lines.length} lines · govt cost AED ${m0(tot)}</div></div>`;
      const eb=el('button','btn sm tpledit','Edit');
      eb.title='Edit this template';
      eb.onclick=()=>templateDialog(t);
      const b=el('button','btn sm p','Use in Invoice');
      b.onclick=()=>{INV=blankInvoice();INV.ServiceType=t;INV.InvoiceNo=nextInvNo(INV.InvoiceDate,INV);
        INV.items=lines.map(x=>({desc:x.desc,qty:n(x.qty)||1,rate:n(x.rate),src:'template'}));switchView('invoice');};
      h.append(eb,b);card.append(h);
      const tb=el('table','list');
      tb.innerHTML='<thead><tr><th style="width:40px">Sr</th><th>Description</th><th style="width:56px;text-align:center">Qty</th><th style="width:86px;text-align:right">Rate</th><th style="width:96px;text-align:right">Amount</th></tr></thead>';
      const body=el('tbody');
      lines.forEach(x=>{const tr=el('tr');
        tr.innerHTML=`<td class="c">${x.sr}</td><td>${esc(x.desc)}</td><td class="c">${n(x.qty)}</td>
          <td class="n">${m2(x.rate)}</td><td class="n">${m2(n(x.qty)*n(x.rate))}</td>`;body.append(tr);});
      tb.append(body);card.append(tb);out.append(card);
    });
    if(!shown.length)out.innerHTML='<div class="glass card"><div class="empty"><div class="e">∅</div>No templates match.</div></div>';
  };
  q.oninput=debounce(()=>draw(q.value),300);
  draw();
}

/* ---------- DATA / BACKUP ---------- */
function renderData(){
  const T=$('#tools');T.innerHTML='';
  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  wrap.append(kpiRow([
    {t:'Work Entries',v:D.transactions.length},{t:'Payments',v:D.payments.length},
    {t:'Invoices',v:D.invoices.length},{t:'Invoice Lines',v:D.invoiceItems.length},
    {t:'Rates',v:D.rates.length},{t:'Templates',v:D.taskTemplates.length},
    {t:'Insurance',v:D.insurance.length},{t:'Visa Files',v:D.visa.length},
    {t:'Contacts',v:D.contacts.length},{t:'Account Moves',v:D.ledger.length}
  ]));

  const c=el('div','glass card');
  c.append(el('h3',null,'Backup & Restore'));
  const r=el('div','row');
  const mk=(t,cls,fn)=>{const b=el('button','btn '+(cls||''),t);b.onclick=fn;r.append(b);};
  mk('↓ Full JSON Backup','p',()=>dl(new Blob([JSON.stringify(D)],{type:'application/json'}),`timelink-backup-${today()}.json`));
  mk('↓ Entries CSV','',exportTxCSV);
  mk('↓ Payments CSV','',()=>dl(new Blob([csv([['DATE','AMOUNT','COMPANY NAME','RECEIVED INTO','REMARKS'],
    ...D.payments.map(p=>[p.date,p.amount,p.company,p.account||'',p.remark])])],{type:'text/csv'}),`payments-${today()}.csv`));
  const f=el('input');f.type='file';f.accept='.json';f.style.display='none';
  f.onchange=async e=>{const file=e.target.files[0];if(!file)return;
    try{const j=JSON.parse(await file.text());if(!j.transactions)throw 0;
      setD(migrate(j));await kvSet('data',D);toast('Backup restored');switchView('entry');}
    catch(x){toast('That file is not a valid TimeLink backup',1);}};
  r.append(f);
  mk('⬆ Restore Backup','',()=>f.click());
  mk('Check & repair data','',repairDialog);
  mk('↺ Reset to Sheet Import','d',async()=>{
    if(!confirm('Discard every change and reload the data imported from your Google Sheet?'))return;
    setD(freshSeed());await kvSet('data',D);toast('Reset to original sheet import');switchView('entry');});
  c.append(r);
  c.append(el('div','hint','Everything lives in this browser. Take a JSON backup before clearing browsing data, or before moving to another computer.'));
  wrap.append(c);

  const s=el('div','glass card');
  s.append(el('h3',null,'Company Settings'));
  const g=el('div','invhead');
  const bind=(lbl,key,path)=>{
    const i=input(path?D.settings[path][key]:D.settings[key],'text');
    i.oninput=()=>{if(path)D.settings[path][key]=i.value;else D.settings[key]=i.value;save();};
    g.append(field(lbl,i));
  };
  bind('Company Name','companyName');bind('TRN','trn');
  bind('Address','address');bind('Phone','phone');
  bind('Email','email');
  const vr=input(Math.round(n(D.settings.vatRate)*100),'text');
  vr.oninput=()=>{D.settings.vatRate=n(vr.value)/100;save();};
  g.append(field('VAT Rate (%)',vr));
  const px=input(D.settings.prefix,'text');
  px.oninput=()=>{D.settings.prefix=px.value.toUpperCase();save();};
  g.append(field('Invoice Prefix',px));
  bind('Bank Name','name','bank');bind('Account Title','title','bank');
  bind('Account No','acc','bank');bind('IBAN','iban','bank');
  s.append(g);wrap.append(s);

  const nb=el('div','note w');
  nb.innerHTML=`<b>Imported history</b> — the workbook contained only the <b>FROM JAN 2026</b> work sheet
    (${D.transactions.length} rows). The older tabs your Apps Script reads — <b>NOV 24 – JAN 25</b> and
    <b>FROM FEB 2025</b> — were not in the file, so statements before Jan 2026 show payments without their matching
    work rows. Send those two tabs and they import into the same structure.`;
  wrap.append(nb);

  const ph=el('div','note i');
  ph.innerHTML=`<b>Roadmap</b> — Phase 1 (data entry + statements), Phase 2 (invoicing) and Phase 3
    (dashboard + cash/bank accounts) are live. Phase 4 moves this to a hosted database with logins,
    role permissions and multi-device sync so your team can work at the same time.`;
  wrap.append(ph);
}

/* =========================================================
   ROUTER
   ========================================================= */
const NAV=[
  {g:'Overview'},
  {v:'entry',i:'▦',l:'Data Entry',t:'Data Entry',s:'daily work sheet',f:renderEntry},
  {v:'dashboard',i:'◧',l:'Dashboard',t:'Dashboard',s:'business at a glance',f:renderDash},
  {v:'alerts',i:'!',l:'Alerts',t:'Alerts Centre',s:'everything needing attention',f:renderAlerts,badge:()=>allAlerts().filter(a=>a.sev==='high').length},
  {g:'Money'},
  {v:'statement',i:'▤',l:'Statements',t:'Statement of Account',s:'per company, with PDF',f:renderStatement},
  {v:'payments',i:'₳',l:'Payments',t:'Payments Received',s:'balances sheet',f:renderPayments},
  {v:'companies',i:'◎',l:'Companies',t:'Companies & Balances',s:'receivables and advances',f:renderCompanies},
  {v:'ageing',i:'◷',l:'Receivables Ageing',t:'Receivables Ageing',s:'who owes you, and for how long',f:renderAgeing},
  {v:'cashbook',i:'▤',l:'Cash Book',t:'Cash Book',s:'manual entries for cash and bank',f:renderCashbook},
  {v:'expenses',i:'▾',l:'Expenses',t:'Expenses',s:'office and business overheads',f:renderExpenses},
  {v:'recurring',i:'↻',l:'Recurring',t:'Recurring Entries',s:'rent, salaries, renewals',f:renderRecurring,badge:()=>dueRecurring().length},
  {v:'accounts',i:'▧',l:'Cash & Bank',t:'Cash & Bank Accounts',s:'account movements',f:renderAccounts},
  {v:'partners',i:'◑',l:'Partner Shares',t:'Partner Shares',s:'profit split and withdrawals',f:renderPartners},
  {g:'Invoicing'},
  {v:'invoice',i:'🧾',l:'New / Edit Invoice',t:'Invoice Builder',s:'tax invoice with PDF',f:renderInvoice},
  {v:'invoices',i:'☰',l:'Invoice Register',t:'Invoice Register',s:'all saved invoices',f:renderInvoiceList},
  {v:'templates',i:'⧉',l:'Service Templates',t:'Service Templates',s:'task packages',f:renderTemplates},
  {v:'vat',i:'%',l:'VAT Return',t:'VAT Return',s:'output tax on service fees',f:renderVAT},
  {g:'Records'},
  {v:'employees',i:'☺',l:'Employees',t:'Employees',s:'staff, history and profit',f:renderEmployees},
  {v:'rates',i:'₤',l:'Rates Master',t:'Rates Master',s:'received, expense and profit',f:renderRates},
  {v:'visa',i:'✓',l:'Visa Tracker',t:'Visa Tracker',s:'file progress',f:renderVisa},
  {v:'insurance',i:'⛨',l:'Insurance',t:'Insurance Data',s:'policies and expiry',f:renderInsurance},
  {v:'contacts',i:'☏',l:'Contacts',t:'Contacts',s:'customer directory',f:renderContacts},
  {v:'assistant',i:'✦',l:'AI Assistant',t:'AI Assistant',s:'local model, your data',f:renderAssistant},
  {g:'System'},
  {v:'audit',i:'☷',l:'Activity Log',t:'Activity Log',s:'what changed and when',f:renderAudit},
  {v:'data',i:'⚙',l:'Data & Settings',t:'Data & Settings',s:'backup, restore, company details',f:renderData}
];
function buildNav(){
  const nav=$('#nav');nav.innerHTML='';
  NAV.forEach(x=>{
    if(x.g){nav.append(el('div','ngrp',x.g));return;}
    const a=el('a');a.dataset.v=x.v;
    a.append(el('span','ic',x.i));a.append(el('span',null,x.l));
    if(x.badge){try{const c=x.badge();if(c)a.append(el('span','tag',String(c)));}catch(e){}}
    a.onclick=()=>switchView(x.v);
    nav.append(a);
  });
}
function switchView(v){
  acHide();
  const sb=$('#subbar');if(sb)sb.innerHTML='';   // each view owns its own sub-bar
  document.body.classList.remove('nobar');       // Data Entry re-adds this
  const item=NAV.find(x=>x.v===v)||NAV.find(x=>x.v);
  $$('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.v===item.v));
  $('#vtitle').textContent=item.t;
  $('#vsub').textContent='· '+item.s;
  try{item.f();}catch(e){
    console.error(e);
    $('#view').innerHTML=`<div class="glass card"><div class="empty"><div class="e">⚠</div>
      Something went wrong rendering this view.<br><span style="font-size:11px">${esc(e.message)}</span></div></div>`;
  }
  $('#view').scrollTop=0;
}

/* =========================================================
   BOOT
   ========================================================= */


/* ---------- mobile drawer ---------- */
function closeNav(){document.body.classList.remove('navopen');$('#scrim').classList.remove('on');}
function initAI(){
  const b=$('#aifab');
  if(b)b.onclick=aiOpen;
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key==='/'){e.preventDefault();aiOpen();}
  });
}
function initMobile(){
  const t=$('#navtoggle'),sc=$('#scrim');
  if(!t)return;
  t.onclick=()=>{
    const open=document.body.classList.toggle('navopen');
    sc.classList.toggle('on',open);
  };
  sc.onclick=closeNav;
  $('#nav').addEventListener('click',e=>{if(e.target.closest('a'))closeNav();});
}

(async function boot(){
  try{setTheme(localStorage.getItem('tl_theme')||'light');}catch(e){setTheme('light');}
  const ts=$('#tsearch');if(ts)ts.onclick=openSearch;
  buildNav();
  initMobile();
  initAI();
  // If IndexedDB itself is unavailable or throws (private browsing, a quota
  // error, a version conflict) the app used to abort here with a permanently
  // blank screen. Fall back to an in-memory session instead — the person can
  // still work, just without persistence, and sees why.
  let stored=null,idbFailed=false;
  try{stored=await kvGet('data');}
  catch(e){idbFailed=true;}
  setD((stored&&stored.transactions)?migrate(stored):freshSeed());
  if(!stored){try{await kvSet('data',D);}catch(e){idbFailed=true;}}
  publishD();
  if(idbFailed)setTimeout(()=>toast('Could not open local storage — working in this tab only, changes will not be saved.',1),900);
  /* let the user know if a scheduled entry is waiting */
  const due=dueRecurring().length;
  if(due)setTimeout(()=>toast(`${due} recurring ${due===1?'entry is':'entries are'} due`),900);
  switchView('entry');
})();



/* =========================================================
   Public handle — window.TimeLink
   Exposed on purpose, for two reasons:
     1. the automated tests drive the app through it
     2. you can inspect live state from the browser console, e.g.
        TimeLink.D.settings      TimeLink.switchView('vat')
   Adding to this object is safe. Removing from it breaks tests.
   ========================================================= */
window.TimeLink = {
  get D() { return D; },
  set D(v) { setD(v); },
  NAV, switchView,
  // saving, so a browser test can force a write and then reload the page
  save, audit,
  // statement selection, used by the print test
  get SS() { return SS; }, setSS,
  n, m2, esc, parseAnyDate, parseClipTable,
  rateMap, rateBust, findRate, invoiceRate,
  invTotals, vatRate, accountBalances, partnerData,
  ageAll, allAlerts, nextInvNo, waNumber,
};
