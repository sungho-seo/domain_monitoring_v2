// js/table/rawViewer.js
let modal, paneOverview, paneJSON, preJSON;
function open(){ modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); }
function close(){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); }
export function bindRawModal(){
  modal = document.getElementById('rawModal');
  paneOverview = document.getElementById('pane-overview');
  paneJSON = document.getElementById('pane-json');
  preJSON = document.getElementById('pre-json');
  if(!modal) return;
  modal.addEventListener('click', (e)=>{
    if(e.target===modal || e.target.hasAttribute('data-close')) close();
  });
  const tabs = modal.querySelectorAll('header .tabs button[data-pane]');
  tabs.forEach(btn=>btn.addEventListener('click',()=>{
    tabs.forEach(b=>b.classList.remove('active')); btn.classList.add('active');
    const pane = btn.getAttribute('data-pane');
    if(pane==='overview'){ paneOverview.style.display='block'; paneJSON.style.display='none'; }
    if(pane==='json'){ paneOverview.style.display='none'; paneJSON.style.display='block'; }
  }));
}
export function openRawView(raw, id, url, tr, opts={mode:'raw'}){
  if(!modal) bindRawModal();
  const rows = Object.entries(raw||{}).map(([k,v])=>`<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${k}</td><td style="padding:6px 8px;border-bottom:1px solid #eee">${String(v)}</td></tr>`).join('');
  paneOverview.innerHTML = `<div style="font-weight:600;margin:6px 0">${url||''}</div><table style="width:100%;border-collapse:collapse">${rows||'<tr><td>(원본 없음)</td></tr>'}</table>`;
  preJSON.textContent = JSON.stringify(raw||{}, null, 2);
  const tabs = modal.querySelectorAll('header .tabs button[data-pane]');
  tabs.forEach(b=>b.classList.remove('active')); if(tabs[0]) tabs[0].classList.add('active');
  paneOverview.style.display='block'; paneJSON.style.display='none';
  open();
}
