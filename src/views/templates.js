/** Service Templates. */
import { audit, save } from '../core/persist.js';
import { switchView } from '../core/router.js';
import { D } from '../core/store.js';
import { blankInvoice, nextInvNo } from '../domain/invoices.js';
import { itemNames, serviceTypes } from '../domain/lists.js';
import { findRate } from '../domain/rates.js';
import { $, debounce, el } from '../lib/dom.js';
import { c, esc, m0, m2, n } from '../lib/format.js';
import { bindAC } from '../ui/autocomplete.js';
import { field, input, mkBtn } from '../ui/forms.js';
import { focusCell, gridKey } from '../ui/grid.js';
import { modal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { gw, kpiRow } from '../ui/widgets.js';
import { INV, setINV } from './invoice.js';

export function templateDialog(name){
  const isNew=!name;
  const lines=isNew?[{sr:1,desc:'',qty:1,rate:0}]
    :D.taskTemplates.filter(t=>t.serviceType===name).sort((a,b)=>(a.sr||0)-(b.sr||0))
      .map(t=>({sr:t.sr,desc:t.desc,qty:n(t.qty)||1,rate:n(t.rate)}));

  const body=el('div');
  const nm=input(name||'','text','e.g. HIGH PROFESSION - INSIDE COUNTRY');
  body.append(field('Service Type Name',nm));

  const tot=el('div','hint');
  const gw=el('div','glass gridwrap');
  gw.style.cssText='max-height:44vh;margin-top:12px';gw.id='tplgrid';
  const t=el('table','grid');
  t.innerHTML=`<thead><tr><th class="rn">#</th><th>Description</th>
    <th class="c" style="width:64px">Qty</th><th class="c" style="width:96px">Rate</th>
    <th class="c" style="width:100px">Amount</th><th style="width:34px"></th></tr></thead>`;
  const tb=el('tbody');t.append(tb);gw.append(t);body.append(gw);

  const foot=el('div');foot.style.cssText='display:flex;gap:9px;align-items:center;margin-top:10px';
  const addb=el('button','btn sm','+ Add Line');
  addb.onclick=()=>{lines.push({sr:lines.length+1,desc:'',qty:1,rate:0});draw();
    requestAnimationFrame(()=>focusCell(gw,lines.length-1,1));};
  foot.append(addb,tot);body.append(foot);

  const draw=()=>{
    tb.innerHTML='';
    lines.forEach((L,i)=>{
      const tr=el('tr');
      tr.append(el('td','rn',String(i+1)));
      const mk=(key,kind,listFn)=>{
        const td=el('td',kind==='num'?'num':null);
        const inp=el('input','cell');inp.value=L[key]??'';
        inp.dataset.nav='1';inp.dataset.r=i;inp.dataset.c=({desc:1,qty:2,rate:3})[key];
        if(kind==='num'){inp.inputMode='decimal';inp.style.textAlign='center';}
        if(listFn)bindAC(inp,listFn,{onPick:()=>{
          if(!n(L.rate)){const hit=findRate(L.desc);if(hit){L.rate=hit.rate;draw();}}
        }});
        inp.addEventListener('input',()=>{
          L[key]=kind==='num'?n(inp.value):inp.value;
          amt.textContent=m2(n(L.qty)*n(L.rate));
          sum();});
        td.append(inp);return td;};
      tr.append(mk('desc','txt',itemNames),mk('qty','num'),mk('rate','num'));
      const atd=el('td','num');const amt=el('div');
      amt.style.cssText='padding:8px;text-align:center;font-family:var(--mono);font-weight:700;font-size:12.2px';
      amt.textContent=m2(n(L.qty)*n(L.rate));atd.append(amt);tr.append(atd);
      const act=el('td','act');const d=el('button','del','×');d.tabIndex=-1;
      d.onclick=()=>{lines.splice(i,1);draw();};
      act.append(d);tr.append(act);
      tb.append(tr);
    });
    gw.onkeydown=ev=>gridKey(ev,gw,{onOverflow:()=>{lines.push({sr:lines.length+1,desc:'',qty:1,rate:0});draw();
      requestAnimationFrame(()=>focusCell(gw,lines.length-1,1));}});
    sum();
  };
  const sum=()=>{
    const v=lines.reduce((a,L)=>a+n(L.qty)*n(L.rate),0);
    tot.innerHTML=`<b style="color:var(--ink);font-size:14px">AED ${m2(v)}</b> &nbsp;package value · ${lines.length} lines`;
  };
  draw();

  modal(isNew?'New Service Template':`Edit Template — ${name}`,body,[
    {label:'Cancel'},
    ...(isNew?[]:[{label:'Delete Template',cls:'d',fn:()=>{
      if(!confirm(`Delete the "${name}" template and all its lines?`))return false;
      D.taskTemplates=D.taskTemplates.filter(t=>t.serviceType!==name);
      audit('remove','service template',name);save();renderTemplates();toast('Template deleted');
    }}]),
    {label:isNew?'Create Template':'Save Template',cls:'p',fn:()=>{
      const v=nm.value.trim().toUpperCase();
      if(!v){toast('Template name is required',1);return false;}
      const kept=lines.filter(L=>L.desc.trim());
      if(!kept.length){toast('Add at least one line',1);return false;}
      if(isNew&&D.taskTemplates.some(t=>t.serviceType===v)){toast('That template already exists',1);return false;}
      D.taskTemplates=D.taskTemplates.filter(t=>t.serviceType!==name&&t.serviceType!==v);
      kept.forEach((L,i)=>D.taskTemplates.push({serviceType:v,sr:i+1,desc:L.desc.trim(),
        qty:n(L.qty)||1,rate:n(L.rate)}));
      audit(isNew?'add':'edit','service template',v);save();renderTemplates();
      toast(`${v} saved · ${kept.length} lines`);
    }}
  ]);
}

export function renderTemplates(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'+ New Template','p',()=>templateDialog(null));
  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const types=serviceTypes();
  wrap.append(kpiRow([
    {t:'Service Templates',v:types.length,s:'packages'},
    {t:'Template Lines',v:D.taskTemplates.length,s:'total rows'},
    {t:'Avg Lines',v:(D.taskTemplates.length/Math.max(1,types.length)).toFixed(1),s:'per package'},
    {t:'Avg Package Value',v:m0(D.taskTemplates.reduce((a,t)=>a+n(t.qty)*n(t.rate),0)/Math.max(1,types.length)),s:'AED govt cost',a:1}
  ]));
  const c=el('div','glass card noprint');
  const q=input('','text','search service type or line description…');c.append(q);wrap.append(c);
  const out=el('div');wrap.append(out);
  const draw=(term='')=>{
    out.innerHTML='';
    const shown=types.filter(t=>{
      if(!term)return true;
      const u=term.toUpperCase();
      return t.toUpperCase().includes(u)||D.taskTemplates.some(x=>x.serviceType===t&&x.desc.toUpperCase().includes(u));
    });
    shown.slice(0,60).forEach(t=>{
      const lines=D.taskTemplates.filter(x=>x.serviceType===t).sort((a,b)=>(a.sr||0)-(b.sr||0));
      const tot=lines.reduce((a,x)=>a+n(x.qty)*n(x.rate),0);
      const card=el('div','glass card');
      const h=el('div');h.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:9px';
      h.innerHTML=`<div style="flex:1"><b style="font-size:13.5px">${esc(t)}</b>
        <div class="hint" style="padding:2px 0 0">${lines.length} lines · govt cost AED ${m0(tot)}</div></div>`;
      const eb=el('button','btn sm tpledit','Edit');
      eb.title='Edit this template';
      eb.onclick=()=>templateDialog(t);
      const b=el('button','btn sm p','Use in Invoice');
      b.onclick=()=>{setINV(blankInvoice());INV.ServiceType=t;INV.InvoiceNo=nextInvNo(INV.InvoiceDate,INV);
        INV.items=lines.map(x=>({desc:x.desc,qty:n(x.qty)||1,rate:n(x.rate),src:'template'}));switchView('invoice');};
      h.append(eb,b);card.append(h);
      const tb=el('table','list');
      tb.innerHTML='<thead><tr><th style="width:40px">Sr</th><th>Description</th><th style="width:56px;text-align:center">Qty</th><th style="width:86px;text-align:right">Rate</th><th style="width:96px;text-align:right">Amount</th></tr></thead>';
      const body=el('tbody');
      lines.forEach(x=>{const tr=el('tr');
        tr.innerHTML=`<td class="c">${x.sr}</td><td>${esc(x.desc)}</td><td class="c">${n(x.qty)}</td>
          <td class="n">${m2(x.rate)}</td><td class="n">${m2(n(x.qty)*n(x.rate))}</td>`;body.append(tr);});
      tb.append(body);card.append(tb);out.append(card);
    });
    if(!shown.length)out.innerHTML='<div class="glass card"><div class="empty"><div class="e">∅</div>No templates match.</div></div>';
  };
  q.oninput=debounce(()=>draw(q.value),300);
  draw();
}
