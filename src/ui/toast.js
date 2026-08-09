/**
 * The small message that slides in at the bottom of the screen.
 * toastUndo() adds an Undo button — use it for anything destructive.
 */
import { $, el } from '../lib/dom.js';

export function toast(msg,err){
  const t=$('#toast');$('#tmsg').textContent=msg;t.classList.toggle('err',!!err);
  const u=$('#tundo');if(u)u.remove();
  t.classList.add('on');clearTimeout(toast._x);toast._x=setTimeout(()=>t.classList.remove('on'),2200);
}

export function toastUndo(msg,undoFn,ms){
  const t=$('#toast');$('#tmsg').textContent=msg;t.classList.remove('err');
  const old=$('#tundo');if(old)old.remove();
  const b=el('button',null,'Undo');b.id='tundo';
  b.style.cssText='margin-left:4px;border:1px solid var(--stroke-2);background:transparent;color:var(--brand2);'+
    'font-weight:800;font-size:11.5px;padding:3px 10px;border-radius:99px;cursor:pointer;pointer-events:auto';
  b.onclick=()=>{undoFn();b.remove();t.classList.remove('on');};
  t.append(b);
  t.style.pointerEvents='auto';
  t.classList.add('on');
  clearTimeout(toast._x);
  toast._x=setTimeout(()=>{t.classList.remove('on');t.style.pointerEvents='none';b.remove();},ms||5000);
}
