(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const prefersLess = matchMedia('(prefers-reduced-motion: reduce)');
  const hasPointer = matchMedia('(hover: hover) and (pointer: fine)');
  const home = document.body.dataset.home;
  const params = new URLSearchParams(location.search);

  function initMenu() {
    const button = $('.menu-button');
    const menu = $('#small-menu');
    function close(restoreFocus = false) {
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Открыть меню');
      if (restoreFocus) button.focus();
    }
    button.addEventListener('click', () => {
      if (!menu.hidden) { close(true); return; }
      menu.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      button.setAttribute('aria-label', 'Закрыть меню');
    });
    menu.addEventListener('click', event => { if (event.target.closest('a')) close(); });
    document.addEventListener('pointerdown', event => {
      if (!menu.hidden && !event.target.closest('.mast')) close();
    });
    document.addEventListener('focusin', event => {
      if (!menu.hidden && !event.target.closest('.mast')) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !menu.hidden) close(true);
    });
    matchMedia('(min-width:981px)').addEventListener('change', event => { if (event.matches) close(); });
  }

  function initMotion() {
    const contact = $('.contact-button');
    let geometryVersion = 0;
    addEventListener('scroll', () => { geometryVersion++; }, {passive:true});
    addEventListener('resize', () => { geometryVersion++; }, {passive:true});
    function track(element, isMagnet = false) {
      let frame = 0, x = 0, y = 0, rect, version = -1;
      const reset = () => {
        cancelAnimationFrame(frame); frame = 0; rect = null;
        for (const prop of isMagnet ? ['--mx','--my'] : ['--px','--py']) element.style.removeProperty(prop);
      };
      const move = event => {
        if (prefersLess.matches || !hasPointer.matches || event.pointerType === 'touch') return;
        if (!rect || version !== geometryVersion) { rect = element.getBoundingClientRect(); version = geometryVersion; }
        x = Math.min(1, Math.max(-1, (event.clientX - rect.left) / Math.max(1, rect.width) * 2 - 1));
        y = Math.min(1, Math.max(-1, (event.clientY - rect.top) / Math.max(1, rect.height) * 2 - 1));
        if (!frame) frame = requestAnimationFrame(() => {
          frame = 0;
          if (isMagnet) {
            element.style.setProperty('--mx', (x * 3.5).toFixed(2)+'px');
            element.style.setProperty('--my', (y * 2.5).toFixed(2)+'px');
          } else {
            element.style.setProperty('--px', x.toFixed(3));
            element.style.setProperty('--py', y.toFixed(3));
          }
        });
      };
      element.addEventListener('pointerenter', e => { rect = null; move(e); });
      element.addEventListener('pointermove', move, {passive:true});
      element.addEventListener('pointerleave', reset);
      element.addEventListener('pointercancel', reset);
      prefersLess.addEventListener('change', reset);
    }
    if (contact) track(contact, true);
    for (const element of all('[data-react]')) track(element);

  }

  function initGalleries() {
    const filterButtons = all('[data-filter]');
    const entries = all('.works-grid .gallery-card');
    for (const button of filterButtons) {
      button.addEventListener('click', () => {
        const category = button.dataset.filter;
        for (const other of filterButtons) other.setAttribute('aria-pressed', String(other === button));
        let count = 0;
        for (const entry of entries) {
          entry.hidden = category !== 'Все' && category !== entry.dataset.category;
          if (!entry.hidden) count++;
        }
        $('#work-count').textContent = 'Показано работ — '+count;
      });
    }
    const viewer = $('.viewer');
    if (!viewer || !viewer.showModal) return;
    const viewImage = $('#viewer-img');
    const caption = $('#viewer-caption');
    const count = $('#viewer-count');
    const prev = $('.view-prev');
    const next = $('.view-next');
    const discuss = $('.viewer-discuss');
    let group = [], index = 0, startX = null, startY = null, opener;
    function fitPicture() {
      if (!viewer.open || !viewImage.width) return;
      const item = group[index]?.querySelector('img');
      if (!item) return;
      const width = Number(item.getAttribute('width'));
      const height = Number(item.getAttribute('height'));
      const limit = Math.min(width,viewer.clientWidth);
      const available = Math.min(window.visualViewport?.height || innerHeight, innerHeight);
      // Each change in photo width can wrap its caption. Re-measure the controls at that width.
      let target = limit;
      for (let pass = 0; pass < 4; pass++) {
        viewer.style.setProperty('--media-width', target + 'px');
        const chrome = [$('.viewer-bar'),$('.viewer-info'),discuss].reduce((total,element) => {
          const style = getComputedStyle(element);
          return total + element.offsetHeight + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
        }, 0);
        const style = getComputedStyle(viewer);
        const room = available - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - chrome - 8;
        const nextWidth = Math.min(target,Math.max(1,Math.floor(room * width / height)));
        if (target === nextWidth) break;
        target = nextWidth;
      }
      viewer.style.setProperty('--media-width', target + 'px');
    }
    function show(indexToShow) {
      index = (indexToShow + group.length) % group.length;
      const item = group[index];
      const thumbnail = item.querySelector('img');
      viewImage.width = Number(thumbnail.getAttribute('width'));
      viewImage.height = Number(thumbnail.getAttribute('height'));
      viewImage.src = item.href;
      viewImage.alt = item.dataset.caption;
      caption.textContent = item.dataset.caption;
      count.textContent = (index + 1)+' / '+group.length;
      prev.hidden = next.hidden = group.length < 2;
      discuss.href = home+'?primer='+encodeURIComponent(item.dataset.shot)+'#zapis';
      fitPicture();
    }
    document.addEventListener('click', event => {
      const item = event.target.closest('a[data-gallery]');
      if (!item || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = item;
      group = all('a[data-gallery]').filter(a => a.dataset.gallery === item.dataset.gallery && !a.closest('[hidden]'));
      show(group.indexOf(item));
      viewer.showModal();
      fitPicture();
      $('.close-view').focus({preventScroll:true});
    });
    addEventListener('resize', fitPicture, {passive:true});
    window.visualViewport?.addEventListener('resize', fitPicture, {passive:true});
    document.fonts?.ready.then(fitPicture);
    prev.addEventListener('click', () => show(index-1));
    next.addEventListener('click', () => show(index+1));
    $('.close-view').addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', event => {
      if (event.target !== viewer) return;
      viewer.close();
    });
    viewer.addEventListener('close', () => {
      viewImage.removeAttribute('src');
      startX = startY = null;
      if (opener?.isConnected) opener.focus({preventScroll:true});
    });
    viewer.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault(); show(index + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    const surface = $('.viewer-picture');
    surface.addEventListener('touchstart', event => {
      if (event.touches.length !== 1) {startX = startY = null;return;}
      startX = event.touches[0].clientX; startY = event.touches[0].clientY;
    }, {passive:true});
    surface.addEventListener('touchend', event => {
      if (startX === null) return;
      const dx = event.changedTouches[0].clientX - startX;
      const dy = event.changedTouches[0].clientY - startY;
      if (Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.5) show(index + (dx < 0 ? 1 : -1));
      startX = startY = null;
    }, {passive:true});
    surface.addEventListener('touchcancel', () => { startX = startY = null; }, {passive:true});
  }

  const appointment = $('#appointment');
  const comment = $('#visitor-comment');
  let prependedText = '';
  function transferText(value) {
    if (!comment) return;
    let personal = comment.value.trim();
    if (prependedText && personal.startsWith(prependedText)) personal = personal.slice(prependedText.length).trim();
    comment.value = value + (personal ? '\n\n'+personal : '');
    prependedText = value;
  }
  function initPlanner() {
    const data = $('#options-data');
    if (!data) return;
    const options = JSON.parse(data.textContent);
    const garments = all('input[name=garment]');
    const steps = [$('#plan-one'),$('#plan-two'),$('#plan-result')];
    const stepCount = $('#step-count'), reset = $('#plan-reset');
    const fabricOptions = $('#cloth-choices');
    let transferred = '', lastAdvance = null;
    let key = 'dvoika', fabric = '', wedding = params.get('model') === 'svadebniy' && [null,'dvoika','troika'].includes(params.get('izdelie'));
    function preview() {
      const o = options[key];
      const name = o.title + (wedding ? ' на свадьбу' : '');
      $('#plan-label').textContent = name;
      $('#plan-price').textContent = 'от '+o.price+' ₽ с тканью · '+o.days+' дней';
      const photo = $('.plan-img');
      photo.width = o.width;
      photo.height = o.height;
      photo.src = o.photo;
      photo.alt = o.alt;
      $('#plan-product').href = wedding ? 'poshiv-kostyuma-na-zakaz/svadebniy/index.html' : o.url;
    }
    function showStep(i, focus) {
      steps.forEach((step,k)=>{step.hidden = i !== k;});
      stepCount.textContent = ['Шаг 1 из 2','Шаг 2 из 2','Подборка готова'][i];
      reset.hidden = i === 0 && key === 'dvoika' && !wedding;
      if (focus) {
        const target = [$('#garment-legend'),$('#cloth-legend'),$('#result-title')][i];
        target.focus({preventScroll:true});
        target.scrollIntoView({block:'nearest'});
      }
    }
    const materialNotes = {
      'Шерсть':'На встрече сравним вес и плотность шерстяных образцов.',
      'Костюмная шерсть':'Посмотрим, как полотно жилета сочетается с брюками и пиджаком.',
      'Тонкая шерсть':'Обсудим, как ляжет стрелка и какой запас длины оставить над обувью.',
      'Кашемир':'Сравним мягкость и плотность и подберём вариант для вашего сезона.',
      'Твид':'Посмотрим фактуру переплетения и масштаб рисунка на выбранном фасоне.',
      'Лён или хлопок':'Сравним два лёгких материала для тёплой погоды и их складку в движении.',
      'Лён':'На встрече посмотрим, как лёгкая ткань драпируется и мнётся в руке.',
      'Хлопок':'Сравним сорочечные образцы по плотности и подберём воротник.',
      'Фланель':'Рассмотрим мягкий материал для сорочки на прохладный сезон.',
      'Шёлк':'Посмотрим, как меняется оттенок ткани при освещении и движении.',
      'Бархат':'Проверим направление ворса и цвет рядом с сорочкой.',
      'Вельвет':'Подберём ширину рубчика и посмотрим, как ткань ложится в складку.'
    };
    function hint(){ $('#fabric-hint').textContent=materialNotes[fabric] || ''; }
    function fabrics() {
      fabricOptions.replaceChildren();
      for (const labelText of options[key].cloth) {
        const label=document.createElement('label'), input=document.createElement('input'), span=document.createElement('span');
        label.className='choice-chip';
        input.type='radio';input.name='fabric';input.value=labelText;
        input.checked = labelText === fabric;
        span.textContent=labelText;label.append(input,span);fabricOptions.append(label);
      }
    }
    function start(keyToSelect, focus) {
      key=keyToSelect; fabric=options[key].cloth[0];
      for (const input of garments) input.checked=input.value===key;
      preview();fabrics();hint();showStep(0,focus);
    }
    start(Object.hasOwn(options,params.get('izdelie')) ? params.get('izdelie') : 'dvoika',false);
    for (const input of garments) input.addEventListener('change',()=>{
      if (input.checked) {
        if (!['dvoika','troika'].includes(input.value)) wedding=false;
        start(input.value,false);
      }
    });
    fabricOptions.addEventListener('change', event=>{if(event.target.checked){fabric=event.target.value;lastAdvance=null;hint();}});
    $('#plan-next').addEventListener('click',event=>{
      lastAdvance=event.detail ? {x:event.clientX,y:event.clientY,time:performance.now()} : null;
      showStep(1,true);
    });
    $('#plan-back').addEventListener('click',()=>showStep(0,true));
    $('#plan-finish').addEventListener('click',event=>{
      if (event.detail && lastAdvance && performance.now()-lastAdvance.time < 420 &&
          Math.hypot(event.clientX-lastAdvance.x,event.clientY-lastAdvance.y) < 8) return;
      lastAdvance=null;
      const o=options[key];
      $('#result-title').textContent=o.title+(wedding?' на свадьбу':'')+' · '+fabric.toLocaleLowerCase('ru');
      $('#result-description').textContent='Ориентир с тканью — от '+o.price+' ₽. Опубликованный срок пошива — '+o.days+' дней. Итоговую цену согласуем после выбора конкретного образца и отделки.';
      $('#result-fit').textContent=o.fit;
      $('#result-examples').href=$('#plan-product').href+'#primery';
      showStep(2,true);
    });
    $('#plan-edit').addEventListener('click',()=>showStep(1,true));
    reset.addEventListener('click',()=>{
      if (transferred && prependedText === transferred && comment.value.startsWith(transferred)) {
        comment.value=comment.value.slice(transferred.length).trim();prependedText='';
      }
      transferred='';wedding=false;start('dvoika',true);
    });
    $('#transfer').addEventListener('click',()=>{
      const o=options[key];
      $('#form-done').hidden=true;$('#form-body').hidden=false;
      transferred = 'Хочу обсудить пошив. Изделие — '+o.title.toLocaleLowerCase('ru')+(wedding?' на свадьбу':'')+'. Ткань для обсуждения — '+fabric.toLocaleLowerCase('ru')+'. Ориентир с тканью — от '+o.price+' ₽, срок — '+o.days+' дней.';
      transferText(transferred);
      location.hash='forma';
      $('#visitor-name').focus({preventScroll:true});
      $('#forma').scrollIntoView({block:'start'});
    });
  }

  function initForm() {
    if (!appointment) return;
    const name=$('#visitor-name'), phone=$('#visitor-phone');
    const fields=[name,phone];
    const errors=[$('#name-error'),$('#phone-error')];
    function setProblem(index,text) {
      const field=fields[index], error=errors[index];
      if(text)field.setAttribute('aria-invalid','true');else field.removeAttribute('aria-invalid');
      error.hidden=!text;error.textContent=text;
    }
    fields.forEach((field,i)=>field.addEventListener('input',()=>{if(field.hasAttribute('aria-invalid'))setProblem(i,'');}));
    $('button[type=submit]',appointment).disabled=false;
    const shots=$('#shot-titles');
    const known=shots ? JSON.parse(shots.textContent) : {};
    if (Object.hasOwn(known,params.get('primer'))) transferText('Хочу обсудить пример «'+known[params.get('primer')]+'».');
    appointment.addEventListener('submit',event=>{
      event.preventDefault();
      const phoneText=phone.value.trim(), digits=phoneText.replace(/\D/g,'');
      const messages=[name.value.trim() ? '' : 'Укажите, как к вам обращаться.',
        /^[+]?[0-9\s().–-]+$/.test(phoneText) && digits.length>=10 && digits.length<=15 ? '' : 'Укажите телефон с кодом страны или города, от 10 до 15 цифр.'];
      messages.forEach((message,i)=>setProblem(i,message));
      const first=messages.findIndex(Boolean);
      if(first!==-1){fields[first].focus();return;}
      appointment.reset();prependedText='';
      $('#form-body').hidden=true;$('#form-done').hidden=false;
      $('#form-done h3').focus();
    });
    $('#form-again').addEventListener('click',()=>{
      appointment.reset();prependedText='';
      $('#form-body').hidden=false;$('#form-done').hidden=true;
      fields.forEach((field,i)=>setProblem(i,''));name.focus();
    });
  }

  initMenu();initMotion();initGalleries();initForm();initPlanner();
})();

