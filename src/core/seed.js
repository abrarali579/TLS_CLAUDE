/**
 * The starting dataset baked into the page, and the upgrade path for data
 * saved by older versions.
 *
 * migrate() must stay backwards compatible: someone restoring a year-old
 * backup should end up with a usable store, not a crash.
 */
import { rateBust } from '../domain/rates.js';
import { uid } from '../lib/format.js';

export const SEED = JSON.parse(document.getElementById('seedjson').textContent);

export function freshSeed(){
  const d=JSON.parse(JSON.stringify(SEED));
  d.transactions.forEach((t,i)=>{t.id=uid();t._s=i;});
  return d;
}

export function migrate(d){
  d.ledger=d.ledger||[];d.invoices=d.invoices||[];d.invoiceItems=d.invoiceItems||[];
  d.taskTemplates=d.taskTemplates||[];d.insurance=d.insurance||[];d.visa=d.visa||[];
  d.contacts=d.contacts||[];d.rates=d.rates||[];d.payments=d.payments||[];
  d.employees=d.employees||[];d.audit=d.audit||[];d.expenses=d.expenses||[];
  d.recurring=d.recurring||[];d.attachments=d.attachments||[];
  d.expenses.forEach(x=>{if(!x.id)x.id=uid();});
  d.ledger.forEach(l=>{if(!l.id)l.id=uid();if(l.company===undefined)l.company='';});
  d.payments.forEach(p=>{if(p.account===undefined)p.account='';});
  d.settings=Object.assign({},SEED.settings,d.settings||{});
  d.settings.bank=Object.assign({},SEED.settings.bank,d.settings.bank||{});
  d.settings.ai=Object.assign({url:'http://localhost:11434',model:'gpt-oss-large:latest',temperature:0.3},d.settings.ai||{});
  if(!Array.isArray(d.settings.accounts)||!d.settings.accounts.length)
    d.settings.accounts=JSON.parse(JSON.stringify(SEED.settings.accounts));
  if(!Array.isArray(d.settings.expenseCategories)||!d.settings.expenseCategories.length)
    d.settings.expenseCategories=(SEED.settings.expenseCategories||[]).slice();
  if(!Array.isArray(d.settings.partners)||!d.settings.partners.length)
    d.settings.partners=JSON.parse(JSON.stringify(SEED.settings.partners||[]));
  rateBust();
  d.companies=d.companies&&d.companies.length?d.companies:SEED.companies;
  d.workItems=d.workItems&&d.workItems.length?d.workItems:SEED.workItems;
  d.transactions.forEach((t,i)=>{if(!t.id)t.id=uid();if(t._s===undefined)t._s=i;});
  return d;
}
