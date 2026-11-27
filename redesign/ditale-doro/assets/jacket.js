/* Project the atelier's existing vector pattern onto a shaped bust, two sleeve tubes and folded lapels.
   Coordinates follow the drawing sheet (x across, y down, z towards the visitor). */
(() => {
  'use strict';
  const stage = document.querySelector('[data-hero-plate]');
  if (!stage) return;
  const svg = stage.querySelector('.garment-plate');
  const garment = svg.querySelector('.garment-turn');
  const defs = svg.querySelector('defs');
  const ns = svg.namespaceURI;
  function element(name, attributes, parent) {
    const item = document.createElementNS(ns,name);
    for (const [key,value] of Object.entries(attributes)) item.setAttribute(key,value);
    parent.append(item);
    return item;
  }

  // y, horizontal radius, depth radius. The cut narrows at the waist and widens at the skirt.
  const bust = [[53,28,27],[64,48,35],[79,76,50],[94,89,57],[123,93,61],
    [164,86,60],[206,79,51],[230,77,47],[270,85,48],[304,89,46],[347,96,43],[359,86,39]];
  const arm = [[86,5,10],[94,14,21],[108,21,27],[135,22,27],[168,19,24],
    [209,17,23],[250,16,22],[292,14,20],[326,12.6,18]];
  function section(rows,y) {
    if (y<=rows[0][0]) return rows[0].slice(1);
    for (let i=1; i<rows.length; i++) {
      const a=rows[i-1], b=rows[i];
      if (y<=b[0]) {
        const t=(y-a[0])/(b[0]-a[0]);
        return [a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
      }
    }
    return rows[rows.length-1].slice(1);
  }
  const clamp = (v,lo=0,hi=1) => Math.max(lo,Math.min(hi,v));
  const armX = (side,y) => 242 + side*(79 + Math.max(0,y-85)*.237);
  const armZ = y => -4 + clamp((y-92)/235)*18;
  const halfEllipse = t => Math.sqrt(Math.max(.012,1-t*t));
  function model(x,y,type) {
    const [width,depth]=section(bust,y);
    const front=depth*halfEllipse((x-242)/width);
    let z=front, dx=0, dy=0, dz=0;
    if (type==='hook') z=-5;
    if (type==='left-arm' || type==='right-arm') {
      const side=type==='left-arm' ? -1 : 1;
      const [rx,rz]=section(arm,y);
      z=armZ(y)+rz*halfEllipse((x-armX(side,y))/rx);
    }
    if (type==='shirt') z=front-5;
    if (type==='tie') z=front;
    if (type==='canvas') z=front-.8;
    if (type==='shell' || type==='right-lapel' || (type==='baste' && x>257)) {
      const lift=clamp((329-x)/84)*clamp((y-58)/87);
      dx=lift*76; dy=-lift*10; dz=lift*23; z+=1.5;
    }
    if (type==='left-lapel' || type==='right-lapel') {
      const sign=type==='right-lapel' ? 1 : -1;
      const rollLine=242+sign*(36-clamp((y-65)/147)*34);
      const roll=Math.exp(-Math.pow((x-rollLine)/13,2));
      z+=6+roll*13;
      if (sign>0) {dx+=5*roll; dz+=9*roll;}
    }
    if (type==='baste') z+=3;
    return [x,y,z,dx,dy,dz];
  }

  const probe=element('path',{},defs);
  const originals=new Map();
  // A native length measurement preserves the existing quadratic and cubic sewing outlines.
  // Sampling each subpath separately keeps move commands from producing connecting strokes.
  function readOutline(d) {
    if (originals.has(d)) return originals.get(d);
    const paths=[];
    let last={x:0,y:0};
    for (const part of d.match(/[Mm][^Mm]*/g) || []) {
      let normalized=part;
      if (part[0]==='m') {
        const pair=part.slice(1).match(/^\s*([-+]?(?:\d*\.)?\d+)\s*,?\s*([-+]?(?:\d*\.)?\d+)/);
        const rest=part.slice(1+pair[0].length).trimStart();
        const command=rest && /^[+\d.-]/.test(rest) ? 'l' : '';
        normalized='M'+(last.x+Number(pair[1]))+' '+(last.y+Number(pair[2]))+command+rest;
      }
      probe.setAttribute('d',normalized);
      const length=probe.getTotalLength();
      const count=Math.max(1,Math.ceil(length/3.4));
      const points=[];
      for (let j=0;j<=count;j++) {
        const at=probe.getPointAtLength(length*j/count);
        points.push([at.x,at.y]);
      }
      last=probe.getPointAtLength(length);
      paths.push({points,closed:/[zZ]\s*$/.test(part)});
    }
    originals.set(d,paths);
    return paths;
  }
  const records=[];
  function add(target,subpaths,map) {
    records.push({target,paths:subpaths.map(({points,closed})=>({
      points:points.map(point=>map(...point)),closed
    }))});
  }
  function materialType(node) {
    if (node.closest('.hero-sleeve-left')) return 'left-arm';
    if (node.closest('.hero-sleeve-right')) return 'right-arm';
    if (node.closest('.hero-lapel-left')) return 'left-lapel';
    if (node.closest('.hero-lapel-right')) return 'right-lapel';
    if (node.closest('.hero-shell')) return 'shell';
    if (node.closest('.hero-basting')) return 'baste';
    if (node.closest('.garment-turn > g:first-child')) return 'hook';
    const fill=node.getAttribute('fill')||'';
    if (/shirt/.test(fill)) return 'shirt';
    if (/tie/.test(fill)) return 'tie';
    if (/canvas/.test(fill)) return 'canvas';
    return 'body';
  }

  // Each visible panel has its own bias and grain. Its checks bend around the corresponding volume.
  let panelId=0;
  function fabricGrid(node,outline,box,type) {
    const id='jacket-grain-'+(++panelId);
    const mask=element('clipPath',{id,clipPathUnits:'userSpaceOnUse'},defs);
    const maskShape=element('path',{},mask);
    add(maskShape,outline,(x,y)=>model(x,y,type));
    const grid=element('g',{'clip-path':'url(#'+id+')',fill:'none','aria-hidden':'true'},node.parentNode);
    node.after(grid);
    node.setAttribute('opacity','.22'); // fine original twill under the projected overcheck
    const slant=({'left-arm':-.20,'right-arm':.20,'left-lapel':.39,'right-lapel':-.35})[type]||.036;
    const x0=box.x-2, x1=box.x+box.width+2, y0=box.y-2, y1=box.y+box.height+2;
    const midX=(x0+x1)/2, midY=(y0+y1)/2;
    const margin=8+Math.max(x1-x0,y1-y0)*Math.abs(slant)/2;
    function lines(offset) {
      const paths=[];
      for(let x=Math.floor((x0-margin)/20)*20+offset; x<=x1+margin; x+=20) {
        const pts=[];
        for (let y=y0;y<y1;y+=8) pts.push([x+slant*(y-midY),y]);
        pts.push([x+slant*(y1-midY),y1]);
        paths.push({points:pts});
      }
      for(let y=Math.floor((y0-margin)/20)*20+offset; y<=y1+margin; y+=20) {
        const pts=[];
        for(let x=x0;x<x1;x+=7) pts.push([x,y-slant*(x-midX)]);
        pts.push([x1,y-slant*(x1-midX)]);
        paths.push({points:pts});
      }
      return paths;
    }
    for(const [offset,color,weight,opacity] of [[1,'#25342a',1.65,.80],[4,'#aeb29d',.65,.70],[10,'#c19a69',.95,.88]]) {
      const ink=element('path',{stroke:color,'stroke-width':weight,opacity},grid);
      add(ink,lines(offset),(x,y)=>model(x,y,type));
    }
  }

  const parts=Array.from(garment.querySelectorAll('path,use,circle'));
  for (const item of parts) {
    const type=materialType(item);
    const ref=item.tagName.toLowerCase()==='use' ? svg.querySelector(item.getAttribute('href')) : item;
    const circle=ref.tagName.toLowerCase()==='circle';
    let shapes, box;
    if (circle) {
      const centerX=ref.cx.baseVal.value, centerY=ref.cy.baseVal.value, radius=ref.r.baseVal.value;
      shapes=[{closed:true,points:Array.from({length:18},(_,i)=>[
        centerX+radius*Math.cos(i*Math.PI/9), centerY+radius*Math.sin(i*Math.PI/9)])}];
    } else {
      shapes=readOutline(ref.getAttribute('d'));
      if (item.getAttribute('fill')==='url(#cloth-check)') box=ref.getBBox();
    }
    let target=item;
    if (item!==ref || circle) {
      target=document.createElementNS(ns,'path');
      for (const attr of item.attributes) {
        if (!['href','cx','cy','r'].includes(attr.name)) target.setAttribute(attr.name,attr.value);
      }
      item.replaceWith(target);
    }
    add(target,shapes,(x,y)=>model(x,y,type));
    if (box) fabricGrid(target,shapes,box,type);
  }
  probe.remove();

  // Side panels are actual elliptical sections around the back, chest and sleeve underseams.
  const shellWalls=element('g',{'stroke-linejoin':'round'},garment);
  garment.prepend(shellWalls);
  const rigid=(x,y,z)=>[x,y,z,0,0,0];
  const TAU=Math.PI*2;
  function ringPoint(rows,side,angle,y) {
    const [rx,rz]=section(rows,y);
    const x=(side ? armX(side,y) : 242)+rx*Math.cos(angle);
    return [x,y,(side?armZ(y):0)+rz*Math.sin(angle)];
  }
  function roundBack(rows,side) {
    const slices=28;
    for(let j=0;j<slices;j++) {
      const a=TAU*j/slices,b=TAU*(j+1)/slices;
      const light=clamp(.46-.39*Math.cos((a+b)/2)+.13*Math.sin((a+b)/2));
      const col=[39+35*light,47+35*light,41+27*light].map(Math.round);
      const color='rgb('+col.join(',')+')';
      const outline=[...rows.map(([y])=>ringPoint(rows,side,a,y)),...rows.slice().reverse().map(([y])=>ringPoint(rows,side,b,y))];
      const slice=element('path',{fill:color,stroke:color,'stroke-width':.7},shellWalls);
      add(slice,[{points:outline,closed:true}],rigid);
      if (j%2===0) {
        const seam=element('path',{fill:'none',stroke:'#a99a77','stroke-width':.7,opacity:.65},shellWalls);
        add(seam,[{points:rows.map(([y])=>ringPoint(rows,side,a,y))}],rigid);
      }
    }
    const cross=element('path',{fill:'none',stroke:'#b9a382','stroke-width':.65,opacity:.68},shellWalls);
    const stripes=[];
    for(let y=rows[0][0]+14;y<rows[rows.length-1][0];y+=20) {
      stripes.push({closed:true,points:Array.from({length:slices},(_,j)=>ringPoint(rows,side,TAU*j/slices,y))});
    }
    add(cross,stripes,rigid);
  }
  roundBack(arm,-1);roundBack(arm,1);roundBack(bust,0);

  // The cuff openings reveal the hollow sleeve and a narrow lining at the hem.
  for(const side of [-1,1]) {
    const y=326, cx=armX(side,y), cz=armZ(y);
    function cuff(rx,rz,dy,color,stroke) {
      const shape=element('path',{fill:color,stroke,'stroke-width':.9},garment);
      const points=Array.from({length:32},(_,i)=>{
        const angle=TAU*i/32;
        return [cx+rx*Math.cos(angle),y+dy-side*3.7*Math.cos(angle)-3.2*Math.sin(angle),cz+rz*Math.sin(angle)];
      });
      add(shape,[{points,closed:true}],rigid);
    }
    cuff(12.8,18,0,'#596052','#303b31');
    cuff(9.9,13.8,.2,'#262c26','#a2987d');
  }
  const leaders=svg.querySelector('.guide-labels');
  const [markL,lineL,markR,lineR]=leaders.children;
  const leftAnchor=model(202,125,'left-lapel'), rightAnchor=model(291,258,'shell');
  const originalDesc=svg.querySelector('#drawing-desc');
  originalDesc.textContent='Объёмный однобортный пиджак. Клетка огибает рукава и грудь, лацкан отогнут. Под полочкой показана тканая бортовка, по краю кармана проходит ручная намётка.';
  svg.classList.add('is-volume');
  svg.dataset.projectedShapes=String(records.length);

  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let pointerX=0, pointerY=0, inside=true, pending=0, lastPose='';
  function paint() {
    pending=0;
    if (!inside) return;
    const rect=stage.getBoundingClientRect();
    const s=reduced.matches ? 0 : clamp(Math.max(0,scrollY)/Math.max(145,rect.height*.59));
    const yaw=-.49 + (reduced.matches?0:pointerX*.35) - s*.22;
    const pitch=-.065 + (reduced.matches?0:pointerY*.10) + s*.065;
    const opening=.10+.90*s;
    const key=[yaw,pitch,opening].map(n=>n.toFixed(4)).join(',');
    if (key===lastPose) return;
    lastPose=key;
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    function project(point) {
      const x=point[0]-242+point[3]*opening, y=point[1]-199+point[4]*opening, z=point[2]-13+point[5]*opening;
      const depth=-sy*x+cy*z;
      const scale=1+depth*.00046;
      return [242+(cy*x+sy*z)*scale,199+(y*cp+depth*sp)*scale];
    }
    for(const record of records) {
      let d='';
      for(const {points,closed} of record.paths) {
        let command='M';
        for(const point of points) {
          const [x,y]=project(point);
          d+=command+x.toFixed(1)+' '+y.toFixed(1);
          command='L';
        }
        if (closed) d+='Z';
      }
      record.target.setAttribute('d',d);
    }
    const [lx,ly]=project(leftAnchor),[rx,ry]=project(rightAnchor);
    markL.setAttribute('cx',lx);markL.setAttribute('cy',ly);
    markR.setAttribute('cx',rx);markR.setAttribute('cy',ry);
    lineL.setAttribute('d','M'+lx+' '+ly+' 146 150H55');
    lineR.setAttribute('d','M'+rx+' '+ry+' 351 233H455');
    svg.dataset.yaw=yaw.toFixed(4);svg.dataset.opening=opening.toFixed(4);
  }
  function schedule() { if (inside && !pending) pending=requestAnimationFrame(paint); }
  function move(event) {
    if (reduced.matches || (event.pointerType==='touch' && !event.buttons)) return;
    const box=stage.getBoundingClientRect();
    pointerX=clamp((event.clientX-box.left)/box.width*2-1,-1,1);
    pointerY=clamp((event.clientY-box.top)/box.height*2-1,-1,1);
    schedule();
  }
  function reset() {pointerX=pointerY=0;schedule();}
  stage.addEventListener('pointermove',move,{passive:true});
  stage.addEventListener('pointerdown',move,{passive:true});
  stage.addEventListener('pointerleave',reset);
  stage.addEventListener('pointercancel',reset);
  stage.addEventListener('pointerup',e=>{if(e.pointerType==='touch') reset();});
  const observer=new IntersectionObserver(([entry])=>{inside=entry.isIntersecting;schedule();},{rootMargin:'60px'});
  observer.observe(stage);
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  reduced.addEventListener('change',reset);
  paint();
})();
