from concurrent.futures import ThreadPoolExecutor
import os
import http.client
import hashlib
import json
import re
import threading
import time
from pathlib import Path
from urllib.parse import urlsplit, quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError

root = Path("media-transfer")
root.mkdir(exist_ok=True)
plan = json.loads(Path(".github/transport/plan.json").read_text())
domains = {"i-tec": "i-tec.ru", "laans-piano": "laans-piano.ru", "virtu-style": "virtu-style.com", "restavraciy": "restavraciy.ru"}
max_bytes = 24 * 1024 ** 2
network_pauses = {}
lock = threading.Lock()
connections = threading.local()

def receive(url):
    u=urlsplit(url)
    store=getattr(connections,'connections',None)
    if store is None: store={}; connections.connections=store
    for attempt in range(2):
        conn=store.get(u.hostname)
        if conn is None:
            conn=http.client.HTTPSConnection(u.hostname,timeout=14)
            store[u.hostname]=conn
        try:
            path=quote(u.path or "/", safe="/%:@-._~!$&'()*+,;=")
            if u.query: path += "?"+quote(u.query, safe="=&%+/:?@-._~!$'()*,;")
            conn.request("GET",path,headers={"User-Agent":"SpokiStudio-PublicGallery/1.0","Accept":"image/*","Accept-Encoding":"identity"})
            response=conn.getresponse()
            if response.status!=200:
                response.read(1024);conn.close();store.pop(u.hostname,None)
                raise HTTPError(url,response.status,response.reason,response.headers,None)
            mime=response.headers.get_content_type()
            body=response.read(max_bytes+1)
            if len(body)>max_bytes: conn.close();store.pop(u.hostname,None)
            return mime,body
        except HTTPError: raise
        except (OSError,http.client.HTTPException):
            conn.close();store.pop(u.hostname,None)
            if attempt: raise

def allowed(url, domain):
    u = urlsplit(url)
    return u.scheme == "https" and u.hostname in {domain, "www." + domain} and u.username is None and u.password is None and u.port in {None,443} and not re.search(r"(?:access_token|signature|api_key|password)=", u.query, re.I)

def request(entry):
    slug, url = entry
    result = {"slug":slug, "url":url}
    if slug not in domains or not allowed(url,domains[slug]):
        return {**result, "error":"not a public URL for this source"}
    with lock:
        if network_pauses.get(slug): return {**result, "error":"source temporarily unavailable"}
    mode = plan["mode"]
    headers = {"User-Agent":"SpokiStudio-PublicGallery/1.0", "Accept":"image/*" if mode=="media" else "text/html,image/*"}
    try:
        if mode=="probe":
            with urlopen(Request(url,headers=headers),timeout=15) as resp:
                result.update(status=resp.status,media=resp.headers.get_content_type(),effective=resp.geturl(),received=len(resp.read(1400)))
                return result
        mime,data=receive(url)
        result.update(status=200,media=mime)
        if not mime.startswith("image/"): return {**result,"error":"not an image"}
        if len(data)>max_bytes or len(data)<120: return {**result,"error":"size outside limits"}
        ext={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/avif":"avif","image/gif":"gif"}.get(mime)
        if not ext:return {**result,"error":"unsupported raster format"}
        file=Path(slug)/(hashlib.sha256(url.encode()).hexdigest()+"."+ext)
        filepath=root/file
        filepath.parent.mkdir(exist_ok=True)
        filepath.write_bytes(data)
        result.update(file=file.as_posix(),bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
    except HTTPError as exc:
        result.update(status=exc.code,error=str(exc))
        if exc.code in {401,403,429}:
            with lock:network_pauses[slug]=True
    except (OSError,http.client.HTTPException,UnicodeError,ValueError) as exc:
        result["error"]=str(exc)
    return result

chosen=os.getenv("SOURCE")
if chosen: plan["sites"]={chosen:plan["sites"].get(chosen,[])}
start=int(os.getenv("RANGE_START","0"));end=int(os.getenv("RANGE_END","50000"))
jobs=[(slug,u) for slug,urls in plan["sites"].items() for u in list(dict.fromkeys(urls))[start:end]]
def for_site(slug):
    items=[x for x in jobs if x[0]==slug]
    if plan["mode"]=="probe": workers=1
    else: workers=3
    with ThreadPoolExecutor(max_workers=workers) as pool:
        return list(pool.map(request,items))
with ThreadPoolExecutor(max_workers=4) as pool:
    all_results=[r for group in pool.map(for_site,plan["sites"]) for r in group]
(root/"result.json").write_text(json.dumps(all_results,ensure_ascii=False,indent=2))
for slug in plan["sites"]:
    chunk=[r for r in all_results if r["slug"]==slug]
    print(slug,sum(r.get("status")==200 and "error" not in r for r in chunk),"/",len(chunk),flush=True)

