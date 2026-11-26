'use strict';

const select = (selector, root = document) => root.querySelector(selector);
const selectAll = (selector, root = document) => [...root.querySelectorAll(selector)];
const bound = (n, low, high) => Math.max(low, Math.min(high, n));
const numberRu = new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 3});
const focusAt = el => {
  el.focus({preventScroll: true});
  el.scrollIntoView({block: 'nearest', behavior: 'instant'});
};

function navigation() {
  const button = select('.menu-toggle');
  const menu = select('#mobile-nav');
  function show(open, returnFocus = false) {
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.hidden = !open;
    if (returnFocus) button.focus();
  }
  button.addEventListener('click', () => show(menu.hidden));
  document.addEventListener('click', e => {
    if (!menu.hidden && (!e.target.closest('header') || e.target.closest('a'))) show(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) show(false, true);
  });
  document.addEventListener('focusin', e => {
    if (!menu.hidden && !e.target.closest('header')) show(false);
  });
  matchMedia('(min-width:791px)').addEventListener('change', () => show(false));
}

function catalogSearch() {
  const wrap = select('[data-search]');
  if (!wrap || !window.KDM_INDEX) return;
  const field = select('input', wrap);
  const box = select('.search-matches', wrap);
  const listing = select('.search-links', wrap);
  const more = select('.search-more', wrap);
  const status = select('[role=status]', wrap);
  const normalize = x => String(x).toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9]+/g, ' ').trim();
  const indexed = window.KDM_INDEX.map(record => {
    const words = normalize(record.slice(1, 3).join(' '));
    return {record, words, together: words.replaceAll(' ', '')};
  });
  let found = [], shown = 0;
  function append() {
    const end = Math.min(shown + 12, found.length);
    for (let i = shown; i < end; i++) {
      const [path, title, , price] = found[i].record;
      const a = document.createElement('a');
      a.href = wrap.dataset.indexRoot.replace(/index\.html$/, '') + path;
      const text = document.createElement('span'), amount = document.createElement('small');
      text.textContent = title;
      amount.textContent = price;
      a.append(text, amount);
      listing.append(a);
    }
    shown = end;
    more.hidden = shown >= found.length;
  }
  function search() {
    const query = normalize(field.value);
    box.hidden = !query;
    listing.replaceChildren();
    if (!query) return;
    const tokens = query.split(' ');
    const together = tokens.join('');
    found = indexed.filter(x => tokens.every(t => x.words.includes(t)) || x.together.includes(together));
    // Show an exact model code before longer models containing the same characters.
    found.sort((a,b) => Number(normalize(b.record[2]).replaceAll(' ','') === together) -
      Number(normalize(a.record[2]).replaceAll(' ','') === together));
    shown = 0;
    status.textContent = found.length ? 'Найдено в каталоге — ' + found.length : 'Совпадений нет. Попробуйте название раздела или артикул.';
    append();
  }
  field.addEventListener('input', search);
  field.addEventListener('keydown', e => {
    if (e.key === 'Escape') { field.value = ''; search(); }
  });
  more.addEventListener('click', append);
}

function showError(form, el, message) {
  const error = select('.form-error', form);
  error.id = form.id + '-error';
  error.textContent = message;
  error.hidden = false;
  el.setAttribute('aria-invalid', 'true');
  el.setAttribute('aria-describedby', error.id);
  focusAt(el);
}
function clearError(form) {
  const error = select('.form-error', form);
  error.hidden = true;
  error.textContent = '';
  selectAll('[aria-invalid]', form).forEach(el => {
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
  });
}

