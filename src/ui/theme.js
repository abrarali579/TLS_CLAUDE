/** Light/dark theme, and the colour picked for each account. */
import { D } from '../core/store.js';
import { $ } from '../lib/dom.js';

export function accentFor(label){return (D.settings.paidFromOptions||[]).find(o=>o.label===label)||null;}

export function setTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  $('#ticon').textContent = t==='dark'?'☾':'☀';
  $('#tlabel').textContent = t==='dark'?'Dark':'Light';
  try{localStorage.setItem('tl_theme',t);}catch(e){}
}
