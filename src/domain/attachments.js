/** Files attached to an entry, kept in the browser's own file store. */
import { D } from '../core/store.js';

export function attachmentsFor(ref){return (D.attachments||[]).filter(a=>a.ref===ref);}

export function attachCount(ref){return attachmentsFor(ref).length;}
