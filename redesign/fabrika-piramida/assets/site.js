'use strict';
(() => {
  const one = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  const metre = value => (value / 1000).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  const roomText = (a, b) => metre(a) + ' × ' + metre(b) + ' м';
  const sizes = {
    10: { price: 1116240, long: 6440, short: 5020, field: [2840, 1420] },
    12: { price: 1401630, long: 7100, short: 5350, field: [3500, 1750] }
  };
  function syncMenu(open, returnFocus = false) {
    const button = one('.menu-button');
    const menu = one('#mobile-menu');
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    one('path', button).setAttribute('d', open ? 'm5 5 14 14M19 5 5 19' : 'M3 6h18M3 12h18M3 18h18');
    if (returnFocus) button.focus();
  }
  one('.menu-button').addEventListener('click', () => syncMenu(one('#mobile-menu').hidden));
  document.addEventListener('click', event => {
    if (!one('#mobile-menu').hidden && (!event.target.closest('.mast') || event.target.closest('a'))) syncMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !one('#mobile-menu').hidden) syncMenu(false, true);
  });
  document.addEventListener('focusin', event => {
    if (!one('#mobile-menu').hidden && !event.target.closest('.mast')) syncMenu(false);
  });
  window.matchMedia('(min-width: 881px)').addEventListener('change', event => { if (event.matches) syncMenu(false); });
  const request = one('#request');
  const success = one('.success');
  const config = one('#specification');
  function clearConfig() {
    config.value = '';
    one('[data-config-wrap]').hidden = true;
  }
  function transfer(value) {
    request.hidden = false;
    success.hidden = true;
    config.value = value;
    one('[data-config-wrap]').hidden = false;
    request.scrollIntoView({ block: 'start' });
    config.focus({ preventScroll: true });
    const box = config.getBoundingClientRect();
    if (box.bottom > innerHeight || box.top < one('.mast').offsetHeight) config.scrollIntoView({ block: 'center' });
  }
  function fieldError(field, message) {
    field.setAttribute('aria-invalid', String(Boolean(message)));
    one('#' + field.getAttribute('aria-describedby')).textContent = message;
  }
  const nameField = one('#visitor-name');
  const contactField = one('#visitor-contact');
  [nameField, contactField].forEach(field => field.addEventListener('input', () => fieldError(field, '')));
  one('#submit-demo').disabled = false;
  request.addEventListener('submit', event => {
    event.preventDefault();
    const nameValid = nameField.value.trim().length > 0;
    const contact = contactField.value.trim();
    const phoneValid = /^\+?[\d\s().-]+$/.test(contact) && /^\d{7,15}$/.test(contact.replace(/\D/g, ''));
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    fieldError(nameField, nameValid ? '' : 'Введите имя.');
    fieldError(contactField, phoneValid || emailValid ? '' : 'Введите телефон с кодом города или электронную почту.');
    if (!nameValid || (!phoneValid && !emailValid)) { (nameValid ? contactField : nameField).focus(); return; }
    const summary = one('.success-config');
    summary.textContent = config.value.trim();
    summary.hidden = !summary.textContent;
    request.reset();
    clearConfig();
    request.hidden = true;
    success.hidden = false;
    success.focus();
  });
  one('[data-new-request]').addEventListener('click', () => {
    success.hidden = true;
    one('.success-config').textContent = '';
    request.hidden = false;
    clearConfig();
    nameField.focus();
  });
  const planner = one('[data-planner]');
  function dimensions(value) {
    const input = value.trim().replace(',', '.');
    if (!/^(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/.test(input)) return 0;
    const number = Math.round(Number(input) * 1000);
    return Number.isSafeInteger(number) && number > 0 ? number : 0;
  }
  function initPlanner() {
    const form = one('.plan-controls', planner);
    const inputs = [one('#room-length'), one('#room-width')];
    const result = one('.plan-result', planner);
    const alternative = one('[data-alternative]', planner);
    const sizeOnly = one('[data-size-only]', planner);
    let prepared = '';
    function chosen() { return Number(one('input[name="feet"]:checked', planner).value); }
    function measured() { return inputs.map(field => dimensions(field.value)).sort((a, b) => b - a); }
    function minimum() {
      const s = sizes[chosen()];
      one('[data-field-size]').textContent = roomText(...s.field);
      one('[data-min-size]').textContent = roomText(s.long, s.short);
      return s;
    }
    function draw(used = false) {
      const s = minimum();
      const dims = used ? measured() : [s.long, s.short];
      const scale = Math.min(325 / Math.max(dims[0],s.field[0]*1.18),185 / Math.max(dims[1],s.field[1]*1.23));
      const width = dims[0] * scale, height = dims[1] * scale;
      const x = 200 - width / 2, y = 125 - height / 2;
      const outline = one('#room-outline');
      Object.entries({x,y,width,height}).forEach(([k,v])=>outline.setAttribute(k, String(v)));
      outline.setAttribute('stroke', used && (dims[0] < s.long || dims[1] < s.short) ? '#ffba83' : '#d7c79d');
      one('#room-axis').setAttribute('d', 'M200 '+y+'v'+height+'M'+x+' 125h'+width);
      const fw=s.field[0]*scale, fh=s.field[1]*scale;
      one('#plan-table').setAttribute('transform', 'translate('+(200-fw/2)+' '+(125-fh/2)+') scale('+(fw/100)+' '+(fh/50)+')');
      one('.room-plan').setAttribute('aria-label', 'План бильярдной. '+(used?'Ваша комната ':'Минимум для игры ')+roomText(...dims)+'. Игровое поле '+roomText(...s.field)+'.');
    }
    function invalidate() {
      if (prepared) clearConfig();
      prepared = ''; result.hidden = true; alternative.hidden = true; sizeOnly.hidden = false;
      one('#dim-error').textContent = '';
      inputs.forEach(field => field.removeAttribute('aria-invalid'));
      draw();
    }
    function evaluate() {
      const firstInvalid = inputs.find(field=>!dimensions(field.value));
      if (firstInvalid) {
        result.hidden=true; prepared='';
        one('#dim-error').textContent='Введите обе стороны в метрах. Например, 6,44 и 5,02.';
        inputs.forEach(field=>field.setAttribute('aria-invalid',String(!dimensions(field.value))));
        firstInvalid.focus();return;
      }
      const feet = chosen(), s = sizes[feet], dims = measured();
      const gaps = [dims[0]-s.long,dims[1]-s.short]; const fits = gaps.every(n=>n>=0);
      const verdict = fits ? 'Стол помещается' : 'Для полного замаха тесно';
      const labels=['по длинной стороне','по короткой стороне'];
      const detail = fits
        ? (gaps.every(n=>n===0) ? 'Обе стороны точно совпадают с минимумом фабрики.' : 'Запас '+labels[0]+' '+metre(gaps[0])+' м, '+labels[1]+' '+metre(gaps[1])+' м.')
        : 'Не хватает '+gaps.map((n,i)=>n<0?metre(-n)+' м '+labels[i]:'').filter(Boolean).join(' и ')+'.';
      prepared='«Император», '+feet+' футов — '+money(s.price)+'\nИгровое поле '+roomText(...s.field)+'\nКомната '+roomText(...dims)+' · минимум '+roomText(s.long,s.short)+'\n'+verdict+'. '+detail;
      one('[data-verdict]', planner).textContent=verdict;
      one('[data-clearance]', planner).textContent=detail;
      alternative.hidden=!(feet===12&&!fits&&dims[0]>=sizes[10].long&&dims[1]>=sizes[10].short);
      result.hidden=false;sizeOnly.hidden=true;draw(true);
      result.scrollIntoView({block:'nearest'});
    }
    form.addEventListener('input',invalidate);
    form.addEventListener('submit',event=>{event.preventDefault();evaluate()});
    one('[data-reset-planner]').addEventListener('click',()=>{form.reset();invalidate();inputs[0].focus()});
    alternative.addEventListener('click',()=>{one('input[value="10"]',planner).checked=true;invalidate();evaluate();one('[data-transfer]').focus()});
    one('[data-transfer]').addEventListener('click',()=>{if(prepared)transfer(prepared)});
    sizeOnly.addEventListener('click',()=>{
      const feet=chosen(), s=sizes[feet];
      prepared='«Император», '+feet+' футов — '+money(s.price)+'\nИгровое поле '+roomText(...s.field)+' · минимум комнаты '+roomText(s.long,s.short)+'\nРазмеры помещения предстоит уточнить.';
      transfer(prepared);
    });
    draw();
  }
  if(planner)initPlanner();
  const offers = one('[data-offer-list]');
  if (offers) {
    const update=()=> {
      const selected=one('input[type=radio]:checked',offers);
      const target=one('[data-offer-price]');if(target&&selected)target.textContent=selected.dataset.price;
    };
    offers.addEventListener('change',()=>{clearConfig();update()});
    one('[data-transfer-offer]').addEventListener('click',()=>{
      const selected=one('input[type=radio]:checked',offers);
      if(selected)transfer(selected.value+' — '+selected.dataset.price);
    });
  }
  all('[data-simple-request]').forEach(b=>b.addEventListener('click',()=>transfer(b.dataset.simpleRequest)));
  const gallery=one('[data-gallery]');
  if(gallery){
    const items=all('.gallery-index a',gallery);
    let index=0;
    function paint(){
      const item=items[index];
      one('[data-gallery-count]',gallery).textContent='Работа '+(index+1)+' из '+items.length;
      one('[data-gallery-title]',gallery).textContent=item.textContent.trim();
      one('[data-gallery-original]',gallery).href=item.href;
      all('.room-symbol',gallery).forEach((node,i)=>node.style.setProperty('opacity',i===index%3?'1':'0'));
    }
    all('[data-step]',gallery).forEach(b=>b.addEventListener('click',()=>{index=(index+Number(b.dataset.step)+items.length)%items.length;paint()}));
    paint();
  }
  function initCatalogue(){
    const section=one('[data-catalogue]');
    const allProducts=window.PyramidCatalogue;
    if(!section||!allProducts)return;
    const ids=section.dataset.ids==='*'?null:new Set(section.dataset.ids.split(' '));
    const priority=section.dataset.feature==='true';
    const list=allProducts.filter(row=>!ids||ids.has(row[0]));
    const featured=['5185','12187','8015','7984'];
    if(priority)list.sort((a,b)=>(featured.includes(a[0])?featured.indexOf(a[0]):20)-(featured.includes(b[0])?featured.indexOf(b[0]):20));
    const pageSize=24;
    const field=one('#catalog-search',section);
    const historyUrl=()=>new URL(location.href);
    const simplify = s => String(s).toLowerCase().replaceAll('ё','е').trim();
    const arrowTemplate=one('template',section);
    const target=one('.product-list',section);
    let pageNumber=1;
    const numItems=count=>new Intl.NumberFormat('ru-RU').format(count);
    function render(){
      const terms=simplify(field.value).split(/\s+/).filter(Boolean);
      const matches=terms.length?list.filter(row=>terms.every(term=>simplify(row[1]+' '+row[0]).includes(term))):list;
      const max=Math.max(1,Math.ceil(matches.length/pageSize));pageNumber=Math.min(Math.max(1,pageNumber),max);
      const visible=matches.slice((pageNumber-1)*pageSize,pageNumber*pageSize);
      const fragment=document.createDocumentFragment();
      visible.forEach(([id,title,price])=>{
        const row=document.createElement('div');row.className='product-row';
        const anchor=document.createElement('a');anchor.href=(document.body.dataset.root||'./')+'products/'+(id==='5185'?'imperator':id)+'/index.html';
        const name=document.createElement('span');name.className='product-title';name.textContent=title;
        anchor.append(name,arrowTemplate.content.cloneNode(true));
        const amount=document.createElement('span');amount.className='price';amount.textContent=price;
        row.append(anchor,amount);fragment.append(row);
      });
      target.replaceChildren(fragment);
      one('[data-found]',section).textContent=matches.length?'Позиций в списке — '+numItems(matches.length):'Совпадений нет. Попробуйте другое название.';
      one('[data-page]',section).textContent=pageNumber+' из '+max;
      one('[data-prev]',section).disabled=pageNumber===1;
      one('[data-next]',section).disabled=pageNumber===max;
      one('.pager',section).hidden=max<2;
      one('[data-clear-search]',section).hidden=!field.value;
    }
    function remember(){
      // Catalogue filters contain product names only. The consultation form is independent.
      const url=historyUrl();
      if(field.value)url.searchParams.set('q',field.value);else url.searchParams.delete('q');
      if(pageNumber>1)url.searchParams.set('page',String(pageNumber));else url.searchParams.delete('page');
      try{history.replaceState(null,'',url)}catch{}
    }
    function restore(){
      const params=historyUrl().searchParams;
      field.value=params.get('q')||'';
      pageNumber=parseInt(params.get('page')||'1',10)||1;render();
    }
    field.addEventListener('input',()=>{pageNumber=1;render();remember()});
    one('[data-clear-search]',section).addEventListener('click',()=>{field.value='';pageNumber=1;render();remember();field.focus()});
    for(const [attr,step] of [['data-prev',-1],['data-next',1]]){
      one('['+attr+']',section).addEventListener('click',()=>{pageNumber+=step;render();remember();one('[data-found]',section).focus()});
    }
    window.addEventListener('popstate',restore);restore();
  }
  initCatalogue();
  const canvas=one('.hero-canvas'), hero=one('.hero'), stand=one('.layer-stage');
  const stick=one('.magnet');
  let raf=0;
  const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
  function set(node,values){Object.entries(values).forEach(([key,value])=>node.style.setProperty(key,value))}
  function scrollArt(){
    raf=0;
    if(reduced.matches)return;
    if(canvas){
      const h=hero.getBoundingClientRect();
      if(h.bottom>=-15&&h.top<innerHeight)set(canvas,{'--scroll-shift':clamp((-h.top+75)/h.height,0,1)*33+'px'});
    }
    if(stand){
      const r=stand.getBoundingClientRect();
      if(r.top<innerHeight+80 && r.bottom>-80){
        const progress=clamp((innerHeight-r.top)/(innerHeight*.64+r.height*.20),0,1);
        const distance=1-progress;
        set(stand,{'--cloth-x':(-55*distance)+'px','--cloth-y':(-33*distance+32*progress)+'px','--slate-x':(48*distance)+'px','--slate-y':(4*progress)+'px','--base-x':(-19*distance)+'px','--base-y':(34*distance-29*progress)+'px'});
      }
    }
  }
  function queueScroll(){if(!raf)raf=requestAnimationFrame(scrollArt)}
  if(canvas||stand){window.addEventListener('scroll',queueScroll,{passive:true});window.addEventListener('resize',queueScroll,{passive:true});queueScroll();reduced.addEventListener('change',queueScroll)}
  function reactive(node,apply,reset) {
    if(!node)return;
    let frame=0,point=null;
    node.addEventListener('pointermove',event=>{
      if(reduced.matches||!fine.matches||event.pointerType==='touch')return;
      point=[event.clientX,event.clientY];
      if(!frame)frame=requestAnimationFrame(()=>{
        frame=0;if(!point)return;
        const b=node.getBoundingClientRect();
        apply(clamp((point[0]-b.left)/b.width,0,1)-.5,clamp((point[1]-b.top)/b.height,0,1)-.5);
      });
    });
    node.addEventListener('pointerleave',()=>{point=null;reset()});
  }
  if(canvas){
    const pose=(x,y)=>set(canvas,{'--hx':x*31+'px','--hy':y*17+'px','--hr':x*2.1+'deg','--lx':-x*16+'px','--ly':-y*5+'px','--lr':-x*1.9+'deg','--bx':x*20+'px','--by':y*11+'px'});
    reactive(hero,pose,()=>pose(0,0));
  }
  reactive(stick,(x,y)=>set(stick,{'--mx':x*7+'px','--my':y*6+'px'}),()=>set(stick,{'--mx':'0px','--my':'0px'}));
  all('.group-card,.gallery-art,.product-image,.feature-split .picture').forEach(node=>{
    const pose=(x,y)=>set(node,{'--dx':x*9+'px','--dy':y*7+'px'});
    reactive(node,pose,()=>pose(0,0));
  });
  all('.collection-row,.article-grid article').forEach(node=>{
    reactive(node,x=>node.style.setProperty('--shine',50+95*x+'%'),()=>node.style.removeProperty('--shine'));
  });
  const contacts=one('.contacts');
  reactive(contacts,(x,y)=>set(contacts,{'--contact-x':50+58*x+'%','--contact-y':50+55*y+'%'}),()=>set(contacts,{'--contact-x':'22%','--contact-y':'54%'}));
  const stage=one('.plan-stage');
  if(stage)reactive(stage,(x,y)=>set(stage,{'--glow-x':50+65*x+'%','--glow-y':48+65*y+'%'}),()=>set(stage,{'--glow-x':'48%','--glow-y':'38%'}));
})();
