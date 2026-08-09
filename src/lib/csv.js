/** Turn rows of values into CSV text. Pure — no DOM, no app state. */
export function csv(rows){return rows.map(r=>r.map(c=>{const s=String(c??'');
  return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(',')).join('\n');}
