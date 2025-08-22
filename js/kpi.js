// js/kpi.js
import { state } from './state.js';
const pct=(n,d)=>!d?'-':Math.round((n/d)*1000)/10+'%';
const $=s=>document.querySelector(s);

export function setKPIs(){
  const base = state.baseRows||[];
  const total = base.length;
  const normal   = base.filter(v=>v._risk==='normal').length;
  const warning  = base.filter(v=>v._risk==='warning').length;
  const critical = base.filter(v=>v._risk==='critical').length;
  const expired  = base.filter(v=>v.expBucket==='Expired').length;
  const cnmis    = base.filter(v=>v.identityIssue).length;
  const net      = base.filter(v=>v.netIssue).length;

  $('#kpi-total')       && ($('#kpi-total').textContent        = String(total));
  $('#kpi-normal')      && ($('#kpi-normal').textContent       = String(normal));
  $('#kpi-warning')     && ($('#kpi-warning').textContent      = String(warning));
  $('#kpi-critical')    && ($('#kpi-critical').textContent     = String(critical));
  $('#kpi-ssl-expired') && ($('#kpi-ssl-expired').textContent  = String(expired));
  $('#kpi-ssl-cn')      && ($('#kpi-ssl-cn').textContent       = String(cnmis));
  $('#kpi-net')         && ($('#kpi-net').textContent          = String(net));

  $('#kpi-total-sub')       && ($('#kpi-total-sub').textContent       = '-');
  $('#kpi-normal-sub')      && ($('#kpi-normal-sub').textContent      = pct(normal,total));
  $('#kpi-warning-sub')     && ($('#kpi-warning-sub').textContent     = pct(warning,total));
  $('#kpi-critical-sub')    && ($('#kpi-critical-sub').textContent    = pct(critical,total));
  $('#kpi-ssl-expired-sub') && ($('#kpi-ssl-expired-sub').textContent = pct(expired,total));
  $('#kpi-ssl-cn-sub')      && ($('#kpi-ssl-cn-sub').textContent      = pct(cnmis,total));
  $('#kpi-net-sub')         && ($('#kpi-net-sub').textContent         = pct(net,total));
}

export function markKPIActive(filter){
  const cards = document.querySelectorAll('.kpis .card.kpi'); Array.prototype.forEach.call(cards,c=>c.classList.remove('active'));
  const card = document.querySelector('.kpis .card.kpi[data-filter="'+filter+'"]'); if(card) card.classList.add('active');
}

let _bound=false;
export function bindKPICards(){
  if(_bound) return; _bound=true;
  const cards=document.querySelectorAll('.kpis .card.kpi');
  Array.prototype.forEach.call(cards, c=>{
    if(!c.hasAttribute('tabindex')) c.setAttribute('tabindex','0');
    if(!c.hasAttribute('role')) c.setAttribute('role','button');
  });
  function dispatchFilter(f){
    markKPIActive(f);
    document.dispatchEvent(new CustomEvent('dm:set-filter',{detail:{filter:f}}));
  }
  const handler=(e)=>{
    const el=e.target.closest && e.target.closest('.kpis .card.kpi[data-filter]');
    if(!el) return;
    dispatchFilter(el.getAttribute('data-filter')||'all');
    e.preventDefault();
  };
  window.addEventListener('click', handler, true);
  window.addEventListener('pointerup', handler, true);
  document.addEventListener('keydown', (e)=>{
    if(e.key!=='Enter' && e.key!==' ') return;
    const el=document.activeElement;
    if(el && el.matches('.kpis .card.kpi[data-filter]')){
      dispatchFilter(el.getAttribute('data-filter')||'all'); e.preventDefault();
    }
  }, true);
}
