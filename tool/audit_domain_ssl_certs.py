#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SSL/Redirect Audit for simplified CSVs (single 'Url' column)
- 입력: data/<DATE>/{lge.com.csv, lge.co.kr.csv, lgthinq.com.csv}
- 출력: output/<DATE>/<source>_ssl_audit_result.csv
        output/<DATE>/<source>_ssl_audit_result_reclassified.csv
"""

import argparse, csv, datetime, re, socket, ssl, sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import requests
from urllib.parse import urlparse
from cryptography import x509
from cryptography.hazmat.backends import default_backend

# -------------------- TLS 인증서 --------------------
def fetch_cert_pem(host: str, port: int = 443, timeout: float = 8.0):
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = True
        ctx.verify_mode = ssl.CERT_REQUIRED
        with socket.create_connection((host, port), timeout=timeout) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                der = ssock.getpeercert(binary_form=True)
                return ssl.DER_cert_to_PEM_cert(der), None
    except Exception as e1:
        try:
            ctx2 = ssl._create_unverified_context()
            with socket.create_connection((host, port), timeout=timeout) as sock:
                with ctx2.wrap_socket(sock, server_hostname=host) as ssock:
                    der = ssock.getpeercert(binary_form=True)
                    return ssl.DER_cert_to_PEM_cert(der), f"(unverified) {e1}"
        except Exception as e2:
            return None, f"TLS connect error: {e1} / fallback: {e2}"

def parse_cert_with_cryptography(pem: str) -> dict:
    cert = x509.load_pem_x509_certificate(pem.encode("utf-8"), default_backend())
    def _cn(name): 
        try: return name.get_attributes_for_name(x509.NameOID.COMMON_NAME)[0].value
        except Exception: return None
    subject_cn, issuer_cn = _cn(cert.subject), _cn(cert.issuer)
    not_after = cert.not_valid_after.replace(tzinfo=datetime.timezone.utc)
    days_to_expiry = (not_after - datetime.datetime.now(datetime.timezone.utc)).days
    san_list = []
    try:
        ext = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName)
        san_list = [d.value for d in ext.value.get_values_for_type(x509.DNSName)]
    except x509.ExtensionNotFound:
        pass
    return {
        "cert_subject_cn": subject_cn,
        "cert_san_list": san_list,
        "not_before_utc": cert.not_valid_before.isoformat(),
        "not_after_utc": not_after.isoformat(),
        "days_to_expiry": days_to_expiry,
        "issuer_cn": issuer_cn,
        "serial_hex": format(cert.serial_number, "X"),
    }

# -------------------- 유틸 --------------------
def normalize_url(u: str):
    if not u: return "", "", 443, "https"
    if not re.match(r"^https?://", u, flags=re.I):
        u = "https://" + u
    p = urlparse(u)
    return u, (p.hostname or ""), p.port or (443 if p.scheme=="https" else 80), p.scheme

def hostname_match(host: str, san_list: List[str], cn: Optional[str]) -> Optional[bool]:
    pats = list(san_list) or ([cn] if cn else [])
    if not pats: return None
    def m(p,h): return h.endswith(p[1:]) if p.startswith("*.") else p==h
    return any(m(p.lower(), host.lower()) for p in pats)

def head_with_redirects(url: str, timeout: float = 10.0):
    import urllib3; urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    headers = {"User-Agent":"ssl-audit/1.0"}
    def summarize(r): 
        hist = r.history or []
        chain = [h.headers.get("Location","") for h in hist if h.is_redirect]
        return (hist[0].status_code if hist else r.status_code), r.status_code, r.url, chain
    try:
        r = requests.head(url, allow_redirects=True, timeout=timeout, headers=headers)
        return (*summarize(r), None)
    except requests.exceptions.SSLError as e:
        try:
            r = requests.head(url, allow_redirects=True, timeout=timeout, headers=headers, verify=False)
            return (*summarize(r), f"insecure (verify=false) due to: {e}")
        except Exception as e2:
            return None, None, None, [], str(e2)
    except Exception as e: return None, None, None, [], str(e)

def read_simple_url_csv(path: Path, url_col: str="Url") -> List[str]:
    with open(path,"r",encoding="utf-8") as f: 
        rdr = csv.DictReader(f); return [r[url_col].strip() for r in rdr if r.get(url_col)]

# -------------------- 재분류 --------------------
def classify_risk_and_action(row: Dict[str, Any]):
    days = int(row["days_to_expiry"]) if row.get("days_to_expiry") not in ("",None) else None
    expired   = days is not None and days < 0
    exp_soon  = days is not None and 0 <= days <= 30
    downgrade = (row.get("final_url") or "").lower().startswith("http://")
    insecure  = "insecure" in (row.get("http_note") or "").lower()
    mismatch  = str(row.get("hostname_match")).lower()=="false"

    if expired: risk, act, sev = "Expired","Renew certificate","Critical"
    elif downgrade: risk, act, sev = "Downgrade","Force HTTPS","Critical"
    elif mismatch: risk, act, sev = "Mismatch","Reissue/fix DNS","High"
    elif insecure: risk, act, sev = "Insecure","Fix certificate chain","Medium"
    elif exp_soon: risk, act, sev = "ExpiringSoon","Renew soon","High" if days<=7 else "Medium"
    else: risk, act, sev = "None","No action","Low"
    return risk, sev, act

# -------------------- 메인 --------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", required=True)
    ap.add_argument("--data-root", default=str(Path(__file__).resolve().parents[1]/"data"))
    ap.add_argument("--output-root", default=str(Path(__file__).resolve().parents[1]/"output"))
    ap.add_argument("--files", nargs="*", default=["lge.com.csv","lge.co.kr.csv","lgthinq.com.csv"])
    args = ap.parse_args()

    data_dir, out_dir = Path(args.data_root)/args.date, Path(args.output_root)/args.date
    out_dir.mkdir(parents=True, exist_ok=True)

    raw_fields = [
        "input_url","normalized_url","host",
        "tls_handshake_ok","cert_subject_cn","cert_san_list","hostname_match",
        "not_before_utc","not_after_utc","days_to_expiry","issuer_cn","serial_hex",
        "http_status_origin","http_status_final","http_status",
        "final_url","redirect_chain","http_note","error",
    ]
    rcf_fields = raw_fields+["risk_type","severity","recommended_action"]

    for path in [data_dir/f for f in args.files]:
        if not path.exists(): 
            print("[WARN] missing", path); continue
        urls = read_simple_url_csv(path)
        results=[]
        for u in urls:
            norm, host, port, scheme = normalize_url(u)
            item={f:None for f in raw_fields}
            item.update({"input_url":u,"normalized_url":norm,"host":host})
            # TLS
            if scheme=="https" and host:
                cert_pem,err=fetch_cert_pem(host,port)
                if cert_pem:
                    info=parse_cert_with_cryptography(cert_pem)
                    item.update(info); item["tls_handshake_ok"]=True
                    item["cert_san_list"]=";".join(info["cert_san_list"])
                    item["hostname_match"]=hostname_match(host,info["cert_san_list"],info["cert_subject_cn"])
                else: item.update({"tls_handshake_ok":False,"error":err})
            # HEAD
            o,fcode,furl,chain,note=head_with_redirects(norm)
            item.update({
                "http_status_origin":o,"http_status_final":fcode,"http_status":fcode,
                "final_url":furl,"redirect_chain":" | ".join([c for c in chain if c]) if chain else None,
                "http_note":note
            })
            results.append(item)

        stem=path.stem
        raw_path, rcf_path = out_dir/f"{stem}_ssl_audit_result.csv", out_dir/f"{stem}_ssl_audit_result_reclassified.csv"

        with open(raw_path,"w",newline="",encoding="utf-8") as f:
            w=csv.DictWriter(f,fieldnames=raw_fields); w.writeheader(); w.writerows(results)
        rcf=[]
        for r in results:
            risk,sev,act=classify_risk_and_action(r); r2=dict(r); r2.update({"risk_type":risk,"severity":sev,"recommended_action":act}); rcf.append(r2)
        with open(rcf_path,"w",newline="",encoding="utf-8") as f:
            w=csv.DictWriter(f,fieldnames=rcf_fields); w.writeheader(); w.writerows(rcf)

        print(f"[OK] {stem}: {len(results)} rows → {raw_path}, {rcf_path}")

if __name__=="__main__": main()
