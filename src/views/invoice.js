/** Invoice Builder and Invoice Register. */
import { audit, save } from '../core/persist.js';
import { switchView } from '../core/router.js';
import { D } from '../core/store.js';
import { DOC_TYPES, blankInvoice, docCfg, findInvoice, invMismatch, invTotals, nextInvNo, normDate, parseInvNo, yymm } from '../domain/invoices.js';
import { customerNames, itemNames, serviceTypes } from '../domain/lists.js';
import { findRate, invoiceRate } from '../domain/rates.js';
import { vatRate } from '../domain/vat.js';
import { waNumber } from '../domain/whatsapp.js';
import { csv } from '../lib/csv.js';
import { fmtDate, today } from '../lib/dates.js';
import { $, debounce, el } from '../lib/dom.js';
import { c, esc, m0, m2, n } from '../lib/format.js';
import { attachButton } from '../ui/attachments-ui.js';
import { bindAC } from '../ui/autocomplete.js';
import { dl } from '../ui/download.js';
import { field, input, mkBtn } from '../ui/forms.js';
import { focusCell, gridKey } from '../ui/grid.js';
import { openPDF, pdfBank, pdfHeader } from '../ui/pdf.js';
import { quickAddCompany } from '../ui/quick-add.js';
import { toast } from '../ui/toast.js';
import { gw, kpiRow } from '../ui/widgets.js';

export let INV=null;

