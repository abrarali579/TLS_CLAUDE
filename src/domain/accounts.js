/**
 * Cash, bank and credit accounts.
 *
 * Asset accounts show a balance (in − out). Credit accounts show what is still
 * OWED, which is the opposite direction — mixing the two up is the classic bug
 * here, so both are pinned in test/money.test.js.
 */
import { D } from '../core/store.js';
import { buildStatement } from './statement.js';
import { c, n } from '../lib/format.js';
import { accentFor } from '../ui/theme.js';

export function companyBalances(){
  const names=[...new Set([...D.transactions.map(t=>t.company),...D.payments.map(p=>p.company)])].filter(Boolean);
  return names.map(c=>{const s=buildStatement(c,'','');
    return{company:c,cost:s.totalCost,received:s.totalRec,balance:s.closing};}).sort((a,b)=>a.balance-b.balance);
}

export const ACC_FALLBACK={'IRFAN':'#eab308','ABRAR':'#22c55e'};

export function accMeta(nm){return (D.settings.accounts||[]).find(a=>a.name===nm)||null;}

export function accColor(nm){const m=accMeta(nm);
  return (m&&m.color)||ACC_FALLBACK[nm]||(accentFor(nm)||{}).color||'#64748b';}

export function accountBalances(){
  const led={},moves={},spend={};
  D.ledger.forEach(l=>{led[l.account]=(led[l.account]||0)+n(l.amount);moves[l.account]=(moves[l.account]||0)+1;});
  D.transactions.forEach(t=>{if(!t.paidFrom)return;
    spend[t.paidFrom]=(spend[t.paidFrom]||0)+n(t.expense);moves[t.paidFrom]=(moves[t.paidFrom]||0)+1;});
  // customer receipts credit whichever account they landed in — but skip
  // payments mirrored from a cash-book row (srcLedger set), since that row
  // is already counted in the ledger sum above and would otherwise be
  // added twice into the account balance.
  (D.payments||[]).forEach(p=>{if(!p.account||!n(p.amount)||p.srcLedger)return;
    led[p.account]=(led[p.account]||0)+n(p.amount);moves[p.account]=(moves[p.account]||0)+1;});
  // overheads are paid out of an account too
  (D.expenses||[]).forEach(x=>{if(!x.account||!n(x.amount))return;
    spend[x.account]=(spend[x.account]||0)+n(x.amount);moves[x.account]=(moves[x.account]||0)+1;});

  const defs=(D.settings.accounts||[]).slice();
  // include any account seen in data but not configured
  [...new Set([...Object.keys(led),...Object.keys(spend)])].forEach(nm=>{
    if(!defs.some(a=>a.name===nm)&&!defs.some(a=>a.settle===nm))defs.push({name:nm,type:'asset'});
  });

  return defs.map(a=>{
    const adj=n(a.adjust),sp=n(spend[a.name]);
    let bal,inn,out,kind;
    if(a.type==='credit'){
      const rep=n(led[a.settle||a.name]);
      bal=sp-rep+adj; inn=rep; out=sp; kind='owed';
    } else if(a.type==='tally'){
      bal=n(led[a.name])+adj; inn=n(led[a.name]); out=0; kind='total';
    } else {
      bal=n(led[a.name])-sp+adj; inn=n(led[a.name]); out=sp; kind='balance';
    }
    return{name:a.name,type:a.type||'asset',kind,in:Math.round(inn*100)/100,out:Math.round(out*100)/100,
      adjust:adj,moves:(moves[a.name]||0)+(a.settle?(moves[a.settle]||0):0),
      balance:Math.round(bal*100)/100,color:accColor(a.name)};
  }).sort((a,b)=>Math.abs(b.balance)-Math.abs(a.balance));
}

export function accountNames(){
  return [...new Set([...(D.settings.accounts||[]).map(a=>a.name),
    ...D.transactions.map(t=>t.paidFrom).filter(Boolean)])].sort();
}

export function accSettleNames(){
  return [...new Set([...(D.settings.accounts||[]).map(a=>a.name),
    ...(D.settings.accounts||[]).map(a=>a.settle).filter(Boolean),
    ...D.ledger.map(l=>l.account).filter(Boolean)])].sort();
}

export const PALETTE=['#0d9488','#e11d48','#2563eb','#f97316','#7c3aed','#22c55e','#eab308','#8d6e63','#64748b','#a855f7','#ec4899','#06b6d4'];

export function accountMovements(name){
  const cfg=(D.settings.accounts||[]).find(a=>a.name===name)||{};
  const settle=cfg.settle||name;
  const out=[];
  D.ledger.forEach(l=>{
    if(l.account!==name&&l.account!==settle)return;
    // on a credit card, a ledger entry is a repayment: it reduces what is owed
    out.push({date:l.date||'',kind:cfg.type==='credit'?'Repayment':'Movement',
      who:'',what:l.remark||'—',amount:cfg.type==='credit'?-n(l.amount):n(l.amount)});
  });
  D.transactions.forEach(t=>{
    if(t.paidFrom!==name||!n(t.expense))return;
    out.push({date:t.date||'',kind:'Work expense',who:t.company||'',
      what:`${t.work||''}${t.employee?' — '+t.employee:''}`,
      amount:cfg.type==='credit'?n(t.expense):-n(t.expense)});
  });
  (D.payments||[]).forEach(p=>{
    // a payment mirrored from a cash-book row (srcLedger set) is already
    // represented by that ledger movement above — counting it again here
    // would double the account's balance and history.
    if(p.account!==name||!n(p.amount)||p.srcLedger)return;
    out.push({date:p.date||'',kind:'Payment received',who:p.company||'',
      what:p.remark||'customer receipt',amount:cfg.type==='credit'?-n(p.amount):n(p.amount)});
  });
  (D.expenses||[]).forEach(x=>{
    if(x.account!==name||!n(x.amount))return;
    out.push({date:x.date||'',kind:'Overhead',who:x.category||'',what:x.desc||'—',
      amount:cfg.type==='credit'?n(x.amount):-n(x.amount)});
  });
  out.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  let run=n(cfg.adjust);
  out.forEach(m=>{run+=m.amount;m.balance=Math.round(run*100)/100;});
  return{rows:out,cfg,opening:n(cfg.adjust)};
}
