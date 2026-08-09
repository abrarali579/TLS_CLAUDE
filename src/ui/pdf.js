/** Print/PDF output: the page styling, letterhead and bank block. */
import { D } from '../core/store.js';
import { esc } from '../lib/format.js';
import { toast } from './toast.js';

export const PDF_CSS=`
@page{size:A4;margin:11mm}
*{box-sizing:border-box}
body{font-family:"Helvetica Neue",Arial,sans-serif;font-size:10px;color:#16302f;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sheet{position:relative}
.hd{background:linear-gradient(115deg,#0b3b38 0%,#0f766e 55%,#134e4a 100%);color:#fff;padding:16px 20px;border-radius:10px;
  display:flex;align-items:center;gap:14px}
.hd .lg{width:46px;height:46px;flex:0 0 46px}
.hd .nm{flex:1}
.hd .nm h1{margin:0;font-size:16px;letter-spacing:2.2px;font-weight:800}
.hd .nm p{margin:3px 0 0;font-size:9px;opacity:.88;line-height:1.5}
.hd .rt{text-align:right;font-size:9px;opacity:.9;line-height:1.6}
.ttl{margin:14px 0 4px;text-align:center;font-size:14px;font-weight:800;letter-spacing:2.4px;color:#0f766e}
.ttl small{display:block;font-size:11px;color:#16302f;letter-spacing:1px;margin-top:4px;font-weight:700}
.rule{height:2.5px;background:linear-gradient(90deg,#0f766e,#fbbf24 55%,transparent);border-radius:2px;margin:6px 0 12px}
.meta{display:flex;justify-content:space-between;font-size:9px;color:#4b5f5e;margin-bottom:10px}
table{border-collapse:collapse;width:100%}
th{background:#0f766e;color:#fff;font-size:8.6px;letter-spacing:1px;text-transform:uppercase;padding:7px 6px;
  border:1px solid #0b5f58;text-align:left}
td{padding:6px;border:1px solid #d8e5e3;font-size:9.2px;vertical-align:middle}
td.c{text-align:center;font-family:"Courier New",monospace}
td.r{text-align:right;font-family:"Courier New",monospace}
tr.alt td{background:#f5faf9}
tr.pay td{background:#e6f7f2}
tr.open td{background:#fef6e0;font-weight:700}
tr.tot td{background:#0b3b38;color:#fff;font-weight:800;font-size:10px;border-color:#0b3b38}
.bank{margin-top:20px;border:1px solid #d8e5e3;border-radius:8px;overflow:hidden}
.bank .bh{background:#0b3b38;color:#fff;padding:6px 10px;font-size:9.5px;font-weight:800;letter-spacing:1.2px}
.bank table td{border:0;border-bottom:1px solid #eef4f3;font-size:9px;padding:5px 10px}
.bank table tr:last-child td{border-bottom:0}
.bank .k{width:150px;font-weight:700;color:#0f766e}
.foot{margin-top:14px;font-size:8.4px;color:#5a6d6c;line-height:1.7;border-top:1px solid #d8e5e3;padding-top:9px}
.ty{text-align:center;font-style:italic;margin-top:9px;font-size:10px;color:#0f766e;font-weight:700}
.stamp{position:absolute;top:120px;right:26px;transform:rotate(-14deg);border:3px solid;padding:5px 14px;
  border-radius:7px;font-size:15px;font-weight:900;letter-spacing:2px;opacity:.16}
`;

export const PDF_LOGO=`<svg class="lg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="#ffffff" opacity=".14"/>
<rect x="1.5" y="1.5" width="45" height="45" rx="13" stroke="#7fe6da" stroke-width="1.6"/>
<circle cx="24" cy="24" r="14.5" stroke="#7fe6da" stroke-width="2.2" fill="none" opacity=".6"/>
<path d="M24 14.5V24l7 4.2" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="24" cy="24" r="2.5" fill="#fbbf24"/><path d="M9 38.5h30" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/></svg>`;

export function pdfHeader(){
  const S=D.settings;
  return `<div class="hd">${PDF_LOGO}
    <div class="nm"><h1>${esc(S.companyName)}</h1>
      <p>${esc(S.address)}</p>
      <p>${esc(S.phone)} &nbsp;·&nbsp; ${esc(S.email)} &nbsp;·&nbsp; TRN ${esc(S.trn)}</p></div>
    <div class="rt">Tel 04 575 5373<br>Contact@timelink.ae<br>timelink.ae</div></div>`;
}

export function pdfBank(){
  const B=D.settings.bank;
  return `<div class="bank"><div class="bh">BANK &amp; PAYMENT INFORMATION</div><table>
    <tr><td class="k">BANK NAME</td><td>${esc(B.name)}</td></tr>
    <tr><td class="k">ACCOUNT TITLE</td><td>${esc(B.title)}</td></tr>
    <tr><td class="k">ACCOUNT NO</td><td>${esc(B.acc)}</td></tr>
    <tr><td class="k">IBAN</td><td>${esc(B.iban)}</td></tr></table></div>`;
}

export function openPDF(title,inner){
  const w=window.open('','_blank');
  if(!w){toast('Popup blocked — allow popups to export',1);return;}
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
    <style>${PDF_CSS}</style></head><body><div class="sheet">${inner}</div>
    <script>window.onload=function(){setTimeout(function(){window.print();},250);}<\/script></body></html>`);
  w.document.close();
}
