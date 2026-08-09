/** Scheduled entries — rent, salaries, renewals — and posting them when due. */
import { audit, save } from '../core/persist.js';
import { D } from '../core/store.js';
import { today } from '../lib/dates.js';
import { m0, n, uid } from '../lib/format.js';

export const FREQ={
  weekly:{label:'Every week',days:7},
  fortnightly:{label:'Every 2 weeks',days:14},
  monthly:{label:'Every month',months:1},
  quarterly:{label:'Every 3 months',months:3},
  yearly:{label:'Every year',months:12}
};

export function newRecurring(){
  return{id:uid(),active:true,kind:'expense',label:'',category:'',
    amount:0,account:'',freq:'monthly',next:today(),lastPosted:'',posted:0};
}

export function advanceDate(iso,freq){
  const f=FREQ[freq]||FREQ.monthly;
  const d=new Date(iso+'T00:00:00');
  if(f.days)d.setDate(d.getDate()+f.days);
  else{
    const day=d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth()+f.months);
    // clamp to the last day of a shorter month
    const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
    d.setDate(Math.min(day,last));
  }
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function dueRecurring(ref){
  ref=ref||today();
  return (D.recurring||[]).filter(r=>r.active&&r.next&&r.next<=ref&&n(r.amount));
}

export function postRecurring(r,onDate){
  const date=onDate||r.next||today();
  if(r.kind==='expense'){
    D.expenses=D.expenses||[];
    D.expenses.push({id:uid(),date,category:r.category||'MISCELLANEOUS',
      desc:r.label||'Recurring',amount:n(r.amount),account:r.account||'',
      srcRecurring:r.id});
  } else {
    D.ledger.push({id:uid(),date,account:r.account||'COUNTER CASH',
      amount:n(r.amount),remark:r.label||'Recurring',company:'',
      srcRecurring:r.id});
  }
  r.lastPosted=date;
  r.posted=(r.posted||0)+1;
  r.next=advanceDate(date,r.freq);
  audit('post','recurring',`${r.label} ${m0(r.amount)}`);
  return r.next;
}

export function postAllDue(){
  let count=0;
  // guard is per-schedule, not shared — otherwise one badly overdue schedule
  // could exhaust the whole safety cap and leave later schedules half-caught-up
  // with no error shown.
  dueRecurring().forEach(r=>{
    let guard=0;
    while(r.active&&r.next<=today()&&guard++<400){postRecurring(r);count++;}
  });
  if(count)save();
  return count;
}
