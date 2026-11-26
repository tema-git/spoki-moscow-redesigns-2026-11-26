'use strict';

const one = (selector, parent = document) => parent.querySelector(selector);
const all = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const bound = (number, min, max) => Math.max(min, Math.min(max, number));

function goTo(element, scrollTarget = element) {
  element.focus({preventScroll: true});
  scrollTarget.scrollIntoView({block: 'start', behavior: 'instant'});
}

function navigation() {
  const trigger = one('.menu-button');
  const nav = one('#mobile-nav');
  const close = (returnFocus = false) => {
    nav.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'Открыть меню');
    if (returnFocus) trigger.focus();
  };
  trigger.addEventListener('click', () => {
    if (!nav.hidden) { close(); return; }
    nav.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-label', 'Закрыть меню');
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !nav.hidden) close(true); });
  document.addEventListener('click', event => { if (!nav.hidden && (!event.target.closest('.mast') || event.target.closest('a'))) close(); });
  document.addEventListener('focusin', event => { if (!nav.hidden && !event.target.closest('.mast')) close(); });
  matchMedia('(min-width:951px)').addEventListener('change', event => { if (event.matches) close(); });
}

function galleryViewer() {
  const el = one('#gallery-viewer');
  const image = one('#gallery-img');
  const caption = one('#gallery-caption');
  const previous = one('[data-prev]', el), next = one('[data-next]', el), close = one('[data-close]', el);
  let images = [], index = 0, opener = null, touch = null;
  function display() {
    const item = images[index];
    image.src = item.href;
    image.alt = item.dataset.caption;
    caption.textContent = item.dataset.caption;
    one('#gallery-counter').textContent = (index + 1) + ' / ' + images.length;
    previous.disabled = next.disabled = images.length < 2;
  }
  function change(delta) {
    index = (index + delta + images.length) % images.length;
    display();
  }
  document.addEventListener('click', event => {
    const frame = event.target.closest('[data-frame]');
    if (!frame || event.metaKey || event.ctrlKey || !el.showModal) return;
    event.preventDefault();
    opener = frame;
    images = all('[data-frame]', frame.closest('[data-gallery]'));
    index = images.indexOf(frame);
    display();
    el.showModal();
    close.focus({preventScroll:true});
  });
  close.addEventListener('click', () => el.close());
  el.addEventListener('close', () => {
    image.removeAttribute('src');
    opener?.focus({preventScroll:true});
  });
  el.addEventListener('click', event => {
    if (event.target !== el) return;
    const box = el.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) el.close();
  });
  previous.addEventListener('click', () => change(-1));
  next.addEventListener('click', () => change(1));
  el.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); change(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  image.addEventListener('touchstart', event => {
    if (event.touches.length === 1) touch = [event.touches[0].clientX, event.touches[0].clientY];
  }, {passive:true});
  image.addEventListener('touchend', event => {
    if (!touch) return;
    const deltaX = event.changedTouches[0].clientX - touch[0], deltaY = event.changedTouches[0].clientY - touch[1];
    if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > 1.7 * Math.abs(deltaY)) change(deltaX < 0 ? 1 : -1);
    touch = null;
  }, {passive:true});
}

