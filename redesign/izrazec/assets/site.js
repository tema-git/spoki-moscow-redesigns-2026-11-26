'use strict';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];
  const assets = new URL(document.body.dataset.base.replace(/\/?$/, '/') + 'assets/', document.baseURI);
  const data = window.workshopData || { numbers: {}, references: {} };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const plain = (s) => s.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

  const menu = $('#mobile-nav');
  const trigger = $('.menu-trigger');
  function closeMenu(returnFocus = false) {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'Открыть меню');
    if (returnFocus) trigger.focus();
  }
  trigger.addEventListener('click', () => {
    if (!menu.hidden) return closeMenu();
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-label', 'Закрыть меню');
  });
  menu.addEventListener('click', () => closeMenu());
  $('.contact-nav').addEventListener('click', () => closeMenu());
  $('.top').addEventListener('focusout', e => {
    if (!menu.hidden && e.relatedTarget && !$('.top').contains(e.relatedTarget)) closeMenu();
  });
  document.addEventListener('pointerdown', e => {
    if (!menu.hidden && !e.target.closest('header')) closeMenu();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) closeMenu(true);
  });
  matchMedia('(max-width: 760px)').addEventListener('change', e => { if (!e.matches) closeMenu(); });

  function trackPointer(el, render, reset, touch = false) {
    let frame = 0;
    let point = null;
    const clear = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      point = null;
      reset();
    };
    const move = e => {
      if (reduced.matches || (!fine.matches && !touch)) return;
      const rect = el.getBoundingClientRect();
      point = [clamp((e.clientX - rect.left) / rect.width * 2 - 1, -1, 1), clamp((e.clientY - rect.top) / rect.height * 2 - 1, -1, 1)];
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        if (point) render(...point);
      });
    };
    el.addEventListener('pointermove', move, { passive: true });
    if (touch) {
      el.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' || reduced.matches) return;
        const r = el.getBoundingClientRect();
        render(clamp((e.clientX-r.left)/r.width*2-1,-1,1),clamp((e.clientY-r.top)/r.height*2-1,-1,1));
      }, { passive: true });
      el.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') clear(); });
    }
    el.addEventListener('pointerleave', clear);
    el.addEventListener('pointercancel', clear);
    reduced.addEventListener('change', clear);
  }
  const vars = (el, values) => {
    for (const [key, value] of Object.entries(values)) el.style.setProperty(key, value);
  };
  const removeVars = (el, names) => names.forEach(name => el.style.removeProperty(name));
  const magnet = $('.contact-nav');
  trackPointer(magnet, (x,y) => vars(magnet, {'--mx':x*3+'px','--my':y*2+'px'}), () => removeVars(magnet,['--mx','--my']));
  all('[data-react]').forEach(el => {
    trackPointer(el, (x,y) => vars(el,{'--rx':x*5+'px','--ry':y*4+'px','--tw':x*3+'deg','--zs':'1.025'}), () => removeVars(el,['--rx','--ry','--tw','--zs']));
  });

  const hero = $('[data-hero-field]');
  if (hero) {
    trackPointer(hero,(x,y) => vars(hero,{'--tilt-x':(8-y*14)+'deg','--tilt-y':(-9+x*19)+'deg','--gloss':(125+x*25-y*10)+'deg','--engrave-x':(-x*7)+'px','--engrave-y':(-y*5)+'px'}),
      () => removeVars(hero,['--tilt-x','--tilt-y','--gloss','--engrave-x','--engrave-y']),true);
    const assembly = $('.assembly');
    let frame = 0;
    function scrollArt() {
      frame = 0;
      if (reduced.matches) {
        hero.style.removeProperty('--drift');
        assembly.style.removeProperty('--sep');
        return;
      }
      const h = hero.getBoundingClientRect();
      if (h.bottom >= -20 && h.top < innerHeight) hero.style.setProperty('--drift',clamp(window.scrollY*.105,0,37)+'px');
      const a = assembly.getBoundingClientRect();
      const t = clamp((innerHeight-a.top)/(innerHeight*.78 + a.height*.26),0,1);
      assembly.style.setProperty('--sep', (1-t).toFixed(4));
    }
    const queue = () => { if (!frame) frame=requestAnimationFrame(scrollArt); };
    window.addEventListener('scroll',queue,{passive:true});
    window.addEventListener('resize',queue,{passive:true});
    reduced.addEventListener('change',queue);
    scrollArt();
    const tile = $('.hero-tile');
    const motifSamples = {bird:'850',flower:'4',rosette:'3'};
    for (const button of all('[data-motif]')) button.addEventListener('click', () => {
      const motif = button.dataset.motif;
      tile.src = new URL('art/'+motif+'.svg',assets).href;
      tile.alt = 'Эскиз росписи. '+button.textContent.trim();
      all('[data-motif]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      const sample = $('input[name=motif][value="'+motifSamples[motif]+'"]');
      if (sample) {sample.checked=true;sample.dispatchEvent(new Event('change',{bubbles:true}));}
    });
  }

  const listSearch = $('[data-list-search]');
  if (listSearch) {
    const rows = all('.product-list li');
    const more = $('[data-more]');
    const count = $('.search-count');
    let limit = 12;
    function render() {
      const q=plain(listSearch.value);
      let matches=0;
      for (const item of rows) {
        const match=plain(item.dataset.search).includes(q);
        item.hidden=!match || matches>=limit;
        if (match) matches++;
      }
      more.hidden=matches<=limit;
      count.textContent=matches?'Показано '+Math.min(limit,matches)+' из '+matches:'Совпадений нет. Попробуйте другое название или номер.';
    }
    listSearch.addEventListener('input',()=>{limit=12;render();});
    more.addEventListener('click',()=>{
      const firstHidden=rows.find(el=>el.hidden && plain(el.dataset.search).includes(plain(listSearch.value)));
      limit+=12;render();if(firstHidden) $('a',firstHidden).focus();
    });
    render();
  }
  const lookup = $('[data-id-lookup]');
  if (lookup) lookup.addEventListener('submit',event=>{
    event.preventDefault();
    const n=$('input',lookup).value.trim();
    const rec=Object.hasOwn(data.numbers,n)?data.numbers[n]:null;
    const output=$('.lookup-output',lookup);
    output.replaceChildren();
    if(!rec) {output.textContent='Такого номера в карте изделий нет. Проверьте номер из ссылки.';return;}
    const a=document.createElement('a');
    a.className='link';
    a.href=rec[1]?new URL('../'+rec[0]+'/index.html',assets).href:'https://izrazec.ru/'+rec[0]+'/';
    a.textContent=rec[1]||'№ '+n+' · Открыть карточку у мастерской';
    a.append($('.arr').cloneNode(true));
    output.append(a);
  });

  const dialog=$('.lightbox');
  if (dialog) {
    const thumbs=all('.gallery-trigger');
    const image=$('#lb-picture');
    let current=0, opener=null, initialX=null;
    const show=i=>{
      current=(i+thumbs.length)%thumbs.length;
      const item=thumbs[current].dataset;
      image.src=item.full;image.alt=item.description;
      $('#lightbox-title').textContent=item.title;
      $('#lightbox-desc').textContent=item.description;
      $('#lightbox-counter').textContent=(current+1)+' из '+thumbs.length;
    };
    thumbs.forEach((button,i)=>button.addEventListener('click',()=>{
      opener=button;show(i);dialog.showModal();$('.lb-close').focus();
    }));
    $('#lb-prev').addEventListener('click',()=>show(current-1));
    $('#lb-next').addEventListener('click',()=>show(current+1));
    $('.lb-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{
      if(event.target!==dialog)return;
      const rect=dialog.getBoundingClientRect();
      if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
    });
    dialog.addEventListener('keydown',event=>{
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();show(current+(event.key==='ArrowLeft'?-1:1));}
    });
    image.addEventListener('pointerdown',e=>{initialX=e.clientX;image.setPointerCapture(e.pointerId);});
    image.addEventListener('pointerup',e=>{if(initialX!==null&&Math.abs(e.clientX-initialX)>42)show(current+(e.clientX<initialX?1:-1));initialX=null;});
    image.addEventListener('pointercancel',()=>{initialX=null;});
    dialog.addEventListener('close',()=>{if(opener)opener.focus({preventScroll:true});});
  }

  const builder=$('#zadanie');
  if (!builder) return;
  const choices = {
    motif:{'850':'Синичка','851':'Снегирь на ветке','4':'Цветок космос','3':'Розетка фасадная на синем',own:'Свой эскиз'},
    kind:{fire:'Камин',stove:'Печь'},
    geometry:{wall:'Пристенная',corner:'Угловая',island:'Островная',bench:'С лежанкой'},
    coverage:{partial:'Частичная',full:'Полная',ask:'Обсудить с мастером'},
    scope:{tiles:'Комплект изразцов',install:'Комплект и монтаж',whole:'Печь или камин целиком'}
  };
  const sampleNotes={
    '850':'«Дубки» · 150 × 150 мм · 4 500 ₽ за изразец.',
    '851':'«Дубки» · 200 × 200 мм · 6 000 ₽ за изразец.',
    '4':'«Традиционные» · 220 × 260 мм · изготовление на заказ от 10 000 ₽ за изразец.',
    '3':'«Традиционные» · 300 × 300 мм · изготовление на заказ от 20 000 ₽ за изразец.',
    own:'Опишите собственный рисунок в задании. Формат и стоимость согласуются с мастером.'
  };
  const read=name=>$('input[name="'+name+'"]:checked',builder).value;
  const pick=(name,val)=>{const el=$('input[name="'+name+'"][value="'+val+'"]',builder);if(el)el.checked=true;};
  const dimKeys=['h','w','d'];
  const dimLabels=['Высота','Ширина','Глубина'];
  const notes=$('.ref-note',builder);
  const inputFields=dimKeys.map(key=>$('#dim-'+key));
  const form=$('#demo-form');
  const contactFields=[$('#client-name'),$('#client-contact'),$('#client-brief')];
  const error=$('#form-error'),success=$('#form-success');
  let reference='';
  let referenceChoice=null;
  let result='';
  const caseRef='kaminy/825';
  const diagram=$('.geom-preview');
  const originalImg=$('.geom-art',diagram);
  originalImg.remove();
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 140 100');svg.setAttribute('aria-hidden','true');svg.classList.add('geom-art');diagram.prepend(svg);
  const plans={
    wall:['M14 17H126','M40 21H100V75H40Z','M40 75H100'],
    corner:['M14 82V16H128','M19 21H100L103 38L49 83H19Z','M103 38L49 83'],
    island:['','M70 10L110 31V67L70 90L30 67V31Z','M30 67L70 90L110 67'],
    bench:['M15 16H125','M24 21H79V49H116V73H24Z','M24 73H116']
  };
  function sampleInfo() {$('#sample-info').textContent=sampleNotes[read('motif')];}
  function renderPlan(){
    const geo=read('geometry'),shape=plans[geo],full=read('coverage')==='full';
    svg.innerHTML='<path d="'+shape[0]+'" fill="none" stroke="#566958" stroke-width="4"/><path d="'+shape[1]+'" fill="'+(full?'#95b19a':'#d8c7a0')+'" stroke="#2f5849" stroke-width="2"/><path d="'+(full?shape[1]:shape[2])+'" fill="none" stroke="#a6573d" stroke-width="4" stroke-linejoin="round"/>';
    $('#geom-caption').textContent=choices.kind[read('kind')]+' · '+choices.geometry[geo].toLocaleLowerCase('ru')+' форма';
  }
  function defaults() {
    if(referenceChoice){referenceChoice.remove();referenceChoice=null;delete choices.motif.reference;delete sampleNotes.reference;}
    for(const [name,value] of Object.entries({motif:'850',kind:'fire',geometry:'wall',coverage:'partial',scope:'tiles'}))pick(name,value);
    inputFields.forEach(i=>{i.value='';i.removeAttribute('aria-invalid');});
    $('#dim-error').textContent='';reference='';result='';notes.textContent='';notes.hidden=true;
    $('#brief-result').textContent='';sampleInfo();renderPlan();
  }
  function display(step,focus=true) {
    all('[data-step]',builder).forEach(el=>el.hidden=+el.dataset.step!==step);
    all('.builder-rail li',builder).forEach((el,i)=>{
      el.classList.toggle('current',i===step-1);
      if(i===step-1)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
    });
    if(focus){
      const panel=$('[data-step="'+step+'"]',builder);
      const heading=$('h3, legend',panel);
      heading.focus({preventScroll:true});
      if(heading.getBoundingClientRect().top<$('.top').offsetHeight+10 || heading.getBoundingClientRect().bottom>innerHeight)builder.scrollIntoView({block:'start'});
    }
  }
  function validateDimensions(){
    $('#dim-error').textContent='';
    for (const i of inputFields)i.removeAttribute('aria-invalid');
    for (const [idx,input] of inputFields.entries()){
      const v=input.value.trim().replace(',','.');
      if(v && (!/^\d+(?:\.\d+)?$/.test(v) || Number(v)<=0)){
        input.setAttribute('aria-invalid','true');$('#dim-error').textContent=dimLabels[idx]+'. Введите положительное число в миллиметрах или оставьте поле пустым.';input.focus();return false;
      }
    }
    return true;
  }
  function makeBrief(){
    const dims=inputFields.map((i,idx)=>dimLabels[idx]+': '+(i.value.trim()?i.value.trim()+' мм':'нужен замер'));
    const lines=[];
    if(reference)lines.push('За основу: '+reference+'.');
    lines.push('Роспись: '+choices.motif[read('motif')]+'.','Объект: '+choices.kind[read('kind')]+'. Форма: '+choices.geometry[read('geometry')]+'.',dims.join(', ')+'.','Облицовка: '+choices.coverage[read('coverage')]+'.','Состав заказа: '+choices.scope[read('scope')]+'.');
    if(read('scope')==='tiles') lines.push('Уточнить состав и цену керамического комплекта.');
    else lines.push('Согласовать керамику и отдельную смету на работы.');
    return lines.join('\n');
  }
  builder.addEventListener('change',e=>{
    if(e.target.name==='kind' && read('kind')==='fire'&&read('geometry')==='bench')pick('geometry','wall');
    if(e.target.name==='geometry'&&read('geometry')==='bench')pick('kind','stove');
    sampleInfo();renderPlan();
    if (e.target.name === 'motif' && !$('[data-step="3"]',builder).hidden) {
      const previous = result;
      result = makeBrief();
      $('#brief-result').textContent = result;
      if (contactFields[2].value === previous) contactFields[2].value = result;
    }
  });
  inputFields.forEach(i=>i.addEventListener('input',()=>{i.removeAttribute('aria-invalid');$('#dim-error').textContent='';}));
  all('[data-step-to]',builder).forEach(b=>b.addEventListener('click',()=>{
    const step=Number(b.dataset.stepTo);
    if(step===3){if(!validateDimensions())return;result=makeBrief();$('#brief-result').textContent=result;}
    display(step);
  }));
  $('#reset-builder').addEventListener('click',()=>{const before=result;defaults();if(before && contactFields[2].value===before)contactFields[2].value='';display(1);});
  function resetForm(){
    form.reset();form.hidden=false;success.hidden=true;$('#final-text').textContent='';
    error.textContent='';contactFields.forEach(el=>el.removeAttribute('aria-invalid'));
  }
  $('#carry-brief').addEventListener('click',()=>{
    if(form.hidden)resetForm();
    contactFields[2].value=result;
    contactFields[2].removeAttribute('aria-invalid');error.textContent='';
    $('#contacts').scrollIntoView({block:'start'});contactFields[0].focus();
  });
  const submit=$('button[type=submit]',form);
  submit.disabled=false;
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const [name,contact,brief]=contactFields.map(f=>f.value.trim());
    const validPhone=/^\+?[\d() .-]+$/.test(contact)&&/^\d{7,15}$/.test(contact.replace(/\D/g,''));
    const validEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    const messages=[!name&&'Укажите, как к вам обращаться.',!(validPhone||validEmail)&&'Укажите телефон или электронную почту.',!brief&&'Добавьте задание или пожелания для мастера.'];
    const invalid=messages.findIndex(Boolean);
    contactFields.forEach((f,i)=>{if(messages[i])f.setAttribute('aria-invalid','true');else f.removeAttribute('aria-invalid');});
    if(invalid>=0){error.textContent=messages[invalid];contactFields[invalid].focus();return;}
    $('#final-text').textContent=brief;form.hidden=true;success.hidden=false;error.textContent='';success.focus();
  });
  contactFields.forEach(f=>f.addEventListener('input',()=>{f.removeAttribute('aria-invalid');error.textContent='';}));
  $('#redo-form').addEventListener('click',()=>{resetForm();contactFields[0].focus();});
  defaults();display(1,false);
  const ref=new URLSearchParams(location.search).get('ref');
  if(ref && Object.hasOwn(data.references,ref)){
    reference=data.references[ref];notes.hidden=false;notes.textContent='За основу выбрано: '+reference+'.';
    const nameParts=ref.split('/');
    if(location.hash==='#contacts'){
      contactFields[2].value='Хочу обсудить '+reference+'. ';
    }else{
      if(nameParts[0]==='izraztsy'){
        const id=nameParts[1];
        if(Object.hasOwn(choices.motif,id))pick('motif',id);
        else {
          referenceChoice=document.createElement('label');referenceChoice.className='choice';
          const radio=document.createElement('input');radio.type='radio';radio.name='motif';radio.value='reference';
          const caption=document.createElement('span');caption.textContent=reference;
          referenceChoice.append(radio,caption);$('.sample-choices',builder).prepend(referenceChoice);
          choices.motif.reference=reference;sampleNotes.reference='Образец из выбранной карточки. В задании сохранится его название.';
          radio.checked=true;
        }
      }
      if(ref.startsWith('pechi/')||ref.includes('izgotovlenie-pechey')||ref.includes('bannaya-pech')||ref.includes('lezhank'))pick('kind','stove');
      if(ref.includes('lezhank'))pick('geometry','bench');
      if(ref.includes('montazh-')||ref.includes('oblitsovka-'))pick('scope','install');
      if(ref.includes('izgotovlenie-kaminov')||ref.includes('izgotovlenie-pechey'))pick('scope','whole');
      if(ref===caseRef){
        pick('geometry','corner');['2900','1800','450'].forEach((v,i)=>inputFields[i].value=v);
        notes.textContent+=' Габариты перенесены с карточки камина. Укажите размеры своего проекта на следующем шаге.';
      }
      sampleInfo();renderPlan();
    }
  }
})();