export function renderInvoice(){
  if(!INV)INV=blankInvoice();
  if(!INV.InvoiceNo)INV.InvoiceNo=nextInvNo(INV.InvoiceDate,INV);

  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'+ New','',()=>{const dt=INV.DocType;INV=blankInvoice();INV.DocType=dt;INV.InvoiceNo=nextInvNo(INV.InvoiceDate,INV);renderInvoice();toast('New '+dt.toLowerCase()+' '+INV.InvoiceNo);});
  mkBtn(T,'< Prev','',()=>navInv(-1));
  mkBtn(T,'Next >','',()=>navInv(1));
  mkBtn(T,'↓ PDF','',()=>{if(validateInv())exportInvoicePDF(INV);});
  mkBtn(T,'WhatsApp','g',()=>{if(validateInv())shareInvoiceWA(INV);});
  T.append(attachButton('inv:'+INV.InvoiceNo,INV.InvoiceNo));
  mkBtn(T,'✓ Save Invoice','p',saveInvoice);

  const v=$('#view');v.innerHTML='';
  const wrap=el('div','fade invgrid');v.append(wrap);
  const left=el('div'),right=el('div');
  wrap.append(left,right);

  /* ---- header card ---- */
  const hc=el('div','glass card');
  hc.append(el('h3',null,'Invoice Details'));
  const hg=el('div','invhead');

  const fillContact=()=>{
    const c=D.contacts.find(x=>x.name.toUpperCase()===INV.BillTo.toUpperCase());
    if(c&&c.phone&&!INV.ContactInfo){INV.ContactInfo=c.phone;cont.value=c.phone;}
  };
  const bill=input(INV.BillTo,'text','customer / company name');
  bindAC(bill,customerNames,{onAdd:quickAddCompany,
    onPick:()=>{INV.BillTo=bill.value.trim();fillContact();appl.focus();}});
  bill.addEventListener('input',()=>INV.BillTo=bill.value);
  bill.addEventListener('change',()=>{INV.BillTo=bill.value.trim();fillContact();});

  const appl=input(INV.Applicant,'text','applicant / employee name');
  appl.oninput=()=>INV.Applicant=appl.value;
  const cont=input(INV.ContactInfo,'text','phone or email');
  cont.oninput=()=>INV.ContactInfo=cont.value;

  /* Service type — focusing or clicking reveals the whole list and selects the current
     value, so a wrong pick is replaced by choosing another; no need to clear it first. */
  const svc=input(INV.ServiceType,'text','click to choose a service template…');
  svc.style.cursor='pointer';
  bindAC(svc,()=>['NEW (MANUAL ENTRY)',...serviceTypes()],
    {fullList:true,onPick:val=>{INV.ServiceType=val;applyTemplate(val);}});
  svc.addEventListener('input',()=>INV.ServiceType=svc.value);
  svc.addEventListener('change',()=>{INV.ServiceType=svc.value.trim();
    if(INV.ServiceType)applyTemplate(INV.ServiceType);});

  const no=el('input','invno');no.value=INV.InvoiceNo;
  no.addEventListener('change',()=>{
    const val=no.value.trim().toUpperCase();
    const found=findInvoice(val);
    if(found){loadInvoice(val);toast('Loaded '+val);}
    else{INV.InvoiceNo=val;toast('New number '+val);}
  });

  const dt=input(INV.InvoiceDate,'date');
  dt.onchange=()=>{INV.InvoiceDate=dt.value;
    if(!findInvoice(INV.InvoiceNo)){INV.InvoiceNo=nextInvNo(dt.value,INV);renderInvoice();}};

  const ctrn=input(INV.CustomerTRN,'text');ctrn.oninput=()=>INV.CustomerTRN=ctrn.value;
  const ttrn=input(INV.TimeLinkTRN,'text');ttrn.readOnly=true;

  const dtype=el('select','fld');
  Object.keys(DOC_TYPES).forEach(k=>dtype.append(new Option(k,k)));
  dtype.value=INV.DocType||'TAX INVOICE';
  dtype.onchange=()=>{
    INV.DocType=dtype.value;
    if(!findInvoice(INV.InvoiceNo))INV.InvoiceNo=nextInvNo(INV.InvoiceDate,INV);
    renderInvoice();toast('Document type: '+INV.DocType);
  };

  hg.append(field('Document Type',dtype),field('Invoice No.',no),
            field('Bill To',bill),
            field('Invoice Date',dt),
            field('Applicant',appl),field('Customer TRN',ctrn),
            field('Contact Info',cont),field('TimeLink TRN',ttrn),
            field('Service Type',svc));
  hc.append(hg);left.append(hc);

  /* ---- line items ---- */
  const lc=el('div','glass card');
  const lh=el('div');lh.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:10px';
  lh.append(el('h3',null,'Line Items'));
  lh.querySelector('h3').style.margin='0';
  const sp=el('div');sp.style.flex='1';lh.append(sp);
  const ab=el('button','btn sm','+ Add Line');ab.onclick=()=>{INV.items.push({desc:'',qty:1,rate:0});renderInvoice();};
  const cb=el('button','btn sm d','Clear All');cb.onclick=()=>{if(confirm('Clear all line items?')){INV.items=[];renderInvoice();}};
  lh.append(ab,cb);lc.append(lh);

  const lg=el('div','gridwrap');lg.id='invlines';lg.style.maxHeight='none';
  const t=el('table','inv');
  t.innerHTML=`<thead><tr><th style="width:44px;text-align:center">Sr</th><th>Description</th>
    <th style="width:66px;text-align:center">Qty</th><th style="width:96px;text-align:center">Rate</th>
    <th style="width:104px;text-align:center">Amount</th><th style="width:80px;text-align:center">Source</th>
    <th style="width:36px"></th></tr></thead>`;
  const tb=el('tbody');
  if(!INV.items.length){
    const tr=el('tr'),td=el('td');td.colSpan=7;
    td.innerHTML='<div class="empty" style="padding:26px"><div class="e">🧾</div>Pick a Service Type above and the lines fill in automatically, priced from Rates Master.</div>';
    tr.append(td);tb.append(tr);
  }
  INV.items.forEach((it,i)=>tb.append(invLine(it,i)));
  t.append(tb);lg.append(t);lc.append(lg);
  lg.addEventListener('keydown',ev=>gridKey(ev,lg,{onOverflow:()=>{
    INV.items.push({desc:'',qty:1,rate:0});renderInvoice();
    requestAnimationFrame(()=>focusCell(gw(),INV.items.length-1,ICOL.desc));}}));
  lc.append(el('div','hint',''));
  lc.lastChild.innerHTML='Service template rates win. <b>template</b> = the package price &nbsp;·&nbsp; '+
    '<b>master</b> = template had no price so Rates Master supplied it &nbsp;·&nbsp; <b>manual</b> = you typed it. '+
    'Arrow keys and Enter move between cells.';
  left.append(lc);

  /* ---- note ---- */
  const nc=el('div','glass card');
  nc.append(el('h3',null,'Note on Invoice'));
  const nt=input(INV.Note,'text','e.g. PAID BY SHAHIRYAR CARD');
  nt.oninput=()=>INV.Note=nt.value;
  nc.append(nt);left.append(nc);

  /* ---- totals panel ---- */
  const tc=el('div','glass card');
  tc.append(el('h3',null,'Summary'));
  const tt=invTotals(INV);
  const add=(lbl,val,cls)=>{const r=el('div','tot-row'+(cls?' '+cls:''));
    r.append(el('div','lbl',lbl));r.append(el('div','val',val));tc.append(r);return r;};
  add('Sub Total — Govt. Charges (non-taxable)','AED '+m2(tt.govt));
  const fr=el('div','tot-row');fr.append(el('div','lbl','Service Fee (taxable)'));
  const fi=el('input');fi.type='text';fi.value=INV.ServiceFee||0;fi.inputMode='decimal';
  fi.oninput=()=>{INV.ServiceFee=n(fi.value);refreshTotals();};
  fr.append(fi);tc.append(fr);
  add(`VAT @ ${Math.round(n(D.settings.vatRate)*100)}% on Service Fee`,'AED '+m2(tt.vat));
  add('Service Fee Inc. VAT','AED '+m2(tt.feeInc));
  add('Invoice Total','AED '+m2(tt.grand));
  const ar=el('div','tot-row');
  ar.append(el('div','lbl','Less: Advance Received'));
  const ai=el('input');ai.type='text';ai.value=INV.Advance||0;ai.inputMode='decimal';
  ai.style.color='var(--pos)';
  ai.oninput=()=>{INV.Advance=n(ai.value);refreshTotals();};
  ar.append(ai);tc.append(ar);
  add('BALANCE DUE (AED)',m2(tt.balance),'grand');
  right.append(tc);

  /* ---- info ---- */
  const ic=el('div','glass card');
  ic.append(el('h3',null,'Status'));
  const exists=findInvoice(INV.InvoiceNo);
  ic.innerHTML+=`<div class="hint" style="padding:0;line-height:1.9">
    <b style="color:var(--ink)">${esc(INV.InvoiceNo)}</b>
    <span class="badge ${exists?'i':'w'}" style="margin-left:6px">${exists?'SAVED — editing':'NEW — unsaved'}</span><br>
    ${INV.items.length} line item${INV.items.length===1?'':'s'} ·
    Next free number this month: <b style="color:var(--gold)">${esc(nextInvNo(INV.InvoiceDate,INV))}</b><br>
    <span style="color:var(--ink-3)">Government fees are collected as a disbursement and are out of scope of VAT. VAT applies only to the service fee.</span></div>`;
  right.append(ic);

  /* ---- recent ---- */
  const rc=el('div','glass card');
  rc.append(el('h3',null,'Recent Invoices'));
  const recent=D.invoices.slice().sort((a,b)=>String(b.InvoiceNo).localeCompare(String(a.InvoiceNo))).slice(0,10);
  recent.forEach(x=>{
    const r=el('div','rankrow');r.style.cursor='pointer';
    r.innerHTML=`<div class="i">🧾</div><div class="nm">${esc(x.BillTo||'—')}<div style="font-size:10px;color:var(--ink-3);font-family:var(--mono)">${esc(x.InvoiceNo)}</div></div>
      <div class="v">${m0(x.GrandTotal)}</div>`;
    r.onclick=()=>{loadInvoice(x.InvoiceNo);};
    rc.append(r);
  });
  right.append(rc);

  function refreshTotals(){
    const t2=invTotals(INV);const rows=tc.querySelectorAll('.tot-row');
    rows[0].querySelector('.val').textContent='AED '+m2(t2.govt);
    rows[2].querySelector('.val').textContent='AED '+m2(t2.vat);
    rows[3].querySelector('.val').textContent='AED '+m2(t2.feeInc);
    rows[4].querySelector('.val').textContent='AED '+m2(t2.grand);
    rows[6].querySelector('.val').textContent=m2(t2.balance);
  }
  renderInvoice._refresh=refreshTotals;
}

