
// js/table/rawViewer.js — robust modal viewer
// Exports: openRawView, closeRawView, bindRawModal
// - 'raw' 모드: 개요/JSON 두 탭 제공
// - 'shot' 모드: 간단 이미지 프리뷰 (data가 없으면 안내 문구)

let modalEl = null;
let dialogEl = null;
let bodyEl = null;
let titleEl = null;
let tabBarEl = null;
let panelOverview = null;
let panelJSON = null;
let panelShot = null;
let activeRow = null;

function ensureModal(){
  if (modalEl) return;
  modalEl = document.createElement('div');
  modalEl.id = 'rawModal';
  modalEl.setAttribute('aria-hidden','true');
  modalEl.style.position = 'fixed';
  modalEl.style.inset = '0';
  modalEl.style.background = 'rgba(0,0,0,0.4)';
  modalEl.style.display = 'none';
  modalEl.style.zIndex = '9999';
  modalEl.addEventListener('click', (e)=>{
    if(e.target === modalEl){ closeRawView(); }
  });

  dialogEl = document.createElement('div');
  dialogEl.className = 'dm-modal__dialog';
  dialogEl.style.position = 'absolute';
  dialogEl.style.left = '50%';
  dialogEl.style.top = '50%';
  dialogEl.style.transform = 'translate(-50%, -50%)';
  dialogEl.style.width = 'min(900px, 92vw)';
  dialogEl.style.maxHeight = '86vh';
  dialogEl.style.background = '#fff';
  dialogEl.style.borderRadius = '10px';
  dialogEl.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';
  dialogEl.style.display = 'flex';
  dialogEl.style.flexDirection = 'column';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.padding = '12px 16px';
  header.style.borderBottom = '1px solid #e5e7eb';

  titleEl = document.createElement('div');
  titleEl.style.fontSize = '14px';
  titleEl.style.fontWeight = '600';
  titleEl.style.whiteSpace = 'nowrap';
  titleEl.style.overflow = 'hidden';
  titleEl.style.textOverflow = 'ellipsis';

  const btnClose = document.createElement('button');
  btnClose.type = 'button';
  btnClose.innerText = '닫기';
  btnClose.style.border = '1px solid #d1d5db';
  btnClose.style.background = '#f9fafb';
  btnClose.style.padding = '6px 10px';
  btnClose.style.borderRadius = '6px';
  btnClose.style.cursor = 'pointer';
  btnClose.addEventListener('click', closeRawView);

  header.appendChild(titleEl);
  header.appendChild(btnClose);

  tabBarEl = document.createElement('div');
  tabBarEl.style.display = 'flex';
  tabBarEl.style.gap = '8px';
  tabBarEl.style.padding = '8px 12px';
  tabBarEl.style.borderBottom = '1px solid #f3f4f6';

  function makeTab(label, key){
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset.panel = key;
    b.style.border = '1px solid #d1d5db';
    b.style.background = '#fff';
    b.style.padding = '6px 10px';
    b.style.borderRadius = '6px';
    b.style.cursor = 'pointer';
    b.addEventListener('click', ()=> activatePanel(key));
    return b;
  }

  const tabOverview = makeTab('개요','overview');
  const tabJSON     = makeTab('JSON','json');
  const tabShot     = makeTab('스크린샷','shot');
  tabBarEl.appendChild(tabOverview);
  tabBarEl.appendChild(tabJSON);
  tabBarEl.appendChild(tabShot);

  bodyEl = document.createElement('div');
  bodyEl.className = 'dm-modal__body';
  bodyEl.style.padding = '12px 16px';
  bodyEl.style.overflow = 'auto';
  bodyEl.style.flex = '1 1 auto';
  bodyEl.style.background = '#fff';

  panelOverview = document.createElement('div');
  panelJSON = document.createElement('div');
  panelShot = document.createElement('div');
  [panelOverview, panelJSON, panelShot].forEach(p=>{ p.style.display='none'; });

  bodyEl.appendChild(panelOverview);
  bodyEl.appendChild(panelJSON);
  bodyEl.appendChild(panelShot);

  dialogEl.appendChild(header);
  dialogEl.appendChild(tabBarEl);
  dialogEl.appendChild(bodyEl);
  modalEl.appendChild(dialogEl);
  document.body.appendChild(modalEl);
}

function activatePanel(key){
  panelOverview.style.display = (key==='overview') ? 'block' : 'none';
  panelJSON.style.display     = (key==='json')     ? 'block' : 'none';
  panelShot.style.display     = (key==='shot')     ? 'block' : 'none';

  // 탭 버튼 active 표시
  [...tabBarEl.querySelectorAll('button')].forEach(btn=>{
    if (btn.dataset.panel === key){
      btn.style.background = '#f3f4f6';
      btn.style.borderColor = '#9ca3af';
      btn.style.fontWeight = '600';
    }else{
      btn.style.background = '#fff';
      btn.style.borderColor = '#d1d5db';
      btn.style.fontWeight = '500';
    }
  });
}

