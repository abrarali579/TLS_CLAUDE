/**
 * The spreadsheet-style sheet: arrow-key movement between cells, row locking,
 * and pasting a block of cells straight from Excel.
 */
import { parseClipTable } from '../lib/dates.js';
import { toast } from './toast.js';

export function gridCells(scope){return [...scope.querySelectorAll('[data-nav]')];}

export function focusCell(scope,r,c){
  const cells=gridCells(scope);
  let best=null;
  cells.forEach(x=>{
    if(+x.dataset.r===r&&+x.dataset.c===c)best=x;
  });
  if(!best){ // fall back to nearest column on that row
    const inRow=cells.filter(x=>+x.dataset.r===r);
    if(inRow.length)best=inRow.reduce((a,b)=>Math.abs(+b.dataset.c-c)<Math.abs(+a.dataset.c-c)?b:a);
  }
  if(best){
    best.focus();
    if(best.select)try{best.select();}catch(e){}
    if(best.scrollIntoView)try{best.scrollIntoView({block:'nearest',inline:'nearest'});}catch(e){}
    return true;}
  return false;
}

export function maxRow(scope){return gridCells(scope).reduce((a,x)=>Math.max(a,+x.dataset.r),0);}

export function lockRow(tr){
  tr.classList.add('locked');
  tr.querySelectorAll('.cell,.pf').forEach(i=>{i.readOnly=true;i.dataset.lock='1';});
}

export function unlockRow(tr,focusEl){
  tr.classList.remove('locked');
  tr.querySelectorAll('[data-lock]').forEach(i=>{
    if(i.dataset.k!=='profit')i.readOnly=false;
    delete i.dataset.lock;
  });
  tr.classList.add('editing');
  if(focusEl&&focusEl.focus){focusEl.focus();if(focusEl.select)try{focusEl.select();}catch(e){}}
}

export function bindRowLock(tr,isFilled){
  if(!isFilled)return;
  lockRow(tr);
  tr.addEventListener('dblclick',ev=>{
    if(!tr.classList.contains('locked'))return;
    const t=ev.target.closest('.cell,.pf');
    unlockRow(tr,t);
  });
  // a single click on a locked row just selects it, and hints how to edit
  tr.addEventListener('click',ev=>{
    if(!tr.classList.contains('locked'))return;
    if(tr.dataset.hinted)return;
    tr.dataset.hinted='1';
    toast('Double-click the row to edit it');
    setTimeout(()=>{delete tr.dataset.hinted;},4000);
  });
}

export function gridKey(ev,scope,opts){
  opts=opts||{};
  const t=ev.target,r=+t.dataset.r,c=+t.dataset.c;
  if(isNaN(r))return false;
  /* The Paid-From pill is a <span>, not a text input, so it has no
     selectionStart/selectionEnd at all (both undefined). Left/right arrows
     used to silently do nothing on that column because atStart/atEnd came
     out false and it isn't a <select> either. A span has no native arrow-key
     behavior of its own though (unlike a real <select>, which needs plain
     up/down reserved to change its value) — so only widen the "no text
     caret" allowance to the left/right check, not the up/down one. */
  const hasSelection=typeof t.selectionStart==='number';
  const atStart=!hasSelection||(t.selectionStart===0&&t.selectionEnd===0);
  const atEnd=!hasSelection||(t.selectionStart===t.value.length&&t.selectionEnd===t.value.length);
  const isSel=t.tagName==='SELECT';
  const blocksHorizNav=isSel||!hasSelection;
  switch(ev.key){
    case 'ArrowDown':
      if(isSel&&!ev.altKey)return false;
      ev.preventDefault();
      if(r>=maxRow(scope)&&opts.onOverflow)opts.onOverflow();
      else focusCell(scope,r+1,c);
      return true;
    case 'ArrowUp':
      if(isSel&&!ev.altKey)return false;
      ev.preventDefault();focusCell(scope,r-1,c);return true;
    case 'ArrowLeft':
      if(!blocksHorizNav&&!atStart)return false;
      ev.preventDefault();
      if(!focusCell(scope,r,c-1))focusCell(scope,r-1,99);
      return true;
    case 'ArrowRight':
      if(!blocksHorizNav&&!atEnd)return false;
      ev.preventDefault();
      if(!focusCell(scope,r,c+1))focusCell(scope,r+1,0);
      return true;
    case 'Enter':
      ev.preventDefault();
      if(r>=maxRow(scope)&&opts.onOverflow)opts.onOverflow();
      else focusCell(scope,r+1,c);
      return true;
    case 'Home':
      if(!ev.ctrlKey)return false;
      ev.preventDefault();focusCell(scope,0,0);return true;
    case 'End':
      if(!ev.ctrlKey)return false;
      ev.preventDefault();focusCell(scope,maxRow(scope),0);return true;
    default:return false;
  }
}

export function bindPaste(scope,opts){
  scope.addEventListener('paste',ev=>{
    const t=ev.target;
    if(!t||!t.dataset||t.dataset.nav!=='1')return;
    const raw=(ev.clipboardData||window.clipboardData).getData('text');
    const grid=parseClipTable(raw);
    if(grid.length<=1&&grid[0]&&grid[0].length<=1)return;   // single value → normal paste
    ev.preventDefault();
    const r0=+t.dataset.r,c0=+t.dataset.c;
    let written=0,rowsAdded=0;
    grid.forEach((line,ri)=>{
      const rowIdx=r0+ri;
      while(rowIdx>maxRow(scope)){opts.grow();rowsAdded++;}
      line.forEach((val,ci)=>{
        if(opts.apply(rowIdx,c0+ci,String(val).trim()))written++;
      });
    });
    opts.done&&opts.done();
    toast(`Pasted ${grid.length} row${grid.length===1?'':'s'} · ${written} cells filled`+
      (rowsAdded?` · ${rowsAdded} new rows`:''));
  });
}
