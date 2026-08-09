/** Activity Log. */
import { save } from '../core/persist.js';
import { D } from '../core/store.js';
import { csv } from '../lib/csv.js';
import { fmtDate, today } from '../lib/dates.js';
import { $, el } from '../lib/dom.js';
import { esc } from '../lib/format.js';
import { dl } from '../ui/download.js';
import { mkBtn } from '../ui/forms.js';
import { toast } from '../ui/toast.js';
import { kpiRow } from '../ui/widgets.js';

export function renderAudit(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'↓ CSV','',()=>dl(new Blob([csv([['WHEN','ACTION','TYPE','DETAIL'],
    ...(D.audit||[]).map(a=>[a.ts,a.action,a.what,a.detail])])],{type:'text/csv'}),`audit-${today()}.csv`));
  mkBtn(T,'Clear Log','d',()=>{if(confirm('Clear the activity log? Your data is not affected.')){
    D.audit=[];save();renderAudit();toast('Log cleared');}});

  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const A=D.audit||[];
  wrap.append(kpiRow([
    {t:'Logged Events',v:A.length,s:'most recent 800'},
    {t:'Additions',v:A.filter(a=>a.action==='add').length,s:'new records',c:'pos'},
    {t:'Edits',v:A.filter(a=>a.action==='edit').length,s:'changes'},
    {t:'Removals',v:A.filter(a=>a.action==='remove').length,s:'deleted',c:'neg'}
  ]));
  if(!A.length){
    wrap.innerHTML+='<div class="glass card"><div class="empty"><div class="e">☰</div>Nothing logged yet. Adding a company, employee, work item or partner will appear here.</div></div>';
    return;
  }
  const card=el('div','glass card');
  const t=el('table','list');
  t.innerHTML='<thead><tr><th style="width:170px">When</th><th style="width:100px">Action</th>'+
    '<th style="width:120px">Type</th><th>Detail</th></tr></thead>';
  const tb=el('tbody');
  const CL={add:'adv',edit:'i',remove:'bal',withdraw:'w'};
  A.slice(0,400).forEach(a=>{
    const tr=el('tr');
    const d=new Date(a.ts);
    tr.innerHTML=`<td style="font-size:11.5px">${isNaN(d)?esc(a.ts):fmtDate(a.ts.slice(0,10))+' '+d.toTimeString().slice(0,5)}</td>
      <td><span class="badge ${CL[a.action]||'i'}">${esc(a.action)}</span></td>
      <td style="font-size:11.8px">${esc(a.what)}</td><td>${esc(a.detail)}</td>`;
    tb.append(tr);
  });
  t.append(tb);card.append(t);wrap.append(card);
}
