/** Recurring Entries. */
import { audit, save } from '../core/persist.js';
import { D } from '../core/store.js';
import { accountNames } from '../domain/accounts.js';
import { expCategories } from '../domain/lists.js';
import { FREQ, advanceDate, dueRecurring, newRecurring, postAllDue, postRecurring } from '../domain/recurring.js';
import { fmtDate, today } from '../lib/dates.js';
import { $, el } from '../lib/dom.js';
import { esc, m0, n } from '../lib/format.js';
import { bindAC } from '../ui/autocomplete.js';
import { field, input, mkBtn } from '../ui/forms.js';
import { modal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { gw, kpiRow } from '../ui/widgets.js';

export function renderRecurring(){
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

export function recurringDialog(existing){
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
