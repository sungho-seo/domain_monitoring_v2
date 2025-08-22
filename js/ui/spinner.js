// js/ui/spinner.js
export function spinnerOn(key, host=document.body){
  let box=document.getElementById('spin-'+key);
  if(!box){ box=document.createElement('div'); box.id='spin-'+key; box.style.position='absolute'; box.style.inset='0'; box.style.display='flex'; box.style.alignItems='center'; box.style.justifyContent='center'; box.style.background='rgba(255,255,255,.6)'; box.innerHTML='<div style="padding:14px 18px;border-radius:10px;background:#111827;color:#fff">Loading…</div>'; (host||document.body).appendChild(box); }
}
export function spinnerOff(key){
  const box=document.getElementById('spin-'+key); if(box && box.parentNode) box.parentNode.removeChild(box);
}
