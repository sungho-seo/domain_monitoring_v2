// js/config.js
export const RUNS_SOURCE = 'runs.json';

export const CSV_FALLBACK = {
  "lge.com":    ["data/lge.com_ssl_audit.csv"],
  "lge.co.kr":  ["data/lge.co.kr_ssl_audit.csv"],
  "lgthinq.com":["data/lgthinq.com_ssl_audit.csv"]
};

export function csvPath(domain, run){
  return run ? `data/${run}/${domain}_ssl_audit.csv`
             : (CSV_FALLBACK[domain] && CSV_FALLBACK[domain][0]);
}

export const ROWS_PER_VIEW = 15;
export function CACHE_BUST(){ return 'v_ssl_audit_full_2'; }

export function imgDir(){ return 'images'; }
export const IMG_DIR = imgDir();
export const IMG_ROOT = imgDir();

export function imagePath(domain, run){
  const base = imgDir();
  return run ? `${base}/${run}/${domain}` : `${base}/${domain}`;
}

export function imageManifestPath(domain, run){
  return `${imagePath(domain, run)}/manifest.json`;
}
