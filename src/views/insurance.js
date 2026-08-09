/** Insurance Data. */
import { D } from '../core/store.js';
import { insuranceSoon } from '../domain/alerts.js';
import { csv } from '../lib/csv.js';
import { fmtDate, today } from '../lib/dates.js';
import { $ } from '../lib/dom.js';
import { esc, m2 } from '../lib/format.js';
import { dl } from '../ui/download.js';
import { mkBtn } from '../ui/forms.js';
import { listView } from '../ui/widgets.js';

export function renderInsurance(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'↓ CSV','',()=>dl(new Blob([csv([['COMPANY','WORKER','EID','COVERAGE','INCEPTION','EXPIRY','PREMIUM'],
    ...D.insurance.map(x=>[x.company,x.worker,x.eid,x.coverage,x.inception,x.expiry,x.total])])],
    {type:'text/csv'}),`insurance-${today()}.csv`));

  const s30=insuranceSoon(30),s3=insuranceSoon(3);
  const expired=D.insurance.filter(x=>x.expiry&&new Date(x.expiry)<new Date());
  listView([
    {t:'Company',k:'company',f:r=>`<b>${esc(r.company)}</b>`},
    {t:'Worker',k:'worker'},
    {t:'EID / UID',k:'eid',w:'150px',cls:'n'},
    {t:'Coverage',k:'coverage',w:'86px'},
    {t:'Inception',w:'110px',f:r=>fmtDate(r.inception)},
    {t:'Expiry',w:'128px',f:r=>{
      const d=r.expiry?(new Date(r.expiry)-new Date())/864e5:9999;
      const col=d<0?'var(--neg)':d<=30?'var(--warn)':'var(--ink)';
      const tag=d<0?'<span class="badge bal" style="margin-left:5px">expired</span>':
        d<=30?`<span class="badge w" style="margin-left:5px">${Math.ceil(d)}d</span>`:'';
      return `<span style="color:${col};font-weight:${d<=30?700:500}">${fmtDate(r.expiry)}</span>${tag}`;}},
    {t:'Premium',k:'total',w:'100px',cls:'n',f:r=>m2(r.total)}
  ],D.insurance,['company','worker','eid'],{
    placeholder:'search company, worker or EID…',
    kpis:[{t:'Policies',v:D.insurance.length,s:'on file'},
      {t:'Expiring ≤ 3 Days',v:s3.length,s:'urgent',c:s3.length?'neg':'',a:1},
      {t:'Expiring ≤ 30 Days',v:s30.length,s:'renew soon',c:'gold'},
      {t:'Already Expired',v:expired.length,s:'needs action',c:expired.length?'neg':''}],
    note: s30.length?`<b>⚠ ${s30.length} policies expire within 30 days</b> — ${s3.length} of them within 3 days.
      The original sheet emailed this alert daily at 11:00; in the web app it surfaces here and on the Dashboard.`:null,
    noteType:'w'
  });
}
