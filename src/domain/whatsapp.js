/** Turning a stored phone number into something WhatsApp will accept. */
export function waNumber(raw){
  let s=String(raw||'').replace(/\D/g,'');
  if(!s)return '';
  s=s.replace(/^0+/,'');
  if(!s.startsWith('971'))s='971'+s;
  return s;
}
