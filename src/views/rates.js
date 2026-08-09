/** Rates Master. */
import { audit, save } from '../core/persist.js';
import { D } from '../core/store.js';
import { rateBust } from '../domain/rates.js';
import { $, debounce, el } from '../lib/dom.js';
import { c, esc, m0, m2, n } from '../lib/format.js';
import { field, input, mkBtn } from '../ui/forms.js';
import { modal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { gw, kpiRow } from '../ui/widgets.js';

export function rateDialog(existing){
  const isNew=!existing;
  const r=existing||{item:'',rate:0,fee:0};
  const body=el('div'),g=el('div','invhead');
  const it=input(r.item,'text','e.g. EMIRATES ID');
  const rc=input(r.rate||'','text','what the client pays');
  const fe=input(r.fee||'','text','what it costs us');
  g.append(field('Work Item',it),field('Received (client price)',rc),field('Expense (our cost)',fe));
  body.append(g);
  const live=el('div','hint');
  const upd=()=>{const p=n(rc.value)-n(fe.value);
    live.innerHTML=`Profit per job: <b style="color:${p<0?'var(--neg)':'var(--pos)'};font-size:14px">${m2(p)}</b>`+
      (p<0?' &nbsp;<span class="badge bal">below cost</span>':'');};
  rc.oninput=upd;fe.oninput=upd;upd();
  body.append(live);
  body.append(el('div','hint','Data Entry uses these two figures to fill a row automatically when you pick this work item.'));
  modal(isNew?'Add Work Item':'Edit Work Item',body,[
    {label:'Cancel'},
    ...(isNew?[]:[{label:'Delete',cls:'d',fn:()=>{
      D.rates=D.rates.filter(x=>x!==existing);rateBust();
      audit('remove','work item',existing.item);save();renderRates();toast('Deleted');}}]),
    {label:isNew?'Add Item':'Save',cls:'p',fn:()=>{
      const v=it.value.trim();
      if(!v){toast('Work item name is required',1);return false;}
      const clash=D.rates.find(x=>x!==existing&&x.item.toUpperCase()===v.toUpperCase());
      if(clash){toast('That work item already exists',1);return false;}
      const rec={item:v,rate:n(rc.value),fee:n(fe.value)};
      if(isNew)D.rates.push(rec);else Object.assign(existing,rec);
      rateBust();audit(isNew?'add':'edit','work item',v);save();renderRates();
      toast(`${v} · received ${m0(rec.rate)} − expense ${m0(rec.fee)} = ${m0(rec.rate-rec.fee)}`);
    }}
  ]);
}

export function renderRates(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'+ Add Work Item','p',()=>rateDialog(null));
  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const avgP=D.rates.reduce((a,r)=>a+(n(r.rate)-n(r.fee)),0)/Math.max(1,D.rates.length);
  wrap.append(kpiRow([
    {t:'Work Items',v:D.rates.length,s:'in rates master'},
    {t:'Avg Received',v:m0(D.rates.reduce((a,r)=>a+n(r.rate),0)/Math.max(1,D.rates.length)),s:'charged to client'},
    {t:'Avg Expense',v:m0(D.rates.reduce((a,r)=>a+n(r.fee),0)/Math.max(1,D.rates.length)),s:'our cost'},
    {t:'Avg Profit',v:m0(avgP),s:'per item',c:avgP<0?'neg':'pos',a:1}
  ]));
  const loss=D.rates.filter(r=>n(r.rate)-n(r.fee)<0);
  if(loss.length){
    const nb=el('div','note w');
    nb.innerHTML=`<b>⚠ ${loss.length} item${loss.length===1?'':'s'} priced below cost</b> — `+
      loss.slice(0,4).map(r=>`${esc(r.item)} (received ${m0(r.rate)}, expense ${m0(r.fee)})`).join(', ')+
      `. Auto-fill will use these figures as-is, so they lose money on every entry.`;
    wrap.append(nb);
  }
  const c=el('div','glass card noprint');
  const q=input('','text','search work item…');c.append(q);wrap.append(c);
  const out=el('div');wrap.append(out);
  const draw=(term='')=>{
    out.innerHTML='';
    const list=D.rates.filter(r=>!term||r.item.toUpperCase().includes(term.toUpperCase()))
      .sort((a,b)=>a.item.localeCompare(b.item));
    const gw=el('div','glass gridwrap');const t=el('table','grid');
    t.innerHTML=`<thead><tr><th class="rn">#</th><th>Work Item</th>
      <th class="c" style="width:120px">Received</th><th class="c" style="width:120px">Expense</th>
      <th class="c" style="width:120px">Profit</th><th style="width:52px"></th></tr></thead>`;
    const tb=el('tbody');
    list.slice(0,600).forEach((r,i)=>{
      const tr=el('tr');tr.append(el('td','rn',String(i+1)));
      const mk=(key,kind)=>{const td=el('td',kind==='num'?'num':null);const inp=el('input','cell');
        inp.value=r[key]??'';if(kind==='num')inp.inputMode='decimal';
        inp.addEventListener('input',()=>{r[key]=kind==='num'?n(inp.value):inp.value;
          paintTot();rateBust();save();});
        td.append(inp);return td;};
      tr.append(mk('item'),mk('rate','num'),mk('fee','num'));
      const ttd=el('td','num');const tot=el('div');
      tot.style.cssText='padding:8px;text-align:center;font-family:var(--mono);font-weight:800';
      const paintTot=()=>{const p=n(r.rate)-n(r.fee);
        tot.textContent=m2(p);tot.style.color=p<0?'var(--neg)':'var(--pos)';};
      paintTot();ttd.append(tot);tr.append(ttd);
      const act=el('td','act');
      const e=el('button','del','Edit');e.title='Edit this work item';e.tabIndex=-1;
      e.style.cssText='font-size:10.5px;font-weight:800;color:var(--brand3);opacity:.75';
      e.onclick=()=>rateDialog(r);
      act.append(e);tr.append(act);tb.append(tr);
    });
    t.append(tb);gw.append(t);out.append(gw);
    out.append(el('div','hint','Profit = Received − Expense. Data Entry uses these figures to auto-fill a row when you choose a Work item — e.g. EMIRATES ID fills Received 390, Expense 370, Profit 20.'));
  };
  q.oninput=debounce(()=>draw(q.value),260);
  draw();
}
