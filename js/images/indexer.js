// js/images/indexer.js
import { imagePath } from '../config.js';
import { fetchJSON, fetchText } from '../net.js';

function parseLinks(html){
  const doc = new DOMParser().parseFromString(html,'text/html');
  return Array.from(doc.querySelectorAll('a[href]')).map(a=>a.getAttribute('href')).filter(Boolean);
}
export async function loadImageIndex(domain, run){
  const base = imagePath(domain, run);
  let files = [];
  try{
    const m = await fetchJSON(`${base}/manifest.json`);
    if(Array.isArray(m)) files = m;
  }catch(_){}
  if(!files.length){
    try{
      const html = await fetchText(`${base}/`);
      const links = parseLinks(html);
      files = links.filter(h=>/\.png$/i.test(h)).map(h=>decodeURIComponent(h));
    }catch(_){}
  }
  const re = /\d{8}_\d{6}__([^_]+(?:\.[^_]+)*)__([^.]+)\.png$/;
  const latest = new Map();
  const all = [];
  files.forEach(name=>{
    const nm = name.split('/').pop();
    const m = nm.match(re); if(!m) return;
    const host = m[1];
    const url = `${base}/${nm}`;
    all.push({host,url,name:nm});
    if(!latest.has(host)) latest.set(host,{host,url,name:nm});
  });
  return { latestMap: latest, all };
}
