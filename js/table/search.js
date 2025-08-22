// js/table/search.js
import { state } from '../state.js';
import { applyFilter } from './filters.js';
export function bindSearch(){
  const el=document.getElementById('search');
  if(!el) return;
  el.addEventListener('input',()=>{
    state.searchQuery = el.value.trim();
    applyFilter();
  });
}
