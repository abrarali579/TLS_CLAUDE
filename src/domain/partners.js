/**
 * Partner profit split: gross profit less office expenses and reserves, then
 * shared out, minus whatever each partner has already drawn.
 */
import { D } from '../core/store.js';
import { n } from '../lib/format.js';

export function partnerData(){
  const parts=D.settings.partners||[];
  const tx=D.transactions;
  const grossProfit=tx.reduce((a,t)=>a+n(t.profit),0);
  const office=D.ledger.filter(l=>l.account==='OFFICE EXPENSES').reduce((a,l)=>a+n(l.amount),0);
  const reserves=D.ledger.filter(l=>l.account==='RESERVES').reduce((a,l)=>a+n(l.amount),0);
  const distributable=Math.round((grossProfit-office-reserves)*100)/100;
  const rows=parts.map(p=>{
    const drawn=D.ledger.filter(l=>l.account===p.drawAccount).reduce((a,l)=>a+n(l.amount),0);
    const share=Math.round(distributable*n(p.share)*100)/100;
    return{...p,share:n(p.share),entitled:share,drawn:Math.round(drawn*100)/100,
      outstanding:Math.round((share-drawn)*100)/100};
  });
  return{grossProfit,office,reserves,distributable,rows,
    totalShare:rows.reduce((a,r)=>a+r.share,0)};
}
