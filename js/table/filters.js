// js/table/filters.js
import { state } from '../state.js';
import { renderTable } from './render.js';
import { sortInPlace } from './sort.js';
import { markKPIActive } from '../kpi.js';

export function bindFilterButtons(){
  document.addEventListener('click', (e)=>{
    const fbtn = e.target.closest('.filters .btn');
    if(!fbtn) return;
    document.querySelectorAll('.filters .btn').forEach(b=>b.classList.remove('active'));
    fbtn.classList.add('active');
    state.activeFilter = fbtn.dataset.filter || 'all';
    markKPIActive(state.activeFilter);
    applyFilter();
  });
}

export function applyFilter(){
  let view = (state.baseRows||[]).slice();

  if(state.activeFilter==='normal')   view=view.filter(v=>v._risk==='normal');
  if(state.activeFilter==='abnormal') view=view.filter(v=>v._risk!=='normal');
  if(state.activeFilter==='warning')  view=view.filter(v=>v._risk==='warning');
  if(state.activeFilter==='critical') view=view.filter(v=>v._risk==='critical');

  if(state.activeFilter==='ssl-expired') view=view.filter(v=>v.expBucket==='Expired');
  if(state.activeFilter==='ssl-7d')      view=view.filter(v=>v.expBucket==='D≤7');
  if(state.activeFilter==='ssl-30d')     view=view.filter(v=>v.expBucket==='D8–30');

  if(state.activeFilter==='ssl-cn')      view=view.filter(v=>v.identityIssue);

  if(state.activeFilter==='net-issue')   view=view.filter(v=>v.netIssue);
  if(state.activeFilter==='dns-fail')    view=view.filter(v=>v.dnsIssue);
  if(state.activeFilter==='timeout')     view=view.filter(v=>v.timeoutIssue);
  if(state.activeFilter==='connect-fail')view=view.filter(v=>v.connectIssue);

  if(state.activeFilter==='chain-issue') view=view.filter(v=>v.chainIssue);
  if(state.activeFilter==='tls-issue')   view=view.filter(v=>v.tlsIssue);
  if(state.activeFilter==='policy-issue')view=view.filter(v=>v.policyIssue);
  if(state.activeFilter==='http-exposed')view=view.filter(v=>v.httpExposed);

  if(state.activeFilter==='has-screenshot') view=view.filter(v=> state.images.latestMap && state.images.latestMap.has(v.host));

  if(state.searchQuery){
    const q = state.searchQuery.toLowerCase();
    view = view.filter(v=>
      (v.url||'').toLowerCase().includes(q) ||
      (v.host||'').toLowerCase().includes(q) ||
      (v.simplified||'').toLowerCase().includes(q) ||
      (v._risk||'').toLowerCase().includes(q) ||
      (v.identity||'').toLowerCase().includes(q) ||
      (v.chain||'').toLowerCase().includes(q) ||
      (v.tls||'').toLowerCase().includes(q) ||
      (v.advice||'').toLowerCase().includes(q) ||
      JSON.stringify(v._raw||{}).toLowerCase().includes(q)
    );
  }

  sortInPlace(view);
  state.viewRows = view;
  renderTable();
}
