/**
 * The smallest possible DOM helpers, used by every screen.
 *   $('#id')            one element
 *   $$('.cls')          all of them, as a real array
 *   el('div','cls','x') create an element in one line
 *   debounce(fn, ms)    run fn only once things settle down
 */
export const $=s=>document.querySelector(s);

export const $$=s=>[...document.querySelectorAll(s)];

export function el(t,c,x){const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e;}

export function debounce(fn,ms){let h;return(...a)=>{clearTimeout(h);h=setTimeout(()=>fn(...a),ms||250);};}
