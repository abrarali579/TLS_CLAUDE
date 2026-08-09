/**
 * Pricing: what a line item costs.
 *
 * Two rules worth protecting, both pinned in test/rates.test.js:
 *   - a service template's own price always beats the Rates Master
 *   - when nothing matches the answer is 0 with src 'none' — never a guess
 */
import { n } from '../lib/format.js';
import { D } from '../core/store.js';

let RATE_MAP=null;

export function rateMap(){
  if(RATE_MAP)return RATE_MAP;
  RATE_MAP={};
  (D.rates||[]).forEach(r=>{
    const k=String(r.item||'').trim().toUpperCase();
    if(k&&!RATE_MAP[k])RATE_MAP[k]={rate:n(r.rate),fee:n(r.fee),src:'master'};
  });
  return RATE_MAP;
}

export function rateBust(){RATE_MAP=null;}

export function findRate(desc){
  const raw=String(desc||'').trim();
  if(!raw)return null;
  const M=rateMap();
  const k=raw.toUpperCase();
  if(M[k])return M[k];
  const norm=s=>s.toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
  const nk=norm(raw.split(/[-–—]\s*[^\x00-\x7F]/)[0]);
  if(!nk)return null;
  for(const key in M){if(norm(key)===nk)return M[key];}
  return null;
}

export function invoiceRate(desc,templateRate){
  if(n(templateRate))return{rate:n(templateRate),src:'template'};
  const r=findRate(desc);
  if(r)return{rate:r.rate,src:'master'};
  return{rate:0,src:'none'};
}
