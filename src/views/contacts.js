/** Contacts. */
import { save } from '../core/persist.js';
import { D } from '../core/store.js';
import { $, debounce, el } from '../lib/dom.js';
import { c } from '../lib/format.js';
import { input, mkBtn } from '../ui/forms.js';
import { gw } from '../ui/widgets.js';

export function renderContacts(){
  const T=$('#tools');T.innerHTML='';
  mkBtn(T,'+ Add Contact','p',()=>{D.contacts.unshift({name:'',phone:''});save();renderContacts();});
  const v=$('#view');v.innerHTML='';const wrap=el('div','fade');v.append(wrap);
  const c=el('div','glass card noprint');
  const q=input('','text','search name or number…');c.append(q);wrap.append(c);
  const out=el('div');wrap.append(out);
  const draw=(term='')=>{
    out.innerHTML='';
    const list=D.contacts.filter(x=>!term||`${x.name} ${x.phone}`.toUpperCase().includes(term.toUpperCase()))
      .sort((a,b)=>a.name.localeCompare(b.name));
    const gw=el('div','glass gridwrap');const t=el('table','grid');
    t.innerHTML='<thead><tr><th class="rn">#</th><th>Name</th><th style="width:190px">Contact No.</th><th style="width:110px">WhatsApp</th><th style="width:36px"></th></tr></thead>';
    const tb=el('tbody');
    list.slice(0,600).forEach((x,i)=>{
      const tr=el('tr');tr.append(el('td','rn',String(i+1)));
      const mk=key=>{const td=el('td');const inp=el('input','cell');inp.value=x[key]??'';
        inp.addEventListener('input',()=>{x[key]=inp.value;save();});td.append(inp);return td;};
      tr.append(mk('name'),mk('phone'));
      const wtd=el('td','c');
      if(x.phone){const a=el('a','btn sm','Message');
        a.href='https://wa.me/'+String(x.phone).replace(/\D/g,'').replace(/^0+/,'').replace(/^(?!971)/,'971');
        a.target='_blank';a.style.textDecoration='none';wtd.append(a);}
      tr.append(wtd);
      const act=el('td','act');const d=el('button','del','×');
      d.onclick=()=>{if(confirm('Delete contact?')){D.contacts.splice(D.contacts.indexOf(x),1);save();draw(term);}};
      act.append(d);tr.append(act);tb.append(tr);
    });
    t.append(tb);gw.append(t);out.append(gw);
    out.append(el('div','hint',`${list.length} contacts`));
  };
  q.oninput=debounce(()=>draw(q.value),260);
  draw();
}