export const ICOL={desc:1,qty:2,rate:3};

export function invLine(it,i){
  const tr=el('tr');
  tr.append(el('td','rn',String(i+1)));
  const cells={};

  const dtd=el('td');const di=el('input','cell');di.value=it.desc||'';
  di.dataset.nav='1';di.dataset.r=i;di.dataset.c=ICOL.desc;cells.desc=di;
  const priceIt=()=>{
    it.desc=di.value.trim();
    if(!n(it.rate)){
      const hit=findRate(it.desc);
      if(hit){
        it.rate=hit.rate;it.src='master';
        if(cells.rate)cells.rate.value=hit.rate;
        amt.textContent=m2(n(it.qty)*n(it.rate));
        toast(`${it.desc} · ${m0(hit.rate)} from Rates Master`);
      }
    }
    tag.innerHTML=srcTag(it);
    renderInvoice._refresh&&renderInvoice._refresh();
  };
  bindAC(di,itemNames,{onPick:()=>{priceIt();focusCell(gw(),i,ICOL.qty);}});
  di.addEventListener('input',()=>it.desc=di.value);
  di.addEventListener('change',priceIt);
  dtd.append(di);tr.append(dtd);

  const mkNum=(key)=>{const td=el('td','num');const inp=el('input','cell');
    inp.style.textAlign='center';inp.inputMode='decimal';inp.value=it[key]??0;
    inp.dataset.nav='1';inp.dataset.r=i;inp.dataset.c=ICOL[key];cells[key]=inp;
    inp.addEventListener('input',()=>{it[key]=n(inp.value);
      if(key==='rate')it.src='manual';
      amt.textContent=m2(n(it.qty)*n(it.rate));
      tag.innerHTML=srcTag(it);
      renderInvoice._refresh&&renderInvoice._refresh();});
    td.append(inp);return td;};
  tr.append(mkNum('qty'),mkNum('rate'));

  const atd=el('td','num');
  const amt=el('div');
  amt.style.cssText='padding:8px 9px;text-align:center;font-family:var(--mono);font-weight:700;font-size:12.2px';
  amt.textContent=m2(n(it.qty)*n(it.rate));atd.append(amt);tr.append(atd);

  const ttd=el('td','c');const tag=el('div');tag.innerHTML=srcTag(it);ttd.append(tag);tr.append(ttd);

  const act=el('td','act');const d=el('button','del','×');d.tabIndex=-1;
  d.onclick=()=>{INV.items.splice(i,1);renderInvoice();};
  act.append(d);tr.append(act);
  return tr;
}

