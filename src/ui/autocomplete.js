/**
 * The suggestion list that drops down under company, employee and item fields.
 * Includes the "create this value" row, so a new name can be added without
 * leaving the sheet.
 */
import { $, el } from '../lib/dom.js';
import { esc } from '../lib/format.js';

export const AC_ADD='\u0000ADD';

export let acT=null,acI=[],acX=-1,acAdd=null;

export function acPlace(){
  if(!acT)return;
  const b=$('#ac'),r=acT.getBoundingClientRect();
  // anchor scrolled out of sight → close
  if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth){acHide();return;}
  const w=Math.max(r.width,230);
  b.style.width=w+'px';
  b.style.left=Math.max(8,Math.min(r.left,innerWidth-w-14))+'px';
  const h=b.offsetHeight;
  b.style.top=(r.bottom+h>innerHeight-10 && r.top-h-4>0 ? r.top-h-4 : r.bottom+4)+'px';
}

export function acShow(inp,list,showAll){
  acT=inp;
  const raw=inp.value.trim();
  const q=showAll?'':raw.toUpperCase();
  acI=list.filter(x=>x&&String(x).toUpperCase().includes(q)).slice(0,60);
  // offer to create the typed value when it is genuinely new
  acAdd=null;
  const opts=inp._acOpts||{};
  if(opts.onAdd&&raw&&!list.some(x=>String(x).trim().toUpperCase()===raw.toUpperCase())){
    acAdd=raw;acI.push(AC_ADD);           // always last, after any partial matches
  }
  const b=$('#ac');
  if(!acI.length){acHide();return;}
  b.innerHTML='';
  // preselect the add row only when nothing else matched
  acX=(acAdd&&acI.length===1)?0:-1;
  acI.forEach((x,i)=>{
    const isAdd=x===AC_ADD;
    const d=el('div',isAdd?'acadd':null);
    if(isAdd){d.innerHTML=`<b>+ Add</b> "${esc(acAdd)}"<span class="k">Enter</span>`;}
    else d.textContent=x;
    if(i===acX)d.classList.add('sel');
    d.onmousedown=e=>{e.preventDefault();acPick(i);};
    b.appendChild(d);
  });
  b.style.display='block';
  acPlace();
}

export function acHide(){$('#ac').style.display='none';acT=null;acI=[];acX=-1;acAdd=null;}

export function acOpen(){return $('#ac').style.display==='block';}

export let acPicking=false;

export function acPick(i){
  if(!acT||!acI[i])return;
  const inp=acT;
  const isAdd=acI[i]===AC_ADD;
  const val=isAdd?acAdd:acI[i];
  const opts=inp._acOpts||{};
  inp.value=val;
  acHide();
  if(isAdd&&opts.onAdd)opts.onAdd(val,inp);
  /* The input event below is what the row handlers listen to, but it also
     reaches this field's own search handler — which would reopen the panel
     we just closed. Suppress that one pass. */
  acPicking=true;
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  inp.dispatchEvent(new Event('change',{bubbles:true}));
  acPicking=false;
  acHide();
  if(inp._acPick)inp._acPick(val,inp);
}

export function acNav(d){
  if(!acI.length)return;
  acX = acX<0 ? (d>0?0:acI.length-1) : (acX+d+acI.length)%acI.length;
  [...$('#ac').children].forEach((c,i)=>c.classList.toggle('sel',i===acX));
  const sel=$('#ac').children[acX];
  if(sel&&sel.scrollIntoView)try{sel.scrollIntoView({block:'nearest'});}catch(e){}
}

export function acKeys(ev){
  if(!acOpen())return false;
  switch(ev.key){
    case 'ArrowDown': ev.preventDefault();ev.stopPropagation();acNav(1);return true;
    case 'ArrowUp':   ev.preventDefault();ev.stopPropagation();acNav(-1);return true;
    case 'Enter':
    case 'Tab':
      if(acX>=0){ev.preventDefault();ev.stopPropagation();acPick(acX);return true;}
      if(acAdd){                                   // typed a new name, nothing highlighted
        ev.preventDefault();ev.stopPropagation();
        acPick(acI.indexOf(AC_ADD));return true;
      }
      acHide();return false;
    case 'Escape':    ev.preventDefault();acHide();return true;
    default: return false;
  }
}

export function bindAC(inp,listFn,opts){
  opts=opts||{};
  inp.setAttribute('autocomplete','off');
  inp._acPick=opts.onPick||null;
  inp._acOpts=opts;
  inp.addEventListener('input',()=>{if(acPicking)return;acShow(inp,listFn());});
  /* Deliberately NOT opening on focus — arrowing through a grid would otherwise
     throw a wall of names over the sheet. The list opens when you type, press
     Down, or click the field. */
  inp.addEventListener('focus',()=>{if(opts.fullList)inp.select();});
  inp.addEventListener('click',()=>{
    if(acOpen()&&acT===inp){acHide();return;}
    if(opts.fullList)inp.select();
    acShow(inp,listFn(),!!opts.fullList||!inp.value.trim());
  });
  inp.addEventListener('blur',()=>setTimeout(()=>{if(acT===inp)acHide();},150));
  inp.addEventListener('keydown',ev=>{
    if(acKeys(ev))return;
    /* Alt+Down (or plain Down on a picker field) opens the list on demand */
    if(!acOpen()&&ev.key==='ArrowDown'&&(opts.fullList||ev.altKey)){
      ev.preventDefault();ev.stopPropagation();
      if(opts.fullList)inp.select();
      acShow(inp,listFn(),true);acNav(1);return;
    }
    if(opts.onKey)opts.onKey(ev);
  });
}
