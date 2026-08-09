/** Payments Received. */
import { save } from '../core/persist.js';
import { D } from '../core/store.js';
import { accColor, accountNames } from '../domain/accounts.js';
import { isBlankPay, newPay } from '../domain/rows.js';
import { allCompanies } from '../domain/statement.js';
import { csv } from '../lib/csv.js';
import { daysAgo, today } from '../lib/dates.js';
import { $, debounce, el } from '../lib/dom.js';
import { c, m0, n } from '../lib/format.js';
import { bindAC } from '../ui/autocomplete.js';
import { dl } from '../ui/download.js';
import { input, mkBtn, pillControl } from '../ui/forms.js';
import { bindRowLock, focusCell, gridKey } from '../ui/grid.js';
import { quickAddCompany } from '../ui/quick-add.js';
import { toast } from '../ui/toast.js';
import { gw, kpiRow } from '../ui/widgets.js';

export const PCOL={date:1,company:2,amount:3,account:4,remark:5};

export function topUpPayments(){
  let spare=D.payments.filter(isBlankPay).length,added=false;
  while(spare<5){D.payments.push(newPay());spare++;added=true;}
  if(added)save();
}

export function renderPayments(){
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

export function ensurePaySpare(tb,offset){
  const rows=[...tb.querySelectorAll('tr')];
  const spare=rows.filter(tr=>{const p=D.payments[+tr.dataset.pi];return p&&isBlankPay(p);}).length;
  for(let i=spare;i<5;i++){
    const p=newPay();D.payments.push(p);
    tb.append(tb._row(p,tb.querySelectorAll('tr').length));
  }
  if(spare<5)save();
}

export function growPayments(tb,gw,offset){
  tb=tb||$('#paybody');gw=gw||$('#paygrid');
  if(!tb||!tb._row){D.payments.push(newPay());save();
    if(renderPayments._draw)renderPayments._draw();return;}
  const p=newPay();D.payments.push(p);save();
  const idx=tb.querySelectorAll('tr').length;
  tb.append(tb._row(p,idx));
  gw.scrollTop=gw.scrollHeight;
  focusCell(gw,idx,PCOL.company);
}
