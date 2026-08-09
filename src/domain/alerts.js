/** Everything needing attention: expiring insurance, mismatched invoices, data problems. */
import { switchView } from '../core/router.js';
import { D } from '../core/store.js';
import { companyBalances } from './accounts.js';
import { invMismatch } from './invoices.js';
import { setSS } from './statement.js';
import { fmtDate } from '../lib/dates.js';
import { m0, m2, n } from '../lib/format.js';

export function insuranceSoon(days){
  const t=new Date();
  return D.insurance.filter(x=>{if(!x.expiry)return false;
    const d=(new Date(x.expiry)-t)/864e5;return d>=0&&d<=days;});
}

export function allAlerts(){
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

export function dataIssues(){
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