export function srcTag(it){
  if(!it.desc)return '';
  if(it.src==='template')return '<span class="badge i" title="Priced by the service template">template</span>';
  if(it.src==='master')return '<span class="badge adv" title="Template had no price — taken from Rates Master">master</span>';
  if(it.src==='saved')return '<span class="badge" style="background:var(--field);color:var(--ink-3)" title="Saved on this invoice">saved</span>';
  if(!n(it.rate))return '<span class="badge w" title="No price found — enter one">no price</span>';
  return '<span class="badge" style="background:var(--field);color:var(--ink-3)" title="Typed manually">manual</span>';
}

export function applyTemplate(name){
  const key=String(name||'').trim().toUpperCase();
  if(!key)return;
  if(['NEW (MANUAL ENTRY)','NEW(MANUAL ENTRY)','MANUAL','NEW'].includes(key)){
    INV.items=[];renderInvoice();toast('Manual entry — lines cleared');return;
  }
  const tpl=D.taskTemplates.filter(t=>t.serviceType.trim().toUpperCase()===key)
    .sort((a,b)=>(a.sr||0)-(b.sr||0));
  if(!tpl.length){
    renderInvoice();
    toast(`No template found for "${name}"`,1);
    return;
  }
  let fromTemplate=0,fromMaster=0,unpriced=0;
  INV.items=tpl.map(t=>{
    const r=invoiceRate(t.desc,t.rate);
    if(r.src==='template')fromTemplate++;else if(r.src==='master')fromMaster++;else unpriced++;
    return{desc:t.desc,qty:n(t.qty)||1,rate:r.rate,src:r.src};
  });
  renderInvoice();
  const bits=[`${INV.items.length} lines`];
  if(fromTemplate)bits.push(`${fromTemplate} at template rates`);
  if(fromMaster)bits.push(`${fromMaster} from Rates Master`);
  if(unpriced)bits.push(`${unpriced} need a price`);
  toast(`${name} · ${bits.join(' · ')}`);
}