function requestForm() {
  const form = select('#request-form'), success = select('#request-success');
  const {person, reply, requirements} = form.elements;
  let generated = '';
  function fitRequirements() {
    if (form.hidden) return;
    requirements.style.height = 'auto';
    if (requirements.value) {
      const limit = Math.min(innerHeight * .65, 410);
      requirements.style.height = Math.min(requirements.scrollHeight + 2, limit) + 'px';
    }
  }
  function clearGenerated(text = generated) {
    if (text && requirements.value.includes(text)) requirements.value = requirements.value.replace(text, '').trim();
    if (text === generated) generated = '';
    fitRequirements();
  }
  function edit() {
    form.hidden = false;
    success.hidden = true;
  }
  function transfer(text) {
    edit();
    clearError(form);
    clearGenerated();
    const notes = requirements.value.trim();
    requirements.value = notes && notes !== text ? text + '\n\n' + notes : text;
    generated = text;
    fitRequirements();
    location.hash = 'zapros';
    focusAt(requirements);
  }
  form.addEventListener('input', e => {
    clearError(form);
    if (e.target === requirements) fitRequirements();
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    clearError(form);
    if (!person.value.trim()) return showError(form, person, 'Укажите имя.');
    const contact = reply.value.trim();
    const digits = contact.replace(/\D/g, '');
    const isPhone = /^[+\d][\d\s()+-]*$/.test(contact) && digits.length >= 7 && digits.length <= 15;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact);
    if (!(isPhone || isEmail)) return showError(form, reply, 'Укажите телефон с кодом города или электронную почту.');
    if (!requirements.value.trim()) return showError(form, requirements, 'Укажите модель или опишите задачу.');
    const receipt = select('.receipt', success);
    receipt.replaceChildren();
    for (const [key, val] of [['Имя',person.value],['Контакт',contact],['Требования',requirements.value]]) {
      const group = document.createElement('div'), term = document.createElement('dt'), value = document.createElement('dd');
      term.textContent = key; value.textContent = val.trim();
      group.append(term,value); receipt.append(group);
    }
    form.hidden = true; success.hidden = false; focusAt(success);
  });
  select('[data-form-edit]').addEventListener('click', () => { edit(); focusAt(requirements); });
  select('[data-form-new]').addEventListener('click', () => {
    form.reset(); generated = ''; clearError(form); select('.receipt', success).replaceChildren(); edit(); fitRequirements(); focusAt(person);
  });
  selectAll('[data-product]').forEach(btn => btn.addEventListener('click', () => {
    transfer((btn.dataset.retired === '1' ? 'Подобрать замену для модели' : 'Модель') + ' — ' + btn.dataset.product);
  }));
  return {transfer, clearGenerated};
}
function configurator(request) {
  const form = select('#config');
  if (!form) return;
  const result = select('#config-result'), versionBox = select('.version-box', result);
  const batch = form.elements.batch, qty = form.elements.quantity, power = form.elements.watts;
  const supplyLabels = {electric:'Только 220 В',natural:'220 В и природный газ',lpg:'220 В и сжиженный газ (LPG)',unknown:'Подключение нужно уточнить'};
  const versions = {electric:'Электрическое · 5 245 Вт',natural:'Газовое · природный газ · 295 Вт',lpg:'Газовое · LPG · 295 Вт'};
  let selection = null, previousText = '';
  function invalidate() {
    clearError(form); result.hidden = true; selection = null;
    if (previousText) request.clearGenerated(previousText);
    previousText = '';
  }
  versionBox.addEventListener('change', () => {
    if (previousText) request.clearGenerated(previousText);
    previousText = '';
  });
  function reset() {
    form.reset(); invalidate(); select('div', versionBox).replaceChildren(); focusAt(batch);
  }
  form.addEventListener('input', invalidate);
  select('[data-config-reset]').addEventListener('click', reset);
  form.addEventListener('submit', e => {
    e.preventDefault(); invalidate();
    const mass = batch.valueAsNumber, count = qty.valueAsNumber, watts = power.valueAsNumber;
    const supply = form.elements.supply.value;
    if (!Number.isSafeInteger(mass) || mass < 1) return showError(form,batch,'Укажите массу партии в целых граммах больше нуля.');
    if (!Number.isSafeInteger(count) || count < 1) return showError(form,qty,'Укажите целое количество ростеров больше нуля.');
    if (!supply) return showError(form,select('[name=supply]',form),'Выберите подключение или вариант для уточнения.');
    if (power.validity.badInput || (power.value !== '' && (!Number.isFinite(watts) || watts <= 0))) return showError(form,power,'Укажите доступную мощность больше нуля или оставьте поле пустым.');
    const knownPower = Number.isFinite(watts);
    const gas = supply === 'natural' || supply === 'lpg';
    const fit = [];
    let title = '', note = '', alternatives = false;
    if (mass < 500 || mass > 2500) {
      title = 'Нужна другая загрузка'; alternatives = true;
      note = 'Для BK-2 указан диапазон от 500 до 2 500 г за цикл. Масса вашей партии — ' + numberRu.format(mass) + ' г. Её можно передать для подбора другой модели.';
    } else if (supply === 'unknown') {
      title = 'Уточнить подключение'; note = 'Партия входит в диапазон BK-2. Для выбора исполнения нужны сведения о сети 220 В, доступной мощности и наличии газа.';
    } else {
      if (gas && (!knownPower || watts >= 295)) fit.push(supply);
      if (!knownPower || watts >= 5245) fit.push('electric');
      if (!fit.length) {
        title = 'Мощности недостаточно';
        note = gas ? 'Даже для газового нагрева требуется 295 Вт при 220 В на один ростер. Укажите ограничения площадки в запросе.' : 'Для электрического нагрева требуется 5 245 Вт при 220 В на один ростер. Ограничение мощности можно передать специалисту.';
      } else {
        title = fit.length > 1 ? 'Два возможных исполнения' : fit[0] === 'electric' ? 'Электрическое исполнение BK-2' : 'Газовое исполнение BK-2';
        const params = fit.length > 1 ? 'Доступны газовый и электрический нагрев. Выберите исполнение для запроса.' : fit[0] === 'electric' ? 'Требование оборудования — 220 В и 5 245 Вт на один ростер.' : 'Электропитание привода — 220 В и 295 Вт на один ростер. Источник нагрева — '+(supply === 'lpg' ? 'сжиженный газ (LPG, 0–6 кПа).' : 'природный газ.');
        note = (knownPower ? 'Партия входит в рабочий диапазон. ' : 'Партия подходит. Доступную мощность ещё нужно подтвердить. ') + params;
      }
    }
    selection = {mass,count,watts,knownPower,supply,fit,title};
    select('h3',result).textContent = title;
    select('.result-copy',result).textContent = note;
    select('.alternative',result).hidden = !alternatives;
    const matches = select('.mass-matches',result);
    let displayed = 0;
    selectAll('li[data-min]',matches).forEach(item => {
      const fits = alternatives && mass >= Number(item.dataset.min) && mass <= Number(item.dataset.max);
      item.hidden = !fits || displayed >= 2;
      if (!item.hidden) displayed++;
    });
    matches.hidden = displayed === 0;
    const options = select('div',versionBox); options.replaceChildren();
    versionBox.hidden = fit.length < 2;
    if (fit.length > 1) fit.forEach((key,index) => {
      const label = document.createElement('label'), input = document.createElement('input'), span = document.createElement('span');
      label.className = 'choice'; input.type='radio'; input.name='desired-version'; input.value=key; input.checked=index===0; span.textContent=versions[key];
      label.append(input,span); options.append(label);
    });
    result.hidden = false; focusAt(result);
  });
  select('[data-config-transfer]').addEventListener('click', () => {
    if (!selection) return;
    const {mass,count,watts,knownPower,supply,fit,title} = selection;
    const choice=fit.length>1 ? select('input:checked',versionBox).value : fit[0];
    const explanation=choice ? ('Исполнение — '+versions[choice]+(knownPower ? '' : ' (требуется проверить мощность)')) : ('Требуется консультация — '+title.toLowerCase());
    previousText=['Модель — BK-2',explanation,'Партия зелёного зерна — '+numberRu.format(mass)+' г','Количество ростеров — '+numberRu.format(count),
      'Подключение — '+supplyLabels[supply],'Мощность на один ростер — '+(knownPower?numberRu.format(watts)+' Вт':'уточнить')].join('\n');
    request.transfer(previousText);
  });
}

