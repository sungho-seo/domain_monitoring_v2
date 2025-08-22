// js/csv.js
import { toViewRow } from './classify.js';

function parseCSVLine(line){
  const out=[]; let cur=''; let q=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(q){
      if(c==='"'){
        if(line[i+1]==='"'){ cur+='"'; i++; } else { q=false; }
      }else{ cur+=c; }
    }else{
      if(c==='"'){ q=true; }
      else if(c===','){ out.push(cur); cur=''; }
      else{ cur+=c; }
    }
  }
  out.push(cur);
  return out;
}

export function parseCSV(text){
  if(!text) return [];
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(x=>x.length);
  if(!lines.length) return [];
  const header = parseCSVLine(lines[0]).map(h=>h.trim());
  const rows=[];
  for(let i=1;i<lines.length;i++){
    const cols=parseCSVLine(lines[i]);
    const o={};
    for(let j=0;j<header.length;j++){ o[header[j]] = (cols[j]??'').trim(); }
    rows.push(o);
  }
  return rows;
}

export function buildView(rows){
  return rows.map((r,i)=>toViewRow(r,i));
}
