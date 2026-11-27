(() => {
  'use strict';
  const goods = window.LAANS_CATALOG || [];
  const byKey = new Map(goods.map(item => [item.key, item]));
  const one = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const pageRoot = document.body.dataset.root || './';
  const cur = new Intl.NumberFormat('ru-RU');
  const money = value => cur.format(value) + ' ₽';
  const kind = item => item.category === 'royali' ? 'Рояль' : 'Пианино';
  const instrumentName = item => kind(item) + ' ' + item.model + ' · ID ' + item.id;
  const params = new URLSearchParams(location.search);
  const validKey = name => byKey.has(params.get(name)) ? params.get(name) : '';
  const firstParam = validKey('a');
  const secondParam = validKey('b') === firstParam ? '' : validKey('b');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const pointerFine = matchMedia('(hover: hover) and (pointer: fine)');
  const menu = one('#mobile-menu');
  const menuToggle = one('.menu-toggle');
  function showMenu(open, returnFocus = false) {
    menu.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    if (returnFocus) menuToggle.focus({preventScroll:true});
  }
  menuToggle.addEventListener('click', () => showMenu(menu.hidden));
  document.addEventListener('click', event => {
    if (!menu.hidden && !event.target.closest('.header')) showMenu(false);
    if (!menu.hidden && event.target.closest('a[href^="#"]')) requestAnimationFrame(() => showMenu(false));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) showMenu(false, true);
  });
  window.addEventListener('pageshow',() => showMenu(false));
  matchMedia('(max-width: 800px)').addEventListener('change', () => showMenu(false));
  all('[data-tab]').forEach(tab => tab.addEventListener('click', () => {
    all('[data-tab]').forEach(t => t.setAttribute('aria-pressed', String(t === tab)));
    all('[data-panel]').forEach(p => {p.hidden = p.dataset.panel !== tab.dataset.tab;});
  }));

  const catalog = one('[data-catalog]');
  const catalogGoods = catalog ? goods.filter(i => i.category === catalog.dataset.catalog) : [];
  const upright = catalog?.dataset.catalog === 'pianino';
  const allGoods = goods.map(i => [i.key, instrumentName(i)]);
  const prices = upright ? [['300000','До 300 000 ₽'],['500000','До 500 000 ₽'],['750000','До 750 000 ₽']] :
    [['1600000','До 1,6 млн ₽'],['2000000','До 2 млн ₽'],['3000000','До 3 млн ₽'],['5000000','До 5 млн ₽']];
  const dimensions = upright ? [['known','С указанной высотой'],['unknown','Высоту нужно уточнить']] :
    [['165','До 165 см'],['190','До 190 см'],['long','Свыше 190 см'],['unknown','Длину нужно уточнить']];
  const options = {
    brands: [['','Все марки'], ...[...new Set(catalogGoods.map(i => i.brand))].sort((a,b)=>a.localeCompare(b,'ru')).map(s=>[s,s])],
    budgets: [['','Любая цена'], ...prices],
    dimensions: [['',upright ? 'Любая высота' : 'Любая длина'], ...dimensions],
    goods: allGoods,
    visitGoods: [['','Подобрать с мастером'], ...allGoods],
    optionalGoods: [['','Без второго инструмента'], ...allGoods]
  };
  const pickerDialog = one('#choices'), optionList = one('.choice-list', pickerDialog);
  const optionSearch = one('#choice-search'), searchWrap = one('.picker-search');
  const pairIds = {first:'second', second:'first', 'visit-first':'visit-second', 'visit-second':'visit-first'};
  let trigger = null;
  let activeOptions = [];
  const defaults = new Map(all('[data-picker]').map(p => [p.id, one('.picker-value',p).textContent]));
  function setChoice(p, key, announce = true) {
    if (!p) return;
    const choice = options[p.dataset.picker].find(v => v[0] === key);
    p.dataset.value = choice ? choice[0] : '';
    one('.picker-value',p).textContent = choice?.[1] || defaults.get(p.id);
    if (announce) p.dispatchEvent(new CustomEvent('choice',{bubbles:true}));
  }
  function closeDialog(dialog) {
    if (!dialog.open) return;
    dialog.close();
    document.body.classList.toggle('modal-open', Boolean(one('dialog[open]')));
    if (dialog === pickerDialog && trigger) {
      const previousTrigger = trigger;
      trigger = null;
      previousTrigger.setAttribute('aria-expanded','false');
      previousTrigger.focus({preventScroll:true});
    } else if (dialog === lightbox) {
      fullImg.removeAttribute('src');
      photoGroup = [];
      opener?.focus({preventScroll:true});
      opener = null;
    }
  }
  all('dialog').forEach(dialog => {
    one('[data-close]',dialog).addEventListener('click',() => closeDialog(dialog));
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') {event.preventDefault();event.stopPropagation();closeDialog(dialog);}
    }, true);
    dialog.addEventListener('click',event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog(dialog);
    });
    dialog.addEventListener('cancel',event => {
      event.preventDefault();
      closeDialog(dialog);
    });
  });
  function availableOptions(p) {
    const other = pairIds[p.id] && document.getElementById(pairIds[p.id])?.dataset.value;
    return options[p.dataset.picker].filter(([key]) => !other || key !== other);
  }
  function drawOptions(search = '') {
    const q = search.trim().toLocaleLowerCase('ru');
    const filtered = activeOptions.filter(([,label]) => label.toLocaleLowerCase('ru').includes(q));
    optionList.replaceChildren();
    for (const [key,label] of filtered) {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role','option'); b.dataset.key = key;
      b.setAttribute('aria-selected',String(trigger.dataset.value === key));
      b.tabIndex=trigger.dataset.value === key ? 0 : -1;
      b.textContent = label; optionList.append(b);
    }
    if (filtered.length && !one('[tabindex="0"]',optionList)) optionList.firstElementChild.tabIndex=0;
    one('.choice-empty').hidden = filtered.length > 0;
  }
  function openPicker(p) {
    if (pickerDialog.open) return;
    trigger = p; p.setAttribute('aria-expanded','true');
    one('#picker-title').textContent = document.getElementById('label-' + p.id).textContent;
    activeOptions = availableOptions(p); optionSearch.value = '';
    searchWrap.hidden = activeOptions.length < 8;
    drawOptions(); pickerDialog.showModal(); document.body.classList.add('modal-open');
    if (!searchWrap.hidden) optionSearch.focus();
    else (one('[aria-selected="true"]',optionList) || one('button',optionList))?.focus();
  }
  all('[data-picker]').forEach(p => {
    p.setAttribute('aria-expanded','false');
    p.addEventListener('click', () => openPicker(p));
    p.addEventListener('keydown', e => { if(e.key === 'ArrowDown' || e.key === 'ArrowUp') {e.preventDefault();openPicker(p);} });
  });
  optionSearch.addEventListener('input', () => drawOptions(optionSearch.value));
  optionList.addEventListener('focusin',event=>{
    if(!event.target.matches('[data-key]'))return;
    all('[data-key]',optionList).forEach(b=>{b.tabIndex=b===event.target?0:-1;});
  });
  optionList.addEventListener('click', event => {
    const option = event.target.closest('[data-key]');
    if (trigger && option) {setChoice(trigger,option.dataset.key);closeDialog(pickerDialog);}
  });
  pickerDialog.addEventListener('keydown', event => {
    if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
    if (event.target === optionSearch && ['Home','End'].includes(event.key)) return;
    const buttons = all('[data-key]',optionList);
    if (!buttons.length) return;
    event.preventDefault();
    const current = buttons.indexOf(document.activeElement);
    let next = event.key === 'End' ? buttons.length-1 : 0;
    if (event.key === 'ArrowDown') next = (current+1)%buttons.length;
    if (event.key === 'ArrowUp') next = current <= 0 ? buttons.length-1 : current-1;
    buttons[next].focus();
  });
  if (catalog) {
    function applyFilters() {
      const brand=one('#brand').dataset.value, budget=Number(one('#budget').dataset.value), dim=one('#dimension').dataset.value;
      let count = 0;
      all('[data-product]',catalog).forEach(el => {
        const g = byKey.get(el.dataset.product);
        let sizeOK = true;
        if (dim === 'unknown') sizeOK = g.size === null;
        else if (dim === 'known') sizeOK = g.size !== null;
        else if (dim === 'long') sizeOK = g.size > 190;
        else if (dim) sizeOK = g.size !== null && g.size <= Number(dim);
        el.hidden = !((!brand || g.brand === brand) && (!budget || g.price <= budget) && sizeOK);
        if (!el.hidden) count++;
      });
      one('#match-count').textContent = 'Показано ' + count + ' из ' + catalogGoods.length;
      one('#no-matches').hidden = count > 0;
    }
    catalog.addEventListener('choice',applyFilters);
    all('[data-reset-filters]',catalog).forEach(b => b.addEventListener('click', () => {
      ['brand','budget','dimension'].forEach(id => setChoice(document.getElementById(id),'',false));
      applyFilters();
      if (b.closest('#no-matches')) one('#brand').focus();
    }));
  }
  function element(tag,text,className) {
    const el=document.createElement(tag);
    if (text) el.textContent=text;
    if (className) el.className=className;
    return el;
  }
  function comparisonCard(g) {
    const card=element('div','','comp-item');
    if (g.file) {const photo=element('img');photo.src=pageRoot+'assets/images/'+g.file;photo.alt=kind(g)+' '+g.model;card.append(photo);}
    card.append(element('strong',g.model),element('span',kind(g)+' · ID '+g.id),element('span',g.period));
    const measurement=g.category === 'royali' ? 'Длина' : 'Высота';
    card.append(element('span',measurement+' — '+(g.size ? g.size+' см' : 'уточнить')),element('span',money(g.price)));
    if (g.cardPrice) card.append(element('span','В карточке салона '+money(g.cardPrice)+'. Уточнить у мастера.'));
    return card;
  }
  const compare=one('[data-compare]');
  if (compare) {
    const a=one('#first'), b=one('#second'), result=one('[data-result]',compare), status=one('[data-compare-status]',compare);
    setChoice(a,firstParam,false);setChoice(b,secondParam,false);
    const clearOutput=()=>{result.hidden=true;result.replaceChildren();status.textContent='';};
    function showComparison() {
      const first=byKey.get(a.dataset.value),second=byKey.get(b.dataset.value);
      if (!first || !second || first.key === second.key) {
        status.textContent='Выберите два разных инструмента для сравнения.';
        (!first ? a : b).focus();return;
      }
      clearOutput();
      const table=element('div','','comp-table');table.append(comparisonCard(first),comparisonCard(second));
      const diff=Math.abs(first.price-second.price), text=[];
      if (first.category===second.category && first.size && second.size) {
        const name=first.category==='royali'?'длине':'высоте';
        const distance=Math.abs(first.size-second.size);
        text.push(distance ? 'Разница по '+name+' — '+distance+' см.' : 'Размеры по '+name+' совпадают.');
      } else if(first.category !== second.category) text.push('У рояля указанная мерка — длина, у пианино — высота.');
      else text.push('Недостающие размеры можно уточнить у мастера.');
      text.push(diff ? 'Разница цен в списке салона — '+money(diff)+'.' : 'Цены в списке салона совпадают.');
      const link=element('a','На прослушивание с этой парой','btn dark-button');
      link.href=pageRoot+'contacts/index.html?'+new URLSearchParams({a:first.key,b:second.key}).toString()+'#visit';
      link.append(one('.header .ico-arrow').cloneNode(true));
      result.append(element('h3','Ваша пара для прослушивания'),table);
      if (first.category===second.category && first.size && second.size) {
        const scale=element('div','','length-scale');
        scale.append(element('strong',first.category==='royali'?'Длина корпусов':'Высота корпусов'));
        const longest=Math.max(first.size,second.size);
        for (const g of [first,second]) {
          const row=element('div','','scale-row'),bar=element('i');
          bar.style.width=(g.size/longest*100)+'%';bar.setAttribute('aria-hidden','true');
          row.append(element('span',g.model+' · '+g.size+' см'),bar);scale.append(row);
        }
        result.append(scale);
      }
      result.append(element('p',text.join(' ')),link);
      result.hidden=false;result.focus({preventScroll:true});
      if(result.getBoundingClientRect().top>innerHeight*.85) result.scrollIntoView({block:'start'});
    }
    compare.addEventListener('choice',clearOutput);
    one('[data-run]',compare).addEventListener('click',showComparison);
    one('[data-clear]',compare).addEventListener('click',()=>{setChoice(a,'',false);setChoice(b,'',false);clearOutput();a.focus({preventScroll:true});});
  }
  const form=one('#booking');
  if (form) {
    const a=one('#visit-first'), b=one('#visit-second'), name=one('#visitor'), telephone=one('#phone');
    const success=one('#booking-success');
    one('[type=submit]',form).disabled=false;
    setChoice(a,firstParam,false);setChoice(b,secondParam,false);
    name.setAttribute('aria-describedby','visitor-error');telephone.setAttribute('aria-describedby','phone-error');
    function fieldError(field,message) {
      document.getElementById(field.id+'-error').textContent=message;
      field.setAttribute('aria-invalid',String(Boolean(message)));
    }
    function clearPrivateFields() {
      name.value='';telephone.value='';one('#preferred-time').value='';fieldError(name,'');fieldError(telephone,'');
    }
    [name,telephone].forEach(field=>field.addEventListener('input',()=>fieldError(field,'')));
    // No network, storage, URL parameters or browser history receive form values.
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const digits=telephone.value.replace(/\D/g,'');
      const nameOK=/\p{L}/u.test(name.value.trim()), phoneOK=/^\+?[\d\s().-]+$/.test(telephone.value) && digits.length>=10 && digits.length<=15;
      fieldError(name,nameOK?'':'Введите имя.');
      fieldError(telephone,phoneOK?'':'Введите телефон с кодом и номером, от 10 до 15 цифр.');
      if (!nameOK || !phoneOK) {(!nameOK ? name : telephone).focus();return;}
      const selection=[a.dataset.value,b.dataset.value].filter(Boolean).map(k=>instrumentName(byKey.get(k)));
      one('#booking-summary').textContent=selection.length ? 'Для визита вы выбрали '+selection.join(' и ')+'.' : 'Вы сможете подобрать инструмент вместе с мастером.';
      const time=one('#preferred-time').value.trim();
      if(time) one('#booking-summary').textContent+=' Удобное время — '+time+'.';
      clearPrivateFields();form.hidden=true;success.hidden=false;success.focus();
    });
    one('#booking-reset').addEventListener('click',()=>{clearPrivateFields();setChoice(a,'',false);setChoice(b,'',false);success.hidden=true;form.hidden=false;one('#booking-summary').textContent='';a.focus();});
    window.addEventListener('pagehide',()=>{clearPrivateFields();one('#booking-summary').textContent='';form.hidden=false;success.hidden=true;});
  }
  const lightbox=one('#lightbox'),fullImg=one('.light-picture img',lightbox);
  let photoGroup=[],current=0,opener=null,touchStart=null;
  function showPhoto() {
    const button=photoGroup[current],im=one('img',button);
    const w=Number(im.getAttribute('width')) || im.naturalWidth, h=Number(im.getAttribute('height')) || im.naturalHeight;
    if(w && h){lightbox.style.setProperty('--image-ratio',String(w/h));lightbox.style.setProperty('--image-width',w+'px');}
    fullImg.src=im.currentSrc||im.src;fullImg.alt=im.alt;
    one('#photo-title').textContent=button.dataset.caption;
    one('#photo-count').textContent=(current+1)+' / '+photoGroup.length;
    all('[data-step]',lightbox).forEach(b=>{b.disabled=photoGroup.length<2;});
  }
  function stepPhoto(n) {
    if(photoGroup.length<2)return;
    current=(current+n+photoGroup.length)%photoGroup.length;showPhoto();
  }
  document.addEventListener('click',event=>{
    const b=event.target.closest('[data-photo]');
    if(!b)return;
    opener=b;
    const source=b.closest('[data-gallery]');
    const group=source.dataset.albumTarget ? document.getElementById(source.dataset.albumTarget) : null;
    photoGroup=all('[data-photo]',group || source);current=Math.max(0,photoGroup.indexOf(b));showPhoto();
    lightbox.showModal();document.body.classList.add('modal-open');one('[data-close]',lightbox).focus();
  });
  all('[data-step]',lightbox).forEach(b=>b.addEventListener('click',()=>stepPhoto(Number(b.dataset.step))));
  lightbox.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();stepPhoto(e.key==='ArrowRight'?1:-1);}});
  const lightPicture=one('.light-picture',lightbox);
  lightPicture.addEventListener('touchstart',e=>{touchStart=[e.touches[0].clientX,e.touches[0].clientY];},{passive:true});
  lightPicture.addEventListener('touchend',e=>{
    if(!touchStart)return;
    const dx=e.changedTouches[0].clientX-touchStart[0],dy=e.changedTouches[0].clientY-touchStart[1];
    if(Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.4)stepPhoto(dx<0?1:-1);
    touchStart=null;
  },{passive:true});
  const hero=one('.hero-stage'),sound=one('.acoustic-scene');
  const pianoSurfaces = all('.piano-model [data-xyz]').map(el => ({
    el, vertices: Float32Array.from(el.dataset.xyz.split(' '), Number),
    lid: !!el.closest('.piano-lid'), prop: !!el.closest('.piano-prop')
  }));
  let pointerX = 0, pointerY = 0, lidScroll = 0, lastView = '';
  function drawPiano() {
    const reduced = reduce.matches;
    const horizontal = reduced ? 0 : pointerX, vertical = reduced ? 0 : pointerY, travel = reduced ? 0 : lidScroll;
    const view = [horizontal, vertical, travel].map(n => n.toFixed(3)).join(',');
    if (view === lastView || !pianoSurfaces.length) return;
    lastView = view;
    const yaw = horizontal * .15 + travel * .075;
    const pitch = vertical * .055 + travel * .025;
    const lid = (69 + horizontal * 3.5 + travel * 9) * Math.PI / 180;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const lidX = Math.cos(lid), lidZ = Math.sin(lid);
    for (const {el, vertices, prop, lid: hinged} of pianoSurfaces) {
      const points = [];
      for (let i = 0; i < vertices.length; i += 3) {
        let x = vertices[i], y = vertices[i+1], z = vertices[i+2];
        if (hinged || (prop && i === 3)) {
          const reach = Math.hypot(x, z - 86);
          x = reach * lidX; z = 86 + reach * lidZ;
        }
        const side = 73 + (x-73)*cy - (y-83)*sy;
        const depth = (x-73)*sy + (y-83)*cy;
        const back = 83 + depth*cp - (z-70)*sp;
        const up = 70 + depth*sp + (z-70)*cp;
        const sx = (105 + 2.35*side + 1.66*back).toFixed(2);
        const screenY = (365 + .52*side - .76*back - 1.90*up).toFixed(2);
        if (vertices.length === 3) { el.setAttribute('cx',sx); el.setAttribute('cy',screenY); }
        else points.push(sx + ',' + screenY);
      }
      if (points.length) el.setAttribute('points', points.join(' '));
    }
  }
  const parts = sound ? all('[data-part]', sound).map(layer => {
    const line = one('[data-for="' + layer.dataset.part + '"]', sound);
    const [dx, dy] = layer.dataset.shift.split(' ').map(Number);
    const [degrees, cx, cy] = (layer.dataset.turn || '0 0 0').split(' ').map(Number);
    const tip = new DOMPoint(...line.dataset.tip.split(' ').map(Number));
    return {layer, line, tip, dx, dy, degrees, cx, cy};
  }) : [];
  const tappedString = sound && one('[data-tip-surface="strings"]', sound);
  const phaseTitle = sound && one('.mechanism-caption b', sound);
  const phaseNames = ['Клавиша опускается', 'Молоточек ударяет по струне', 'Струна колеблется', 'Дека передаёт звук воздуху'];
  function easeRange(t, start, end) {
    const v = Math.max(0, Math.min(1, (t - start)/(end - start)));
    return v * v * (3 - 2 * v);
  }
  let lastAssembly = -1;
  function positionMechanism(progress) {
    if (progress === lastAssembly) return;
    lastAssembly = progress;
    const remaining = 1 - easeRange(progress, 0, .36);
    const press = easeRange(progress, .10, .36) * (1 - easeRange(progress, .65, .94));
    const strike = easeRange(progress, .28, .51) * (1 - easeRange(progress, .52, .73));
    const vibration = 13 * Math.sin((progress - .49) * 42) * easeRange(progress,.48,.55) * (1-easeRange(progress,.60,.89));
    const resonance = easeRange(progress, .66, .98);
    const phase = progress < .29 ? 0 : progress < .52 ? 1 : progress < .73 ? 2 : 3;
    sound.dataset.phase = String(phase);
    if (phaseTitle.textContent !== phaseNames[phase]) phaseTitle.textContent = phaseNames[phase];
    sound.style.setProperty('--resonance', resonance.toFixed(3));
    tappedString.setAttribute('d', 'M143 91.6 Q364.5 ' + (76.4 + vibration) + ' 586 61.2');
    for (const {layer, line, tip, dx, dy, degrees, cx, cy} of parts) {
      const pose = new DOMMatrix().translate(dx * remaining, dy * remaining);
      if (degrees) pose.translateSelf(cx, cy).rotateSelf(degrees * remaining).translateSelf(-cx, -cy);
      if (layer.dataset.part === 'key') pose.translateSelf(255, 251).rotateSelf(-6.5 * press).translateSelf(-255, -251);
      if (layer.dataset.part === 'hammer') pose.translateSelf(191, 222).rotateSelf(-7.5 * strike).translateSelf(-191, -222);
      if (progress === 1) layer.removeAttribute('transform');
      else layer.setAttribute('transform', 'matrix(' + [pose.a, pose.b, pose.c, pose.d, pose.e, pose.f].join(' ') + ')');
      const surfacePoint = layer.dataset.part === 'strings' ? new DOMPoint(tip.x, tip.y + 2 * .42 * .58 * vibration) : tip;
      const end = surfacePoint.matrixTransform(pose);
      line.setAttribute('d', line.dataset.prefix + end.x.toFixed(3) + ' ' + end.y.toFixed(3));
    }
  }
  let scrollFrame=0;
  function scrollScene() {
    scrollFrame=0;
    if(hero) {
      const rect=hero.getBoundingClientRect();
      if(rect.bottom>0 || reduce.matches) {
        lidScroll=reduce.matches ? 0 : Math.min(1,Math.max(0,scrollY/Math.max(rect.height,1)));
        hero.style.setProperty('--scroll',String(lidScroll));
        drawPiano();
      }
    }
    if(sound) {
      const rect=sound.getBoundingClientRect();
      const progress=Math.max(0,Math.min(1,(innerHeight-rect.top)/(innerHeight*.82+rect.height*.22)));
      positionMechanism(reduce.matches ? 1 : progress);
    }
  }
  const scheduleScroll=()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(scrollScene);};
  if(hero||sound){document.addEventListener('scroll',scheduleScroll,{passive:true});window.addEventListener('resize',scheduleScroll);reduce.addEventListener('change',scheduleScroll);scheduleScroll();}
  let activeTarget=null,frame=0,x=0,y=0;
  function clearPointer(el) {
    if(!el)return;
    ['--hx','--hy','--px','--py','--mx','--my','--res-x','--photo-light'].forEach(k=>el.style.removeProperty(k));
    if (el === hero) {pointerX=0;pointerY=0;drawPiano();}
  }
  document.addEventListener('pointermove',e=>{
    if(!pointerFine.matches||reduce.matches)return;
    const target=e.target.closest('.hero-stage,.react,.magnet');
    if(target!==activeTarget){clearPointer(activeTarget);activeTarget=target;}
    if(!target)return;
    x=e.clientX;y=e.clientY;
    if(frame)return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      if(!activeTarget)return;
      const r=activeTarget.getBoundingClientRect();const px=Math.max(-1,Math.min(1,2*(x-r.left)/r.width-1));const py=Math.max(-1,Math.min(1,2*(y-r.top)/r.height-1));
      if(activeTarget===hero) {pointerX=px;pointerY=py;activeTarget.style.setProperty('--hx',String(px));activeTarget.style.setProperty('--hy',String(py));drawPiano();}
      else if(activeTarget.classList.contains('magnet')) {activeTarget.style.setProperty('--mx',px*3+'px');activeTarget.style.setProperty('--my',py*2+'px');}
      else {activeTarget.style.setProperty('--px',px*5+'px');activeTarget.style.setProperty('--py',py*4+'px');activeTarget.style.setProperty('--photo-light',String((px+1)/2));if (activeTarget.classList.contains('resonance')) activeTarget.style.setProperty('--res-x',String(px));}
    });
  },{passive:true});
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget){clearPointer(activeTarget);activeTarget=null;}});
  const keyboard = one('.note-keys');
  if (keyboard) {
    const keys = all('.note-key', keyboard);
    const readout = one('.note-readout');
    const frequencyFormat = new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 1});
    const releaseTimers = new WeakMap();
    const partials = [[1, .12, 1.45], [2, .044, .95], [3, .021, .7], [4, .009, .45]];
    let audio, mix, mouseStrike;
    function selectKey(key) {
      for (const button of keys) button.tabIndex = button === key ? 0 : -1;
    }
    selectKey(keys[0]);
    async function strike(key) {
      selectKey(key);
      const frequency = 440 * 2 ** ((Number(key.dataset.midi) - 69) / 12);
      const octave = key.dataset.octave === '2' ? '²' : '¹';
      readout.textContent = key.dataset.pitch + octave + ' · ' + frequencyFormat.format(frequency) + ' Гц';
      clearTimeout(releaseTimers.get(key));
      key.classList.add('is-sounding');
      releaseTimers.set(key, setTimeout(() => key.classList.remove('is-sounding'), 340));
      try {
        if (!audio) {
          const Audio = window.AudioContext || window.webkitAudioContext;
          audio = new Audio();
          mix = audio.createDynamicsCompressor();
          mix.connect(audio.destination);
        }
        if (audio.state !== 'running') await audio.resume();
        const now = audio.currentTime;
        for (const [multiple, volume, decay] of partials) {
          const oscillator = audio.createOscillator(), gain = audio.createGain();
          oscillator.frequency.value = frequency * multiple;
          gain.gain.setValueAtTime(.0001, now);
          gain.gain.exponentialRampToValueAtTime(volume, now + .009);
          gain.gain.exponentialRampToValueAtTime(.0001, now + decay);
          oscillator.connect(gain); gain.connect(mix);
          oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
          oscillator.start(now); oscillator.stop(now + decay + .02);
        }
      } catch {
        readout.textContent = 'В этом браузере звук недоступен.';
      }
    }
    keyboard.addEventListener('pointerdown', event => {
      mouseStrike = event.pointerType === 'mouse' && event.button === 0 ? event.target.closest('.note-key') : null;
      if (mouseStrike) strike(mouseStrike);
    });
    keyboard.addEventListener('click', event => {
      const key = event.target.closest('.note-key');
      if (key && (event.detail === 0 || key !== mouseStrike)) strike(key);
      mouseStrike = null;
    });
    keyboard.addEventListener('keydown', event => {
      const index = keys.indexOf(event.target);
      if (index < 0) return;
      if (event.repeat && ['Enter', ' '].includes(event.key)) { event.preventDefault(); return; }
      const offsets = {ArrowLeft: -1, ArrowRight: 1, Home: -index, End: keys.length - 1 - index};
      if (!Object.prototype.hasOwnProperty.call(offsets, event.key)) return;
      event.preventDefault();
      const next = keys[Math.max(0, Math.min(keys.length - 1, index + offsets[event.key]))];
      selectKey(next);
      next.focus({preventScroll:true});
    });
  }
})();
