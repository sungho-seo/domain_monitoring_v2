// js/table/render.js
import { state } from '../state.js';

function riskPill(r){
  if(r==='critical') return '<span class="pill bad">긴급</span>';
  if(r==='warning')  return '<span class="pill warn">주의</span>';
  return '<span class="pill ok">정상</span>';
}
function rowTintClass(v){
  if(v._risk==='critical') return 'tint-red';
  if(v._risk==='warning')  return 'tint-amber';
  if(v._risk==='normal')   return 'tint-green';
  return '';
}

export function renderTable(){
  const tbody=document.querySelector('#table tbody'); if(!tbody) return; tbody.innerHTML='';
  const view=state.viewRows||[];
  view.forEach(v=>{
    const tr=document.createElement('tr'); tr.className=rowTintClass(v);
    const hasImg = state.images && state.images.latestMap && state.images.latestMap.has(v.host);
    const imgCell = hasImg
      ? '<button class="icon-btn shot-btn" data-host="'+v.host+'" title="스크린샷 보기">🖼️</button>'
      : '<button class="icon-btn disabled" disabled title="스크린샷 없음">🖼️</button>';
    tr.innerHTML=
      '<td style="text-align:left"><a href="'+v.url+'" target="_blank" rel="noopener">'+(v.url||'').replace(/^https?:\/\//,'')+'</a></td>'+
      '<td>'+riskPill(v._risk)+'</td>'+
      '<td>'+(v.dday||'-')+'</td>'+
      '<td><span class="pill '+(v._risk==='normal'?'ok':'warn')+'">AI: '+(v._risk==='normal'?'정상':'비정상')+'</span></td>'+
      '<td>'+(v.identity||'-')+'</td>'+
      '<td>'+(v.chain||'-')+'</td>'+
      '<td>'+(v.tls||'-')+'</td>'+
      '<td>'+(v.advice||'-')+'</td>'+
      '<td><button class="icon-btn raw-btn" data-id="'+v._id+'" title="원본 보기">🔎</button></td>'+
      '<td>'+imgCell+'</td>';
    tbody.appendChild(tr);
  });
}