export function validateInv(){
  if(!INV.BillTo.trim()){toast('BILL TO is required',1);return false;}
  if(!INV.items.some(x=>x.desc.trim()&&n(x.qty)*n(x.rate)>0)){toast('Add at least one line item',1);return false;}
  return true;
}

export function saveInvoice(){
  if(!validateInv())return;
  const t=invTotals(INV);
  let no=INV.InvoiceNo.trim();
  const p=parseInvNo(no,INV);
  if(!no||!p||p.yymm!==yymm(INV.InvoiceDate)){
    if(!findInvoice(no)) no=nextInvNo(INV.InvoiceDate,INV);
  }
  INV.InvoiceNo=no;
  const rec={InvoiceNo:no,DocType:INV.DocType||'TAX INVOICE',InvoiceDate:INV.InvoiceDate,BillTo:INV.BillTo.trim(),
    Applicant:INV.Applicant.trim(),ContactInfo:INV.ContactInfo.trim(),ServiceType:INV.ServiceType.trim(),
    CustomerTRN:INV.CustomerTRN.trim(),TimeLinkTRN:INV.TimeLinkTRN,
    GovtSubtotal:t.govt,ServiceFee:t.fee,VAT:t.vat,ServiceFeeIncVat:t.feeInc,GrandTotal:t.grand,
    Advance:t.advance,BalanceDue:t.balance,
    Note:INV.Note||'',PDF_Link:'',CreatedAt:new Date().toISOString()};
  const ex=D.invoices.findIndex(v=>String(v.InvoiceNo).trim()===no);
  if(ex>=0){rec.CreatedAt=D.invoices[ex].CreatedAt||rec.CreatedAt;D.invoices[ex]=rec;}
  else D.invoices.push(rec);
  D.invoiceItems=D.invoiceItems.filter(x=>String(x.invoiceNo).trim()!==no);
  INV.items.filter(x=>x.desc.trim()).forEach((x,i)=>D.invoiceItems.push({
    invoiceNo:no,sr:i+1,desc:x.desc.trim(),qty:n(x.qty),rate:n(x.rate),amount:Math.round(n(x.qty)*n(x.rate)*100)/100}));
  save();
  toast(`Invoice ${no} saved · AED ${m2(t.grand)}`);
  renderInvoice();
}

export function loadInvoice(no){
  const v=findInvoice(no);
  if(!v){toast('Invoice '+no+' not found',1);return;}
  const items=D.invoiceItems.filter(x=>String(x.invoiceNo).trim()===String(no).trim())
    .sort((a,b)=>(a.sr||0)-(b.sr||0)).map(x=>({desc:x.desc,qty:n(x.qty)||1,rate:n(x.rate),src:'saved'}));
  INV={InvoiceNo:v.InvoiceNo,DocType:v.DocType||'TAX INVOICE',InvoiceDate:normDate(v.InvoiceDate),BillTo:v.BillTo||'',Applicant:v.Applicant||'',
    ContactInfo:v.ContactInfo||'',ServiceType:v.ServiceType||'',CustomerTRN:v.CustomerTRN||'',
    TimeLinkTRN:v.TimeLinkTRN||D.settings.trn,ServiceFee:n(v.ServiceFee),Advance:n(v.Advance),
    Note:v.Note||'',items};
  switchView('invoice');
}

export function navInv(step){
  const list=D.invoices.map(v=>v.InvoiceNo).filter(x=>parseInvNo(x))
    .sort((a,b)=>parseInvNo(a).num6-parseInvNo(b).num6);
  if(!list.length){toast('No saved invoices',1);return;}
  const cur=parseInvNo(INV.InvoiceNo);
  const c6=cur?cur.num6:Infinity;
  if(step>0){const nx=list.find(x=>parseInvNo(x).num6>c6);
    if(nx)loadInvoice(nx);else toast('Already at the newest invoice');}
  else{let prev=null;for(let i=list.length-1;i>=0;i--){if(parseInvNo(list[i]).num6<c6){prev=list[i];break;}}
    if(prev)loadInvoice(prev);else toast('Already at the oldest invoice');}
}