function directory() {
  const root = one('[data-directory]');
  if (!root) return;
  const search = one('#directory-search',root), total = one('#filter-count',root), more = one('#load-more',root), reset = one('#clear-filter',root);
  const cards = all('[data-item]',root), limit = Number(root.dataset.limit);
  const maxPrice=one('#max-price',root);
  const normalized=s=>s.toLocaleLowerCase('ru').replaceAll('ё','е').replace(/[х×]/g,'x').replace(/(?<=\d)\s+(?=\d)/g,'').trim();
  if(root.hasAttribute('data-products')){
    const sourceType=new URLSearchParams(location.search).get('type');
    const group=({'led':'Светодиодные экраны','videowall':'Видеостены'})[sourceType];
    const initial=all('input[name="filter"]',root).find(r=>r.value===group);
    if(initial)initial.checked=true;
  }
  let visibleCount = limit;
  function repaint(resetPage = true, focusNew = false) {
    if (resetPage) visibleCount = limit;
    const group = one('input[name="filter"]:checked',root).value;
    const query = normalized(search.value);
    const maker=one('[name="maker"]:checked',root)?.value || '';
    const budget=maxPrice?.value ? Number(maxPrice.value) : 0;
    const matches = cards.filter(card => (!group || card.dataset.group.split('|').includes(group)) && (!maker || maker===card.dataset.maker) && (!budget || (Number(card.dataset.amount)>0 && Number(card.dataset.amount)<=budget)) && (!query || query.split(/\s+/).every(word => normalized(card.dataset.search).includes(word))));
    const visible = new Set(matches.slice(0, visibleCount));
    cards.forEach(card => { card.hidden = !visible.has(card); });
    total.textContent = matches.length ? 'Показано ' + visible.size + ' из ' + matches.length : 'По вашему запросу ничего не найдено.';
    more.hidden = visibleCount >= matches.length;
    reset.hidden = !query && !group && !maker && !budget;
    if (focusNew) one('a', matches[visibleCount - limit])?.focus({preventScroll:true});
  }
  search.addEventListener('input',() => repaint());
  root.addEventListener('change',e => { if (e.target.name === 'filter' || e.target.name === 'maker') repaint(); });
  maxPrice?.addEventListener('input',()=>repaint());
  reset.addEventListener('click',() => { search.value=''; one('input[name="filter"]',root).checked=true; const mainMaker=one('[name="maker"]',root);if(mainMaker)mainMaker.checked=true;if(maxPrice)maxPrice.value='';repaint(); search.focus(); });
  more.addEventListener('click', () => { visibleCount+=limit; repaint(false,true); });
  repaint();
}

