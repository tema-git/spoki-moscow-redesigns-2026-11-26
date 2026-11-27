(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const svgArrow = '<svg class="arrow" width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (n, min, max) => Math.max(min, Math.min(max,n));
  const normalize = s => s.toLocaleLowerCase('ru-RU').replaceAll('ё','е').trim();
  const mobileMenu = $('#mobile-menu');
  const menuButton = $('.menu-button');
  function menu(open, restore = false) {
    mobileMenu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label',open ? 'Закрыть меню' : 'Открыть меню');
    if (restore) menuButton.focus();
  }
  menuButton.addEventListener('click',() => menu(mobileMenu.hidden));
  document.addEventListener('click',e => { if (!mobileMenu.hidden && (!e.target.closest('.mast') || e.target.closest('a'))) menu(false); });
  document.addEventListener('keydown',e => { if (e.key === 'Escape' && !mobileMenu.hidden) menu(false,true); });
  matchMedia('(min-width: 996px)').addEventListener('change',e => { if (e.matches) menu(false); });

  $$('[data-paged]').forEach(group => {
    const tiles = $$('[data-tile]', group);
    const find = $('[data-find]',group);
    const priced = $('[data-price-only]',group);
    const count = $('[data-count]',group);
    const empty = $('.empty-result',group);
    const more = $('[data-more]',group);
    const step = Number(group.dataset.limit) || 18;
    let limit = step;
    function update(extend = false) {
      const term = normalize(find?.value || '');
      const matched = tiles.filter(tile => (!term || normalize(tile.dataset.search || '').includes(term)) && (!priced?.checked || tile.dataset.priced === '1'));
      const visible = new Set(matched.slice(0,limit));
      const newlyVisible = extend ? matched[limit-step] : null;
      tiles.forEach(tile => { tile.hidden = !visible.has(tile); });
      if (count) count.textContent = 'Показано ' + visible.size + ' из ' + matched.length;
      if (empty) empty.hidden = matched.length > 0;
      if (more) {
        more.hidden = visible.size === matched.length;
        more.textContent = 'Показать ещё ' + Math.min(step,matched.length-visible.size);
      }
      if (newlyVisible) (newlyVisible.querySelector('a, button') || newlyVisible).focus({preventScroll:true});
    }
    find?.addEventListener('input',() => {limit=step;update();});
    priced?.addEventListener('change',() => {limit=step;update();});
    more?.addEventListener('click',() => {limit+=step;update(true);});
    update();
  });

  function framePhoto(img, style) {
    const existing=img.parentElement.classList.contains('natural-frame') ? img.parentElement : null;
    if(!style){if(existing)existing.replaceWith(img);return;}
    const frame=existing||document.createElement('span');
    frame.className='natural-frame';
    frame.style.cssText=style;
    if(!existing){img.replaceWith(frame);frame.append(img);}
  }
  const dialog = $('#gallery-dialog');
  const viewer = $('.light-view', dialog);
  const zoom = $('.light-zoom', dialog);
  const fullSource = $('.light-source', dialog);
  let images = [], position = 0, opener;
  function setZoom(enlarge) {
    const img = $('.light-image', dialog);
    if (enlarge) {
      const frame = img.closest('.natural-frame');
      const size = (frame || img).getBoundingClientRect();
      const detailWidth = frame ? parseFloat(frame.style.getPropertyValue('--frame-w')) : img.naturalWidth;
      if (!size.width || !img.naturalWidth) return;
      viewer.style.width = size.width+'px';
      viewer.style.height = size.height+'px';
      viewer.style.setProperty('--zoom-width', Math.max(detailWidth,size.width*2)+'px');
    } else {
      viewer.removeAttribute('style');
    }
    viewer.classList.toggle('enlarged', enlarge);
    viewer.tabIndex = enlarge ? 0 : -1;
    zoom.setAttribute('aria-pressed', String(enlarge));
    zoom.textContent = enlarge ? 'Целиком' : 'Увеличить';
    if (enlarge) {
      viewer.scrollLeft = (viewer.scrollWidth-viewer.clientWidth)/2;
      viewer.scrollTop = (viewer.scrollHeight-viewer.clientHeight)/2;
      viewer.focus({preventScroll:true});
    } else viewer.scrollTo(0,0);
  }
  zoom.addEventListener('click', () => setZoom(!viewer.classList.contains('enlarged')));
  function displayPhoto(offset = 0) {
    if (!images.length) return;
    setZoom(false);
    position = (position+offset+images.length)%images.length;
    const item = images[position];
    const image = $('.light-image',dialog);
    image.src = item.dataset.photo; image.alt = item.dataset.caption;
    framePhoto(image,item.dataset.frame);
    fullSource.hidden = !item.dataset.original;
    if (item.dataset.original) fullSource.href = item.dataset.original;
    else fullSource.removeAttribute('href');
    $('#light-caption').textContent = item.dataset.caption;
    $('#light-count').textContent = (position+1) + ' / ' + images.length;
    $('.light-actions',dialog).hidden = images.length < 2;
  }
  document.addEventListener('click',e => {
    const button=e.target.closest('[data-photo]');
    if (!button) return;
    opener=button;
    const wholePage = $('.product-layout,.project-detail,.salon-lead');
    const group = wholePage ? document : button.closest('[data-photo-group]') || button.parentElement;
    const distinct = new Map();
    for (const photo of $$('[data-photo]', group)) {
      if (!distinct.has(photo.dataset.photo)) distinct.set(photo.dataset.photo, photo);
    }
    images = [...distinct.values()];
    position = Math.max(0,images.findIndex(x=>x.dataset.photo===button.dataset.photo));
    displayPhoto();
    if (!dialog.open) dialog.showModal();
    $('.light-close',dialog).focus();
    document.body.style.overflow='hidden';
  });
  $('.light-close',dialog).addEventListener('click',() => dialog.close());
  $('[data-prev]',dialog).addEventListener('click',() => displayPhoto(-1));
  $('[data-next]',dialog).addEventListener('click',() => displayPhoto(1));
  dialog.addEventListener('click',e => {
    if(e.target!==dialog) return;
    const b=dialog.getBoundingClientRect();
    if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom) dialog.close();
  });
  dialog.addEventListener('close',() => {document.body.style.overflow='';opener?.focus({preventScroll:true});});
  dialog.addEventListener('keydown',e => {
    if (e.target === viewer && viewer.classList.contains('enlarged')) return;
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();displayPhoto(e.key==='ArrowRight'?1:-1);}
  });
  let startX,startY;
  dialog.addEventListener('touchstart',e => {startX=e.changedTouches[0].clientX;startY=e.changedTouches[0].clientY;},{passive:true});
  dialog.addEventListener('touchend',e => {
    if(viewer.classList.contains('enlarged'))return;
    const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;
    if(Math.abs(dx)>45 && Math.abs(dx)>1.5*Math.abs(dy)) displayPhoto(dx<0?1:-1);
  },{passive:true});

  const stage=$('[data-stage]'), hero=$('.hero'), scene=$('[data-assembly]');
  let heroProgress=0, x=0, y=0, request=0;
  function renderHero() {
    if(!stage) return;
    const moving=!reduced.matches;
    window.VirtuMantel?.hero(x,y,heroProgress,!moving);
    const set=(n,s)=>stage.style.setProperty(n,s);
    set('--hx',(moving?x*13:0)+'px');set('--hy',(moving?y*6+heroProgress*10:0)+'px');
    set('--ry','0deg');set('--rx','0deg');
    set('--hs',moving?1+heroProgress*.075:1);set('--beam',(50+x*22)+'%');set('--flame',moving?1+y*.08-heroProgress*.08:1);
  }
  function readScroll() {
    request=0;
    if(stage) {
      const b=hero.getBoundingClientRect();
      if(b.bottom>=0 && b.top<=innerHeight) {heroProgress=clamp(-b.top/Math.max(b.height,1),0,1);renderHero();}
    }
    if(scene) {
      const b=scene.getBoundingClientRect();
      const pinned=scene.firstElementChild;
      const header=Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header'))||68;
      const entrance=Math.max(1,innerHeight-header);
      const runway=b.height-pinned.offsetHeight;
      let p;
      if(runway<60) p=clamp((innerHeight-b.top)/(innerHeight*.7+b.height*.4),0,1);
      else if(b.top>=header) p=.28*clamp((innerHeight-b.top)/entrance,0,1);
      else p=.28+.72*clamp((header-b.top)/runway,0,1);
      window.VirtuMantel?.study(p,reduced.matches);
    }
  }
  const scrollRequest=()=>{if(!request)request=requestAnimationFrame(readScroll);};
  if(stage||scene){addEventListener('scroll',scrollRequest,{passive:true});addEventListener('resize',scrollRequest);readScroll();}
  if(stage){
    let origin=null;
    stage.addEventListener('pointerdown',e=>{
      if(e.pointerType==='touch' && !reduced.matches)origin={x:e.clientX,y:e.clientY,start:x};
    },{passive:true});
    stage.addEventListener('pointermove',e=>{
      if(!origin || e.pointerType!=='touch')return;
      const dx=e.clientX-origin.x,dy=e.clientY-origin.y;
      if(Math.abs(dy)>Math.abs(dx)+7){origin=null;return;}
      if(Math.abs(dx)>5){x=clamp(origin.start+dx/(stage.clientWidth*.36),-1,1);renderHero();}
    },{passive:true});
    for(const name of ['pointerup','pointercancel'])stage.addEventListener(name,()=>{origin=null;},{passive:true});
  }
  let touchFrame;
  document.addEventListener('pointermove',e=>{
    if(!pointer.matches||reduced.matches||e.pointerType==='touch')return;
    const target=e.target.closest('[data-stage],[data-react],.contact-button,.compare-card,.direction,.form-card');
    if(!target)return;
    if(touchFrame)cancelAnimationFrame(touchFrame);
    touchFrame=requestAnimationFrame(()=>{
      const b=target.getBoundingClientRect(),px=clamp((e.clientX-b.left)/Math.max(b.width,1)*2-1,-1,1),py=clamp((e.clientY-b.top)/Math.max(b.height,1)*2-1,-1,1);
      if(target===stage){x=px;y=py;renderHero();}
      else if(target.matches('.contact-button')){target.style.setProperty('--mx',px*3+'px');target.style.setProperty('--my',py*2+'px');}
      else {target.style.setProperty('--px',px*5+'px');target.style.setProperty('--py',py*3+'px');target.style.setProperty('--light',(50+px*42)+'%');}
    });
  },{passive:true});
  document.addEventListener('pointerout',e=>{
    const t=e.target.closest?.('[data-stage],[data-react],.contact-button,.compare-card,.direction,.form-card');
    if(!t||t.contains(e.relatedTarget))return;
    if(touchFrame)cancelAnimationFrame(touchFrame);
    if(t===stage){if(e.pointerType!=='touch'){x=y=0;renderHero();}}else for(const k of ['--px','--py','--light','--mx','--my'])t.style.removeProperty(k);
  });
  reduced.addEventListener('change',()=>{x=y=0;renderHero();readScroll();});

  const form=$('#brief-form');
  if(!form)return;
  const data=JSON.parse($('#model-data').textContent);
  const models=new Map(data.map(m=>[m.id,m]));
  const search=new URLSearchParams(location.search);
  const start={a:'516',b:'170'};
  const state={...start,base:'a',stone:'Как у модели'};
  if(models.has(search.get('model'))){
    state.a=search.get('model');
    if(state.a===state.b)state.b=start.a;
  }
  const sides=['a','b'];
  const other=s=>s==='a'?'b':'a';
  const getModel=s=>models.get(state[s]);
  const dimensions=m=>m.id==='162'?'По стенам 1350 × 1350 мм, высота 1450 мм':m.dims?m.dims.slice(0,3).join(' × ')+' мм':'Уточнить у мастерской';
  const aperture=m=>m.dims?m.dims.slice(3).join(' × ')+' мм':'Уточнить по топке';
  const stoneFor=m=>state.stone==='Как у модели'?(m.material||'Подобрать образец в салоне'):state.stone;
  const field=(k,v)=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></div>';
  let openSide=null,lastBrief='';
  function closeList(restore=false) {
    if(!openSide)return;
    const side=openSide;openSide=null;
    $('#list-'+side).hidden=true;
    $('#choose-'+side).setAttribute('aria-expanded','false');
    if(restore)$('#choose-'+side).focus({preventScroll:true});
  }
  function placeList() {
    if (!openSide) return;
    const list = $('#list-'+openSide);
    const anchor = list.parentElement.getBoundingClientRect();
    const header = $('.mast').getBoundingClientRect().bottom;
    const availableAbove = Math.max(0, anchor.top-header-6);
    const availableBelow = Math.max(0, innerHeight-anchor.bottom-6);
    const required = Math.min(310, innerHeight*.43);
    const above = availableBelow < required && availableAbove > availableBelow;
    list.classList.toggle('above', above);
    list.style.maxHeight = Math.floor(Math.min(required, above ? availableAbove : availableBelow))+'px';
  }
  addEventListener('resize', placeList);
  addEventListener('scroll', placeList, {passive:true});
  function openList(side,first=false) {
    closeList();
    const list=$('#list-'+side), trigger=$('#choose-'+side);
    list.hidden=false;openSide=side;trigger.setAttribute('aria-expanded','true');
    placeList();
    const pick=first?list.firstElementChild:$('[aria-selected=true]',list);
    // Scroll within this small list without bringing its containing page under the sticky header.
    list.scrollTop=Math.max(0,pick.offsetTop-list.clientHeight*.35);
    pick.focus({preventScroll:true});
  }
  function selectModel(side,id) {
    if(!models.has(id))return;
    const previous=state[side];
    if(id===state[other(side)])state[other(side)]=previous;
    state[side]=id;closeList(true);render();
  }
  for(const side of sides){
    const list=$('#list-'+side), trigger=$('#choose-'+side);
    const sorted=[...data].sort((m,n)=>m.name.localeCompare(n.name,'ru'));
    list.innerHTML=sorted.map(m=>'<button type="button" role="option" tabindex="-1" data-id="'+esc(m.id)+'"><span>'+esc(m.name)+'</span><small>'+esc(m.price)+'</small></button>').join('');
    trigger.addEventListener('click',()=>{if(openSide===side)closeList(true);else openList(side);});
    trigger.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();openList(side);}});
    list.addEventListener('click',e=>{const o=e.target.closest('[role=option]');if(o)selectModel(side,o.dataset.id);});
    let typing='',timer;
    list.addEventListener('keydown',e=>{
      const all=[...list.children];let n=all.indexOf(document.activeElement);
      if(e.key==='Escape'){e.preventDefault();closeList(true);return;}
      if(e.key==='Tab'){closeList(true);return;}
      if(e.key==='ArrowDown')n=(n+1)%all.length;
      else if(e.key==='ArrowUp')n=(n+all.length-1)%all.length;
      else if(e.key==='Home')n=0;
      else if(e.key==='End')n=all.length-1;
      else if(e.key.length===1 && e.key!==' ' && !e.metaKey && !e.ctrlKey){
        clearTimeout(timer);typing+=normalize(e.key);timer=setTimeout(()=>{typing='';},650);
        const found=all.findIndex(o=>normalize(o.firstElementChild.textContent).startsWith(typing));if(found<0)return;n=found;
      } else return;
      e.preventDefault();all[n].focus({preventScroll:true});
      const item=all[n],bottom=item.offsetTop+item.offsetHeight;
      if(item.offsetTop<list.scrollTop)list.scrollTop=item.offsetTop;else if(bottom>list.scrollTop+list.clientHeight)list.scrollTop=bottom-list.clientHeight;
    });
    $('[data-side='+side+'] .choose-base').addEventListener('click',()=>{state.base=side;render();});
  }
  document.addEventListener('pointerdown',e=>{if(openSide&&!e.target.closest('.model-chooser'))closeList();});
  document.addEventListener('focusin',e=>{if(openSide&&!e.target.closest('.model-chooser'))closeList();});
  $$('input[name=stone]').forEach(el=>el.addEventListener('change',()=>{state.stone=el.value;render();}));
  function silhouette(m) {
    if(!m.dims||m.id==='162')return '<div class="scale-model"><div class="scale-unknown">'+(m.id==='162'?'Угловой фасад':'Габариты по замеру')+'</div><span>'+esc(m.name)+'</span></div>';
    const [w,h,,ow,oh]=m.dims,base=2680,x=(base-w)/2,yp=base-h,ix=(base-ow)/2;
    return '<div class="scale-model"><svg viewBox="0 0 2680 2680" preserveAspectRatio="xMidYMax meet" role="img" aria-label="'+esc(m.name+', габарит '+dimensions(m))+'"><path d="M'+x+' '+base+'V'+yp+'h'+w+'v'+h+'H'+(ix+ow)+'v-'+oh+'H'+ix+'v'+oh+'z" fill="#b49d84" stroke="#6e5d50" stroke-width="26"/><path d="M'+x+' '+(yp+65)+'h'+w+'" stroke="#eadbc5" stroke-width="36"/></svg><span>'+esc(m.name)+'</span></div>';
  }
  function render() {
    for(const side of sides){
      const m=getModel(side), card=$('[data-side='+side+']');
      $('#picked-'+side).textContent=m.name;
      $$('[role=option]', $('#list-'+side)).forEach(o=>o.setAttribute('aria-selected',String(o.dataset.id===m.id)));
      const im=$('.model-picture',card);if(m.img){im.src=m.img;im.alt='Портал «'+m.name+'»';im.hidden=false;}else{im.removeAttribute('src');im.hidden=true;}
      framePhoto(im,m.frame);
      $('.compare-details',card).innerHTML='<p class="product-price">'+esc(m.price)+'</p>'+(m.offer?'<p class="offer">'+esc(m.offer)+'</p>':'')+'<dl class="specs">'+field('Ширина, высота, глубина',dimensions(m))+field('Проём',aperture(m))+field('Камень в карточке',m.material||'Породу уточняют в салоне')+field('Совместимость',m.firebox?m.firebox.replace(/^изготовлен[ао]?\s+под\s+/i,'Под '):'По выбранной топке')+'</dl><a class="source-link" href="'+esc(m.href)+'">Карточка модели '+svgArrow+'</a>';
      const pick=$('.choose-base',card);pick.setAttribute('aria-pressed',String(state.base===side));pick.textContent=state.base===side?'Выбран для заявки':'Выбрать для заявки';
    }
    const a=getModel('a'),b=getModel('b'),both=a.dims&&b.dims&&a.dims[0]&&b.dims[0];
    let note='Силуэты по размерам чертежей. У моделей без габаритов размеры согласуют с мастерской.';
    if(both){
      const delta=a.dims[0]-b.dims[0],height=a.dims[1]-b.dims[1];
      note=delta===0?'Ширина порталов одинакова.':'«'+(delta>0?a.name:b.name)+'» шире на '+Math.abs(delta)+' мм.';
      note+=' '+(height===0?'Высота порталов одинакова.':'«'+(height>0?a.name:b.name)+'» выше на '+Math.abs(height)+' мм.');
      const opening=a.dims[3]-b.dims[3];
      note+=' '+(opening===0?'Ширина проёма одинакова.':'У модели «'+(opening>0?a.name:b.name)+'» проём шире на '+Math.abs(opening)+' мм.');
    }
    $('#scale-panel').innerHTML='<div><h3>Пропорции фасада</h3><p>'+esc(note)+'</p></div><div class="scale-diagram">'+silhouette(a)+silhouette(b)+'</div>';
    const selected=getModel(state.base);
    const exampleIds={'Crema Marfil':'180','Breccia Sardo':'181','Statuario':'178','Травертин Navona':'170'};
    const stoneExample=models.get(exampleIds[state.stone]) || (state.stone==='Как у модели' && selected.material ? selected : null);
    const ex=$('#material-example');
    ex.hidden=!stoneExample;
    if(stoneExample)ex.innerHTML='<a href="'+esc(stoneExample.href)+'">'+(stoneExample.img?'<img src="'+esc(stoneExample.img)+'" alt="" loading="lazy">':'')+'<span><small>Пример камня на изделии</small>'+esc(stoneExample.material)+' · «'+esc(stoneExample.name)+'»</span>'+svgArrow+'</a>';
    if(stoneExample?.img)framePhoto($('img',ex),stoneExample.frame);
    $('#choice-summary').textContent='«'+selected.name+'» · '+stoneFor(selected)+' · цена исходной модели — '+selected.price;
  }
  function makeBrief(m,stone) {
    const p=['Портал «'+m.name+'».','Камень для обсуждения — '+stone+'.','Цена по карточке — '+m.price+'.'];
    if(m.dims)p.push('Размеры по чертежу — '+dimensions(m)+'. Проём — '+aperture(m)+'.');else p.push('Нужно согласовать габариты и проём под топку.');
    if(m.offer)p.push(m.offer);
    return p.join('\n');
  }
  function showForm(){$('#form-success').hidden=true;form.hidden=false;}
  function applyBrief(value){showForm();$('#brief').value=value;lastBrief=value;}
  $('#carry-choice').addEventListener('click',()=>{
    const model=getModel(state.base);applyBrief(makeBrief(model,stoneFor(model)));
    location.hash='kontakty';
    $('#client-name').focus({preventScroll:true});
    $('.form-card').scrollIntoView({block:'start'});
  });
  $('#reset-choice').addEventListener('click',()=>{
    closeList();Object.assign(state,start,{base:'a',stone:'Как у модели'});
    $('input[name=stone]').checked=true;if($('#brief').value===lastBrief)$('#brief').value='';lastBrief='';render();
    $('#choose-a').focus();
  });
  const error=$('#form-error');
  function invalid(field,msg){field.setAttribute('aria-invalid','true');field.setAttribute('aria-describedby','form-error');error.textContent=msg;field.focus();return false;}
  form.addEventListener('input',e=>{e.target.removeAttribute('aria-invalid');e.target.removeAttribute('aria-describedby');error.textContent='';});
  form.addEventListener('submit',e=>{
    e.preventDefault();const name=$('#client-name'),contact=$('#client-contact'),brief=$('#brief');
    if(!name.value.trim())return invalid(name,'Укажите, как к вам обращаться.');
    const c=contact.value.trim(),digits=c.replace(/\D/g,'');
    const phone=/^[+\d\s().-]+$/.test(c)&&digits.length>=10&&digits.length<=15;
    if(!phone&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c))return invalid(contact,'Укажите телефон с кодом города или электронную почту.');
    if(!brief.value.trim())return invalid(brief,'Добавьте модель или пожелания к проекту.');
    error.textContent='';$('#success-brief').textContent=brief.value.trim();
    form.hidden=true;$('#form-success').hidden=false;$('#form-success').focus();
  });
  $('#new-brief').addEventListener('click',()=>{form.reset();lastBrief='';error.textContent='';$('#success-brief').textContent='';showForm();$('#client-name').focus();});
  const requestId=search.get('izdelie'),projectId=search.get('proekt');
  if(models.has(requestId)) {
    const m=models.get(requestId);applyBrief(makeBrief(m,m.material||'Подобрать образец в салоне'));
  }else if(requestId||projectId) {
    const script=document.createElement('script');script.src='assets/subjects.js';
    script.onload=()=>{const src=window.VirtuSubjects;const hint=requestId?src?.products?.[requestId]:src?.projects?.[projectId];if(typeof hint==='string'&&!$('#brief').value)applyBrief((requestId?'Изделие — ':'Хочу обсудить похожий проект — ')+hint+'.');};
    document.head.append(script);
  }
  if((requestId||projectId)&&location.hash==='#kontakty'){
    const reveal=()=>$('.form-card').scrollIntoView({block:'start'});
    if(document.readyState==='complete')requestAnimationFrame(reveal);else addEventListener('load',()=>requestAnimationFrame(reveal),{once:true});
  }
  render();
})();
