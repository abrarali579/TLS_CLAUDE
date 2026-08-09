/** Form building blocks: labelled fields, inputs, pill toggles, buttons. */
import { el } from '../lib/dom.js';

export function field(label,node){const w=el('div','f');if(label)w.append(el('label','lb',label));w.append(node);return w;}

export function input(val,type,ph){const i=el('input','fld');i.type=type||'text';i.value=val??'';if(ph)i.placeholder=ph;return i;}

export function pillControl(cls){
  const s=el('span',cls||'pf');
  s.tabIndex=0;
  Object.defineProperty(s,'value',{
    get(){return s.dataset.val||'';},
    set(v){s.dataset.val=v==null?'':String(v);s.textContent=s.dataset.val||'—';},
    configurable:true
  });
  s.select=()=>{};
  s.value='';
  return s;
}

export function mkBtn(parent,label,cls,fn){const b=el('button','btn '+(cls||''),label);b.onclick=fn;parent.append(b);return b;}
