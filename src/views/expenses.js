/** Expenses — office and business overheads. */
import { audit, save } from '../core/persist.js';
import { D } from '../core/store.js';
import { accColor, accountNames } from '../domain/accounts.js';
import { expCategories } from '../domain/lists.js';
import { isBlankExp, monthKey, newExp } from '../domain/rows.js';
import { csv } from '../lib/csv.js';
import { today } from '../lib/dates.js';
import { $, debounce, el } from '../lib/dom.js';
import { c, esc, m0, n } from '../lib/format.js';
import { attachButton } from '../ui/attachments-ui.js';
import { bindAC } from '../ui/autocomplete.js';
import { dl } from '../ui/download.js';
import { input, mkBtn, pillControl } from '../ui/forms.js';
import { bindRowLock, focusCell, gridKey } from '../ui/grid.js';
import { toast, toastUndo } from '../ui/toast.js';
import { gw, kpiRow, svgLine } from '../ui/widgets.js';

export const XCOL={date:1,category:2,desc:3,amount:4,account:5};

export function topUpExpenses(){
  D.expenses=D.expenses||[];
  let spare=D.expenses.filter(isBlankExp).length,added=false;
  while(spare<5){D.expenses.push(newExp());spare++;added=true;}
  if(added)save();
}

export function renderExpenses(){
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

export function ensureExpSpare(tb){
  const rows=[...tb.querySelectorAll('tr')];
  const spare=rows.filter(tr=>{const x=D.expenses.find(z=>z.id===tr.dataset.id);return x&&isBlankExp(x);}).length;
  for(let i=spare;i<5;i++){
    const x=newExp();D.expenses.push(x);
    tb.append(tb._row(x,tb.querySelectorAll('tr').length));
  }
  if(spare<5)save();
}

export function growExpenses(tb,gw){
  tb=tb||$('#expbody');gw=gw||$('#expgrid');
  if(!tb||!tb._row){D.expenses=D.expenses||[];D.expenses.push(newExp());save();
    if(renderExpenses._draw)renderExpenses._draw();return;}
  const x=newExp();D.expenses.push(x);save();
  const idx=tb.querySelectorAll('tr').length;
  tb.append(tb._row(x,idx));
  gw.scrollTop=gw.scrollHeight;
  focusCell(gw,idx,XCOL.category);
}
