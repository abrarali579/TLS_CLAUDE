/** The pick lists that feed every dropdown and autocomplete in the app. */
import { D } from '../core/store.js';
import { accountNames } from './accounts.js';
import { allCompanies } from './statement.js';
import { c } from '../lib/format.js';

export function serviceTypes(){return [...new Set(D.taskTemplates.map(t=>t.serviceType))].sort();}

export function itemNames(){return [...new Set([...D.rates.map(r=>r.item),...D.taskTemplates.map(t=>t.desc),
  ...D.invoiceItems.map(i=>i.desc)])].filter(Boolean).sort();}

export function customerNames(){return [...new Set([...D.contacts.map(c=>c.name),...D.invoices.map(i=>i.BillTo),...D.companies])].filter(Boolean).sort();}

export function expCategories(){
  return [...new Set([...(D.settings.expenseCategories||[]),
    ...(D.expenses||[]).map(x=>x.category).filter(Boolean)])].sort();
}

export const XFER_PREFIX='> ';

export function cbPickList(current){
  return [...accountNames().filter(a=>a!==current).map(a=>XFER_PREFIX+a),
          ...allCompanies()];
}

export function accountPick(text){
  const v=String(text||'').trim();
  if(!v)return '';
  const bare=v.startsWith(XFER_PREFIX)?v.slice(XFER_PREFIX.length):v;
  return accountNames().find(a=>a.toUpperCase()===bare.trim().toUpperCase())||'';
}

export function companyMatch(text){
  const v=String(text||'').trim();
  if(!v)return '';
  const hit=allCompanies().find(c=>c.toUpperCase()===v.toUpperCase());
  return hit||'';
}
