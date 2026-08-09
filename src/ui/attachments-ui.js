/** The paperclip button and the dialog listing files attached to an entry. */
import { MAX_FILE, audit, fileDel, fileGet, filePut, save } from '../core/persist.js';
import { D } from '../core/store.js';
import { attachCount, attachmentsFor } from '../domain/attachments.js';
import { fmtDate } from '../lib/dates.js';
import { el } from '../lib/dom.js';
import { c, esc, uid } from '../lib/format.js';
import { modal } from './modal.js';
import { toast } from './toast.js';

export function attachButton(ref,title){
  const b=el('button','btn sm attachbtn');
  const paint=()=>{
    const c=attachCount(ref);
    b.textContent=c?`📎 ${c}`:'📎 Attach';
    b.classList.toggle('has',!!c);
  };
  paint();
  b.onclick=()=>attachmentDialog(ref,title,paint);
  return b;
}

export function attachmentDialog(ref,title,onChange){
  D.attachments=D.attachments||[];
  const body=el('div');
  const list=el('div');
  const drop=el('div','dropzone');
  drop.innerHTML='<b>Drop files here</b><span>or click to choose — images and PDFs, up to 4 MB each</span>';
  const picker=el('input');picker.type='file';picker.multiple=true;
  picker.accept='image/*,application/pdf';picker.style.display='none';
  drop.onclick=()=>picker.click();
  drop.ondragover=e=>{e.preventDefault();drop.classList.add('over');};
  drop.ondragleave=()=>drop.classList.remove('over');
  drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');take(e.dataTransfer.files);};
  picker.onchange=()=>take(picker.files);
  body.append(drop,picker,list);

  async function take(files){
    let added=0;
    for(const f of [...files]){
      if(f.size>MAX_FILE){toast(`${f.name} is over 4 MB — skipped`,1);continue;}
      const id=uid();
      await filePut(id,f);
      D.attachments.push({id,ref,name:f.name,type:f.type,size:f.size,
        added:new Date().toISOString()});
      added++;
    }
    if(added){save();draw();if(onChange)onChange();
      audit('add','attachment',`${added} file(s) on ${title||ref}`);
      toast(`${added} file${added===1?'':'s'} attached`);}
  }

  function draw(){
    list.innerHTML='';
    const items=attachmentsFor(ref);
    if(!items.length){
      list.append(el('div','hint','Nothing attached yet.'));
      return;
    }
    items.forEach(a=>{
      const row=el('div','attrow');
      const isImg=String(a.type).startsWith('image/');
      row.innerHTML=`<div class="ic">${isImg?'🖼':'📄'}</div>
        <div class="nm"><b>${esc(a.name)}</b>
          <span>${(a.size/1024).toFixed(0)} KB · ${fmtDate(String(a.added).slice(0,10))}</span></div>`;
      const open=el('button','btn sm','Open');
      open.onclick=async()=>{
        const blob=await fileGet(a.id);
        if(!blob){toast('File missing from storage',1);return;}
        const url=URL.createObjectURL(blob);
        window.open(url,'_blank');
        setTimeout(()=>URL.revokeObjectURL(url),60000);
      };
      const dl2=el('button','btn sm','Save');
      dl2.onclick=async()=>{
        const blob=await fileGet(a.id);if(!blob)return;
        const x=el('a');x.href=URL.createObjectURL(blob);x.download=a.name;x.click();
        setTimeout(()=>URL.revokeObjectURL(x.href),4000);
      };
      const del=el('button','btn sm d','×');
      del.onclick=async()=>{
        if(!confirm(`Remove ${a.name}?`))return;
        await fileDel(a.id);
        D.attachments=D.attachments.filter(x=>x.id!==a.id);
        save();draw();if(onChange)onChange();toast('Removed');
      };
      const acts=el('div','acts');acts.append(open,dl2,del);
      row.append(acts);
      list.append(row);
    });
  }
  draw();

  modal(`Attachments${title?' — '+title:''}`,body,[{label:'Close'}]);
}
