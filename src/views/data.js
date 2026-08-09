/** Data & Settings — backup, restore, repair, company details. */
import { audit, kvSet, save } from '../core/persist.js';
import { switchView } from '../core/router.js';
import { freshSeed, migrate } from '../core/seed.js';
import { D, setD } from '../core/store.js';
import { dataIssues } from '../domain/alerts.js';
import { rateBust } from '../domain/rates.js';
import { csv } from '../lib/csv.js';
import { today } from '../lib/dates.js';
import { $, el } from '../lib/dom.js';
import { esc, n } from '../lib/format.js';
import { dl } from '../ui/download.js';
import { field, input } from '../ui/forms.js';
import { modal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { kpiRow } from '../ui/widgets.js';
import { exportTxCSV } from './sheets.js';

export function repairDialog(){
  const issues=dataIssues();
  const body=el('div');
  if(!issues.length){
    body.append(el('div','empty','Nothing to repair — every invoice reconciles and no item is priced below cost.'));
    modal('Data Check',body,[{label:'Close'}]);
    return;
  }
  const nb=el('div','note w');
  nb.innerHTML=`<b>${issues.length} issues found.</b> These came across from the spreadsheet.
    Repairing recalculates each invoice from its own line items, and lifts any below-cost rate up to break-even.
    Take a backup first if you want to be able to step back.`;
  body.append(nb);

  const t=el('table','list');
  t.innerHTML='<thead><tr><th style="width:110px">Type</th><th style="width:150px">Record</th><th>Problem</th></tr></thead>';
  const tb=el('tbody');
  issues.forEach(i=>{
    const tr=el('tr');
    tr.innerHTML=`<td><span class="badge ${i.type==='invoice'?'w':'bal'}">${i.type}</span></td>
      <td><b>${esc(i.id)}</b></td><td style="font-size:11.8px">${esc(i.detail)}</td>`;
    tb.append(tr);
  });
  t.append(tb);
  const box=el('div','glass gridwrap');box.style.cssText='max-height:44vh;margin-top:12px';
  box.append(t);body.append(box);

  modal('Data Check',body,[
    {label:'Close'},
    {label:`Repair all ${issues.length}`,cls:'p',fn:()=>{
      issues.forEach(i=>i.fix());
      rateBust();
      audit('repair','data',`${issues.length} records`);
      save();toast(`Repaired ${issues.length} records`);
      if(typeof renderData==='function')switchView('data');
    }}
  ]);
}

export function renderData(){
  const T=$('#tools');T.innerHTML='';
  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  wrap.append(kpiRow([
    {t:'Work Entries',v:D.transactions.length},{t:'Payments',v:D.payments.length},
    {t:'Invoices',v:D.invoices.length},{t:'Invoice Lines',v:D.invoiceItems.length},
    {t:'Rates',v:D.rates.length},{t:'Templates',v:D.taskTemplates.length},
    {t:'Insurance',v:D.insurance.length},{t:'Visa Files',v:D.visa.length},
    {t:'Contacts',v:D.contacts.length},{t:'Account Moves',v:D.ledger.length}
  ]));

  const c=el('div','glass card');
  c.append(el('h3',null,'Backup & Restore'));
  const r=el('div','row');
  const mk=(t,cls,fn)=>{const b=el('button','btn '+(cls||''),t);b.onclick=fn;r.append(b);};
  mk('↓ Full JSON Backup','p',()=>dl(new Blob([JSON.stringify(D)],{type:'application/json'}),`timelink-backup-${today()}.json`));
  mk('↓ Entries CSV','',exportTxCSV);
  mk('↓ Payments CSV','',()=>dl(new Blob([csv([['DATE','AMOUNT','COMPANY NAME','RECEIVED INTO','REMARKS'],
    ...D.payments.map(p=>[p.date,p.amount,p.company,p.account||'',p.remark])])],{type:'text/csv'}),`payments-${today()}.csv`));
  const f=el('input');f.type='file';f.accept='.json';f.style.display='none';
  f.onchange=async e=>{const file=e.target.files[0];if(!file)return;
    try{const j=JSON.parse(await file.text());if(!j.transactions)throw 0;
      setD(migrate(j));await kvSet('data',D);toast('Backup restored');switchView('entry');}
    catch(x){toast('That file is not a valid TimeLink backup',1);}};
  r.append(f);
  mk('⬆ Restore Backup','',()=>f.click());
  mk('Check & repair data','',repairDialog);
  mk('↺ Reset to Sheet Import','d',async()=>{
    if(!confirm('Discard every change and reload the data imported from your Google Sheet?'))return;
    setD(freshSeed());await kvSet('data',D);toast('Reset to original sheet import');switchView('entry');});
  c.append(r);
  c.append(el('div','hint','Everything lives in this browser. Take a JSON backup before clearing browsing data, or before moving to another computer.'));
  wrap.append(c);

  const s=el('div','glass card');
  s.append(el('h3',null,'Company Settings'));
  const g=el('div','invhead');
  const bind=(lbl,key,path)=>{
    const i=input(path?D.settings[path][key]:D.settings[key],'text');
    i.oninput=()=>{if(path)D.settings[path][key]=i.value;else D.settings[key]=i.value;save();};
    g.append(field(lbl,i));
  };
  bind('Company Name','companyName');bind('TRN','trn');
  bind('Address','address');bind('Phone','phone');
  bind('Email','email');
  const vr=input(Math.round(n(D.settings.vatRate)*100),'text');
  vr.oninput=()=>{D.settings.vatRate=n(vr.value)/100;save();};
  g.append(field('VAT Rate (%)',vr));
  const px=input(D.settings.prefix,'text');
  px.oninput=()=>{D.settings.prefix=px.value.toUpperCase();save();};
  g.append(field('Invoice Prefix',px));
  bind('Bank Name','name','bank');bind('Account Title','title','bank');
  bind('Account No','acc','bank');bind('IBAN','iban','bank');
  s.append(g);wrap.append(s);

  const nb=el('div','note w');
  nb.innerHTML=`<b>Imported history</b> — the workbook contained only the <b>FROM JAN 2026</b> work sheet
    (${D.transactions.length} rows). The older tabs your Apps Script reads — <b>NOV 24 – JAN 25</b> and
    <b>FROM FEB 2025</b> — were not in the file, so statements before Jan 2026 show payments without their matching
    work rows. Send those two tabs and they import into the same structure.`;
  wrap.append(nb);

  const ph=el('div','note i');
  ph.innerHTML=`<b>Roadmap</b> — Phase 1 (data entry + statements), Phase 2 (invoicing) and Phase 3
    (dashboard + cash/bank accounts) are live. Phase 4 moves this to a hosted database with logins,
    role permissions and multi-device sync so your team can work at the same time.`;
  wrap.append(ph);
}
