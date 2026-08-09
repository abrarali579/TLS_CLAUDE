/**
 * The router: which screen is showing, and the sidebar that switches between
 * them.
 *
 * The screen list lives here rather than being imported, and main.js hands it
 * over with setNav() at startup. That one indirection is what lets a screen
 * call switchView() without the router having to import every screen back —
 * which would be a circular import.
 */
import { $, $$, el } from '../lib/dom.js';
import { esc } from '../lib/format.js';
import { acHide } from '../ui/autocomplete.js';

let NAV = [];

/** Hand the router the screen list. Called once, at startup. */
export function setNav(nav) {
  NAV = nav || [];
  return NAV;
}

/** The screen list, for anything that needs to walk it. */
export function getNav() {
  return NAV;
}

export function switchView(v){
  acHide();
  const sb=$('#subbar');if(sb)sb.innerHTML='';   // each view owns its own sub-bar
  document.body.classList.remove('nobar');       // Data Entry re-adds this
  const item=NAV.find(x=>x.v===v)||NAV.find(x=>x.v);
  if(!item)return;
  $$('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.v===item.v));
  $$('#mobilebar button').forEach(b=>b.classList.toggle('on',b.dataset.v===item.v));
  $('#vtitle').textContent=item.t;
  $('#vsub').textContent='· '+item.s;
  try{item.f();}catch(e){
    console.error(e);
    $('#view').innerHTML=`<div class="glass card"><div class="empty"><div class="e">⚠</div>
      Something went wrong rendering this view.<br><span style="font-size:11px">${esc(e.message)}</span></div></div>`;
  }
  $('#view').scrollTop=0;
}

export function buildNav(){
  const nav=$('#nav');nav.innerHTML='';
  NAV.forEach(x=>{
    if(x.g){nav.append(el('div','ngrp',x.g));return;}
    const a=el('a');a.dataset.v=x.v;
    a.append(el('span','ic',x.i));a.append(el('span',null,x.l));
    if(x.badge){try{const c=x.badge();if(c)a.append(el('span','tag',String(c)));}catch(e){}}
    a.onclick=()=>switchView(x.v);
    nav.append(a);
  });
}

export function closeNav(){document.body.classList.remove('navopen');$('#scrim').classList.remove('on');}
