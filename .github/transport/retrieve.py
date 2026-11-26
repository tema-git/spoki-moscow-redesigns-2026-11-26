from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import re
import threading
import time
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from urllib.error import HTTPError

root = Path("media-transfer")
root.mkdir(exist_ok=True)
plan = json.loads(Path(".github/transport/plan.json").read_text())
domains = {"i-tec": "i-tec.ru", "laans-piano": "laans-piano.ru", "virtu-style": "virtu-style.com", "restavraciy": "restavraciy.ru"}
max_bytes = 24 * 1024 ** 2
network_pauses = {}
lock = threading.Lock()

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
        with urlopen(Request(url,headers=headers),timeout=15) as resp:
            result.update(status=resp.status, media=resp.headers.get_content_type(), effective=resp.geturl())
            if not allowed(resp.geturl(),domains[slug]): return {**result,"error":"different origin"}
            if mode=="probe":
                result["received"]=len(resp.read(1400))
                print(slug,resp.status,result["media"],flush=True)
                return result
            if not resp.headers.get_content_type().startswith("image/"):
                return {**result,"error":"not an image"}
            data=resp.read(max_bytes+1)
            if len(data)>max_bytes or len(data)<120: return {**result,"error":"size outside limits"}
            ext={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/avif":"avif","image/gif":"gif"}.get(result["media"])
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
    except OSError as exc:
        result["error"]=str(exc)
    return result

jobs=[(slug,u) for slug,urls in plan["sites"].items() for u in dict.fromkeys(urls)]
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

