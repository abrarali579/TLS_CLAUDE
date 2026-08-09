/**
 * Invoices: numbering, blank documents, and the totals.
 *
 * The rule that matters most: VAT applies to the SERVICE FEE only, never to
 * government charges passed through at cost. Pinned in test/money.test.js.
 */
import { D } from '../core/store.js';
import { today } from '../lib/dates.js';
import { c, n } from '../lib/format.js';

export const LINE_ROWS=20;

export const DOC_TYPES={
  'TAX INVOICE':{prefix:'TL',totalLabel:'GRAND TOTAL',dueLabel:'BALANCE DUE',
    foot:'This is a computer-generated tax invoice and does not require a signature.',
    thanks:'Thanks for doing business with us!',stamp:''},
  'QUOTATION':{prefix:'QT',totalLabel:'QUOTED TOTAL',dueLabel:'PAYABLE ON ACCEPTANCE',
    foot:'This quotation is valid for 15 days from the date above. Government charges are subject to change without notice.',
    thanks:'We look forward to working with you.',stamp:'QUOTATION'},
  'PAYMENT RECEIPT':{prefix:'RC',totalLabel:'TOTAL',dueLabel:'BALANCE REMAINING',
    foot:'Received with thanks. This receipt confirms the amount recorded against your account.',
    thanks:'Thank you for your payment!',stamp:'PAID'}
};

export function docCfg(inv){return DOC_TYPES[(inv&&inv.DocType)||'TAX INVOICE']||DOC_TYPES['TAX INVOICE'];}

export function blankInvoice(){
  return {DocType:'TAX INVOICE',InvoiceNo:'',InvoiceDate:today(),BillTo:'',Applicant:'',ContactInfo:'',ServiceType:'',
    CustomerTRN:'NOT REGISTERED',TimeLinkTRN:D.settings.trn,
    ServiceFee:0,Advance:0,items:[],Note:''};
}

export function yymm(d){const x=d?new Date(d):new Date();
  return String(x.getFullYear()).slice(2)+String(x.getMonth()+1).padStart(2,'0');}

export function docPrefix(inv){
  const base=D.settings.prefix||'TL';
  const c=docCfg(inv);
  return c.prefix==='TL'?base:c.prefix;
}

export function parseInvNo(no,inv){
  const p=inv!==undefined?docPrefix(inv):(D.settings.prefix||'TL');
  const m=String(no||'').trim().toUpperCase().match(new RegExp('^'+p+'(\\d{4})(\\d{2,})$'));
  if(!m)return null;
  return{yymm:m[1],nn:+m[2],num6:+m[1]*1000+ +m[2]};
}

export function nextInvNo(dateStr,inv){
  const p=inv?docPrefix(inv):(D.settings.prefix||'TL'), ym=yymm(dateStr);
  let max=0;
  D.invoices.forEach(v=>{
    const q=parseInvNo(v.InvoiceNo,{DocType:v.DocType});
    if(q&&q.yymm===ym&&q.nn>max&&String(v.InvoiceNo).startsWith(p))max=q.nn;});
  const nn=max+1;
  return p+ym+String(nn).padStart(2,'0');
}

export function invMismatch(v){
  const items=D.invoiceItems.filter(i=>String(i.invoiceNo).trim()===String(v.InvoiceNo).trim());
  if(!items.length)return null;
  const govt=Math.round(items.reduce((a,x)=>a+n(x.qty)*n(x.rate),0)*100)/100;
  const d=Math.round((govt-n(v.GovtSubtotal))*100)/100;
  return Math.abs(d)>0.51?{govt,stored:n(v.GovtSubtotal),diff:d}:null;
}

export function findInvoice(no){return D.invoices.find(v=>String(v.InvoiceNo).trim()===String(no).trim());}

export function invTotals(inv){
  // only count a line once it has a description — matches the filter used by
  // validateInv()/saveInvoice()/exportInvoicePDF(), so a qty/rate typed into
  // a still-blank row can't inflate the live total shown before it's saved
  const govt=Math.round(inv.items.filter(x=>(x.desc||'').trim())
    .reduce((a,x)=>a+n(x.qty)*n(x.rate),0)*100)/100;
  const fee=n(inv.ServiceFee);
  const vat=Math.round(fee*n(D.settings.vatRate)*100)/100;
  const grand=Math.round((govt+fee+vat)*100)/100;
  const adv=Math.round(n(inv.Advance)*100)/100;
  return{govt,fee,vat,feeInc:Math.round((fee+vat)*100)/100,
    grand,advance:adv,balance:Math.round((grand-adv)*100)/100};
}

export function normDate(s){
  if(!s)return today();
  const t=String(s).trim();
  if(/^\d{4}-\d{2}-\d{2}/.test(t))return t.slice(0,10);
  const m=t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return today();
}
