const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { chromium } = require("playwright");
const root = path.resolve("redesign");
const out = path.resolve("qa-output");
const origin = "https://tema-git.github.io";
const prefix = "/spoki-moscow-redesigns-2026-11-26/";
const version = process.env.GITHUB_SHA || "manual";
fs.mkdirSync(out, { recursive: true });
const checks = [];
const screenshots = [];
const failures = [];
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function localFile(url) {
  const u = new URL(url);
  if (u.origin !== origin || !u.pathname.startsWith(prefix + "redesign/")) return null;
  let file = path.resolve(root, decodeURIComponent(u.pathname.slice((prefix + "redesign/").length)));
  if (!file.startsWith(root + path.sep)) return null;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}
async function compare(url, file, tag) {
  const expected = hash(fs.readFileSync(file));
  let state;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(18000) });
      const bytes = Buffer.from(await r.arrayBuffer());
      const actual = hash(bytes);
      state = { url, effective:r.url, tag, status:r.status, bytes:bytes.length, actual, expected, ok:r.ok && actual === expected };
    } catch (e) {
      state = { url, tag, ok:false, error:String(e) };
    }
    if (state.ok) break;
    if (i !== 3) await sleep(2500 * (i + 1));
  }
  checks.push(state);
  if (!state.ok) failures.push([url,tag,state.status || state.error]);
}
async function review(browser, slug) {
  const home = origin + prefix + "redesign/" + slug + "/";
  const file = path.join(root, slug, "index.html");
  await Promise.all([["home",home],["explicit",home+"index.html"],["slash",home.slice(0,-1)],["query",home+"?v="+version.slice(0,10)],["reload",home]].map(([label,url])=>compare(url,file,label)));
  for (const w of [1440,390]) {
    const ctx = await browser.newContext({ viewport:{ width:w,height:w===390?844:900 }, isMobile:w===390, hasTouch:w===390, deviceScaleFactor:1, locale:"ru-RU" });
    const p = await ctx.newPage();
    const errors = [];
    p.on("pageerror",e=>errors.push(e.message));
    try {
      const response = await p.goto(home,{waitUntil:"domcontentloaded",timeout:45000});
      await p.evaluate(async()=>{ await Promise.race([Promise.all([document.fonts.ready,...[...document.images].filter(img=>{const r=img.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0;}).map(img=>img.decode().catch(()=>{}))]),new Promise(r=>setTimeout(r,4500))]); });
      await p.waitForTimeout(500);
      const snapshot = await p.evaluate(()=>({title:document.title,width:document.documentElement.scrollWidth, viewport:innerWidth, h1:document.querySelector("h1")?.textContent?.trim(),broken:[...document.images].filter(e=>e.currentSrc&&e.complete&&!e.naturalWidth&&e.getBoundingClientRect().width>0&&e.getBoundingClientRect().top<innerHeight&&e.getBoundingClientRect().bottom>0).map(e=>e.currentSrc)}));
      await p.screenshot({ path:path.join(out,slug+"-"+w+".jpg"), type:"jpeg",quality:86, timeout:15000 });
      if (w===1440) {
        const refs = await p.evaluate(()=>({ assets:[...document.querySelectorAll("script[src],link[rel=stylesheet],img[src]")].map(e=>e.currentSrc||e.src||e.href),pages:[...document.links].map(a=>a.href) }));
        const seen = new Set([file]); const extras = [];
        for(const [kind, list, limit] of [["asset",refs.assets,5],["inner",refs.pages,2]]) {
          let n=0;
          for (const href of list) {
            const u=new URL(href);if(!u.pathname.startsWith(new URL(home).pathname))continue;
            const f=localFile(href);if(!f||seen.has(f))continue;
            seen.add(f); extras.push(compare(href,f,kind));if(++n>=limit)break;
          }
        }
        await Promise.all(extras);
      }
      const link = p.locator("header a:visible,header button:visible,[role=banner] a:visible").filter({hasText:/Контакты/i}).first();
      await link.click({timeout:9000});
      await p.waitForTimeout(750);
      const dest=await p.evaluate(()=>({url:location.href,forms:document.forms.length,contactLinks:[...document.links].filter(a=>a.href.startsWith("tel:")||a.href.startsWith("mailto:")).length,scroll:scrollY}));
      const ok=response?.ok()&&!!snapshot.h1&&snapshot.width<=w+1&&snapshot.viewport<=w+1&&!snapshot.broken.length&&!errors.length&&new URL(dest.url).pathname.startsWith(new URL(home).pathname)&&(dest.forms+dest.contactLinks>0);
      screenshots.push({slug,w,status:response?.status(),snapshot,dest,errors,ok});
      if(!ok)failures.push([slug,w,snapshot,errors]);
    } catch(e) {
      screenshots.push({slug,w,ok:false,errors:[String(e)]});failures.push([slug,w,String(e)]);
    } finally { await ctx.close(); }
  }
}
(async()=>{
  const slugs=fs.readdirSync(root,{withFileTypes:true}).filter(p=>p.isDirectory()).map(p=>p.name);
  if(slugs.length!==10)throw Error("Expected ten demos, found "+slugs.length);
  const index = path.resolve("index.html");
  const entries = Array.from(fs.readFileSync(index, "utf8").matchAll(/href="redesign\/([^"/]+)\/"/g), match => match[1]).sort();
  if (JSON.stringify(entries) !== JSON.stringify([...slugs].sort())) throw Error("Demo catalogue does not match the ten sites");
  await compare(origin + prefix, index, "catalogue");
  const localChrome=["/usr/bin/google-chrome","/usr/bin/chromium","/usr/bin/chromium-browser"].find(f=>fs.existsSync(f));
  const browser=await chromium.launch(localChrome?{executablePath:localChrome,headless:true}:{headless:true});
  const pending=[...slugs];
  async function next(){let s;while((s=pending.shift()))await review(browser,s);}
  try{await Promise.all([next(),next()]);}finally{await browser.close();}
  fs.writeFileSync(path.join(out,"checks.json"),JSON.stringify({version,checks,screenshots,failures},null,2));
  console.log("Sites:",slugs.length,"network:",checks.length,"browser:",screenshots.length,"issues:",failures.length);
  if(failures.length){console.log(JSON.stringify(failures).slice(0,8500));process.exitCode=1;}
})().catch(err=>{console.error(err.message);process.exitCode=1;});
