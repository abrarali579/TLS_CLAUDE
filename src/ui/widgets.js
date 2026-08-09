/** Small building blocks reused across screens: KPI tiles, grid widths, list layouts, sparklines. */
import { $, debounce, el } from '../lib/dom.js';
import { esc } from '../lib/format.js';
import { input } from './forms.js';

export function kpiRow(items){
  const k=el('div','kpis');
  items.forEach(o=>{
    const c=el('div','glass kpi'+(o.a?' accent':'')+(o.g?' g-'+o.g:''));
    c.append(el('div','t',o.t));
    c.append(el('div','v '+(o.c||''),String(o.v)));
    if(o.s)c.append(el('div','s',o.s));
    k.append(c);
  });
  return k;
}

export function gw(){return $('#invlines');}

export function svgLine(points,w,h,color,fill){
  if(points.length<2)return '';
  const vals=points.map(p=>p.v);
  const mx=Math.max(...vals,0),mn=Math.min(...vals,0);
  const rng=(mx-mn)||1;
  const padT=14,padB=20,padL=0;
  const xs=points.map((p,i)=>padL+i/(points.length-1)*(w-padL));
  const ys=points.map(p=>h-padB-((p.v-mn)/rng)*(h-padT-padB));
  const d=xs.map((x,i)=>`${i?'L':'M'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const area=`${d} L${w},${h-padB} L${padL},${h-padB} Z`;
  const zeroY=h-padB-((0-mn)/rng)*(h-padT-padB);
  /* three reference lines so the shape can be read against real numbers */
  const ticks=[mx,(mx+mn)/2,mn].map(v=>({v,y:h-padB-((v-mn)/rng)*(h-padT-padB)}));
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"
      style="width:100%;height:${h}px;display:block;overflow:visible">
    <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${fill}" stop-opacity=".38"/>
      <stop offset="1" stop-color="${fill}" stop-opacity="0"/>
    </linearGradient></defs>
    ${ticks.map(t=>`<line x1="0" y1="${t.y.toFixed(1)}" x2="${w}" y2="${t.y.toFixed(1)}"
        stroke="currentColor" stroke-opacity=".13" stroke-dasharray="3 5"/>
      <text x="2" y="${(t.y-4).toFixed(1)}" font-size="9" fill="currentColor"
        fill-opacity=".45" font-family="inherit">${Math.round(t.v).toLocaleString('en-US')}</text>`).join('')}
    <line x1="0" y1="${zeroY.toFixed(1)}" x2="${w}" y2="${zeroY.toFixed(1)}"
      stroke="currentColor" stroke-opacity=".28"/>
    <path d="${area}" fill="url(#ag)"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.4"
      stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    ${xs.map((x,i)=>`<circle cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="2.6" fill="${color}">
      <title>${esc(points[i].d)} · ${Math.round(points[i].v).toLocaleString('en-US')}</title></circle>`).join('')}
  </svg>`;
}

export function listView(cols,rows,keys,opts){
  opts=opts||{};
  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  if(opts.kpis)wrap.append(kpiRow(opts.kpis));
  if(opts.note){const nb=el('div','note '+(opts.noteType||'i'));nb.innerHTML=opts.note;wrap.append(nb);}
  const c=el('div','glass card noprint');
  const q=input('','text',opts.placeholder||'Search…');
  c.append(q);wrap.append(c);
  const out=el('div');wrap.append(out);
  const draw=(term='')=>{
    out.innerHTML='';
    const f=rows.filter(r=>!term||keys.some(k=>String(r[k]??'').toUpperCase().includes(term.toUpperCase())));
    const gw=el('div','glass gridwrap');
    const t=el('table','list');
    t.innerHTML='<thead><tr>'+cols.map(c=>`<th${c.w?` style="width:${c.w}"`:''}>${c.t}</th>`).join('')+'</tr></thead>';
    const tb=el('tbody');
    f.slice(0,600).forEach(r=>{
      const tr=el('tr');
      tr.innerHTML=cols.map(c=>`<td class="${c.cls||''}">${c.f?c.f(r):esc(r[c.k]??'')}</td>`).join('');
      if(opts.onRow)opts.onRow(tr,r);
      tb.append(tr);
    });
    if(!f.length){const tr=el('tr'),td=el('td');td.colSpan=cols.length;
      td.innerHTML='<div class="empty"><div class="e">∅</div>Nothing matches that search.</div>';tr.append(td);tb.append(tr);}
    t.append(tb);gw.append(t);out.append(gw);
    out.append(el('div','hint',f.length>600?`Showing 600 of ${f.length} records — narrow with search.`:`${f.length} records`));
  };
  q.oninput=debounce(()=>draw(q.value),260);
  draw();
  return {redraw:draw};
}