function configure() {
  const form = one('#brief-form');
  if (!form) return;
  const cases = JSON.parse(one('#case-data').textContent), solutions = JSON.parse(one('#solution-data').textContent);
  const equipmentNode = one('#brand-data');
  const equipment = equipmentNode ? JSON.parse(equipmentNode.textContent) : {};
  const products=JSON.parse(one('#model-data').textContent);
  const budget = one('#budget'), error = one('#brief-error'), result = one('#brief-result'), originBox = one('#origin-reference'), section = one('#brief');
  const money = new Intl.NumberFormat('ru-RU',{maximumFractionDigits:4});
  const q = new URLSearchParams(location.search);
  let origin = cases.find(c => c.key === q.get('ref')) || null;
  let solution = Object.hasOwn(solutions,q.get('solution')) ? solutions[q.get('solution')] : null;
  let brand = Object.hasOwn(equipment,q.get('brand')) ? equipment[q.get('brand')] : '';
  let model=Object.hasOwn(products,q.get('model')) ? products[q.get('model')] : '';
  let briefText = '';
  function pick(name,value) {
    const opt = all('input[name="'+name+'"]',form).find(node => node.value === value);
    if (opt) opt.checked = true;
  }
  function inputValue(name) {
    const input = one('input[name="'+name+'"]:checked',form);
    return {key: input.value, title: input.closest('label').textContent.trim()};
  }
  function updateOrigin() {
    originBox.textContent = model ? 'Выбранная комплектация — '+model : origin ? 'Исходный объект — '+origin.title+' · '+origin.price : (solution || brand ? 'Выбранное направление — '+(solution?.title || brand) : '');
    originBox.hidden = !originBox.textContent;
  }
  pick('room', q.get('room') || origin?.room);
  pick('intent', q.get('intent'));
  const initial = q.get('budget');
  if (initial && /^\d+(?:[.,]\d{1,4})?$/.test(initial)) budget.value = initial.replace('.',',');
  else if (origin?.budget) budget.value = money.format(origin.budget);
  updateOrigin();
  function reset() {
    form.reset(); budget.value=''; origin=null; solution=null; brand='';model=''; briefText='';
    error.textContent='';budget.removeAttribute('aria-invalid');updateOrigin();
    result.hidden=true;form.hidden=false;
    goTo(one('input[name="room"]',form),section);
  }
  one('#brief-reset').addEventListener('click',reset);
  one('#restart-brief').addEventListener('click',reset);
  budget.addEventListener('input',()=>{ budget.removeAttribute('aria-invalid');error.textContent=''; });
  form.addEventListener('change',e=>{
    if(e.target.name!=='room')return;
    const room=e.target.value;
    if(origin && room!==origin.room)origin=null;
    if(solution && room!==solution.room && !(solution.room==='cinema' && ['living','compact','tv'].includes(room))) solution=null;
    updateOrigin();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const room = inputValue('room'), goal = inputValue('intent');
    const raw = budget.value.trim().replace(/\s/g,'');
    const amount = raw ? Number(raw.replace(',','.')) : null;
    if (raw && (!/^\d+([.,]\d{1,4})?$/.test(raw) || !Number.isFinite(amount) || amount <= 0)) {
      error.textContent='Введите положительную сумму в миллионах рублей, например 2,5, или оставьте поле пустым.';
      budget.setAttribute('aria-invalid','true');budget.focus();return;
    }
    error.textContent='';budget.removeAttribute('aria-invalid');
    const exact=cases.filter(c=>c.room===room.key && c.budget>0);
    let eligible=exact;
    if(room.key==='compact') eligible=cases.filter(c=>c.room==='living');
    if(room.key==='other') eligible=solution ? cases.filter(c=>solution.related.includes(c.key) && c.budget>0) : [];
    const ordered=[...eligible];
    if(amount !== null) ordered.sort((a,b)=>Math.abs(a.budget-amount)-Math.abs(b.budget-amount));
    const reference = origin?.room===room.key ? origin : ordered[0];
    const budgetLabel = amount === null ? 'уточнить после обследования' : money.format(amount)+' млн ₽';
    one('#result-heading').textContent=reference ? reference.title : room.title;
    one('#result-meta').textContent=reference ? [reference.type,reference.price,reference.term].filter(Boolean).join(' · ') : 'Индивидуальный подбор оборудования';
    one('#result-info').textContent=reference?.description || 'Опишите назначение помещения и количество мест, чтобы уточнить состав системы.';
    const matches=[];
    if(origin && reference===origin) matches.push('Вы выбрали этот объект как пример.');
    else if(room.key==='compact') matches.push('Ближайший по формату пример из гостиной. Размеры вашей комнаты нужно уточнить.');
    else if(room.key==='other' && reference) matches.push('Компания приводит этот объект в выбранном разделе. Уточните назначение вашего помещения в брифе.');
    else if(reference && amount!==null) matches.push('Ближайший опубликованный бюджет для выбранного типа помещения.');
    if(reference && amount!==null && reference.budget>amount){matches.push('Этот объект дороже вашего ориентира на '+money.format(reference.budget-amount)+' млн ₽.');}
    if(amount !== null && amount<.5)matches.push('В условиях компании указан минимальный бюджет 500 000 ₽.');
    matches.push('Ваш ориентир — '+budgetLabel+'. Стоимость нового проекта определяется отдельно.');
    one('#result-match').textContent=matches.join(' ');
    const links = one('#result-links');links.replaceChildren();
    if(reference){const a=document.createElement('a');a.href=reference.route;a.className='textlink';a.textContent='Открыть карточку объекта';a.append(one('#to-form .arrow').cloneNode(true));links.append(a);}
    briefText=[goal.title+'.','Помещение — '+room.title+'.',solution?'Решение — '+solution.title+'.':'',brand?'Производитель — '+brand+'.':'',model?'Комплектация — '+model+'.':'','Бюджет — '+budgetLabel+'.',reference?'Пример — '+reference.title+' ('+reference.price+').':''].filter(Boolean).join('\n');
    form.hidden=true;result.hidden=false;goTo(result,section);
  });
  one('#edit-brief').addEventListener('click',()=>{result.hidden=true;form.hidden=false;goTo(one('input[name="room"]:checked',form),section);});
  one('#to-form').addEventListener('click',()=>{
    const cf=one('#contact-form'), success=one('#contact-success');
    success.hidden=true;cf.hidden=false;
    const msg=one('#message');msg.value=briefText;msg.dispatchEvent(new Event('input',{bubbles:true}));
    goTo(one('#visitor'),cf);
  });
}

function contact() {
  const form=one('#contact-form');
  if(!form)return;
  const fields=['visitor','channel','message'].map(id=>document.getElementById(id));
  const success=one('#contact-success');
  one('#contact-fields').disabled=false;
  function validate(el) {
    const val=el.value.trim();let msg='';
    if(el.id==='visitor' && !val) msg='Укажите имя или удобное обращение.';
    if(el.id==='channel'){
      const digits=val.replace(/\D/g,'');
      const isPhone=/^\+?[\d\s().-]+$/.test(val) && digits.length>=10 && digits.length<=15;
      const isEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      if(!isPhone&&!isEmail)msg='Укажите телефон с кодом или адрес электронной почты.';
    }
    if(el.id==='message' && !val)msg='Опишите задачу или перенесите параметры из брифа.';
    one('#'+el.id+'-error').textContent=msg;
    if(msg)el.setAttribute('aria-invalid','true');else el.removeAttribute('aria-invalid');
    return !msg;
  }
  fields.forEach(el=>el.addEventListener('input',()=>{if(el.hasAttribute('aria-invalid'))validate(el);}));
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const invalid=fields.filter(el=>!validate(el));
    if(invalid.length){invalid[0].focus();return;}
    one('#success-summary').textContent=one('#message').value;
    form.hidden=true;success.hidden=false;goTo(success,success);
  });
  one('#form-again').addEventListener('click',()=>{
    form.reset();fields.forEach(el=>{el.removeAttribute('aria-invalid');one('#'+el.id+'-error').textContent='';});
    one('#success-summary').textContent='';success.hidden=true;form.hidden=false;goTo(fields[0],form);
  });
}

