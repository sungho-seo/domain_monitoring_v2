// js/ui/tabs.js
export function setupTabs({onEnterShots}={}){
  const btns=document.querySelectorAll('.tabsbar .tabbtn');
  const tabDomains=document.getElementById('tab-domains');
  const tabShots=document.getElementById('tab-shots');
  btns.forEach(b=>b.addEventListener('click',()=>{
    btns.forEach(x=>x.classList.remove('active')); b.classList.add('active');
    const tab=b.getAttribute('data-tab');
    if(tab==='domains'){ tabDomains.style.display='block'; tabShots.style.display='none'; }
    else{ tabDomains.style.display='none'; tabShots.style.display='block'; onEnterShots && onEnterShots(); }
  }));
}
