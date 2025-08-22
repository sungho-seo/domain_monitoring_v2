// js/classify.js
function normStr(v){ return (v==null?'':String(v)).trim(); }
function toInt(v){ const n=parseInt(v,10); return isNaN(n)?null:n; }

function pickUrl(row){
  const a = normStr(row.final_url);
  const b = normStr(row.normalized_url);
  const c = normStr(row.input_url);
  return a || b || c || '';
}
function hostOf(row){
  return normStr(row.host) || (pickUrl(row).replace(/^https?:\/\//,'').split('/')[0]) || '';
}

function expiryBucket(row){
  const expired = String(row.expired).toLowerCase()==='true';
  const d = toInt(row.days_to_expiry);
  if(expired || (d!=null && d<=0)) return 'Expired';
  const e7  = String(row.expiring_7d).toLowerCase()==='true';
  const e30 = String(row.expiring_30d).toLowerCase()==='true';
  if(e7) return 'D≤7';
  if(e30) return 'D8–30';
  return 'None';
}

function classifyError(row){
  const ok = String(row.tls_handshake_ok).toLowerCase()==='true';
  const msg = normStr(row.error).toLowerCase();
  let type = 'none';
  if(!ok){
    if(msg.includes('getaddrinfo')) type='dns';
    else if(msg.includes('timed out')) type='timeout';
    else if(msg.includes('wrong version') || msg.includes('handshake failure') || msg.includes('unexpected_eof') || msg.includes('eof occurred')) type='tls';
    else if(msg.includes('certificate verify failed') || msg.includes('unable to get issuer') || msg.includes('unable to verify') || msg.includes('self signed')) type='chain';
    else type='connect';
  }
  return { ok, type };
}

function identity(row, tlsOk){
  const certMismatch = String(row.cert_mismatch).toLowerCase()==='true';
  const hostnameMatch = (String(row.hostname_match).toLowerCase()==='true');
  const mismatch = tlsOk ? (certMismatch || !hostnameMatch) : false;
  return { label: mismatch?'불일치':'일치', mismatch };
}

function policyFlags(row){
  const hsts = String(row.hsts_enabled).toLowerCase()==='true';
  const ocsp = normStr(row.ocsp_status).toLowerCase();
  const ocspBad = (!!ocsp && ocsp!=='good' && ocsp!=='ok');
  return { issue: (!hsts)||ocspBad, hsts, ocsp };
}

function httpFlags(row){
  const url = pickUrl(row);
  const schemeHttp = /^http:\/\//i.test(url);
  return { httpExposed: schemeHttp };
}

function riskLevel(row, expBkt, ident, err, http){
  if(expBkt==='Expired' || ident.mismatch) return 'critical';
  if(err.type==='chain') return 'critical';
  if(expBkt==='D≤7' || expBkt==='D8–30') return 'warning';
  if(err.type==='tls' || err.type==='dns' || err.type==='timeout' || err.type==='connect') return 'warning';
  if(http.httpExposed) return 'warning';
  const sev = normStr(row.severity).toLowerCase();
  if(sev==='critical') return 'critical';
  if(sev==='high') return 'warning';
  return 'normal';
}

function adviceText(row, expBkt, ident, err, http){
  const base = normStr(row.recommended_action);
  if(base){
    if(/no immediate action/i.test(base)) return '즉시 조치 필요 없음';
    if(/reissue.*SAN/i.test(base)) return 'CN/SAN 재발급';
    if(/renew.*immediately|reissue.*immediately/i.test(base)) return '즉시 갱신/재발급';
    if(/plan renewal/i.test(base)) return '90일 내 갱신 계획 수립';
    if(/investigate.*trust/i.test(base)) return '신뢰 체인 점검';
  }
  if(expBkt==='Expired') return '즉시 갱신';
  if(ident.mismatch) return 'CN/SAN 재발급';
  if(expBkt==='D≤7') return '7일 내 갱신';
  if(expBkt==='D8–30') return '30일 내 갱신 계획';
  if(err.type==='chain') return '체인/CA 구성 점검';
  if(err.type==='tls') return 'TLS 설정 점검(버전/암호군)';
  if(err.type==='dns' || err.type==='timeout' || err.type==='connect') return '네트워크/DNS 점검';
  if(http.httpExposed) return 'HTTP → HTTPS 강제/리디렉션';
  return base || '점검 필요 없음';
}

export function toViewRow(row, idx){
  const url = pickUrl(row);
  const host = hostOf(row);
  const expBkt = expiryBucket(row);
  const err = classifyError(row);
  const ident = identity(row, err.ok);
  const policy = policyFlags(row);
  const http = httpFlags(row);
  const risk = riskLevel(row, expBkt, ident, err, http);
  const advice = adviceText(row, expBkt, ident, err, http);

  let simplified='Handshake OK';
  if(expBkt==='Expired') simplified='Cert Expired';
  else if(ident.mismatch) simplified='Cert CN Mismatch';
  else if(!err.ok){
    if(err.type==='dns') simplified='DNS Fail';
    else if(err.type==='timeout') simplified='Timeout';
    else if(err.type==='chain') simplified='Trust Chain Error';
    else if(err.type==='tls') simplified='TLS Handshake Error';
    else simplified='Connect Error';
  }

  const d=toInt(row.days_to_expiry);
  const dday=(expBkt==='Expired')?'만료':(d!=null?(d<=7?'D-7':(d<=30?'D-30':'-')):'-');

  const dnsIssue = (!err.ok && err.type==='dns');
  const timeoutIssue = (!err.ok && err.type==='timeout');
  const connectIssue = (!err.ok && err.type==='connect');
  const netIssue = dnsIssue || timeoutIssue || connectIssue;

  return {
    _id: idx, _raw: row, url, host,
    simplified, advice,
    _risk: risk,
    expBucket: expBkt,
    identity: ident.label, identityIssue: ident.mismatch,
    chain: (err.type==='chain' ? '체인 오류' : (err.type==='connect'||err.type==='dns'||err.type==='timeout') ? '미확인' : '정상'),
    chainIssue: (err.type==='chain'),
    tls: err.ok ? (http.httpExposed?'OK(HTTP 노출)':'OK')
                : (err.type==='tls'?'구성 이슈': err.type==='timeout'?'타임아웃': err.type==='dns'?'DNS 오류':'연결 실패'),
    tlsIssue: (!err.ok && err.type==='tls'),
    policyIssue: policy.issue,
    dday,
    dnsIssue, timeoutIssue, connectIssue, netIssue,
    httpExposed: http.httpExposed
  };
}