function interactions() {
  const art=one('[data-optic]'), hero=one('#hero'), scene=one('[data-assembly]'), magnet=one('.contact-btn'), brief=one('.brief-section');
  let target=null,pointerEvent=null,frame=0,scrollFrame=0;
  function clear(target) {
    if(!target)return;
    for(const key of ['--ry','--rx','--px','--py','--gx','--gy','--beam','--lx','--ly','--ix','--iy','--mag-x','--mag-y','--meter']) target.style.removeProperty(key);
  }
  function coordinates(node,event) {
    const rect=node.getBoundingClientRect();
    return [bound((event.clientX-rect.left)/Math.max(1,rect.width),0,1),bound((event.clientY-rect.top)/Math.max(1,rect.height),0,1)];
  }
  function paintPointer() {
    frame=0;
    if(!target||!pointerEvent||reduced.matches)return;
    const [x,y]=coordinates(target,pointerEvent),dx=x-.5,dy=y-.5;
    const styles=target===art ? {'--ry':dx*18+'deg','--rx':-dy*15+'deg','--px':dx*31+'px','--py':dy*18+'px','--gx':dx*6+'px','--gy':dy*5+'px','--beam':dy*8+'deg'} :
      target===magnet ? {'--mag-x':dx*6+'px','--mag-y':dy*6+'px'} :
      target===brief ? {'--meter':(.65+x*.7).toFixed(3)} :
      {'--lx':x*100+'%','--ly':y*100+'%','--ix':dx*10+'px','--iy':dy*8+'px'};
    Object.entries(styles).forEach(([k,v])=>target.style.setProperty(k,v));
  }
  function pointer(e){
    if(reduced.matches)return;
    const touch = e.pointerType==='touch';
    if(!touch && !finePointer.matches)return;
    const next=e.target.closest(touch?'[data-optic]':'[data-optic],.reactive,.contact-btn,.brief-section');
    if(next!==target){clear(target);target=next;}
    pointerEvent=e;
    if(next&&!frame)frame=requestAnimationFrame(paintPointer);
  }
  document.addEventListener('pointermove',pointer,{passive:true});
  document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')pointer(e);},{passive:true});
  document.addEventListener('pointerup',e=>{if(e.pointerType==='touch'){clear(target);target=null;}},{passive:true});
  document.addEventListener('pointercancel',()=>{clear(target);target=null;},{passive:true});
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget){clear(target);target=null;}},{passive:true});
  function paintScroll(){
    scrollFrame=0;
    if(reduced.matches){if(art)art.removeAttribute('style');if(scene)scene.removeAttribute('style');return;}
    if(hero && art){
      const r=hero.getBoundingClientRect();
      if(r.bottom>=-20 && r.top<=innerHeight){const t=bound(-r.top/Math.max(1,r.height),0,1);art.style.setProperty('--fall',t*53+'px');art.style.setProperty('--tilt',t*-8+'deg');art.style.setProperty('--beam-alpha',String(.9-t*.3));}
    }
    if(scene){
      const r=scene.getBoundingClientRect();
      if(r.top<innerHeight+5 && r.bottom>=-20) {
        const amount=1-bound((innerHeight-r.top)/(innerHeight*.54+r.height*.22),0,1);
        const values={'--base-shift':15,'--walls-x':-30,'--walls-y':-28,'--screen-x':48,'--screen-y':-38,'--seats-x':35,'--seats-y':35};
        Object.entries(values).forEach(([k,v])=>scene.style.setProperty(k,v*amount+'px'));
      }
    }
  }
  const schedule=()=>{if((hero||scene)&&!scrollFrame)scrollFrame=requestAnimationFrame(paintScroll);};
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
  reduced.addEventListener('change',()=>{clear(target);schedule();});
  schedule();
}

navigation();galleryViewer();directory();contact();configure();interactions();

