/** Visa Tracker. */
import { save } from '../core/persist.js';
import { D } from '../core/store.js';
import { $, debounce, el } from '../lib/dom.js';
import { c } from '../lib/format.js';
import { bindAC } from '../ui/autocomplete.js';
import { input, mkBtn } from '../ui/forms.js';
import { gw, kpiRow } from '../ui/widgets.js';

export function renderVisa(){
  const T=$('#tools');T.innerHTML='';
  const steps=Object.keys((D.visa[0]||{}).steps||{});
  mkBtn(T,'+ Add File','p',()=>{
    const s={};steps.forEach(k=>s[k]=false);
    D.visa.unshift({company:'',employee:'',steps:s});save();renderVisa();});

  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const done=D.visa.filter(x=>steps.every(k=>x.steps[k]));
  const active=D.visa.filter(x=>steps.some(k=>x.steps[k])&&!steps.every(k=>x.steps[k]));
  wrap.append(kpiRow([
    {t:'Visa Files',v:D.visa.length,s:'tracked'},
    {t:'In Progress',v:active.length,s:'partially complete',c:'gold',a:1},
    {t:'Completed',v:done.length,s:'all steps done',c:'pos'},
    {t:'Not Started',v:D.visa.length-done.length-active.length,s:'no steps ticked'}
  ]));
  const c=el('div','glass card noprint');
  const q=input('','text','search company or employee…');c.append(q);wrap.append(c);
  const out=el('div');wrap.append(out);
  const draw=(term='')=>{
    out.innerHTML='';
    const list=D.visa.filter(x=>!term||`${x.company} ${x.employee}`.toUpperCase().includes(term.toUpperCase()));
    const gw=el('div','glass gridwrap');const t=el('table','list');
    t.innerHTML='<thead><tr><th style="min-width:170px">Company</th><th style="min-width:140px">Employee</th>'+
      steps.map(s=>`<th style="width:48px;text-align:center" title="${s}">${s.split(' ').map(w=>w[0]).join('')}</th>`).join('')+
      '<th style="width:110px">Progress</th></tr></thead>';
    const tb=el('tbody');
    list.slice(0,600).forEach(x=>{
      const tr=el('tr');
      const ctd=el('td');const ci=el('input','cell');ci.value=x.company;
      bindAC(ci,()=>D.companies);ci.addEventListener('input',()=>{x.company=ci.value;save();});
      ctd.append(ci);tr.append(ctd);
      const etd=el('td');const ei=el('input','cell');ei.value=x.employee;
      ei.addEventListener('input',()=>{x.employee=ei.value;save();});etd.append(ei);tr.append(etd);
      const bar=el('td');
      steps.forEach(s=>{
        const td=el('td','c');const p=el('span','pill'+(x.steps[s]?' on':''));
        p.style.cursor='pointer';p.title=s;
        p.onclick=()=>{x.steps[s]=!x.steps[s];save();draw(term);};
        td.append(p);tr.append(td);
      });
      const d=steps.filter(s=>x.steps[s]).length;
      const ptd=el('td');
      ptd.innerHTML=`<div style="font-family:var(--mono);font-weight:800;font-size:11.5px">${d}/${steps.length}</div>
        <div class="bar"><i style="width:${(d/steps.length*100).toFixed(0)}%"></i></div>`;
      tr.append(ptd);tb.append(tr);
    });
    t.append(tb);gw.append(t);out.append(gw);
    const lg=el('div','lgd');
    lg.innerHTML=steps.map(s=>`<span><b>${s.split(' ').map(w=>w[0]).join('')}</b> ${s}</span>`).join('');
    out.append(lg);
  };
  q.oninput=debounce(()=>draw(q.value),260);
  draw();
}
