// js/app.js  (shots 모드에서 도메인 필터/검색줄 완전 숨김 + HTTP 코드 버튼만 노출)
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
import { openRawView, closeRawView, bindRawModal } from './table/rawViewer.js';
import { toast } from './ui/notify.js';
import { spinnerOn, spinnerOff } from './ui/spinner.js';

const byId = (id)=> document.getElementById(id);

let RUNS = [''];
let DOMAINS = Object.keys(CSV_FALLBACK || {});

// 검색창 분리/복원용 (도메인 탭에만 존재)
let __dmSearchNode = null;
let __dmSearchAnchor = null;

function detachSearchForShots() {
  // .selectors .search 래퍼를 떼서 보관
  const wrap = document.querySelector('.selectors .search');
  if (!wrap || __dmSearchNode) return; // 이미 분리됨
  __dmSearchNode = wrap;
  __dmSearchAnchor = document.createElement('div');
  __dmSearchAnchor.id = 'search-placeholder';
  wrap.parentNode.insertBefore(__dmSearchAnchor, wrap);
  wrap.remove();
}

function restoreSearchFromShots() {
  if (!__dmSearchNode || !__dmSearchAnchor) return;
  if (__dmSearchAnchor.parentNode) {
    __dmSearchAnchor.parentNode.replaceChild(__dmSearchNode, __dmSearchAnchor);
  }
  __dmSearchNode = null;
  __dmSearchAnchor = null;
}


function prettyRun(run){
  if(!run) return '(기본)';
  return (/^\d{8}$/).test(run) ? (run.slice(0,4)+'-'+run.slice(4,6)+'-'+run.slice(6,8)) : run;
}

async function discoverRunsFromDir(){
  try{
    const html = await fetchText('data/');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const anchors = Array.prototype.slice.call(doc.querySelectorAll('a[href]'));
    const names = anchors
      .map((a)=> decodeURIComponent((a.getAttribute('href')||'').replace(/\/?(\?.*)?$/,'')))
      .map((n)=> n.replace(/\/$/,''))
      .filter((n)=> (/^\d{8}$/).test(n));
    const uniq = Array.from(new Set(names));
    return uniq.sort((a,b)=> b.localeCompare(a));
  }catch(e){ return []; }
}

async function loadRuns(){
  try{
    const arr = await fetchJSON(RUNS_SOURCE);
    if(Array.isArray(arr) && arr.length){ RUNS = arr.sort((a,b)=> b.localeCompare(a)); return; }
    throw new Error('empty runs.json');
  }catch(e){
    const guessed = await discoverRunsFromDir();
    RUNS = guessed.length ? guessed : [''];
    if(!guessed.length){ toast('runs.json이 없고 data/ 폴더에서 날짜를 찾지 못했어요. (기본 경로 모드)', 'warn', 4500); }
  }
}

function populateSelectors(){
  const runSel = byId('runSelect');
  const lastRun = localStorage.getItem('dm:lastRun');
  runSel.innerHTML = RUNS.map((r)=> `<option value="${r}">${prettyRun(r)}</option>`).join('');
  state.currentRun = runSel.value = (lastRun && RUNS.indexOf(lastRun) >= 0) ? lastRun : (RUNS[0] || '');

  if(!DOMAINS.length){ DOMAINS = ['lge.com']; }
  const dsSel = byId('dsSelect');
  const lastDom = localStorage.getItem('dm:lastDomain');
  dsSel.innerHTML = DOMAINS.map((d)=> `<option value="${d}">${d}</option>`).join('');
  state.currentDS = dsSel.value = (lastDom && DOMAINS.indexOf(lastDom) >= 0) ? lastDom : (DOMAINS[0] || 'lge.com');

  // shots 전용 드롭다운도 동기화
  const dsShots = byId('dsSelectShots'); if (dsShots){ dsShots.innerHTML = dsSel.innerHTML; dsShots.value = state.currentDS; }
  const runShots = byId('runSelectShots'); if (runShots){ runShots.innerHTML = runSel.innerHTML; runShots.value = state.currentRun; }
}