export function exportInvoicePDF(inv){
  const t=invTotals(inv);
  const rows=inv.items.filter(x=>x.desc.trim()).map((x,i)=>
    `<tr class="${i%2?'alt':''}"><td class="c">${i+1}</td><td>${esc(x.desc)}</td>
     <td class="c">${n(x.qty)}</td><td class="r">${m2(x.rate)}</td>
     <td class="r">${m2(n(x.qty)*n(x.rate))}</td></tr>`).join('');
  const inner=`${pdfHeader()}
    <div class="ttl">${esc(inv.DocType||'TAX INVOICE')}<small>${esc(inv.InvoiceNo)}</small></div>
    ${docCfg(inv).stamp?`<div class="stamp" style="color:#0f766e;border-color:#0f766e">${docCfg(inv).stamp}</div>`:''}
    <div class="rule"></div>
    <table style="margin-bottom:12px;border:1px solid #d8e5e3">
      <tr><td class="k" style="width:110px;background:#f5faf9;font-weight:700;color:#0f766e">BILL TO</td>
          <td style="font-weight:700">${esc(inv.BillTo)}</td>
          <td class="k" style="width:110px;background:#f5faf9;font-weight:700;color:#0f766e">INVOICE NO.</td>
          <td style="font-family:'Courier New',monospace;font-weight:700">${esc(inv.InvoiceNo)}</td></tr>
      <tr><td style="background:#f5faf9;font-weight:700;color:#0f766e">APPLICANT</td><td>${esc(inv.Applicant||'—')}</td>
          <td style="background:#f5faf9;font-weight:700;color:#0f766e">DATE</td><td>${fmtDate(inv.InvoiceDate)}</td></tr>
      <tr><td style="background:#f5faf9;font-weight:700;color:#0f766e">CONTACT</td><td>${esc(inv.ContactInfo||'—')}</td>
          <td style="background:#f5faf9;font-weight:700;color:#0f766e">CUSTOMER TRN</td><td>${esc(inv.CustomerTRN||'NOT REGISTERED')}</td></tr>
      <tr><td style="background:#f5faf9;font-weight:700;color:#0f766e">SERVICE TYPE</td><td>${esc(inv.ServiceType||'—')}</td>
          <td style="background:#f5faf9;font-weight:700;color:#0f766e">TIMELINK TRN</td><td>${esc(inv.TimeLinkTRN)}</td></tr>
    </table>
    <table><thead><tr><th style="width:34px;text-align:center">Sr</th><th>Description</th>
      <th style="width:44px;text-align:center">Qty</th><th style="width:70px;text-align:right">Rate</th>
      <th style="width:82px;text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <table style="margin-top:12px;width:58%;margin-left:auto;border:1px solid #d8e5e3">
      <tr><td>Sub Total — Govt. Charges (non-taxable)</td><td class="r" style="width:96px">${m2(t.govt)}</td></tr>
      <tr class="alt"><td>Service Fee (taxable)</td><td class="r">${m2(t.fee)}</td></tr>
      <tr><td>VAT @ ${Math.round(n(D.settings.vatRate)*100)}% on Service Fee</td><td class="r">${m2(t.vat)}</td></tr>
      <tr class="alt"><td>Service Fee Inc. VAT</td><td class="r">${m2(t.feeInc)}</td></tr>
      <tr><td><b>${docCfg(inv).totalLabel==='GRAND TOTAL'?'Invoice Total':docCfg(inv).totalLabel}</b></td><td class="r"><b>${m2(t.grand)}</b></td></tr>
      ${t.advance?`<tr style="background:#e6f7f2"><td>Less: Advance Received</td><td class="r">− ${m2(t.advance)}</td></tr>`:''}
      <tr class="tot"><td style="text-align:right">${t.advance?docCfg(inv).dueLabel:docCfg(inv).totalLabel} (AED)</td><td class="r">${m2(t.balance)}</td></tr>
    </table>
    ${inv.Note?`<div style="margin-top:10px;font-size:9px"><b style="color:#0f766e">NOTE:</b> ${esc(inv.Note)}</div>`:''}
    ${pdfBank()}
    <table style="margin-top:16px;border:0"><tr>
      <td style="border:0;font-size:8.4px;color:#5a6d6c;width:60%;line-height:1.7">
        Government fees are collected as a disbursement and are out of scope of VAT.<br>
        VAT is applied only on service fees.<br>
        ${docCfg(inv).foot}</td>
      <td style="border:0;text-align:right;font-size:9px">
        <div style="height:34px"></div>
        <div style="border-top:1px solid #0f766e;display:inline-block;padding-top:5px;min-width:150px">
          <b>Authorized Signatory</b><br>Abrar Ali · +971 55 978 5637</div></td></tr></table>
    <div class="ty">${docCfg(inv).thanks}</div>`;
  openPDF(`${inv.DocType||'INVOICE'} ${inv.InvoiceNo} - ${inv.BillTo}`,inner);
}

