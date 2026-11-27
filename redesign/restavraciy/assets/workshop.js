'use strict';
(() => {
  const find = (selector, parent = document) => parent.querySelector(selector);
  const all = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));

  const nav = find('.head-nav');
  const menu = find('.menu-toggle');
  function closeMenu(restoreFocus = false) {
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Открыть меню');
    if (restoreFocus) menu.focus({preventScroll:true});
  }
  menu.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  });
  document.addEventListener('click', (event) => {
    if (nav.classList.contains('open') && (!event.target.closest('.head') || event.target.closest('a'))) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('open')) closeMenu(true);
  });
  document.addEventListener('focusin', (event) => {
    if (nav.classList.contains('open') && !event.target.closest('.head')) closeMenu();
  });
  matchMedia('(max-width: 940px)').addEventListener('change', () => closeMenu());

  const stage = find('.art-stage');
  const bench = find('.bench-figure');
  const benchSection = bench?.closest('.bench');
  const benchPanel = benchSection && find('.bench-grid',benchSection);
  const phases = bench ? all('.bench-steps li',bench) : [];
  const door = stage && find('.door-right',stage);
  const flank = stage && find('.cabinet-flank',stage);
  const drawer = stage && find('.drawer-front',stage);
  const drawerInside = stage && find('.drawer-inside',stage);
  const drawerEdge = stage && find('.drawer-edge',stage);
  const magnet = find('.contact-head');
  const interactiveSelector = '.track, .compare-figure, .gallery-tile, .rates > div, .prep-result';
  let lastSurface = null;
  let latestPointer = null;
  let pointerFrame = 0;
  let scrollFrame = 0;
  const neutral = {x:0,y:0};
  let position = neutral;
  let progress = 0;
  function cabinetPosition() {
    if (!stage) return;
    stage.style.setProperty('--turn', (position.x * 12 - progress * 9) + 'deg');
    stage.style.setProperty('--pitch', (-position.y * 7 + progress * 4) + 'deg');
    stage.style.setProperty('--art-x', (position.x * 8 + progress * 5) + 'px');
    stage.style.setProperty('--art-y', (position.y * 4) + 'px');
    stage.style.setProperty('--halo-x', position.x * -5 + 'px');
    stage.style.setProperty('--shine-x', position.x * 27 + '%');
    // Project the stained-glass door around its right-hand hinge.
    const angle = clamp(46 + 34 * progress + 27 * position.x, 10, 84) * Math.PI / 180;
    const projection = Math.cos(angle) + .23 * Math.sin(angle);
    const drop = -.23 * Math.sin(angle);
    door.setAttribute('transform', `matrix(${projection} ${drop} 0 1 ${312*(1-projection)} ${-312*drop})`);
    const depth = 1.26 - position.x * .34 + progress * .18;
    flank.setAttribute('transform', `translate(312 0) scale(${depth} 1) translate(-312 0)`);

    const extension = clamp(.21 + progress * .79 - position.x * .4);
    const x = -22 * extension;
    const y = 17 * extension;
    drawer.setAttribute('transform', `translate(${x} ${y})`);
    drawerInside.setAttribute('d', `M220 252h89l${x} ${y}h-89Z`);
    drawerEdge.setAttribute('d', `M309 252v27l${x} ${y}v-27Z`);
  }
  function relative(event, el) {
    const box = el.getBoundingClientRect();
    return {x:clamp((event.clientX - box.left)/Math.max(1,box.width)*2-1,-1,1),
            y:clamp((event.clientY - box.top)/Math.max(1,box.height)*2-1,-1,1)};
  }
  function resetSurface() {
    if (!lastSurface) return;
    ['--px','--py','--active','--light-x'].forEach(p=>lastSurface.style.removeProperty(p));
    lastSurface = null;
  }
  function pointerPaint() {
    pointerFrame=0;
    const e=latestPointer;
    if (!e || reduce.matches || !fine.matches || e.pointerType==='touch') return;
    const el = e.target instanceof Element ? e.target : null;
    const surface = el?.closest(interactiveSelector);
    if (surface !== lastSurface) resetSurface();
    if (surface) {
      const {x,y}=relative(e,surface);
      lastSurface=surface;
      surface.style.setProperty('--px',String(x));
      surface.style.setProperty('--py',String(y));
      surface.style.setProperty('--active','1');
      surface.style.setProperty('--light-x',(x+1)*50+'%');
    }
    if (stage) {
      const next=el?.closest('.art-stage') ? relative(e,stage) : neutral;
      if (position.x!==next.x || position.y!==next.y) {position=next;cabinetPosition();}
    }
    const offset=el?.closest('.contact-head') ? relative(e,magnet) : neutral;
    magnet.style.setProperty('--mx',offset.x*3.5+'px');
    magnet.style.setProperty('--my',offset.y*2.5+'px');
  }
  document.addEventListener('pointermove',e=>{
    if (!fine.matches || reduce.matches || e.pointerType==='touch') return;
    latestPointer=e;
    if (!pointerFrame) pointerFrame=requestAnimationFrame(pointerPaint);
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{
    latestPointer=null;position=neutral;resetSurface();cabinetPosition();
    magnet.style.removeProperty('--mx');magnet.style.removeProperty('--my');
  });
  const ease = n => { const t=clamp(n); return t*t*(3-2*t); };
  const sectionTime = (p,start,end) => ease((p-start)/(end-start));
  const move = (node,x,y) => node.setAttribute('transform',`translate(${x.toFixed(2)} ${y.toFixed(2)})`);
  const benchArt = bench && Object.fromEntries(
    ['layer-base','layer-sheet','layer-finish','join-guides','work-brush','work-clamp','polish-sheen','polish-pad'].map(name=>[name,find('.'+name,bench)])
  );
  let lastBenchProgress=null;
  let lastBenchStill=null;
  function showVeneer(p,still) {
    if (p===lastBenchProgress && still===lastBenchStill) return;
    lastBenchProgress=p;
    lastBenchStill=still;
    const entry = still ? 0 : 1-sectionTime(p,0,.24);
    const spread = 1 - sectionTime(p,.21,.56);
    const finish = 1 - sectionTime(p,.61,.90);
    move(benchArt['layer-base'],-15*spread-12*entry,17*spread+9*entry);
    move(benchArt['layer-sheet'],22*spread+9*entry,-27*spread-2-8*entry);
    move(benchArt['layer-finish'],37*finish+12*entry,-52*finish-3-7*entry);
    benchArt['layer-finish'].setAttribute('opacity', still ? .64 : .32+.68*sectionTime(p,.65,.94));
    benchArt['join-guides'].setAttribute('opacity', .54*spread);
    const gluing = sectionTime(p,.17,.30) * (1-sectionTime(p,.42,.49));
    const brushTravel = sectionTime(p,.20,.46);
    move(benchArt['work-brush'],83+70*brushTravel,136+35*brushTravel);
    benchArt['work-brush'].setAttribute('opacity', gluing);
    const pressure = sectionTime(p,.39,.49) * (1-sectionTime(p,.60,.74));
    move(benchArt['work-clamp'],166,186-29*(1-pressure));
    benchArt['work-clamp'].setAttribute('opacity', pressure);
    const polishing = sectionTime(p,.66,.77) * (1-sectionTime(p,.91,1));
    const wipe = sectionTime(p,.69,.96);
    move(benchArt['polish-pad'],118+173*wipe,149-30*wipe);
    benchArt['polish-pad'].setAttribute('opacity', polishing);
    move(benchArt['polish-sheen'],430*wipe,0);
    const activePhase = p<.28 ? 0 : p<.69 ? 1 : 2;
    phases.forEach((li,i)=>{
      if (!still && i===activePhase) li.setAttribute('aria-current','step');
      else li.removeAttribute('aria-current');
    });
  }
  function scrollPaint() {
    scrollFrame=0;
    if (stage) {
      const r=stage.closest('.hero').getBoundingClientRect();
      if (reduce.matches) { position=neutral; progress=0; cabinetPosition(); }
      else if (r.bottom >= -5 && r.top < innerHeight) {
        progress=clamp((parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--head'))-r.top)/Math.max(1,r.height*.8));cabinetPosition();
      }
    }
    if (bench) {
      benchSection.toggleAttribute('data-sequence',!reduce.matches);
      if (reduce.matches) { showVeneer(0,true); return; }
      const head = find('.head').offsetHeight;
      const panelHeight = benchPanel.offsetHeight;
      const compact = panelHeight + head > innerHeight;
      benchSection.toggleAttribute('data-compact',compact);
      const r=benchSection.getBoundingClientRect();
      const entry=innerHeight*.93;
      const travel=Math.max(1,r.height-panelHeight);
      // The first layers move on entry. The remaining work follows the pinned panel.
      const p = compact ? clamp((entry-r.top)/(entry+panelHeight*.48))
        : r.top>head ? .23*clamp((entry-r.top)/(entry-head)) : .23+.77*clamp((head-r.top)/travel);
      showVeneer(p,false);
    }
  }
  function scheduleScroll() {if (!scrollFrame) scrollFrame=requestAnimationFrame(scrollPaint);}
  if (stage || bench) {
    addEventListener('scroll',scheduleScroll,{passive:true});addEventListener('resize',scheduleScroll,{passive:true});
    reduce.addEventListener('change',()=>{position=neutral;resetSurface();scheduleScroll();});scheduleScroll();
    document.fonts.ready.then(scheduleScroll);
  }

  function revealBatch(container, batch) {
    const tiles=all('.gallery-tile',container);
    const remote=container.closest('.reader-photos');
    for (const tile of tiles) {
      if (+tile.dataset.batch>batch) continue;
      tile.hidden=false;
      const img=find('img',tile);
      if (img.dataset.lazySrc) {img.src=img.dataset.lazySrc;delete img.dataset.lazySrc;}
      if (img.dataset.remoteSrc && remote?.open && !img.hasAttribute('src')) img.src=img.dataset.remoteSrc;
    }
    const shown=tiles.filter(t=>!t.hidden).length;
    const more=find('.more',container);
    if (more) more.hidden=shown===tiles.length;
    find('.gallery-count',container).textContent='Показано '+shown+' из '+tiles.length;
    container.dataset.batch=String(batch);
  }
  all('[data-gallery]').forEach(g=>{
    find('.more',g)?.addEventListener('click',()=>{
      const next=+(g.dataset.batch||0)+1;
      revealBatch(g,next);
      const a=find('.gallery-tile[data-batch="'+next+'"] a',g);
      if (a) a.focus({preventScroll:true});
    });
    const remote=g.closest('.reader-photos');
    if (remote) remote.addEventListener('toggle',()=>{if(remote.open) revealBatch(g, +(g.dataset.batch||0));});
  });
  document.addEventListener('error',event=>{
    if (!(event.target instanceof HTMLImageElement)) return;
    const tile=event.target.closest('.gallery-tile');
    if (tile) {
      const fallback=find('.unavailable-image',tile);if(!fallback)return;
      find('.gallery-picture',tile).hidden=true;fallback.hidden=false;
    }
  },true);

  const viewer=find('#viewer');
  const large=find('.view-frame img',viewer);
  const frame=find('.view-frame',viewer);
  const viewSpace=find('.view-space',viewer);
  const fallback=find('.view-fallback',viewer);
  function sizePhoto(container,width,height) {
    if (!width || !height) return;
    container.style.setProperty('--photo-width',width+'px');
    container.style.setProperty('--photo-ratio',String(width/height));
  }
  document.addEventListener('load',event=>{
    const img=event.target;
    if (!(img instanceof HTMLImageElement) || !img.dataset.remoteSrc) return;
    const tile=img.closest('.gallery-tile');
    sizePhoto(tile,img.naturalWidth,img.naturalHeight);
    tile.classList.toggle('wide-photo',img.naturalWidth>=2.15*img.naturalHeight);
  },true);
  let cohort=[], active=0, opener=null, gesture=null;
  function showPhoto(index) {
    active=(index+cohort.length)%cohort.length;
    const anchor=cohort[active];
    const caption=anchor.dataset.caption || find('img',anchor).alt;
    const thumbnail=find('img',anchor);
    sizePhoto(frame,thumbnail.naturalWidth || Number(thumbnail.getAttribute('width')),thumbnail.naturalHeight || Number(thumbnail.getAttribute('height')));
    frame.hidden=false;large.hidden=false;fallback.hidden=true;
    fallback.href=anchor.href;large.alt=caption;large.src=anchor.href;
    find('.view-caption',viewer).textContent=caption;
    find('.view-count',viewer).textContent=(active+1)+' / '+cohort.length;
    find('.view-steps',viewer).hidden=cohort.length<2;
  }
  large.addEventListener('load',()=>sizePhoto(frame,large.naturalWidth,large.naturalHeight));
  large.addEventListener('error',()=>{if(large.hasAttribute('src')){frame.hidden=true;fallback.hidden=false;}});
  document.addEventListener('click',event=>{
    const anchor=event.target.closest?.('[data-picture]');
    if (!anchor || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    cohort=all('[data-picture]').filter(a=>a.dataset.zone===anchor.dataset.zone && !a.hidden);
    opener=anchor;showPhoto(cohort.indexOf(anchor));
    viewer.showModal();find('.close-view',viewer).focus({preventScroll:true});
  });
  find('.close-view',viewer).addEventListener('click',()=>viewer.close());
  viewer.addEventListener('close',()=>{
    large.removeAttribute('src');fallback.hidden=true;
    if (opener?.isConnected) opener.focus({preventScroll:true});
    cohort=[];opener=null;gesture=null;
  });
  all('[data-step]',viewer).forEach(b=>b.addEventListener('click',()=>showPhoto(active+Number(b.dataset.step))));
  viewer.addEventListener('keydown',event=>{
    if (event.key==='ArrowRight' || event.key==='ArrowLeft') {
      event.preventDefault();showPhoto(active+(event.key==='ArrowRight'?1:-1));
    }
  });
  viewer.addEventListener('click',e=>{if(e.target===viewer || e.target===viewSpace)viewer.close();});
  viewSpace.addEventListener('touchstart',e=>{if(e.touches.length===1)gesture=[e.touches[0].clientX,e.touches[0].clientY];},{passive:true});
  viewSpace.addEventListener('touchcancel',()=>{gesture=null;},{passive:true});
  viewSpace.addEventListener('touchend',e=>{
    if(!gesture||!cohort.length)return;
    const dx=e.changedTouches[0].clientX-gesture[0],dy=e.changedTouches[0].clientY-gesture[1];gesture=null;
    if(Math.abs(dx)>50 && Math.abs(dx)>1.4*Math.abs(dy))showPhoto(active+(dx<0?1:-1));
  },{passive:true});
  const pairChoices=all('.pair-choice');
  function selectPair(b) {
    pairChoices.forEach(choice=>{
      const selected=choice===b;
      choice.setAttribute('aria-pressed',String(selected));
      document.getElementById(choice.getAttribute('aria-controls')).hidden=!selected;
    });
  }
  pairChoices.forEach(b=>b.addEventListener('click',()=>{
    selectPair(b);
    if (location.protocol!=='file:') history.replaceState(null,'','#'+b.getAttribute('aria-controls'));
  }));
  function restorePair() {
    const b=pairChoices.find(el=>'#'+el.getAttribute('aria-controls')===location.hash);
    if (!b) return;
    selectPair(b);
    requestAnimationFrame(()=>document.getElementById(b.getAttribute('aria-controls')).scrollIntoView());
  }
  if (pairChoices.length) { restorePair(); addEventListener('hashchange',restorePair); }

  const search=find('#cat-search');
  if (search) {
    const filters=all('[data-category]'),groups=all('[data-group]'),reset=find('#clear-search');
    let category='all';
    const normalized=t=>t.toLowerCase().trim().replaceAll('ё','е').replace(/\s+/g,' ');
    function apply() {
      const query=normalized(search.value);let total=0;
      filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===category)));
      groups.forEach(g=>{
        let count=0;
        all('[data-entry]',g).forEach(e=>{
          const visible=(category==='all'||g.dataset.group===category)&&normalized(e.dataset.search).includes(query);
          e.hidden=!visible;if(visible)count++;
        });
        g.hidden=!count;total+=count;
      });
      find('#matches').textContent='Материалов: '+total;
      reset.hidden=category==='all'&&!query;find('.empty-index').hidden=total!==0;
    }
    const fromHash=()=>{const key=location.hash.slice(1);category=filters.some(b=>b.dataset.category===key)?key:'all';apply();};
    filters.forEach(b=>b.addEventListener('click',()=>{
      category=b.dataset.category;
      if (location.protocol!=='file:')history.replaceState(null,'',location.pathname+location.search+(category==='all'?'':'#'+category));
      apply();
    }));
    search.addEventListener('input',apply);
    reset.addEventListener('click',()=>{
      search.value='';category='all';
      if (location.protocol!=='file:')history.replaceState(null,'',location.pathname+location.search);
      apply();search.focus();
    });
    addEventListener('hashchange',fromHash);fromHash();
  }
  const prep=find('#prep-form');
  const inquiry=find('#inquiry');
  if (!prep || !inquiry) return;
  const plan=find('#plan-done'), base=find('#plan-default'), checklist=find('#plan-list'), details=find('#details');
  const chosen=()=>find('[name="item"]:checked',prep);
  const conditions=()=>all('[name="state"]:checked',prep);
  const label=input=>input.closest('label').textContent.trim();
  function clearPlan() {plan.hidden=true;base.hidden=false;checklist.replaceChildren();}
  function makePlan() {
    const item=chosen();const condition=conditions();
    const tips=[item.dataset.guide,...condition.map(c=>c.dataset.guide)];
    if (!condition.length) tips.push('Добавьте крупный план наиболее заметного следа или повреждения.');
    checklist.replaceChildren(...tips.map(s=>{const li=document.createElement('li');li.textContent=s;return li;}));
    find('#plan-title').textContent='Снимки для оценки: '+label(item).toLowerCase();
    find('#plan-related').href=item.dataset.article;
    plan.hidden=false;base.hidden=true;plan.focus();
  }
  prep.addEventListener('submit',e=>{e.preventDefault();makePlan();});
  prep.addEventListener('change',clearPlan);
  prep.addEventListener('reset',()=>{clearPlan();});
  function objectHash() {
    if (!location.hash.startsWith('#ocenka-'))return;
    const value=location.hash.slice(8);
    const radio=all('input[name="item"]',prep).find(r=>r.value===value);
    if(!radio)return;
    radio.checked=true;clearPlan();requestAnimationFrame(()=>find('#ocenka').scrollIntoView({block:'start'}));
  }
  addEventListener('hashchange',objectHash);objectHash();
  const stageForm=find('#form-stage'),success=find('#form-success'),subject=find('#subject'),contact=find('#reply'),file=find('#photofile'),error=find('#form-error');
  function clearErrors() {
    error.hidden=true;error.textContent='';all('[aria-invalid="true"]',inquiry).forEach(f=>{f.removeAttribute('aria-invalid');f.removeAttribute('aria-describedby');});
  }
  function fileLabel() {find('#file-label').textContent=file.files[0]?.name || 'Выбрать фотографию';}
  function reopen() {stageForm.hidden=false;success.hidden=true;clearErrors();}
  find('#transfer').addEventListener('click',e=>{
    e.preventDefault();reopen();
    subject.value=label(chosen());
    const condition=conditions().map(label);
    details.value=condition.length?'Состояние: '+condition.join(', ').toLowerCase()+'.':'Хочу уточнить состояние предмета.';
    find('#contacts').scrollIntoView({block:'start'});subject.focus({preventScroll:true});
    // A narrow screen places the form below the address.
    if(subject.getBoundingClientRect().bottom>innerHeight)subject.scrollIntoView({block:'center'});
  });
  file.addEventListener('change',()=>{fileLabel();clearErrors();});
  inquiry.addEventListener('input',clearErrors);
  inquiry.addEventListener('submit',e=>{
    e.preventDefault();clearErrors();
    const fail=(el,msg)=>{(el.closest('.file-box') || el).insertAdjacentElement('afterend',error);error.textContent=msg;error.hidden=false;el.setAttribute('aria-invalid','true');el.setAttribute('aria-describedby','form-error');el.focus();};
    if(!subject.value.trim())return fail(subject,'Укажите, какой предмет хотите восстановить.');
    if(!details.value.trim())return fail(details,'Опишите состояние или напишите, что хотите выяснить.');
    const value=contact.value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&!(/^\+?[\d\s().-]+$/.test(value)&&value.replace(/\D/g,'').length>=7&&value.replace(/\D/g,'').length<=15))return fail(contact,'Введите адрес электронной почты или телефон с кодом города или страны.');
    const photo=file.files[0];
    if(photo && !(photo.type.startsWith('image/')||(!photo.type&&/\.(jpe?g|png|webp|heic|heif|avif|gif)$/i.test(photo.name))))return fail(file,'Выберите файл изображения.');
    if(photo && photo.size>6*1024*1024)return fail(file,'Фотография больше 6 МБ. Выберите файл меньшего размера.');
    inquiry.reset();fileLabel();stageForm.hidden=true;success.hidden=false;success.focus();
  });
  find('#new-inquiry').addEventListener('click',()=>{reopen();inquiry.reset();fileLabel();subject.focus();});
})();
