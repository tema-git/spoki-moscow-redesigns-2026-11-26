(() => {
  'use strict';
  const hero = document.querySelector('.hero');
  const model = hero?.querySelector('.hero-canvas');
  const scene = document.querySelector('[data-build-scene]');
  if (!model || !scene) return;
  const track = scene.querySelector('.assembly-track');
  const stage = scene.querySelector('.layer-stage');
  const caption = scene.querySelector('[data-stage-caption]');
  const steps = Array.from(scene.querySelectorAll('.build-steps li'));
  const layers = ['foundation','slate','cloth','rails','game-balls'].map(id => stage.querySelector('#' + id));
  const clothMask = stage.querySelector('.cloth-mask');
  const fullCloth = clothMask.getAttribute('points');
  const roll = stage.querySelector('.felt-roll');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
  const phase = (p, from, to) => {
    const t = clamp((p - from) / (to - from));
    return t * t * (3 - 2 * t);
  };
  const numbers = s => s.trim().split(/\s+/).map(Number);
  const baseYaw = .37, basePitch = .39;
  function camera(yaw, pitch) {
    return {cy:Math.cos(yaw), sy:Math.sin(yaw), cp:Math.cos(pitch), sp:Math.sin(pitch)};
  }
  const originalCamera = camera(baseYaw, basePitch);

  // u and v span the tabletop. z measures depth below the playing surface.
  // Preserve the engraved artwork at its original view and rotate each physical plane independently.
  function point(u, v, z = 0) {
    return {x:208 + 710*u - 152*v + 4*u*v, y:218 + 67*u + 127*v + 31*u*v + z,
            long:(u-.5)*753, depth:(v-.5)*345, z};
  }
  function project(p, c) {
    const base = originalCamera;
    return [
      p.x + p.long*(c.cy-base.cy) - p.depth*(c.sy-base.sy),
      p.y + p.long*(c.sy*c.sp-base.sy*base.sp) + p.depth*(c.cy*c.sp-base.cy*base.sp) + p.z*(c.cp-base.cp),
    ];
  }
  function plane(element, a, b, c) {
    const ux=b.x-a.x, uy=b.y-a.y, vx=c.x-a.x, vy=c.y-a.y;
    const det=ux*vy-vx*uy;
    return view => {
      const [x,y]=project(a,view), [bx,by]=project(b,view), [cx,cy]=project(c,view);
      const m11=((bx-x)*vy-(cx-x)*uy)/det, m12=((by-y)*vy-(cy-y)*uy)/det;
      const m21=(ux*(cx-x)-vx*(bx-x))/det, m22=(ux*(cy-y)-vx*(by-y))/det;
      const matrix=[m11,m12,m21,m22,x-m11*a.x-m21*a.y,y-m12*a.x-m22*a.y];
      element.setAttribute('transform','matrix('+matrix.map(n=>n.toFixed(5)).join(' ')+')');
    };
  }
  const surfaces = Array.from(model.querySelectorAll('[data-model-deck]'),
    element => plane(element,point(0,0),point(1,0),point(0,1)));
  for (const element of model.querySelectorAll('[data-model-side]')) {
    const [u,v,endU,endV]=numbers(element.dataset.modelSide);
    surfaces.push(plane(element,point(u,v),point(endU,endV),point(u,v,35)));
  }
  const roundParts = Array.from(model.querySelectorAll('[data-model-leg],[data-model-ball]'), element => {
    const isLeg=element.hasAttribute('data-model-leg');
    const [u,v]=numbers(isLeg ? element.dataset.modelLeg : element.dataset.modelBall);
    return {element,isLeg,anchor:point(u,v,isLeg ? 20 : 0)};
  });
  let targetX=0, targetY=0, pointerId=null, touchStart=0, touchAngle=0, frame=0, activeStep=-1;
  function drawTable(progress) {
    const yaw=baseYaw+targetX*.235+progress*.115;
    const pitch=basePitch+targetY*.10+progress*.085;
    const view=camera(yaw,pitch);
    for (const draw of surfaces) draw(view);
    for (const {element,isLeg,anchor} of roundParts) {
      const [x,y]=project(anchor,view);
      const scaleY=isLeg ? view.cp/originalCamera.cp : 1;
      element.setAttribute('transform','matrix(1 0 0 '+scaleY.toFixed(5)+' '+(x-anchor.x).toFixed(2)+' '+(y-anchor.y*scaleY).toFixed(2)+')');
    }
    model.style.setProperty('--hx',targetX*5+'px');
    model.style.setProperty('--hy',targetY*3+'px');
    model.style.setProperty('--scroll-shift',progress*12+'px');
    model.style.setProperty('--lx',-targetX*13+'px');
    model.style.setProperty('--ly',-targetY*5-progress*6+'px');
    model.style.setProperty('--lr',-targetX*1.2+'deg');
    model.dataset.yaw=yaw.toFixed(4);
    model.dataset.pitch=pitch.toFixed(4);
    if (!reduced.matches) model.setAttribute('aria-valuenow',String(Math.round(targetX*14)));
  }
  function move(layer, x, y) {
    layer.style.transform='translate('+x.toFixed(3)+'px,'+y.toFixed(3)+'px)';
  }
  function drawAssembly(p) {
    const base=phase(p,0,.27), slate=phase(p,.20,.55), cloth=phase(p,.44,.78);
    const rails=phase(p,.68,.91), balls=phase(p,.84,.99);
    move(layers[0],12*base,-38*base);
    move(layers[1],-35*slate,3*slate);
    // A small initial slide makes the separated cloth visible as the section enters.
    move(layers[2],10*base+12*cloth,4*base+42*cloth);
    const edge=.34+.7*cloth;
    const clothPoint=(u,v)=>[(140+402*u-95*v).toFixed(2),(150+66*u+80*v).toFixed(2)];
    clothMask.setAttribute('points',[clothPoint(-.08,-.1),clothPoint(edge,-.1),clothPoint(edge,1.1),clothPoint(-.08,1.1)].join(' '));
    const [x1,y1]=clothPoint(edge,.04),[x2,y2]=clothPoint(edge,.96);
    roll.setAttribute('x1',x1);roll.setAttribute('y1',y1);roll.setAttribute('x2',x2);roll.setAttribute('y2',y2);
    roll.setAttribute('opacity',(1-phase(cloth,.84,1)).toFixed(3));
    move(layers[3],-14*rails,90*rails);
    move(layers[4],-14*balls,93*balls);
    layers[4].style.opacity=String(.22+.78*balls);
    const index=p<.24 ? 0 : p<.51 ? 1 : p<.76 ? 2 : 3;
    if (index!==activeStep) {
      activeStep=index;
      steps.forEach((step,i)=>step.toggleAttribute('data-current',i===index));
      caption.textContent=steps[index].querySelector('strong').textContent;
    }
    stage.dataset.progress=p.toFixed(4);
    stage.dataset.phase=String(index+1);
  }
  function render() {
    frame=0;
    if (reduced.matches) return;
    const box=hero.getBoundingClientRect();
    if (box.bottom>=0 && box.top<=innerHeight) drawTable(clamp((hero.offsetTop-box.top)/box.height));
    const area=track.getBoundingClientRect();
    if (area.top<innerHeight+90 && area.bottom>-90) {
      const stickyTop=parseFloat(getComputedStyle(stage).top)||0;
      const start=innerHeight*.98;
      const end=stickyTop-Math.max(0,area.height-stage.offsetHeight)+24;
      drawAssembly(clamp((start-area.top)/Math.max(1,start-end)));
    }
  }
  function queue() { if (!frame) frame=requestAnimationFrame(render); }
  hero.addEventListener('pointermove',event=>{
    if (reduced.matches) return;
    if (event.pointerId===pointerId) {
      targetX=clamp(touchAngle+(event.clientX-touchStart)/Math.max(85,model.clientWidth*.38),-1,1);
    } else if (event.pointerType!=='touch' && fine.matches) {
      const box=model.getBoundingClientRect();
      targetX=clamp(2*(event.clientX-box.left)/box.width-1,-1,1);
      targetY=clamp(2*(event.clientY-box.top)/box.height-1,-1,1);
    } else return;
    queue();
  });
  hero.addEventListener('pointerleave',event=>{
    if (event.pointerType!=='touch' && pointerId===null) { targetX=0;targetY=0;queue(); }
  });
  model.addEventListener('pointerdown',event=>{
    if (reduced.matches || event.pointerType!=='touch' || !event.isPrimary) return;
    pointerId=event.pointerId;touchStart=event.clientX;touchAngle=targetX;
    model.setPointerCapture(pointerId);
  });
  function release(event) { if(event.pointerId===pointerId) pointerId=null; }
  model.addEventListener('pointerup',release);
  model.addEventListener('pointercancel',release);
  model.addEventListener('lostpointercapture',release);
  model.addEventListener('keydown',event=>{
    if (reduced.matches) return;
    const delta={ArrowLeft:-.25,ArrowDown:-.25,ArrowRight:.25,ArrowUp:.25};
    if (event.key in delta) targetX=clamp(targetX+delta[event.key],-1,1);
    else if (event.key==='Home') targetX=-1;
    else if (event.key==='End') targetX=1;
    else return;
    event.preventDefault();queue();
  });
  function motionMode() {
    targetX=0;targetY=0;pointerId=null;
    scene.classList.toggle('build-motion',!reduced.matches);
    if (reduced.matches) {
      model.setAttribute('role','img');model.setAttribute('aria-label','Объёмный бильярдный стол «Император» со светильниками и шарами');
      for(const attr of ['tabindex','aria-valuemin','aria-valuemax','aria-valuenow']) model.removeAttribute(attr);
      drawTable(0);
      for (const g of layers) {g.style.removeProperty('transform');g.style.removeProperty('opacity');}
      clothMask.setAttribute('points',fullCloth);roll.setAttribute('opacity','0');
      activeStep=-1;
      steps.forEach(step=>step.removeAttribute('data-current'));
      caption.textContent='«Император» в разрезе';
      stage.dataset.phase='static';stage.removeAttribute('data-progress');
    } else {
      model.tabIndex=0;model.setAttribute('role','slider');model.setAttribute('aria-label','Ракурс бильярдного стола «Император»');
      model.setAttribute('aria-valuemin','-14');model.setAttribute('aria-valuemax','14');model.setAttribute('aria-valuenow','0');
      queue();
    }
  }
  window.addEventListener('scroll',queue,{passive:true});
  window.addEventListener('resize',queue,{passive:true});
  reduced.addEventListener('change',motionMode);
  motionMode();
})();