export function renderInvoiceList(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'+ New Invoice','p',()=>{INV=blankInvoice();INV.InvoiceNo=nextInvNo(INV.InvoiceDate);switchView('invoice');});
  mkBtn(T,'↓ CSV','',()=>{
    const rows=D.invoices.map(v=>[v.InvoiceNo,v.InvoiceDate,v.BillTo,v.Applicant,v.ServiceType,
      v.GovtSubtotal,v.ServiceFee,v.VAT,v.GrandTotal]);
    dl(new Blob([csv([['InvoiceNo','Date','BillTo','Applicant','ServiceType','Govt','Fee','VAT','GrandTotal'],...rows])],
      {type:'text/csv'}),`invoices-${today()}.csv`);});

  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const list=D.invoices;
  const gt=list.reduce((a,x)=>a+n(x.GrandTotal),0);
  // VAT is only a real liability on tax invoices — quotations and receipts
  // carry a VAT figure too (for display) but must not count toward what's
  // actually payable, or this KPI disagrees with the VAT Return page.
  const vt=list.filter(x=>(x.DocType||'TAX INVOICE').toUpperCase()==='TAX INVOICE')
    .reduce((a,x)=>a+Math.round(n(x.ServiceFee)*vatRate()*100)/100,0);
  const ft=list.reduce((a,x)=>a+n(x.ServiceFee),0);
  wrap.append(kpiRow([
    {t:'Invoices',v:list.length,s:'all time'},
    {t:'Invoiced Value',v:m0(gt),s:'AED',a:1},
    {t:'Service Fees',v:m0(ft),s:'AED',c:'pos'},
    {t:'VAT Collected',v:m0(vt),s:'tax invoices only',c:'gold'}
  ]));

  const flagged=list.filter(invMismatch);
  if(flagged.length){
    const nb=el('div','note w');
    nb.innerHTML=`<b>⚠ ${flagged.length} invoices do not reconcile</b> — the header total stored in your sheet
      differs from the sum of that invoice's saved line items (${flagged.slice(0,4).map(v=>esc(v.InvoiceNo)).join(', ')}${flagged.length>4?'…':''}).
      This came across from the spreadsheet, where a total was edited after the lines were saved. Open one and hit
      <b>Save Invoice</b> to recompute it from the lines.`;
    wrap.append(nb);
  }

  const c=el('div','glass card noprint');
  const q=input('','text','search invoice no, customer, applicant or service…');
  c.append(q);wrap.append(c);
  const out=el('div');wrap.append(out);

  const draw=(term='')=>{
    out.innerHTML='';
    const f=list.filter(x=>!term||`${x.InvoiceNo} ${x.BillTo} ${x.Applicant} ${x.ServiceType}`.toUpperCase().includes(term.toUpperCase()))
      .sort((a,b)=>String(b.InvoiceNo).localeCompare(String(a.InvoiceNo)));
    const gw=el('div','glass gridwrap');
    const t=el('table','list');
    t.innerHTML=`<thead><tr><th style="width:106px">Number</th><th style="width:108px">Type</th><th style="width:104px">Date</th>
      <th>Bill To</th><th>Applicant</th><th>Service Type</th>
      <th style="width:92px;text-align:right">Govt</th><th style="width:82px;text-align:right">Fee</th>
      <th style="width:72px;text-align:right">VAT</th><th style="width:100px;text-align:right">Total</th>
      <th style="width:120px"></th></tr></thead>`;
    const tb=el('tbody');
    f.slice(0,500).forEach(x=>{
      const tr=el('tr');
      const mm=invMismatch(x);
      const dtp=x.DocType||'TAX INVOICE';
      tr.innerHTML=`<td style="font-family:var(--mono);font-weight:700;color:var(--gold)">${esc(x.InvoiceNo)}${mm?' <span class="badge w" title="Header total '+m2(mm.stored)+' vs lines '+m2(mm.govt)+'">!</span>':''}</td>
        <td><span class="badge ${dtp==='QUOTATION'?'w':dtp==='PAYMENT RECEIPT'?'adv':'i'}">${esc(dtp.replace('PAYMENT ',''))}</span></td>
        <td>${fmtDate(normDate(x.InvoiceDate))}</td><td><b>${esc(x.BillTo)}</b></td>
        <td>${esc(x.Applicant||'—')}</td><td style="font-size:11.6px;color:var(--ink-2)">${esc(x.ServiceType||'—')}</td>
        <td class="n">${m2(x.GovtSubtotal)}</td><td class="n">${m2(x.ServiceFee)}</td>
        <td class="n">${m2(x.VAT)}</td><td class="n" style="font-weight:800;color:var(--brand2)">${m2(x.GrandTotal)}</td><td class="c"></td>`;
      const cell=tr.lastChild;
      const e=el('button','btn sm','Edit');e.onclick=()=>loadInvoice(x.InvoiceNo);
      const p=el('button','btn sm','PDF');p.style.marginLeft='5px';
      p.onclick=()=>{const items=D.invoiceItems.filter(i=>String(i.invoiceNo).trim()===String(x.InvoiceNo).trim())
          .sort((a,b)=>(a.sr||0)-(b.sr||0)).map(i=>({desc:i.desc,qty:n(i.qty),rate:n(i.rate)}));
        exportInvoicePDF({...x,InvoiceDate:normDate(x.InvoiceDate),items,ServiceFee:n(x.ServiceFee)});};
      cell.append(e,p);tb.append(tr);
    });
    t.append(tb);gw.append(t);out.append(gw);
    out.append(el('div','hint',f.length>500?`Showing 500 of ${f.length} invoices — narrow with search.`:`${f.length} invoices`));
  };
  q.oninput=debounce(()=>draw(q.value),260);
  draw();
}

