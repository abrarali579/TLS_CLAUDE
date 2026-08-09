/**
 * Saving to the browser's own database (IndexedDB).
 *
 * Two stores live in one database, opened at the SAME version everywhere.
 * save() is debounced, so rapid edits become one write. If storage is
 * unavailable the app keeps working in memory and warns the person once,
 * rather than dying with a blank screen.
 */
import { D } from './store.js';
import { toast } from '../ui/toast.js';

export const DB='timelink_db', ST='kv';

export function publishD(){try{window.D=D;}catch(e){}}

export function idb(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,2);
  r.onupgradeneeded=()=>{
    const db=r.result;
    if(!db.objectStoreNames.contains(ST))db.createObjectStore(ST);
    if(!db.objectStoreNames.contains('files'))db.createObjectStore('files');
  };
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}

export async function kvGet(k){const db=await idb();return new Promise(r=>{const q=db.transaction(ST).objectStore(ST).get(k);
  q.onsuccess=()=>r(q.result);q.onerror=()=>r(undefined);});}

export async function kvSet(k,v){const db=await idb();return new Promise(r=>{const t=db.transaction(ST,'readwrite');
  t.objectStore(ST).put(v,k);t.oncomplete=()=>r();});}

export let _t=null,_saveWarned=false;

export function save(){
  publishD();clearTimeout(_t);
  _t=setTimeout(()=>{
    kvSet('data',D).catch(()=>{
      // a rejected write used to vanish silently — the user would keep
      // working with no idea their changes stopped being saved to disk
      if(!_saveWarned){_saveWarned=true;
        try{toast('Could not save to local storage — recent changes may be lost if you close this tab.',1);}catch(e){}}
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

export const FILE_STORE='files';

export const MAX_FILE=4*1024*1024;

export function fdb(){return idb();}

export async function filePut(id,blob){
  const db=await fdb();
  return new Promise(r=>{const t=db.transaction(FILE_STORE,'readwrite');
    t.objectStore(FILE_STORE).put(blob,id);t.oncomplete=()=>r();});
}

export async function fileGet(id){
  const db=await fdb();
  return new Promise(r=>{const q=db.transaction(FILE_STORE).objectStore(FILE_STORE).get(id);
    q.onsuccess=()=>r(q.result);q.onerror=()=>r(null);});
}

export async function fileDel(id){
  const db=await fdb();
  return new Promise(r=>{const t=db.transaction(FILE_STORE,'readwrite');
    t.objectStore(FILE_STORE).delete(id);t.oncomplete=()=>r();});
}
