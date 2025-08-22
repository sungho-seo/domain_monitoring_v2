// js/net.js
import { CACHE_BUST } from './config.js';
export function bust(url){ const sep = url.includes('?')?'&':'?'; return url + sep + '_=' + encodeURIComponent(CACHE_BUST()); }
export async function fetchText(url){ const r = await fetch(bust(url)); if(!r.ok) throw new Error(`HTTP ${r.status}`); return await r.text(); }
export async function fetchJSON(url){ const r = await fetch(bust(url)); if(!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json(); }
