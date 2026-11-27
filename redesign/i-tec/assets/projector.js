/* The front optics, chassis, cooling assembly and cover share one three-dimensional coordinate system. */
window.mountItecProjector = function mountItecProjector(canvas) {
  'use strict';
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const tau = 2 * Math.PI;
  const ring = Array.from({length: 72}, (_,i) => [Math.cos(i*tau/72), Math.sin(i*tau/72)]);
  function footprint(x0,x1,z0,z1,r) {
    const outline = [];
    for (const [x,z,angle] of [[x1-r,z1-r,0],[x0+r,z1-r,90],[x0+r,z0+r,180],[x1-r,z0+r,270]]) {
      for (let i=0;i<=6;i++) {
        const a=(angle+i*15)*Math.PI/180;
        outline.push([x+r*Math.cos(a),z+r*Math.sin(a)]);
      }
    }
    return outline;
  }
  const body = footprint(-2.62,2.62,-1.65,1.36,.19);
  const base = footprint(-2.55,2.55,-1.58,1.30,.19);
  const lid = footprint(-2.66,2.66,-1.68,1.40,.19);
  const topInset = footprint(-2.46,2.46,-1.48,1.20,.12);
  let last = '';
  return function draw(turn = 0, pitch = 0, progress = 0) {
    const rect=canvas.getBoundingClientRect();
    if (rect.width<1 || rect.height<1) return;
    const dpr=Math.min(window.devicePixelRatio || 1,2);
    const signature=[rect.width,rect.height,dpr,turn,pitch,progress].map(n=>n.toFixed(3)).join('/');
    if (last===signature) return;
    last=signature;
    const w=Math.round(rect.width*dpr), h=Math.round(rect.height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,rect.width,rect.height);
    const yaw=.60+turn*.34+progress*.095;
    const tilt=.40+pitch*.14+progress*.09;
    const cy=Math.cos(yaw),sy=Math.sin(yaw),ct=Math.cos(tilt),st=Math.sin(tilt);
    const opening=progress*progress*(3-2*progress);
    const lidY=1.33+.96*opening;
    const lensZ=2.06+.36*opening;
    // Keep the raised cover and the nearest lip of the lens inside the drawing, also on short screens.
    let minY=Infinity,maxY=-Infinity;
    function includeY(x,y,z){
      const v=(x*sy+z*cy)*st-y*ct;
      minY=Math.min(minY,v);maxY=Math.max(maxY,v);
    }
    for(const x of [-2.66,2.66])for(const z of [-1.68,1.4]){
      includeY(x,lidY+.14,z);includeY(x,-.14,z);
    }
    for(const [u,v] of ring)includeY(-.56+.8*u,.81+.8*v,lensZ);
    const scale=Math.min(rect.width/7.32,rect.height/4.35,rect.height*.84/(maxY-minY));
    const centerX=rect.width*.532;
    const centerY=Math.min(rect.height*.90-maxY*scale,Math.max(rect.height*.055-minY*scale,rect.height*.59));
    function proj([x,y,z]) {
      return [centerX+scale*(x*cy-z*sy),centerY+scale*((x*sy+z*cy)*st-y*ct)];
    }
    const trace=points=>{
      ctx.beginPath();
      points.forEach((point,i)=>{const [x,y]=proj(point);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
    };
    function face(points,fill,edge='',weight=.75) {
      trace(points);ctx.closePath();
      if(fill){ctx.fillStyle=fill;ctx.fill();}
      if(edge){ctx.strokeStyle=edge;ctx.lineWidth=weight;ctx.stroke();}
    }
    function line(points,color,weight=1) {
      trace(points);ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.stroke();
    }
    const grad=(a,b,stops)=>{
      const [x,y]=proj(a),[u,v]=proj(b);
      const g=ctx.createLinearGradient(x,y,u,v);stops.forEach(([n,c])=>g.addColorStop(n,c));return g;
    };
    const flat=(outline,y)=>outline.map(([x,z])=>[x,y,z]);
    function shell(outline,y0,y1,top,side,front,trim) {
      for(let i=0;i<outline.length;i++){
        const [x,z]=outline[i],[xx,zz]=outline[(i+1)%outline.length];
        const dx=xx-x,dz=zz-z, length=Math.hypot(dx,dz);
        if(length<.0001 || (dz*sy-dx*cy)<=0)continue;
        const points=[[x,y0,z],[xx,y0,zz],[xx,y1,zz],[x,y1,z]];
        const mix=Math.min(1,Math.abs(dx)/length);
        face(points,mix>.47?front:side);
      }
      face(flat(outline,y1),top,trim,.8);
    }
    const circleXY=(x,y,z,rx,ry=rx)=>ring.map(([u,v])=>[x+rx*u,y+ry*v,z]);
    const circleXZ=(x,y,z,r)=>ring.map(([u,v])=>[x+r*u,y,z+r*v]);
    const shine=ctx.createRadialGradient(centerX,centerY+scale*.86,0,centerX,centerY+scale*.86,scale*3.04);
    shine.addColorStop(0,'rgba(2,5,12,.70)');shine.addColorStop(.62,'rgba(4,7,12,.28)');shine.addColorStop(1,'rgba(3,7,15,0)');
    ctx.save();ctx.translate(centerX,centerY+scale*.64);ctx.scale(1,.21);ctx.translate(-centerX,-(centerY+scale*.86));
    ctx.fillStyle=shine;ctx.fillRect(centerX-scale*3.2,centerY-scale*2.5,scale*6.4,scale*6.5);ctx.restore();
    for(const x of [-2,2])for(const z of [-1.13,.93]){
      shell(footprint(x-.22,x+.22,z-.19,z+.19,.09),-.14,.19,'#4e5863','#232d3b','#323d4b','#697784');
    }
    shell(base,.11,.27,'#404d5e','#161e2a','#293442','#64737e');
    const shellSide=grad([2,.22,1.3],[2,1.34,-1.3],[[0,'#253141'],[.55,'#425062'],[1,'#78889a']]);
    const shellFront=grad([-2,1.5,1.4],[1.5,.17,1.4],[[0,'#b1bdc8'],[.16,'#8896a5'],[.56,'#556777'],[1,'#364553']]);
    shell(body,.23,1.32,'#273540',shellSide,shellFront,'#a4b1be');
    // The grille is inset in the right side, parallel to the cooling fins behind it.
    face([[2.624,.37,1.11],[2.624,.37,-1.38],[2.624,1.15,-1.38],[2.624,1.15,1.11]],'#17232e','#6e7d8a');
    for(let i=0;i<34;i++){
      const z=1.06-i*.071;
      face([[2.635,.41,z],[2.635,.41,z-.036],[2.635,1.10,z-.064],[2.635,1.10,z-.026]],'#121b26');
      line([[2.64,.41,z-.011],[2.64,1.10,z-.041]],'#82919f',Math.max(.6,scale*.012));
    }
    for(let i=0;i<11;i++){
      const y=.40+i*.068;
      line([[-2.36,y,1.365],[-1.58,y,1.365]],'#253442',Math.max(1,scale*.025));
      line([[-2.36,y+.018,1.368],[-1.58,y+.018,1.368]],'#a0abb7',.7);
    }
    for(const x of [-2.37,2.32])for(const y of [.35,1.2]){
      face(circleXY(x,y,1.372,.043),'#344353','#b0bfca',.65);
      line([[x-.021,y,1.373],[x+.021,y,1.373]],'#142131',.7);
    }
    const indicator=1.369;
    face([[1.12,.85,indicator],[2.12,.85,indicator],[2.12,.97,indicator],[1.12,.97,indicator]],'#202d38','#8899a8',.7);
    line([[1.24,.91,indicator],[1.52,.91,indicator]],'#97e4fe',2);
    line([[1.58,.91,indicator],[1.66,.91,indicator]],'#7493af',1.5);
    if(opening>.005){
      // Optical block, cable and the fins of its heat exchanger, visible as the lid rises.
      face(flat(topInset,1.326),'#1d2b36','#6c8090');
      shell(footprint(-1.51,-.12,-.88,.61,.065),1.33,1.60,'#859fb4','#394e60','#566e82','#9ab1c0');
      shell(footprint(.10,1.78,-.94,.70,.055),1.33,1.44,'#728798','#41596b','#5c7283','#92a8b8');
      for(let i=0;i<14;i++){
        const x=.16+i*.118;
        face([[x,1.46,-.89],[x,1.46,.65],[x,1.68,.65],[x,1.68,-.89]],'#668194');
        line([[x,1.68,-.89],[x,1.68,.65]],'#bdcfdb',1.2);
      }
      shell(footprint(-.96,-.12,.60,1.07,.04),1.34,1.55,'#9ab4c8','#47677b','#547489','#cadbe4');
      face([[-.88,1.55,.98],[-.59,1.68,.83],[-.25,1.55,.70],[-.58,1.45,.88]],'#8bafd4','#beddf5',.8);
      for(let i=0;i<7;i++){
        const x=.44+i*.14;
        face([[x,1.38,.74],[x,1.38,1.06],[x,1.60,1.06],[x,1.60,.74]],'#8096a7');
        line([[x,1.60,1.06],[x,1.60,.74]],'#c2d5df',1);
      }
      for(const x of [-2.12,2.12])for(const z of [-1.12,.84])line([[x,1.31,z],[x,lidY-.005,z]],'#8497a7',1);
      line([[-1.93,1.36,-1.13],[-1.93,1.38,.35],[-1.36,1.39,.75],[-.60,1.39,.75]],'#81abbf',1.5);
    }
    const lidColor=grad([-2.5,lidY,-1.6],[2.7,lidY,1.1],[[0,'#b8c2ce'],[.32,'#91a1b1'],[.77,'#697d8f'],[1,'#536777']]);
    shell(lid,lidY,lidY+.12,lidColor,'#435363','#6a7c8c','#c3d0d9');
    face(flat(topInset,lidY+.122),null,'#6f8394',.85);
    for(const x of [-2.29,2.29])for(const z of [-1.28,1.02]){
      face(circleXZ(x,lidY+.125,z,.048),'#4d5d6c','#adbeca',.5);
      line([[x-.023,lidY+.13,z],[x+.023,lidY+.13,z]],'#d2dee6',.7);
    }
    const buttons=footprint(.63,1.75,-1.08,-.41,.07);
    face(flat(buttons,lidY+.13),'#657b8d','#a9becb',.75);
    for(let i=0;i<3;i++)face(circleXZ(.84+i*.32,lidY+.14,-.74,.102),i===0?'#9cb5cb':'#435b70','#b6c8d4',.65);
    for(let i=0;i<7;i++)line([[-1.87,lidY+.134,-1.03+i*.10],[-.75,lidY+.134,-1.03+i*.10]],'#657d90',.8);
    // Rings are actual circular sections of the lens barrel. Their projected faces move at different depths.
    const x=-.56, y=.81;
    const radius=.80;
    for(let i=0;i<=19;i++){
      const t=i/19, z=1.34+(lensZ-1.34)*t, r=radius*(1.01-.08*Math.sin(t*Math.PI));
      const steel=grad([x-r,y+r,z],[x+r,y-r,z],[[0,'#c9d5db'],[.17,'#8294a5'],[.43,'#344354'],[.71,'#141f2c'],[1,'#8796a4']]);
      face(circleXY(x,y,z,r),steel,i%3===0?'#8c9ba7':'#354554',.85);
    }
    face(circleXY(x,y,lensZ,radius*.98),'#455461','#b0bdc7',1.2);
    for(let i=0;i<100;i++){
      const a=i*tau/100,u=Math.cos(a),v=Math.sin(a);
      line([[x+u*.738,y+v*.738,lensZ+.007],[x+u*.772,y+v*.772,lensZ+.007]],v>-.25?'#bac7ce':'#748694',.78);
    }
    const [gx,gy]=proj([x+.14,y+.18,lensZ]);
    const glass=ctx.createRadialGradient(gx,gy,0,gx,gy,.92*scale);
    for(const [n,c] of [[0,'#8395cc'],[.14,'#3c538f'],[.33,'#1c2d54'],[.51,'#34466f'],[.68,'#162f43'],[.88,'#547887'],[1,'#132637']])glass.addColorStop(n,c);
    face(circleXY(x,y,lensZ+.012,.705),glass,'#121d2b',2.8);
    for(const [n,c] of [[.66,'#687a8e'],[.60,'#254954'],[.558,'#80a3bb'],[.48,'#31445e'],[.36,'#5d7391']])face(circleXY(x,y,lensZ+.013,n),null,c,.8);
    ctx.save();trace(circleXY(x,y,lensZ+.015,.58));ctx.closePath();ctx.clip();
    face(circleXY(x+.19+turn*.14,y+.31+pitch*.10,lensZ+.02,.27,.068),'rgba(179,201,255,.35)');
    face(circleXY(x-.22+turn*.13,y-.31,lensZ+.02,.34,.047),'rgba(74,204,201,.36)');
    ctx.restore();
    const [sx,sv]=proj([x,y,lensZ+.034]),[ex,ev]=proj([x,y,lensZ+3.8]);
    const beam=ctx.createLinearGradient(sx,sv,ex,ev);
    beam.addColorStop(0,'rgba(172,220,255,.38)');beam.addColorStop(.37,'rgba(90,170,255,.16)');beam.addColorStop(1,'rgba(77,143,255,0)');
    face([[x,y+.036,lensZ+.04],[x+.94,y+1.55,lensZ+4.7],[x-1.0,y-.35,lensZ+4.7],[x,y-.056,lensZ+.04]],beam);
    const glow=ctx.createRadialGradient(sx,sv,0,sx,sv,.24*scale);
    glow.addColorStop(0,'#f3fdff');glow.addColorStop(.13,'#d9f4ff');glow.addColorStop(.42,'rgba(137,198,255,.65)');glow.addColorStop(1,'rgba(139,209,255,0)');
    ctx.fillStyle=glow;ctx.fillRect(sx-.25*scale,sv-.25*scale,.50*scale,.50*scale);
  };
};
