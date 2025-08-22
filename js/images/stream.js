// js/images/stream.js  (HTTP 응답코드 필터 바)
import { state } from '../state.js';

function bucketFromFile(file){
  const m = String(file||'').match(/__([0-9]{3})-([A-Za-z].*?)\.png$/);
  if(!m){ return '기타'; }
  const n = parseInt(m[1], 10);
  if (n >= 200 && n <= 299) return '2xx';
  if (n >= 300 && n <= 399) return '3xx';
  if (n >= 400 && n <= 499) return '4xx';
  if (n >= 500 && n <= 599) return '5xx';
  return '기타';
}

function countByBucket(list){
  const c = { '전체': list.length, '2xx':0, '3xx':0, '4xx':0, '5xx':0, '기타':0 };
  list.forEach(rec=>{ c[bucketFromFile(rec.file)]++; });
  return c;
}

function el(tag, cls){
  const n = document.createElement(tag);
  if(cls) n.className = cls;
  return n;
}

function ensureControlsHost(){
  let ctrlHost = document.getElementById('shotsControls');
  if(!ctrlHost){
    ctrlHost = el('div'); ctrlHost.id = 'shotsControls';
    const tab = document.getElementById('tab-shots');
    tab?.insertBefore(ctrlHost, tab.firstElementChild?.nextSibling || tab.firstChild);
  }
  return ctrlHost;
}

function renderCodeFilters(list){
  const hostEl = ensureControlsHost();
  hostEl.innerHTML = '';
  const counts = countByBucket(list);
  const wrap = el('div', 'shots-filters');
  const labels = ['전체','2xx','3xx','4xx','5xx','기타'];

  labels.forEach(lab=>{
    const btn = el('button', 'btn');
    btn.type = 'button';
    btn.dataset.bucket = lab;
    btn.textContent = `${lab} (${counts[lab]||0})`;
    if ((state.shotsCodeFilter||'전체') === lab) btn.classList.add('active');
    btn.addEventListener('click', ()=>{
      state.shotsCodeFilter = lab;
      wrap.querySelectorAll('button.btn').forEach(b=> b.classList.remove('active'));
      btn.classList.add('active');
      const container = document.getElementById('shotsStream');
      if(container){ renderShotsList(container, state.images); }
    });
    wrap.appendChild(btn);
  });

  hostEl.appendChild(wrap);
}

function renderShotsList(container, images){
  container.innerHTML = '';

  const list = Array.isArray(images?.all) ? images.all : [];
  const bucket = state.shotsCodeFilter || '전체';
  const filtered = (bucket==='전체') ? list : list.filter(r => bucketFromFile(r.file) === bucket);

  filtered.forEach((rec, idx)=>{
    const shot = el('div', 'shot');

    const title = el('div', 'title');
    const indexText = `${idx+1}/${filtered.length}`;
    const host = rec.host || '(host 없음)';
    const file = rec.file || '(파일명 없음)';
    title.textContent = `${indexText} — ${host} — ${file}`;

    const imgwrap = el('div', 'imgwrap');
    const img = new Image();
    img.alt = rec.file || 'screenshot';
    img.loading = 'lazy';
    img.src = rec.url;
    imgwrap.appendChild(img);

    shot.appendChild(title);
    shot.appendChild(imgwrap);
    container.appendChild(shot);
  });

  if (!filtered.length){
    const empty = el('div', 'shot');
    const title = el('div', 'title');
    title.textContent = '표시할 스크린샷이 없습니다.';
    empty.appendChild(title);
    container.appendChild(empty);
  }
}

export function renderShotsStream(container, images){
  const list = Array.isArray(images?.all) ? images.all : [];
  renderCodeFilters(list);
  renderShotsList(container, images);
}
