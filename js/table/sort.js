// js/table/sort.js
export function sortInPlace(arr){
  arr.sort((a,b)=> (a.host||'').localeCompare(b.host||''));
}
