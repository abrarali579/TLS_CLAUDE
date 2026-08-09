/**
 * Numbers, money and text escaping.
 * Pure functions — no DOM, no app state, trivially testable on their own.
 */

export const n=v=>{if(v===''||v==null)return 0;const x=Number(String(v).replace(/,/g,'').trim());return isNaN(x)?0:x;};
export const m0=v=>Math.round(n(v)).toLocaleString('en-US');
export const m2=v=>n(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
export const uid=()=>'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
export const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