async function loadDataset(domain, run){
  state.currentDS = domain; state.currentRun = run;
  localStorage.setItem('dm:lastDomain', domain);
  localStorage.setItem('dm:lastRun', run || '');

  const dsShots = byId('dsSelectShots'); if (dsShots) dsShots.value = domain;
  const runShots = byId('runSelectShots'); if (runShots) runShots.value = run;

  spinnerOn('table', byId('tab-domains') || document.body);

  let rows = []; let note='';
  try{
    if(run){
      const text = await fetchText(csvPath(domain, run));
      rows = parseCSV(text);
      if(!rows.length) note = `CSV가 비어 있거나 파싱된 행이 없습니다. (${domain}, ${prettyRun(run)})`;
    }else{
      const fbArr = CSV_FALLBACK[domain] || [];
      const fb = fbArr[0];
      const text = await fetchText(fb);
      rows = parseCSV(text);
      if(!rows.length) note = `CSV가 비어 있거나 파싱된 행이 없습니다. (${domain}, 기본 경로)`;
    }
  }catch(e){
    console.error('[CSV] 로드 실패]:', e);
    toast('CSV를 불러오지 못했습니다. 경로/권한/파일명을 확인하세요.', 'error', 5000);
    note = 'CSV 로딩 실패: 경로 또는 권한 문제일 수 있습니다.';
    rows = [];
  }

  state.loadNote = note;
  window.__BASE_VIEW__ = buildView(rows);
  state.baseRows = window.__BASE_VIEW__;
  state.viewRows = state.baseRows.slice();

  try{
    state.images = await loadImageIndex(domain, run);
    if(document.body.classList.contains('mode-shots')){
      const tabShots = byId('tab-shots');
      spinnerOn('shots', tabShots || document.body);
      const shotsStream = byId('shotsStream');
      renderShotsStream(shotsStream, state.images);
      spinnerOff('shots');
    }
  }catch(e){
    console.warn('[IMG] 인덱스 실패:', e);
    toast('스크린샷 목록을 불러오지 못했습니다(manifest 혹은 디렉터리 인덱스).', 'error', 5000);
    state.images = { latestMap:new Map(), all:[] };
  }

  setKPIs();
  renderTable();
  applyFilter();

  spinnerOff('table');
}

// === 모드 전환: shots 모드에서는 도메인 필터/검색줄 숨김 ===
function enterShotsMode(){
  document.body.classList.add('mode-shots');
  const shotsCtrl = document.getElementById('shotsControls');
  if(shotsCtrl){ shotsCtrl.style.display = ''; }
  detachSearchForShots();   // ★ 검색창 제거
}

function exitShotsMode(){
  document.body.classList.remove('mode-shots');
  const shotsCtrl = document.getElementById('shotsControls');
  if(shotsCtrl){ shotsCtrl.style.display = 'none'; }
  restoreSearchFromShots(); // ★ 검색창 복원
}


function bindGlobal(){
  byId('runSelect').addEventListener('change', ()=> loadDataset(byId('dsSelect').value, byId('runSelect').value));
  byId('dsSelect').addEventListener('change', ()=> loadDataset(byId('dsSelect').value, byId('runSelect').value));

  const dsShots = byId('dsSelectShots');
  if (dsShots){ dsShots.addEventListener('change', ()=> loadDataset(dsShots.value, (byId('runSelectShots')?.value || byId('runSelect').value))); }
  const runShots = byId('runSelectShots');
  if (runShots){ runShots.addEventListener('change', ()=> loadDataset((byId('dsSelectShots')?.value || byId('dsSelect').value), runShots.value)); }

  // 탭 클릭 시 모드 전환
  document.addEventListener('click', (e)=>{
    const t = e.target.closest('.tabbtn');
    if(!t) return;
    const isShots = t.dataset.tab === 'shots';
    setTimeout(()=>{
      if(isShots) enterShotsMode(); else exitShotsMode();
    }, 0);
  });

  const home = document.getElementById('btnHome');
  function onScroll(){
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    if(y > 240) home?.classList.add('show'); else home?.classList.remove('show');
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
}

document.addEventListener('DOMContentLoaded', async function(){
  setupTabs({
    onEnterShots: function(){
      enterShotsMode();
      const tabShots = byId('tab-shots');
      spinnerOn('shots', tabShots || document.body);
      const shotsStream = byId('shotsStream');
      renderShotsStream(shotsStream, state.images);
      spinnerOff('shots');
    },
    onEnterDomains: function(){
      exitShotsMode();
    }
  });

  bindFilterButtons(); // 도메인 탭에서만 보이게 CSS로 제어
  bindSearch();
  bindGlobal();
  bindRawModal();
  bindKPICards();

  await loadRuns();
  populateSelectors();
  await loadDataset(byId('dsSelect').value, byId('runSelect').value);
});
