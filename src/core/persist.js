/**
 * Saving, the activity log, and file attachments.
 *
 * Where the data actually goes is decided by core/backend.js — this browser,
 * or the office server. Nothing here needs to know which.
 *
 * save() is debounced, so a burst of typing becomes one write. A failed write
 * used to vanish silently; now it says so, because a person who thinks their
 * books are saved and finds out otherwise is the worst case.
 */
import { D } from './store.js';
import { toast } from '../ui/toast.js';
import { loadData, saveData, putFile, getFile, delFile, ConflictError } from './backend.js';

export function publishD(){try{window.D=D;}catch(e){}}

/** Read the whole store. Returns the data, or undefined when there is none yet. */
export async function kvGet(){
  const got = await loadData();
  return got ? got.data : undefined;
}

/** Write the whole store. */
export async function kvSet(_key, value){
  return saveData(value === undefined ? D : value);
}

export let _t=null,_saveWarned=false,_conflict=false;

export function save(){
  publishD();clearTimeout(_t);
  _t=setTimeout(()=>{
    saveData(D).then(()=>{_saveWarned=false;}).catch((e)=>{
      if(e instanceof ConflictError||e?.conflict){
        // Someone else saved while this person was editing. Never overwrite
        // them silently — say so and let the person reload.
        if(!_conflict){_conflict=true;
          try{toast('Someone else saved changes. Reload the page before carrying on, or your work may clash.',1);}catch(x){}}
        return;
      }
      if(!_saveWarned){_saveWarned=true;
        try{toast('Could not save — recent changes may be lost if you close this tab.',1);}catch(x){}}
    });
  },350);
}

export function audit(action,what,detail,before,after){
  if(!D)return;
  D.audit=D.audit||[];
  D.audit.unshift({ts:new Date().toISOString(),action,what,detail:String(detail||''),
    before:before===undefined?null:before,after:after===undefined?null:after});
  if(D.audit.length>800)D.audit.length=800;
}

export const MAX_FILE=4*1024*1024;

export const filePut=(id,blob)=>putFile(id,blob);
export const fileGet=(id)=>getFile(id);
export const fileDel=(id)=>delFile(id);
