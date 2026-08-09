/** Employees. */
import { audit, save } from '../core/persist.js';
import { D } from '../core/store.js';
import { employeeHistory, employeeStats } from '../domain/employees.js';
import { csv } from '../lib/csv.js';
import { fmtDate, today } from '../lib/dates.js';
import { $, debounce, el } from '../lib/dom.js';
import { c, esc, m0 } from '../lib/format.js';
import { bindAC } from '../ui/autocomplete.js';
import { dl } from '../ui/download.js';
import { field, input, mkBtn } from '../ui/forms.js';
import { modal } from '../ui/modal.js';
import { quickAddCompany } from '../ui/quick-add.js';
import { toast } from '../ui/toast.js';
import { gw, kpiRow } from '../ui/widgets.js';

export function renderEmployees(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'+ Add Employee','p',()=>{
    const body=el('div'),g=el('div','invhead');
    const nm=input('','text','full name'),co=input('','text','company'),nt=input('','text','note (optional)');
    bindAC(co,()=>D.companies,{onAdd:quickAddCompany});
    g.append(field('Employee Name',nm),field('Company',co),field('Note',nt));
    body.append(g);
    modal('Add Employee',body,[{label:'Cancel'},{label:'Add',cls:'p',fn:()=>{
      if(!nm.value.trim()){toast('Name is required',1);return false;}
      D.employees=D.employees||[];
      D.employees.push({name:nm.value.trim(),company:co.value.trim(),note:nt.value.trim()});
      audit('add','employee',nm.value.trim());save();renderEmployees();toast('Employee added');
    }}]);
  });
  mkBtn(T,'↓ CSV','',()=>dl(new Blob([csv([['EMPLOYEE','COMPANIES','JOBS','RECEIVED','EXPENSE','PROFIT','FIRST','LAST'],
    ...employeeStats().map(e=>[e.name,e.companies.join('; '),e.jobs,e.received,e.expense,e.profit,e.first,e.last])])],
    {type:'text/csv'}),`employees-${today()}.csv`));

  const rows=employeeStats();
  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const active=rows.filter(e=>e.visaTotal&&e.visaDone<e.visaTotal);
  wrap.append(kpiRow([
    {t:'Employees',v:rows.length,s:'seen in entries'},
    {t:'Total Profit',v:m0(rows.reduce((a,e)=>a+e.profit,0)),s:'across all staff',c:'pos',a:1},
    {t:'Visa Files Open',v:active.length,s:'partially complete',c:'gold'},
    {t:'Avg Profit / Employee',v:m0(rows.reduce((a,e)=>a+e.profit,0)/Math.max(1,rows.length)),s:'AED'}
  ]));

  const c=el('div','glass card noprint');
  const q=input('','text','search employee, company or work…');c.append(q);wrap.append(c);
  const out=el('div');wrap.append(out);
  const draw=(term='')=>{
    out.innerHTML='';
    const f=rows.filter(e=>!term||
      `${e.name} ${e.companies.join(' ')} ${Object.keys(e.works).join(' ')}`.toUpperCase().includes(term.toUpperCase()));
    const gw=el('div','glass gridwrap');const t=el('table','list');
    t.innerHTML=`<thead><tr><th style="min-width:170px">Employee</th><th style="min-width:170px">Company</th>
      <th style="width:60px;text-align:center">Jobs</th><th style="width:100px;text-align:right">Received</th>
      <th style="width:100px;text-align:right">Expense</th><th style="width:100px;text-align:right">Profit</th>
      <th style="min-width:150px">Most Frequent Work</th><th style="width:110px">Visa</th>
      <th style="width:118px">Insurance</th><th style="width:96px"></th></tr></thead>`;
    const tb=el('tbody');
    f.slice(0,600).forEach(e=>{
      const tr=el('tr');
      const insD=e.insExpiry?(new Date(e.insExpiry)-new Date())/864e5:null;
      const insTxt=e.insExpiry
        ? `<span style="color:${insD<0?'var(--neg)':insD<=30?'var(--warn)':'var(--ink-2)'}">${fmtDate(e.insExpiry)}</span>`
        : '<span style="color:var(--ink-3)">—</span>';
      const visa=e.visaTotal
        ? `<div style="font-family:var(--mono);font-size:11px;font-weight:700">${e.visaDone}/${e.visaTotal}</div>
           <div class="bar"><i style="width:${(e.visaDone/e.visaTotal*100).toFixed(0)}%"></i></div>`
        : '<span style="color:var(--ink-3)">—</span>';
      tr.innerHTML=`<td><b>${esc(e.name)}</b><div style="font-size:10px;color:var(--ink-3)">${e.first?fmtDate(e.first)+' → '+fmtDate(e.last):''}</div></td>
        <td style="font-size:11.8px">${esc(e.companies.slice(0,2).join(', ')||'—')}${e.companies.length>2?` +${e.companies.length-2}`:''}</td>
        <td class="c">${e.jobs}</td><td class="n">${m0(e.received)}</td><td class="n">${m0(e.expense)}</td>
        <td class="n"><b style="color:${e.profit<0?'var(--neg)':'var(--pos)'}">${m0(e.profit)}</b></td>
        <td style="font-size:11.8px">${e.topWork?esc(e.topWork[0])+` <span style="color:var(--ink-3)">×${e.topWork[1]}</span>`:'—'}</td>
        <td>${visa}</td><td style="font-size:11.5px">${insTxt}</td><td class="c"></td>`;
      const b=el('button','btn sm','History');
      b.onclick=()=>employeeHistory(e.name);
      tr.lastChild.append(b);tb.append(tr);
    });
    if(!f.length){const tr=el('tr'),td=el('td');td.colSpan=10;
      td.innerHTML='<div class="empty"><div class="e">∅</div>No employees match.</div>';tr.append(td);tb.append(tr);}
    t.append(tb);gw.append(t);out.append(gw);
    out.append(el('div','hint',`${f.length} employees`));
  };
  q.oninput=debounce(()=>draw(q.value),260);
  draw();
}
