// js/ui/notify.js
export function toast(msg, type='info', ms=2500){
  console[type==='error'?'error':(type==='warn'?'warn':'log')](msg);
}