function motion() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)'), fine = matchMedia('(hover: hover) and (pointer: fine)');
  const hero = select('.hero') || select('.product-top'), plate = select('.hero-plate');
  const process = select('.process'), magnetic = select('.contact-head');
  let scrollFrame = 0;
  function updateScroll() {
    scrollFrame = 0;
    if (reduced.matches) return;
    if (plate && hero) {
      const rect = hero.getBoundingClientRect();
      if (rect.bottom>=0 && rect.top<=innerHeight) plate.style.setProperty('--hs',bound(-rect.top/Math.max(1,rect.height),0,1).toFixed(3));
    }
    if (process) {
      const rect = process.getBoundingClientRect();
      if (rect.bottom>=0 && rect.top <= innerHeight) {
        const prog = bound((innerHeight-rect.top)/(innerHeight*.7+rect.height*.5),0,1);
        process.style.setProperty('--progress',prog.toFixed(3));
      }
    }
  }
  if (plate) {
    const touchTurn = e => {
      if (e.pointerType !== 'touch' || reduced.matches) return;
      const r = plate.getBoundingClientRect();
      plate.style.setProperty('--px', bound((e.clientX-r.left)/r.width*2-1,-1,1).toFixed(3));
      plate.style.setProperty('--py', bound((e.clientY-r.top)/r.height*2-1,-1,1).toFixed(3));
    };
    const release = e => {
      if (e.pointerType === 'touch') {
        plate.style.removeProperty('--px');
        plate.style.removeProperty('--py');
      }
    };
    plate.addEventListener('pointerdown',touchTurn,{passive:true});
    plate.addEventListener('pointermove',touchTurn,{passive:true});
    plate.addEventListener('pointerup',release,{passive:true});
    plate.addEventListener('pointercancel',release,{passive:true});
  }
  const schedule = () => { if (!scrollFrame && !reduced.matches) scrollFrame=requestAnimationFrame(updateScroll); };
  addEventListener('scroll',schedule,{passive:true}); addEventListener('resize',schedule,{passive:true});
  reduced.addEventListener('change',schedule); schedule();
  let last = null, pending = null, pointerFrame = 0;
  function clearTarget(el) {
    if (!el) return;
    for (const k of ['--px','--py','--rx','--ry','--mx','--my']) el.style.removeProperty(k);
  }
  function drawPointer() {
    pointerFrame=0;
    if (!pending || reduced.matches || !fine.matches) {clearTarget(last);last=null;return;}
    const {target,clientX,clientY} = pending;
    const el=target.closest('.hero-plate,.react,.contact-head');
    if(last!==el) clearTarget(last);
    last=el;
    if(!el || target.closest('input,textarea,.plate-caption,figcaption')) return;
    const r=el.getBoundingClientRect();
    const x=bound((clientX-r.left)/r.width*2-1,-1,1), y=bound((clientY-r.top)/r.height*2-1,-1,1);
    if (el===magnetic) {el.style.setProperty('--mx',(x*3).toFixed(2)+'px');el.style.setProperty('--my',(y*2.5).toFixed(2)+'px');}
    else if(el.classList.contains('hero-plate')) {el.style.setProperty('--px',x.toFixed(3));el.style.setProperty('--py',y.toFixed(3));}
    else {el.style.setProperty('--rx',x.toFixed(3));el.style.setProperty('--ry',y.toFixed(3));}
  }
  document.addEventListener('pointermove', e => {
    if (e.pointerType==='touch'||reduced.matches||!fine.matches) return;
    pending=e; if (!pointerFrame) pointerFrame=requestAnimationFrame(drawPointer);
  },{passive:true});
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget){pending=null;clearTarget(last);last=null;}});
  reduced.addEventListener('change',()=>{clearTarget(last);last=null;});
}
navigation(); catalogSearch(); configurator(requestForm()); motion();
