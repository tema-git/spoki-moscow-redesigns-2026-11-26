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
  let scrollFrame=0;
  function scrollScene() {
    scrollFrame=0;
    if(reduce.matches)return;
    if(hero) {
      const rect=hero.getBoundingClientRect();
      if(rect.bottom>0) hero.style.setProperty('--scroll',String(Math.min(1,Math.max(0,scrollY/Math.max(rect.height,1)))));
    }
    if(sound) {
      const rect=sound.getBoundingClientRect();
      const progress=Math.max(0,Math.min(1,(innerHeight-rect.top)/(innerHeight*.54+rect.height*.24)));
      sound.style.setProperty('--sp',String(progress));
    }
  }
  const scheduleScroll=()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(scrollScene);};
  if(hero||sound){document.addEventListener('scroll',scheduleScroll,{passive:true});window.addEventListener('resize',scheduleScroll);reduce.addEventListener('change',scheduleScroll);scheduleScroll();}
  let activeTarget=null,frame=0,x=0,y=0;
  function clearPointer(el) {
    if(!el)return;
    ['--hx','--hy','--px','--py','--mx','--my','--res-x'].forEach(k=>el.style.removeProperty(k));
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
      if(activeTarget===hero) {activeTarget.style.setProperty('--hx',String(px));activeTarget.style.setProperty('--hy',String(py));}
      else if(activeTarget.classList.contains('magnet')) {activeTarget.style.setProperty('--mx',px*3+'px');activeTarget.style.setProperty('--my',py*2+'px');}
      else {activeTarget.style.setProperty('--px',px*5+'px');activeTarget.style.setProperty('--py',py*4+'px');if (activeTarget.classList.contains('resonance')) activeTarget.style.setProperty('--res-x',String(px));}
    });
  },{passive:true});
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget){clearPointer(activeTarget);activeTarget=null;}});
  const play=one('#play-note');let ctx,toneTimer;
  if(play)play.addEventListener('click',async()=>{
    const status=one('.audible-status');
    try {
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)throw new Error('Unavailable');
      ctx=ctx||new Audio();await ctx.resume();
      const start=ctx.currentTime;
      [[440,.12,1.45],[880,.044,.95],[1320,.021,.7],[1760,.009,.45]].forEach(([freq,level,decay])=>{
        const osc=ctx.createOscillator(), gain=ctx.createGain();
        osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(level,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+decay);
        osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+decay+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};
      });
      play.disabled=true;one('span',play).textContent='Звучит ля';status.textContent='Ля первой октавы, 440 Гц.';
      clearTimeout(toneTimer);toneTimer=setTimeout(()=>{play.disabled=false;one('span',play).textContent='Повторить ноту';},1500);
    } catch {status.textContent='В этом браузере звук недоступен.';}
  });
})();
