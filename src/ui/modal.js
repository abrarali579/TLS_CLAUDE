/** The dialog box used by every "are you sure" and every edit form. */
import { el } from '../lib/dom.js';

export function modal(title,body,buttons){
  const ov=el('div','modal-ov');
  const box=el('div','modal glass');
  const h=el('div','modal-h');h.append(el('b',null,title));
  const x=el('button','btn ico','✕');x.onclick=close;h.append(x);
  const b=el('div','modal-b');b.append(body);
  const f=el('div','modal-f');
  (buttons||[{label:'Close'}]).forEach(cfg=>{
    const btn=el('button','btn '+(cfg.cls||''),cfg.label);
    btn.onclick=()=>{if(cfg.fn){if(cfg.fn()===false)return;}close();};
    f.append(btn);
  });
  box.append(h,b,f);ov.append(box);document.body.append(ov);
  requestAnimationFrame(()=>ov.classList.add('on'));
  const first=b.querySelector('input,select');if(first)setTimeout(()=>first.focus(),80);
  function close(){ov.classList.remove('on');setTimeout(()=>ov.remove(),200);document.removeEventListener('keydown',esckey);}
  function esckey(e){if(e.key==='Escape')close();}
  document.addEventListener('keydown',esckey);
  ov.onclick=e=>{if(e.target===ov)close();};
  return{close};
}
