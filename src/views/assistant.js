/**
 * AI Assistant — talks to a local Ollama model, so business data never leaves
 * the machine. Every action it takes is recorded so it can be undone.
 */
import { audit, save } from '../core/persist.js';
import { D } from '../core/store.js';
import { accountBalances, companyBalances } from '../domain/accounts.js';
import { ageAll, ageCompany } from '../domain/ageing.js';
import { allAlerts } from '../domain/alerts.js';
import { employeeStats } from '../domain/employees.js';
import { findInvoice, normDate } from '../domain/invoices.js';
import { companyMatch } from '../domain/lists.js';
import { partnerData } from '../domain/partners.js';
import { findRate, rateBust } from '../domain/rates.js';
import { isBlankExp, isBlankTx, monthKey } from '../domain/rows.js';
import { allCompanies, buildStatement } from '../domain/statement.js';
import { periodLabel, vatPeriods } from '../domain/vat.js';
import { parseAnyDate, today } from '../lib/dates.js';
import { $, el } from '../lib/dom.js';
import { c, esc, m0, n, uid } from '../lib/format.js';
import { field, input, mkBtn } from '../ui/forms.js';
import { modal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { kpiRow } from '../ui/widgets.js';
import { refreshEntryTotals, syncLinkedPayment } from './sheets.js';

export function aiCfg(){
  D.settings.ai=D.settings.ai||{};
  const a=D.settings.ai;
  if(!a.url)a.url='http://localhost:11434';
  if(!a.model)a.model='gpt-oss-large:latest';
  if(a.temperature===undefined)a.temperature=0.3;
  return a;
}

export function aiSnapshot(){
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

export const AI_TOOLS={
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

export const AI_UNDO=[];

export function aiRecord(tool,detail,undoFn){
  AI_UNDO.push({tool,detail,undoFn,at:new Date().toISOString()});
  if(AI_UNDO.length>50)AI_UNDO.shift();
  audit('ai',tool,detail);
  save();
}

export function aiUndoLast(){
  const last=AI_UNDO.pop();
  if(!last)return null;
  last.undoFn();
  audit('undo','ai action',last.detail);
  save();
  return last;
}

export function aiRunTool(name,args){
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

export function aiToolSpecs(){
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

export const AI_SYSTEM=()=>`You are the assistant built into TIME LINK Business Suite, the system that runs
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

export async function aiPing(){
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

export async function aiChat(messages,onDelta,onTool){
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

export async function aiTurn(history,onDelta,onTool,depth){
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

export function aiOffline(q){
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

export let AI_HISTORY=[];

export let AI_BUSY=false;

export function aiOpen(){
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

export function aiCheck(){
  const st=$('#aistatus');if(!st)return;
  aiPing().then(r=>{
    if(!st.isConnected&&!$('#aistatus'))return;
    const s=$('#aistatus');if(!s)return;
    if(r.ok&&r.hasModel){s.textContent=`${aiCfg().model} · connected`;s.className='ok';}
    else if(r.ok){s.textContent=`connected, but ${aiCfg().model} is not installed`;s.className='warn';}
    else{s.textContent='Ollama not reachable — using built-in answers';s.className='warn';}
  });
}

export function aiGreet(){
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

export function aiBubble(role,text){
  const b=el('div','aimsg '+role);
  b.textContent=text||'';
  $('#aibody').append(b);
  $('#aibody').scrollTop=$('#aibody').scrollHeight;
  return b;
}

export function aiToolChip(name,args,result){
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

export async function aiSend(){
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

export function aiSetupHint(ping){
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

export function aiSettings(){
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

export function renderAssistant(){
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
