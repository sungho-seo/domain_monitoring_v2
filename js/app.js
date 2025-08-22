// js/app.js
import { CSV_FALLBACK, RUNS_SOURCE, csvPath } from './config.js';
import { state } from './state.js';
import { fetchText, fetchJSON } from './net.js';
import { parseCSV, buildView } from './csv.js';
import { loadImageIndex } from './images/indexer.js';
import { renderShotsStream } from './images/stream.js';
import { setupTabs } from './ui/tabs.js';
import { bindFilterButtons, applyFilter } from './table/filters.js';
import { bindSearch } from './table/search.js';
import { renderTable } from './table/render.js';
import { setKPIs, bindKPICards } from './kpi.js';
import { openRawView, bindRawModal } from './table/rawViewer.js';
import { toast } from './ui/notify.js';
import { spinnerOn, spinnerOff } from './ui/spinner.js';

const byId = (id)=>document.getElementById(id);
let RUNS = [''];
let DOMAINS = Object.keys(CSV_FALLBACK || {});

function prettyRun(run){
  if(!run) return '(기본)';
  return (/^\d{8}$/).test(run) ? (run.slice(0,4)+'-'+run.slice(4,6)+'-'+run.slice(6,8)) : run;
}

async function discoverRunsFromDir(){
  try{
    const html = await fetchText('data/');
    const doc = new DOMParser().parseFromString(html,'text/html');
    const anchors=[...doc.querySelectorAll('a[href]')];
    const names=[...new Set(anchors.map(a=>(a.getAttribute('href')||'').replace(/\/?(\?.*)?$/,'').replace(/\/$/,'')).filter(n=>/^\d{8}$/.test(n)))];
    return names.sort((a,b)=>b.localeCompare(a));
  }catch(e){ return []; }
}

async function loadRuns(){
  try{
    const arr = await fetchJSON(RUNS_SOURCE);
    if(Array.isArray(arr) && arr.length){ RUNS = arr.sort((a,b)=>b.localeCompare(a)); return; }
    throw new Error('empty runs.json');
  }catch(e){
    const guessed = await discoverRunsFromDir();
    RUNS = guessed.length ? guessed : [''];
    if(!guessed.length){ toast('runs.json이 없고 data/ 폴더에서 날짜를 찾지 못했어요. (기본 경로 모드)', 'warn', 4500); }
  }
}

function populateSelectors(){
  const runSel=byId('runSelect'); const lastRun=localStorage.getItem('dm:lastRun');
  runSel.innerHTML = RUNS.map(r=>`<option value="${r}">${prettyRun(r)}</option>`).join('');
  state.currentRun = runSel.value = (lastRun && RUNS.indexOf(lastRun)>=0) ? lastRun : (RUNS[0]||'');

  if(!DOMAINS.length){ DOMAINS=['lge.com']; }
  const dsSel=byId('dsSelect'); const lastDom=localStorage.getItem('dm:lastDomain');
  dsSel.innerHTML = DOMAINS.map(d=>`<option value="${d}">${d}</option>`).join('');
  state.currentDS = dsSel.value = (lastDom && DOMAINS.indexOf(lastDom)>=0) ? lastDom : (DOMAINS[0]||'lge.com');
}

async function loadDataset(domain, run){
  state.currentDS=domain; state.currentRun=run;
  localStorage.setItem('dm:lastDomain', domain);
  localStorage.setItem('dm:lastRun', run||'');

  const tabDomains=byId('tab-domains'); spinnerOn('table', tabDomains);

  let rows=[]; let note='';
  try{
    const path = csvPath(domain, run);
    const text = await fetchText(path);
    rows = parseCSV(text);
    if(!rows.length) note='CSV가 비어있습니다.';
  }catch(e){
    console.error('[CSV] 로드 실패:', e); toast('CSV 로드 실패', 'error', 4000); rows=[]; note='CSV 로딩 실패';
  }

  state.loadNote=note;
  state.baseRows = buildView(rows);
  state.viewRows = state.baseRows.slice();

  try{
    state.images = await loadImageIndex(domain, run);
  }catch(e){
    console.warn('[IMG] 인덱스 실패:', e); state.images={ latestMap:new Map(), all:[] };
  }

  setKPIs();
  renderTable();
  applyFilter();

  spinnerOff('table');
}

function bindGlobal(){
  byId('runSelect').addEventListener('change',()=> loadDataset(byId('dsSelect').value, byId('runSelect').value));
  byId('dsSelect').addEventListener('change',()=> loadDataset(byId('dsSelect').value, byId('runSelect').value));

  document.addEventListener('click',(e)=>{
    const rawBtn=e.target.closest('button.raw-btn[data-id]');
    if(rawBtn){
      const id=Number(rawBtn.getAttribute('data-id'));
      const item=(state.viewRows||[]).find(v=>v._id===id);
      if(item){ const tr=rawBtn.closest('tr'); openRawView(item._raw, id, item.url, tr, {mode:'raw'}); }
      return;
    }
    const shotBtn=e.target.closest('button.shot-btn[data-host]');
    if(shotBtn){
      const btnShots=document.querySelector('.tabsbar .tabbtn[data-tab="shots"]');
      if(btnShots){ btnShots.click(); }
      return;
    }
  });

  document.addEventListener('dm:set-filter', (ev)=>{
    const f = ev && ev.detail && ev.detail.filter ? ev.detail.filter : 'all';
    const btns=document.querySelectorAll('.filters .btn'); btns.forEach(b=>b.classList.remove('active'));
    const sel=document.querySelector('.filters .btn[data-filter="'+f+'"]'); if(sel) sel.classList.add('active');
    state.activeFilter = f;
    import('./table/filters.js').then(m=> m.applyFilter && m.applyFilter());
  });

  byId('btnHome').addEventListener('click',()=>{
    const topEl=document.querySelector('.tabsbar'); (topEl||document.body).scrollIntoView({behavior:'smooth',block:'start'});
  });
}

document.addEventListener('DOMContentLoaded', async function(){
  setupTabs({
    onEnterShots: function(){
      const host=document.getElementById('tab-shots');
      spinnerOn('shots', host);
      const shotsStream=document.getElementById('shotsStream');
      import('./images/stream.js').then(m=> m.renderShotsStream && m.renderShotsStream(shotsStream, state.images));
      spinnerOff('shots');
      const home=document.getElementById('btnHome'); if(home) home.classList.add('active');
    }
  });
  bindFilterButtons();
  bindSearch();
  bindGlobal();
  bindRawModal();
  bindKPICards();

  await loadRuns();
  populateSelectors();
  await loadDataset(document.getElementById('dsSelect').value, document.getElementById('runSelect').value);
});
