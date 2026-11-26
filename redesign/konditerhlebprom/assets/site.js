'use strict';
(() => {
  const first = (sel, root = document) => root.querySelector(sel);
  const all = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const arrow = '<svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const fold = value => value.toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[‐‑–—]/g,'-').replace(/[^а-яa-z0-9]/g,'');
  const toggle = first('.menutoggle'), panel = first('#mobile-nav');
  function menu(open, restore = false) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open ? 'Закрыть меню' : 'Открыть меню');
    if (restore) toggle.focus();
  }
  toggle.addEventListener('click', () => menu(panel.hidden));
  panel.addEventListener('click', event => { if (event.target.closest('a')) menu(false); });
  document.addEventListener('pointerdown', event => { if (!panel.hidden && !event.target.closest('.mast')) menu(false); });
  document.addEventListener('focusin', event => { if (!panel.hidden && !event.target.closest('.mast')) menu(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) menu(false,true); });
  matchMedia('(min-width:781px)').addEventListener('change',event => { if (event.matches) menu(false); });

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const precise = matchMedia('(hover:hover) and (pointer:fine)');
  const clamp = (n, lo = -1, hi = 1) => Math.min(hi,Math.max(lo,n));
  const stage = first('.drawing-stage');
  const process = first('.cut-diagram');
  function track(node,callback,includeTouch = false) {
    if (!node) return;
    let rect, frame = 0, position;
    const update = () => {
      frame = 0;
      if (motion.matches) return;
      callback(position[0],position[1]);
    };
    const move = event => {
      if (motion.matches || (!includeTouch && !precise.matches) || (!precise.matches && event.pointerType !== 'touch')) return;
      rect = node.getBoundingClientRect();
      position = [clamp(2*(event.clientX-rect.left)/rect.width-1),clamp(2*(event.clientY-rect.top)/rect.height-1)];
      if (!frame) frame = requestAnimationFrame(update);
    };
    const restore = () => { cancelAnimationFrame(frame); frame = 0; callback(0,0); };
    node.addEventListener('pointermove',move,{passive:true});
    if (includeTouch) node.addEventListener('pointerdown',move,{passive:true});
    node.addEventListener('pointerleave',restore);
    node.addEventListener('pointercancel',restore);
    node.addEventListener('pointerup',event => { if (event.pointerType === 'touch') restore(); });
    motion.addEventListener('change',restore);
  }
  track(first('.contact-btn'),(x,y) => {
    const el=first('.contact-btn');el.style.setProperty('--magx',x*3+'px');el.style.setProperty('--magy',y*2.2+'px');
  });
  track(stage,(x,y) => { stage.style.setProperty('--hx',x);stage.style.setProperty('--hy',y); },true);
  all('.react').forEach(node => track(node,(x,y) => {node.style.setProperty('--rx',x);node.style.setProperty('--ry',y);}));
  if (stage || process) {
    let scheduled = false;
    const layers = process ? all('[data-layer]',process) : [];
    const positions = {feed:[0,-91],roll:[-55,-18],die:[69,7],wire:[-110,3],drop:[0,26],tray:[92,28]};
    function paint(){
      scheduled = false;
      if (stage) {
        const box=stage.closest('.hero').getBoundingClientRect();
        if(box.bottom>=-30) stage.style.setProperty('--hs',motion.matches ? 0 : clamp(-box.top/box.height,0,1));
      }
      if (process) {
        const b=process.getBoundingClientRect();
        if(b.top<innerHeight+110 && b.bottom>-100) {
          const t=motion.matches ? 1 : clamp((innerHeight-b.top)/(innerHeight*.57+b.height*.55),0,1);
          layers.forEach(layer => {
            const pos=positions[layer.dataset.layer]; const remaining = 1-t;
            layer.style.transform='translate('+pos[0]*remaining+'px,'+pos[1]*remaining+'px)';
          });
        }
      }
    }
    function queue(){if(!scheduled){scheduled=true;requestAnimationFrame(paint);}}
    addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue,{passive:true});
    motion.addEventListener('change',queue);queue();
  }
  for (const directory of all('[data-directory]')) {
    const original = JSON.parse(first('.directory-data',directory).textContent);
    const input=first('input',directory),list=first('.directory-list',directory),more=first('.load-more',directory),clear=first('.clear-search',directory),status=first('.list-count',directory);
    original.forEach(item => {item.key=fold([item.name,item.meta,item.code].join(' '));});
    const size=Number(directory.dataset.limit);
    let max=size, filtered=original;
    function draw(focusNew=false){
      const frag=document.createDocumentFragment();
      for (const item of filtered.slice(0,max)) {
        const a=document.createElement('a'),label=document.createElement('span');
        a.className='directory-row';a.href=item.href;label.textContent=item.name;
        if(item.meta){const small=document.createElement('small');small.textContent=item.meta;label.append(small);}
        a.append(label);a.insertAdjacentHTML('beforeend',arrow);frag.append(a);
      }
      if(!filtered.length){const p=document.createElement('p');p.className='price-empty';p.textContent='Совпадений нет. Попробуйте часть названия или артикул.';frag.append(p);}
      list.replaceChildren(frag);
      more.hidden=max>=filtered.length;clear.hidden=!input.value;
      status.textContent='Найдено '+filtered.length+' · Показано '+Math.min(max,filtered.length);
      if(focusNew) list.children[Math.max(0,max-size)]?.focus({preventScroll:true});
    }
    function apply(){const term=fold(input.value);max=size;filtered=original.filter(item=>item.key.includes(term));draw();}
    input.addEventListener('input',apply);
    clear.addEventListener('click',()=>{input.value='';apply();input.focus();});
    more.addEventListener('click',()=>{max+=size;draw(true);});
    if(original.length<=size) more.hidden=true;
  }
  const priceFilter=first('#price-filter');
  if(priceFilter){
    const groups=all('.price-group'),status=first('.price-count'),clear=first('.clear-price');
    const rows=groups.map(group=>({group,key:fold(group.dataset.group),rows:all('.price-item',group).map(item=>({item,key:fold(item.textContent)}))}));
    let openBefore=null;
    function filter(){
      const term=fold(priceFilter.value);let total=0;
      if(term && openBefore===null) openBefore=new Set(groups.filter(g=>g.open));
      for(const g of rows){
        let count=0;
        for(const row of g.rows){const found=!term||g.key.includes(term)||row.key.includes(term);row.item.hidden=!found;if(found){count++;total++;}}
        g.group.hidden=!count;
        if(term)g.group.open=Boolean(count);
        else if(openBefore)g.group.open=openBefore.has(g.group);
      }
      if(!term)openBefore=null;
      clear.hidden=!priceFilter.value;first('.price-empty').hidden=total>0;status.textContent='Позиций — '+total;
    }
    priceFilter.addEventListener('input',filter);
    clear.addEventListener('click',()=>{priceFilter.value='';filter();priceFilter.focus();});
    const hash=location.hash.slice(1);
    if(hash && /^[a-z0-9-]+$/.test(hash)){const row=document.getElementById(hash);if(row?.classList.contains('price-item')){row.closest('details').open=true;requestAnimationFrame(()=>row.scrollIntoView());}}
  }
})();
