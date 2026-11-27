'use strict';
(() => {
  const root=document.body.dataset.root;
  const {families,models}=window.equipmentSelection;
  const q=s=>document.querySelector(s);
  const arrow='<svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const choose=q('#choose'),out=q('#selection-result'),volume=q('#volume'),stages=q('#stage-choices'),blank=out.innerHTML;
  const brief=q('#brief'),request=q('#request-form'),success=q('#form-result');
  const params=new URLSearchParams(location.search);
  let previousAutofill='', originalBrief='';
  const readFamily=()=>choose.elements['product-choice'].value;
  const readStage=()=>choose.elements['stage'].value;
  function initial(){
    const family=readFamily();stages.replaceChildren();
    Object.entries(families[family][2]).forEach(([id,name],index)=>{
      const label=document.createElement('label'),input=document.createElement('input'),span=document.createElement('span');
      label.className='choice';input.type='radio';input.name='stage';input.value=id;input.checked=index===0;span.textContent=name;
      label.append(input,span);stages.append(label);
    });
    q('#unit').textContent=families[family][1];
    volume.placeholder=family==='loaves' ? 'Например, 1 200' : family==='zefir' ? 'Например, 70' : family==='sticks' ? 'Например, 100' : 'Например, 250';
  }
  function invalidate(){
    out.innerHTML=blank;
    if(previousAutofill && brief.value===previousAutofill){brief.value=originalBrief;previousAutofill='';originalBrief='';}
  }
  choose.addEventListener('change',event=>{if(event.target.name==='product-choice')initial();invalidate();});
  volume.addEventListener('input',()=>{volume.setCustomValidity('');invalidate();});
  choose.addEventListener('reset',event=>{
    event.preventDefault();
    choose.querySelector('[name="product-choice"][value="biscuits"]').checked=true;
    volume.value='';volume.setCustomValidity('');initial();invalidate();
    choose.querySelector('[name="product-choice"]:checked').focus({preventScroll:true});
  });
  function element(tag,text,cls=''){const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node;}
  function button(text,action,cls='btn solid'){
    const b=element('button',text,cls);b.type='button';b.insertAdjacentHTML('beforeend',arrow);b.addEventListener('click',action);return b;
  }
  function attach(text){
    success.hidden=true;request.hidden=false;
    if(brief.value!==previousAutofill)originalBrief=brief.value.trim();
    brief.value=originalBrief ? originalBrief+'\n'+text : text;
    previousAutofill=brief.value;
    request.scrollIntoView({block:'start'});brief.focus({preventScroll:true});
    if(brief.getBoundingClientRect().bottom>innerHeight-12)brief.scrollIntoView({block:'center'});
  }
  choose.addEventListener('submit',event=>{
    event.preventDefault();
    const family=readFamily(),stage=readStage(),amount=volume.valueAsNumber;
    if(!Number.isFinite(amount)||amount<=0){volume.setCustomValidity('Введите положительный выпуск в час.');volume.reportValidity();return;}
    if(family==='loaves' && !Number.isInteger(amount)){volume.setCustomValidity('Введите целое число заготовок в час.');volume.reportValidity();return;}
    const [label,unit,operations]=families[family],printing=amount.toLocaleString('ru-RU',{maximumFractionDigits:3});
    const briefBase=label+'. '+operations[stage]+'. Требуемый выпуск — '+printing+' '+unit+'.';
    const matches=models.filter(m=>m.family===family&&m.stage===stage&&amount>=m.min&&amount<=m.max).sort((a,b)=>a.max-b.max);
    const list=element('div','', 'result-list');out.replaceChildren(element('p',label+' · '+printing+' '+unit,'result-title'),list);
    if(matches.length){
      for(const m of matches){
        const card=element('article'),title=element('h3',m.name),rate=element('strong',m.capacity),note=element('p',m.note);
        const link=element('a','Характеристики','text-link');link.href=root+'equipment/'+m.id+'.html';link.insertAdjacentHTML('beforeend',arrow);
        const add=button('В запрос',()=>attach(briefBase+' Модель — '+m.name+'. '+m.capacity+'. Прошу уточнить исполнение и цену.'),'text-link pick-model');
        card.append(title,rate,note,link,add);list.append(card);
      }
      list.append(element('p','Ориентир для одной операции. Работу на вашем сырье и нужном режиме подтверждают при согласовании.','fine'));
    } else {
      list.append(element('h3','Нужен расчёт технолога'),element('p','Для этого режима в подборе нет подтверждённой модели. Параметры можно передать в технический запрос.'),button('В технический запрос',()=>attach(briefBase+' Нужен индивидуальный подбор.')));
    }
    out.focus({preventScroll:true});if(innerWidth<=630)out.scrollIntoView({block:'start'});
  });
  if(params.has('family') && Object.hasOwn(families,params.get('family'))) choose.querySelector('[value="'+params.get('family')+'"]').checked=true;
  initial();
  if(params.has('model')||params.has('price')){
    const source=document.createElement('script');source.src=root+'assets/inquiry-items.js';
    source.onload=()=>{
      const name=params.has('model')?window.inquiryItems.products[params.get('model')]:window.inquiryItems.prices[params.get('price')];
      if(typeof name==='string' && !brief.value){brief.value='Оборудование — '+name+'. Прошу уточнить комплектацию и стоимость.';previousAutofill=brief.value;if(location.hash==='#contacts')request.scrollIntoView({block:'start'});}
    };
    document.head.append(source);
  }
  for(const field of [q('#person'),brief]){
    field.addEventListener('input',()=>field.setCustomValidity(''));
  }
  request.addEventListener('submit',event=>{
    event.preventDefault();
    if(q('#person').value.trim().length<2){q('#person').setCustomValidity('Укажите имя из двух или более букв.');q('#person').reportValidity();return;}
    if(brief.value.trim().length<10){brief.setCustomValidity('Добавьте описание задачи, минимум 10 символов.');brief.reportValidity();return;}
    if(!request.reportValidity())return;
    q('.prepared').textContent=brief.value.trim();request.hidden=true;success.hidden=false;success.focus({preventScroll:true});success.scrollIntoView({block:'nearest'});
  });
  q('.new-request').addEventListener('click',()=>{
    request.reset();previousAutofill='';originalBrief='';q('.prepared').textContent='';success.hidden=true;request.hidden=false;q('#person').focus();
  });
})();
