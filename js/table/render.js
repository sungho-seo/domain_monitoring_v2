// js/table/render.js — renderBits 의존 제거(헬퍼 인라인)
import { state } from '../state.js';

/* ===== Inline helpers (renderBits 대체) ===== */
function riskPill(risk){
  const map = {
    'critical': {label:'높음',  bg:'#fee2e2', fg:'#991b1b'},
    'warning' : {label:'중간',  bg:'#fef3c7', fg:'#92400e'},
    'normal'  : {label:'낮음',  bg:'#dcfce7', fg:'#065f46'},
  };
  const m = map[(risk||'').toLowerCase()] || {label:'-', bg:'#e5e7eb', fg:'#374151'};
  return `<span class="pill" style="background:${m.bg};color:${m.fg};border-radius:999px;padding:.15rem .5rem;display:inline-block;min-width:3em;text-align:center">${m.label}</span>`;
}

function aiPill(risk){
  const abnormal = (risk||'').toLowerCase() !== 'normal';
  if (abnormal){
    return `<span class="pill" style="background:#fee2e2;color:#9f1239;border-radius:999px;padding:.15rem .5rem;display:inline-block;">비정상</span>`;
  }
  return `<span class="pill" style="background:#e0f2fe;color:#075985;border-radius:999px;padding:.15rem .5rem;display:inline-block;">정상</span>`;
}

function manualPill(manualStatus){
  if (!manualStatus) return '-';
  const bad = /invalid|suspend|block|폐쇄/i.test(String(manualStatus));
  if (bad){
    return `<span class="pill" style="background:#f3e8ff;color:#6b21a8;border-radius:999px;padding:.15rem .5rem;display:inline-block;">수동:비정상</span>`;
  }
  return `<span class="pill" style="background:#eef2ff;color:#3730a3;border-radius:999px;padding:.15rem .5rem;display:inline-block;">수동:정상</span>`;
}

function rowTintClass(v){
  const r = (v && v._risk || '').toLowerCase();
  if (r === 'critical') return 'tint-critical';
  if (r === 'warning')  return 'tint-warning';
  if (r === 'normal')   return 'tint-normal';
  return '';
}
/* ========================================= */

export function renderTable(){
  const tbody=document.querySelector('#table tbody'); 
  if(!tbody) return;
  tbody.innerHTML='';
  const view=state.viewRows || [];

  view.forEach(v=>{
    const tr=document.createElement('tr'); tr.className=rowTintClass(v);
    const mismatch=v._mismatch?'<span class="pill neut" style="background:#e0e7ff;color:#1e3a8a;">불일치</span>':'-';
    const rec=state.images && state.images.latestMap ? state.images.latestMap.get(v.host) : null;

    // URL/host 파생
    let hostFromUrl = v.host;
    if(!hostFromUrl){
      try{ hostFromUrl = new URL(v.url).host; }catch(_){ hostFromUrl=''; }
    }

    const imgCell = rec
      ? '<button class="icon-btn shot-btn" title="스크린샷 보기(모달)"'
        + (hostFromUrl? ' data-host="'+hostFromUrl+'"' : '')
        + (rec.url? ' data-img="'+encodeURIComponent(rec.url)+'"' : '')
        + ' aria-label="이미지 보기">'
          + '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
          +   '<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"></rect>'
          +   '<circle cx="8" cy="12" r="2" fill="currentColor"></circle>'
          +   '<path d="M12 14l2-2 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>'
          + '</svg></button>'
      : '<button class="icon-btn disabled" title="스크린샷 없음" disabled aria-disabled="true">'
          + '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
          +   '<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"></rect>'
          +   '<circle cx="8" cy="12" r="2" fill="currentColor"></circle>'
          +   '<path d="M12 14l2-2 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>'
          + '</svg></button>';

    const urlCell = (v.url ? v.url.replace(/^https?:\/\//,'') : '');
    tr.innerHTML=
      '<td><a href="'+(v.url||'#')+'" target="_blank" rel="noopener">'+urlCell+'</a></td>'
      +'<td>'+riskPill(v._risk)+'</td>'
      +'<td><span class="badge">'+(v.simplified||'')+'</span></td>'
      +'<td>'+aiPill(v._risk)+'</td>'
      +'<td>'+manualPill(v._manualStatus)+'</td>'
      +'<td>'+mismatch+'</td>'
      +'<td>'+(v.advice||'')+'</td>'
      +'<td><button class="icon-btn raw-btn" title="원본" data-id="'+v._id+'" aria-label="원본 보기(돋보기)">'
        +'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
        +'<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"></circle>'
        +'<line x1="16.65" y1="16.65" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>'
        +'</svg></button></td>'
      +'<td>'+imgCell+'</td>';
    tbody.appendChild(tr);
  });
}
