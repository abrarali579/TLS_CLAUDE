/**
 * Reading and displaying dates, and splitting pasted spreadsheet blocks.
 *
 * One rule to keep in mind: ambiguous numeric dates are read DAY FIRST, so
 * 05/03/2026 is 5 March. Changing that shifts money between months in every
 * report. It is pinned by test/dates.test.js.
 */
export const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function fmtDate(iso){if(!iso)return '—';const p=String(iso).split('-');if(p.length<3)return iso;
  return `${+p[2]} ${MON[+p[1]-1]} ${p[0]}`;}

export function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

export function daysAgo(k){const d=new Date();d.setDate(d.getDate()-k);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

export function parseClipTable(text){
  const t=String(text||'').replace(/\r\n?/g,'\n').replace(/\n$/,'');
  if(!t)return [];
  return t.split('\n').map(line=>line.split('\t'));
}

export function parseAnyDate(v){
  const s=String(v||'').trim();
  if(!s)return '';
  let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`;
  m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if(m){
    let[,d,mo,y]=m;y=+y;if(y<100)y+=2000;
    // day-first, but swap when the first number cannot be a day
    if(+d>12&&+mo<=12){}else if(+mo>12&&+d<=12){const t2=d;d=mo;mo=t2;}
    return `${y}-${String(+mo).padStart(2,'0')}-${String(+d).padStart(2,'0')}`;
  }
  const p=new Date(s);
  if(!isNaN(p))return `${p.getFullYear()}-${String(p.getMonth()+1).padStart(2,'0')}-${String(p.getDate()).padStart(2,'0')}`;
  return '';
}
