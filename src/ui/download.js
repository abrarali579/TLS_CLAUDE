/** Hand the browser a file to save. */
import { el } from '../lib/dom.js';
import { toast } from './toast.js';

export function dl(blob,name){const a=el('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast('Saved '+name);}
