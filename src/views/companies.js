/** Companies & Balances. */
import { audit, save } from '../core/persist.js';
import { switchView } from '../core/router.js';
import { D } from '../core/store.js';
import { companyBalances } from '../domain/accounts.js';
import { setSS } from '../domain/statement.js';
import { csv } from '../lib/csv.js';
import { today } from '../lib/dates.js';
import { $, el } from '../lib/dom.js';
import { c, esc, m0, n, uid } from '../lib/format.js';
import { dl } from '../ui/download.js';
import { field, input, mkBtn } from '../ui/forms.js';
import { modal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { listView } from '../ui/widgets.js';

export function companyDialog(){
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

export function renderCompanies(){
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
