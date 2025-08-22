// js/images/indexer.js
// 이미지 경로 규칙 고정: images/img.{domain}/{run}/manifest.json
// - Windows 경로(\)가 와도 모두 웹 경로(/)로 정규화
// - manifest 포맷 유연 지원: 
//     1) { shots: [ {file, host?}, ... ] }
//     2) [ "YYYYMMDD_hhmmss__host__code.png", ... ]
// - 파일명에서 host 추출: 20250814_212937__host.name__403-Forbidden.png

function joinUrl() {
  // joinUrl('images','img.lge.com','20250814','manifest.json') => 'images/img.lge.com/20250814/manifest.json'
  return Array.prototype.slice.call(arguments)
    .filter(Boolean)
    .join('/')
    .replace(/\\+/g, '/')   // 백슬래시 → 슬래시
    .replace(/\/{2,}/g, '/'); // 중복 슬래시 축소
}

function shotsDir(domain, run){
  const dom = `img.${domain}`;           // lge.com -> img.lge.com
  return run ? joinUrl('images', dom, run) : joinUrl('images', dom);
}

function manifestPath(domain, run){
  return joinUrl(shotsDir(domain, run), 'manifest.json');
}

function parseTsFromName(name){
  // '20250814_212937__host__code.png' -> Date or null
  const m = String(name).match(/^(\d{8})_(\d{6})__/);
  if(!m) return null;
  const d = m[1], t = m[2];
  const iso = `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T${t.slice(0,2)}:${t.slice(2,4)}:${t.slice(4,6)}Z`;
  const time = Date.parse(iso);
  return isNaN(time) ? null : new Date(time);
}

function hostFromName(name){
  // '...__host.name__...' -> host.name
  const m = String(name).match(/__([^_]+?)__/);
  return m ? m[1] : '';
}

async function fetchJSON(path){
  const res = await fetch(path, { cache: 'no-store' });
  if(!res.ok) throw new Error(`manifest fetch failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function loadImageIndex(domain, run){
  const idx = { all: [], latestMap: new Map() };
  const mUrl = manifestPath(domain, run);
  let data;
  try{
    data = await fetchJSON(mUrl);
  }catch(e){
    console.warn('[IMG] manifest 로드 실패:', e, 'path=', mUrl);
    return idx; // manifest 없으면 빈 인덱스 반환
  }

  // shots 배열 추출
  let shots = [];
  if (Array.isArray(data)){
    shots = data;
  }else if (data && Array.isArray(data.shots)){
    shots = data.shots;
  }else{
    console.warn('[IMG] manifest 포맷 인식 불가. shots 필드가 없습니다.');
    return idx;
  }

  shots.forEach(rec=>{
    let file = '';
    let host = '';
    if (typeof rec === 'string'){
      file = rec;
      host = hostFromName(rec);
    }else if (rec && typeof rec === 'object'){
      file = rec.file || rec.path || '';
      host = rec.host || hostFromName(file);
    }
    if(!file) return;

    // 정규화
    file = String(file).replace(/\\/g, '/');
    const url = joinUrl(shotsDir(domain, run), file);
    const ts  = parseTsFromName(file);

    const row = { host, file, url, ts };
    idx.all.push(row);

    // 최신 1건만 보관(타임스탬프가 더 큰 것을 최신으로)
    const prev = idx.latestMap.get(host);
    if (!prev || ((ts && prev.ts && ts > prev.ts) || (ts && !prev.ts))){
      idx.latestMap.set(host, row);
    }
  });

  return idx;
}