function safeStringify(obj){
  const seen = new WeakSet();
  try{
    return JSON.stringify(obj, function(k,v){
      if (typeof v === 'object' && v !== null){
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
      }
      return v;
    }, 2);
  }catch(e){
    try{
      return JSON.stringify(String(obj), null, 2);
    }catch(_){
      return '{ "error": "stringify failed" }';
    }
  }
}

function buildOverview(raw, url){
  const container = document.createElement('div');
  const tbl = document.createElement('table');
  tbl.style.width = '100%';
  tbl.style.borderCollapse = 'collapse';
  const tbody = document.createElement('tbody');

  function row(k,v){
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    const td = document.createElement('td');
    th.textContent = k;
    th.style.textAlign = 'left';
    th.style.padding = '6px 8px';
    th.style.width = '140px';
    th.style.color = '#374151';
    th.style.background = '#f9fafb';
    th.style.borderBottom = '1px solid #f3f4f6';
    td.textContent = v;
    td.style.padding = '6px 8px';
    td.style.borderBottom = '1px solid #f3f4f6';
    tr.appendChild(th); tr.appendChild(td);
    return tr;
  }

  try{
    const u = new URL(url);
    tbody.appendChild(row('도메인', u.host));
    tbody.appendChild(row('URL', url));
  }catch(_){
    tbody.appendChild(row('URL', url || '(알 수 없음)'));
  }

  if (raw && typeof raw === 'object'){
    // 대표 필드 몇 개 보여주기 (있을 때)
    const picks = ['Url','URL','Response','Status','Error_Type','Error_Code','Cause_Code','Cert_DNS','Category','Risk','Advice'];
    let printed = 0;
    picks.forEach(k=>{
      const v = raw[k];
      if (typeof v !== 'undefined' && v !== null && String(v) !== ''){
        tbody.appendChild(row(k, String(v)));
        printed++;
      }
    });
    if (printed === 0){
      tbody.appendChild(row('정보', '표시할 개요 정보가 없습니다.'));
    }
  }else{
    tbody.appendChild(row('정보', '원본 데이터가 없습니다.'));
  }

  tbl.appendChild(tbody);
  container.appendChild(tbl);
  return container;
}

function buildJSON(raw){
  const pre = document.createElement('pre');
  pre.style.margin = '0';
  pre.style.whiteSpace = 'pre-wrap';
  pre.style.wordBreak = 'break-word';
  pre.style.fontSize = '12px';
  pre.textContent = safeStringify(raw || {});
  return pre;
}

function buildShot(url){
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.alignItems = 'center';
  wrap.style.gap = '8px';

  const p = document.createElement('div');
  p.style.color = '#374151';
  p.style.fontSize = '13px';
  p.textContent = '스크린샷';

  const img = document.createElement('img');
  img.alt = 'screenshot';
  img.style.maxWidth = '100%';
  img.style.height = 'auto';

  // url에서 host를 파싱하고, state.images에서 최신 항목을 찾으려고 시도
  let src = '';
  try{
    const u = new URL(url);
    const host = u.host;
    if (window.state && window.state.images && window.state.images.latestMap && typeof window.state.images.latestMap.get === 'function'){
      const rec = window.state.images.latestMap.get(host);
      if (rec && rec.url){ src = rec.url; }
    }
  }catch(_){}

  if (!src){
    const msg = document.createElement('div');
    msg.style.color = '#6b7280';
    msg.textContent = '연결된 스크린샷 정보를 찾지 못했습니다.';
    wrap.appendChild(msg);
  }else{
    img.src = src;
    wrap.appendChild(p);
    wrap.appendChild(img);
  }
  return wrap;
}

export function openRawView(rawObj, id, url, trEl, opts={}){
  ensureModal();
  activeRow = trEl || null;
  if (activeRow){ activeRow.classList.add('row-selected'); }

  const mode = (opts && opts.mode) || 'raw';
  titleEl.textContent = url || '상세';

  // 탭 활성/비활성
  const tabs = tabBarEl.querySelectorAll('button');
  tabs.forEach(btn => btn.disabled = false);

  panelOverview.innerHTML = '';
  panelJSON.innerHTML = '';
  panelShot.innerHTML = '';

  if (mode === 'shot'){
    panelShot.appendChild(buildShot(url || ''));
    activatePanel('shot');
  }else{
    panelOverview.appendChild(buildOverview(rawObj || {}, url || ''));
    panelJSON.appendChild(buildJSON(rawObj || {}));
    activatePanel('overview');
  }

  modalEl.style.display = 'block';
  modalEl.setAttribute('aria-hidden','false');
}

export function closeRawView(){
  if (!modalEl) return;
  modalEl.style.display = 'none';
  modalEl.setAttribute('aria-hidden','true');
  if (activeRow){ activeRow.classList.remove('row-selected'); activeRow = null; }
}

export function bindRawModal(){
  ensureModal();
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape' && modalEl && modalEl.getAttribute('aria-hidden') === 'false'){
      closeRawView();
    }
  });
}
