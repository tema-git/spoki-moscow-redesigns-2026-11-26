/* The carved face, sides, stone shelf and firebox share one orthographic camera. */
(() => {
  'use strict';
  const radians = angle => angle * Math.PI / 180;
  const range = (p, from, to) => {
    const n = Math.max(0, Math.min(1, (p-from)/(to-from)));
    return n*n*(3-2*n);
  };
  function makeRenderer(svg) {
    if (!svg) return null;
    const parts = [...svg.querySelectorAll('[data-part]')].map(group => ({
      name:group.dataset.part,
      group,
      polygons:[...group.querySelectorAll('[data-world]')].map(el => ({
        el, points:el.dataset.world.split(' ').map(s=>s.split(',').map(Number))
      })),
      planes:[...group.querySelectorAll('[data-plane-z]')].map(el=>({el,z:Number(el.dataset.planeZ)}))
    }));
    let last = '';
    return (yaw, pitch, progress, study) => {
      const state = [yaw,pitch,progress].map(n=>n.toFixed(4)).join(',');
      if (state===last) return;
      last = state;
      const cy=Math.cos(radians(yaw)), sy=Math.sin(radians(yaw));
      const cp=Math.cos(radians(pitch)), sp=Math.sin(radians(pitch));
      const u = (x,z) => 300+(x-300)*cy+z*sy;
      const v = (x,y,z) => 217+(y-228)*cp+(z*cy-(x-300)*sy)*sp;
      const closeSides = study ? 1-range(progress,.24,.72) : 0;
      const closeCrown = study ? 1-range(progress,.59,.94) : -progress*.17;
      const left = -46*closeSides;
      const shifts = {
        back:[0,study?-10*(1-range(progress,0,.32)):0,study?-24*(1-range(progress,0,.35)):0],
        logs:[0,0,0], fire:[0,0,0],
        base:[0,study?20*(1-range(progress,0,.35)):0,study?12*(1-range(progress,0,.35)):0],
        left:[left,4*closeSides,9*closeSides],right:[-left,4*closeSides,9*closeSides],
        trim:[0,-17*closeCrown,-5*closeCrown],crown:[0,-66*closeCrown,12*closeCrown]
      };
      for (const {name,group,polygons,planes} of parts) {
        const [dx,dy,dz]=shifts[name];
        // The offsets project as translations. The surface bases still depend on the camera.
        const tx=dx*cy+dz*sy, ty=dy*cp+(dz*cy-dx*sy)*sp;
        const offset='translate('+tx.toFixed(3)+' '+ty.toFixed(3)+')';
        group.setAttribute('transform',offset);
        if (name==='fire') group.style.opacity=study ? range(progress,.77,.98) : 1;
        for (const {el,points} of polygons) {
          el.setAttribute('points',points.map(([x,y,z])=>u(x,z).toFixed(2)+','+v(x,y,z).toFixed(2)).join(' '));
        }
        for (const {el,z} of planes) {
          el.setAttribute('transform','matrix('+[cy,-sy*sp,0,cp,u(0,z),v(0,0,z)].map(n=>n.toFixed(5)).join(' ')+')');
        }
      }
      svg.dataset.view=yaw.toFixed(2);
      svg.dataset.progress=progress.toFixed(4);
    };
  }
  const hero=makeRenderer(document.querySelector('[data-mantel="hero"]'));
  const study=makeRenderer(document.querySelector('[data-mantel="study"]'));
  const stops=[...document.querySelectorAll('.process-steps li')];
  window.VirtuMantel={
    hero(x,y,p,still) {
      if(hero) hero(still?-27:-27+x*25+p*14,still?15:15-y*9+p*7,still?0:p,false);
    },
    study(p,still) {
      if(!study) return;
      const t=still?1:p;
      study(still?-24:-33+10*range(t,.03,.90),still?16:19-5*range(t,.12,.94),t,true);
      const active = t<.31 ? 0 : (t<.72 ? 1 : 2);
      stops.forEach((step,i)=>{
        step.classList.toggle('current',!still && i===active);
        step.classList.toggle('complete',still || i<active);
        if(!still && i===active) step.setAttribute('aria-current','step');
        else step.removeAttribute('aria-current');
      });
    }
  };
})();
