/**
 * The shape of a row in each sheet, and how to tell a genuinely blank one from
 * a half-typed one. The isBlank* checks stop empty spare rows being saved.
 */
import { today } from '../lib/dates.js';
import { n, uid } from '../lib/format.js';

export const SPARE=5;

export const isBlankTx=r=>!r.company&&!r.employee&&!r.work&&!n(r.received)&&!n(r.expense)&&!r.paidFrom;

export function newTx(){return{id:uid(),date:today(),company:'',employee:'',work:'',
  received:0,expense:0,profit:0,paidFrom:'',_s:Date.now()+Math.random()};}

export const COL={date:1,company:2,employee:3,work:4,received:5,expense:6,profit:7,paidFrom:8};

export const isBlankExp=x=>!x.category&&!x.desc&&!n(x.amount)&&!x.account;

export function newExp(){return{id:uid(),date:today(),category:'',desc:'',amount:0,account:''};}

export function monthKey(iso){return String(iso||'').slice(0,7);}

export const isBlankCB=l=>!n(l.amount)&&!l.remark;

export function newCB(account){return{id:uid(),date:today(),account,amount:0,remark:'',company:''};}

export const isBlankPay=p=>!p.company&&!n(p.amount)&&!p.remark&&!p.account;

export function newPay(){return{date:today(),amount:0,company:'',account:'',remark:''};}
