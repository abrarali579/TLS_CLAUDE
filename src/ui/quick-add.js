/** "Create this value" — adding a company, employee or work item without leaving the sheet. */
import { audit, save } from '../core/persist.js';
import { D } from '../core/store.js';
import { rateBust } from '../domain/rates.js';
import { c } from '../lib/format.js';
import { toast, toastUndo } from './toast.js';

export function quickAddCompany(name){
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

export function quickAddWork(name){
  const v=name.trim();if(!v)return;
  if((D.rates||[]).some(r=>r.item.toUpperCase()===v.toUpperCase()))return;
  D.rates.push({item:v,rate:0,fee:0});rateBust();
  audit('add','work item',v);save();
  toastUndo(`Added work item "${v}" — set its rate in Rates Master`,()=>{
    D.rates=D.rates.filter(r=>r.item!==v);rateBust();save();toast(`Removed "${v}"`);
  });
}

export function quickAddEmployee(name,company){
  const v=name.trim();if(!v)return;
  D.employees=D.employees||[];
  if(D.employees.some(e=>e.name.toUpperCase()===v.toUpperCase()))return;
  D.employees.push({name:v,company:company||'',note:''});
  audit('add','employee',v);save();
  toastUndo(`Added employee "${v}"`,()=>{
    D.employees=D.employees.filter(e=>e.name!==v);save();toast(`Removed "${v}"`);
  });
}
