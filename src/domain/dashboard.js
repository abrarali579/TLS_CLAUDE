/** Date ranges and trend lines behind the dashboard. */
import { D } from '../core/store.js';
import { isBlankTx } from './rows.js';
import { MON, daysAgo, fmtDate } from '../lib/dates.js';

export let DR=0;

export let AF=0;

export function inRange(iso){
  if(!DR)return true;
  return iso && iso>=daysAgo(DR);
}

export function autoRange(){
  if(!DR)return false;
  const has=D.transactions.some(t=>t.date&&!isBlankTx(t)&&inRange(t.date));
  if(!has){DR=0;return true;}
  return false;
}

export function trendPoints(map){
  const days=Object.keys(map).sort();
  if(days.length<=45)return days.map(d=>({d:fmtDate(d),v:map[d],key:d}));
  const byMonth={};
  days.forEach(d=>{const k=d.slice(0,7);byMonth[k]=(byMonth[k]||0)+map[d];});
  return Object.keys(byMonth).sort().map(k=>{
    const[y,mo]=k.split('-');
    return{d:`${MON[+mo-1]} ${y}`,v:byMonth[k],key:k};
  });
}

export function dayspan(){
  const ds=D.transactions.map(t=>t.date).filter(Boolean).sort();
  if(ds.length<2)return 1;
  return Math.max(1,(new Date(ds[ds.length-1])-new Date(ds[0]))/864e5);
}

/** Replace DR — imported bindings cannot be assigned directly. */
export function setDR(v) {
  DR = v;
  return DR;
}

/** Replace AF — imported bindings cannot be assigned directly. */
export function setAF(v) {
  AF = v;
  return AF;
}
