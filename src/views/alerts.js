/** Alerts Centre. */
import { switchView } from '../core/router.js';
import { allAlerts } from '../domain/alerts.js';
import { $, el } from '../lib/dom.js';
import { esc } from '../lib/format.js';
import { kpiRow } from '../ui/widgets.js';

export function renderAlerts(){
  const T=$('#tools');T.innerHTML='';
  const A=allAlerts();
  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  wrap.append(kpiRow([
    {t:'Total Alerts',v:A.length,s:'needing attention',a:1},
    {t:'Urgent',v:A.filter(x=>x.sev==='high').length,s:'act today',c:'neg'},
    {t:'Soon',v:A.filter(x=>x.sev==='med').length,s:'this month',c:'gold'},
    {t:'Informational',v:A.filter(x=>x.sev==='low').length,s:'when you can'}
  ]));
  if(!A.length){
    wrap.innerHTML+='<div class="glass card"><div class="empty"><div class="e">✓</div>Nothing needs your attention. Everything is up to date.</div></div>';
    return;
  }
  const LBL={high:['Urgent','bal'],med:['Soon','w'],low:['Info','i']};
  ['high','med','low'].forEach(sev=>{
    const list=A.filter(x=>x.sev===sev);
    if(!list.length)return;
    const card=el('div','glass card');
    const h=el('h3',null,`${LBL[sev][0]} · ${list.length}`);card.append(h);
    list.slice(0,60).forEach(x=>{
      const r=el('div','rankrow');r.style.cursor='pointer';
      r.innerHTML=`<div class="i">${x.i}</div>
        <div class="nm">${esc(x.t)}<div style="font-size:10.5px;color:var(--ink-3)">${esc(x.d)}</div></div>
        <div class="v"><span class="badge ${LBL[sev][1]}">${LBL[sev][0]}</span></div>`;
      r.onclick=()=>x.act?x.act():switchView(x.go);
      card.append(r);
    });
    if(list.length>60)card.append(el('div','hint',`+${list.length-60} more`));
    wrap.append(card);
  });
}