export function shareInvoiceWA(inv){
  const t=invTotals(inv);
  const msg=[
    `*${D.settings.companyName}*`,'',
    `Tax Invoice *${inv.InvoiceNo}*`,
    `Date: ${fmtDate(inv.InvoiceDate)}`,
    `Bill to: ${inv.BillTo}`,
    inv.Applicant?`Applicant: ${inv.Applicant}`:'',
    inv.ServiceType?`Service: ${inv.ServiceType}`:'','',
    `Government charges: AED ${m2(t.govt)}`,
    `Service fee: AED ${m2(t.fee)}`,
    `VAT: AED ${m2(t.vat)}`,
    `Invoice total: AED ${m2(t.grand)}`,
    t.advance?`Advance received: AED ${m2(t.advance)}`:'',
    `*${t.advance?'Balance due':'Amount due'}: AED ${m2(t.balance)}*`,'',
    `Bank: ${D.settings.bank.name}\nIBAN: ${D.settings.bank.iban}`,'',
    `Thank you for your business.\n${D.settings.phone}`
  ].filter(Boolean).join('\n');
  const num=waNumber(inv.ContactInfo);
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`,'_blank');
  audit('share','invoice',inv.InvoiceNo);save();
  toast('Opening WhatsApp');
}

/** Replace INV — imported bindings cannot be assigned directly. */
export function setINV(v) {
  INV = v;
  return INV;
}
