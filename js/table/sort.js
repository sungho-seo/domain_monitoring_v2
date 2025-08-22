
// js/table/sort.js
// Robust utilities + shims so that any existing import works without breaking.
// Exports: sortInPlace, bindSort, initSort, attachSort

/** Normalize a value for comparison (string/number/date-ish). */
function norm(v){
  if (v == null) return {t:3, v:''}; // null/undefined last
  if (typeof v === 'number') return {t:0, v:v};
  if (v instanceof Date) return {t:0, v:+v};
  // numeric-looking string → number
  if (typeof v === 'string' && v.trim() !== '' && !isNaN(v)) {
    return {t:0, v: Number(v)};
  }
  // fallback: lowercase string
  return {t:1, v: String(v).toLowerCase()};
}

/** Build comparator.
 * opts: { key?:string, dir?:'asc'|'desc', accessor?:(row)=>any, nullsLast?:boolean }
 */
export function makeComparator(opts={}){
  const dir = (opts.dir || 'asc').toLowerCase() === 'desc' ? -1 : 1;
  const acc = (typeof opts.accessor === 'function')
    ? opts.accessor
    : (opts.key ? (row)=> row?.[opts.key] : (x)=> x);
  const nullsLast = opts.nullsLast !== false; // default true
  return function(a,b){
    const aa = acc(a), bb = acc(b);
    const na = norm(aa), nb = norm(bb);
    // nulls last
    if (nullsLast && na.t === 3 && nb.t !== 3) return  1;
    if (nullsLast && nb.t === 3 && na.t !== 3) return -1;
    if (na.v < nb.v) return -1*dir;
    if (na.v > nb.v) return  1*dir;
    return 0;
  };
}

/** In-place sort with flexible signatures.
 * Usage patterns supported:
 *   sortInPlace(rows, 'url', 'asc')
 *   sortInPlace(rows, {key:'risk', dir:'desc'})
 *   sortInPlace(rows, (row)=> row.score, 'desc')
 *   sortInPlace({viewRows:[...]}, 'url', 'asc')   // state object
 * Returns the sorted array (or state.viewRows).
 */
export function sortInPlace(target, arg2, arg3){
  // Resolve array
  let arr = Array.isArray(target) ? target
          : (target && Array.isArray(target.viewRows) ? target.viewRows : null);
  if (!arr) return [];

  // Resolve options
  let opts = {};
  if (typeof arg2 === 'function'){
    opts.accessor = arg2;
    opts.dir = (arg3 || 'asc');
  } else if (typeof arg2 === 'string'){
    opts.key = arg2;
    opts.dir = (arg3 || 'asc');
  } else if (arg2 && typeof arg2 === 'object'){
    opts = {...arg2};
  } else {
    opts.dir = 'asc';
  }

  const cmp = makeComparator(opts);
  // Stable sort: tag index to preserve order when equal
  const tagged = arr.map((v,i)=>({v,i}));
  tagged.sort((a,b)=> {
    const res = cmp(a.v, b.v);
    return res !== 0 ? res : (a.i - b.i);
  });
  for (let i=0; i<tagged.length; i++) arr[i] = tagged[i].v;
  return arr;
}

// ---- Shims to satisfy old imports (no-op or minimal) ----
export function bindSort(){ /* optional: header click binding can be implemented here if needed */ }
export function initSort(){ /* noop */ }
export function attachSort(){ /* noop */ }
