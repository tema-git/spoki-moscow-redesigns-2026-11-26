/* BK-2. The same metalwork is projected by both renderers. */
(() => {
  'use strict';
  const tau = 2 * Math.PI;
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const times = (a, k) => a.map(v => v * k);
  const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const unit = a => times(a, 1 / (Math.hypot(...a) || 1));
  const steel = [.67,.73,.73,.88], polished = [.82,.84,.78,1], darkSteel = [.33,.44,.49,.72];
  const frame = [.18,.28,.34,.38], graphite = [.075,.13,.16,.18], ruby = [.78,.24,.16,.34];
  const glass = [.09,.18,.20,.96], brass = [.77,.53,.28,.53], blue = [.12,.26,.40,.44];
  const trayZ = 1.35;

  function geometry() {
    const faces = [];
    let moving = 0;
    function face(points, material, normals) {
      const normal = unit(cross(sub(points[1],points[0]),sub(points[2],points[0])));
      faces.push({points, material, normal, normals:normals || points.map(() => normal), moving});
    }
    function box(x0,y0,z0,x1,y1,z1,col) {
      const a=[x0,y0,z0], b=[x1,y0,z0], c=[x1,y1,z0], d=[x0,y1,z0];
      const e=[x0,y0,z1], f=[x1,y0,z1], g=[x1,y1,z1], h=[x0,y1,z1];
      for (const quad of [[e,f,g,h],[b,a,d,c],[f,b,c,g],[a,e,h,d],[h,g,c,d],[a,b,f,e]]) face(quad,col);
    }
    function tube(start,end,r0,r1,material,count=32,caps=true,inside=false) {
      const axis = unit(sub(end,start));
      const u = unit(cross(Math.abs(axis[1])>.82 ? [0,0,1] : [0,1,0],axis));
      const v = cross(axis,u);
      const slope = (r0-r1) / Math.hypot(...sub(end,start));
      const rows=[], normals=[];
      for (let i=0;i<count;i++) {
        const a=i*tau/count;
        const radial=add(times(u,Math.cos(a)),times(v,Math.sin(a)));
        rows.push([add(start,times(radial,r0)),add(end,times(radial,r1))]);
        normals.push(unit(add(radial,times(axis,slope))));
      }
      for (let i=0;i<count;i++) {
        const j=(i+1)%count;
        const vertices=[rows[i][0],rows[j][0],rows[j][1],rows[i][1]];
        const ns=[normals[i],normals[j],normals[j],normals[i]];
        face(inside ? vertices.reverse() : vertices,material,inside ? ns.reverse().map(n=>times(n,-1)) : ns);
      }
      if (caps) {
        face(rows.map(row=>row[0]).reverse(),material);
        face(rows.map(row=>row[1]),material);
      }
    }
    function rod(a,b,r,col,n=12) { tube(a,b,r,r,col,n); }
    function vertical(x,z,y0,y1,r0,r1,col,n=40,caps=true) {tube([x,y0,z],[x,y1,z],r0,r1,col,n,caps);}
    function axial(x,y,z0,z1,r0,r1,col,n=48) {tube([x,y,z0],[x,y,z1],r0,r1,col,n);}

    // Welded plinth, levelling feet and the drive cabinet.
    for (const x of [-.60,.60]) for (const z of [-.91,1.66]) {
      vertical(x,z,.027,.067,.114,.114,graphite,18);
      vertical(x,z,.067,.19,.046,.046,darkSteel,12);
    }
    box(-.73,.17,-1.04,.73,.245,1.81,frame);
    box(-.72,.245,-1.03,.72,.268,1.8,steel);
    box(-.58,.268,-.98,.61,1.17,.63,darkSteel);
    box(-.62,1.04,-1,.65,1.18,.64,polished);
    box(.61,.37,-.89,.64,.95,.50,frame);
    for (let i=0;i<12;i++) box(.645,.58,-.76+i*.077,.653,.86,-.731+i*.077,graphite);
    for (const z of [-.80,.42]) for (const y of [.42,.90])
      rod([.64,y,z],[.664,y,z],.022,polished,8);

    // Horizontal drum, rolled seams, front hatch and sight glass.
    axial(0,1.66,-1.03,.62,.71,.71,steel,64);
    for (const z of [-.96,-.79,.47,.60]) axial(0,1.66,z,z+.038,.724,.724,polished,64);
    axial(0,1.66,.632,.69,.733,.733,frame,64);
    axial(0,1.66,.69,.733,.713,.691,polished,64);
    axial(0,1.66,.733,.744,.657,.657,steel,64);
    for (let i=0;i<14;i++) {
      const a=i*tau/14, x=.632*Math.cos(a), y=1.66+.632*Math.sin(a);
      axial(x,y,.741,.765,.027,.025,darkSteel,6);
    }
    axial(0,1.67,.748,.781,.357,.357,frame);
    axial(0,1.67,.782,.826,.324,.302,polished);
    axial(0,1.67,.829,.852,.201,.179,graphite);
    axial(0,1.67,.853,.862,.146,.146,glass);
    rod([-.088,1.66,.868],[-.012,1.76,.868],.012,steel,8);
    axial(.36,1.91,.75,.84,.082,.064,darkSteel,24);
    rod([.36,1.91,.84],[.49,2.05,.98],.025,polished);
    rod([.46,2.02,.95],[.56,2.13,1.05],.044,ruby);
    box(-.27,1.17,.72,.27,1.31,.77,frame);
    rod([-.24,1.32,.79],[-.36,1.42,.86],.025,steel);
    rod([-.35,1.41,.86],[-.43,1.52,.90],.04,ruby);
    const lip=[[-.29,1.21,.75],[.29,1.21,.75],[.25,1.02,1.14],[-.25,1.02,1.14]];
    face(lip.slice().reverse(),steel);
    for (const s of [-1,1]) {
      const wall=[[s*.29,1.21,.75],[s*.25,1.02,1.14],[s*.25,1.10,1.14],[s*.29,1.31,.75]];
      face(wall,polished);face(wall.slice().reverse(),polished);
    }
    // Open, double-walled charge hopper with a slide gate and red handle.
    const hopperZ=.27, rimTop=3.14;
    vertical(0,hopperZ,2.26,2.46,.105,.108,darkSteel,26);
    vertical(0,hopperZ,2.44,3.00,.11,.591,polished,64,false);
    tube([0,2.46,hopperZ],[0,3.00,hopperZ],.091,.566,darkSteel,64,false,true);
    vertical(0,hopperZ,3.00,rimTop,.60,.60,polished,64,false);
    tube([0,3.00,hopperZ],[0,rimTop,hopperZ],.565,.565,darkSteel,64,false,true);
    const rim=[];
    for (let i=0;i<=64;i++) {
      const a=i*tau/64;
      rim.push([Math.cos(a),Math.sin(a)]);
      if (!i) continue;
      const [x0,z0]=rim[i-1],[x1,z1]=rim[i];
      face([[.60*x0,rimTop,hopperZ+.60*z0],[.565*x0,rimTop,hopperZ+.565*z0],
        [.565*x1,rimTop,hopperZ+.565*z1],[.60*x1,rimTop,hopperZ+.60*z1]],polished);
    }
    box(-.13,2.405,hopperZ-.15,.22,2.443,hopperZ+.13,darkSteel);
    rod([.14,2.42,hopperZ],[.37,2.42,hopperZ],.016,steel);
    rod([.32,2.42,hopperZ],[.42,2.42,hopperZ],.032,ruby);

    // Perforated cooling tray and three sweeps on a common drive shaft.
    vertical(0,trayZ,.26,.54,.63,.66,frame,56);
    vertical(0,trayZ,.51,.79,.695,.74,steel,56);
    vertical(0,trayZ,.51,.537,.701,.701,darkSteel,56);
    vertical(0,trayZ,.783,.818,.747,.747,polished,64);
    vertical(0,trayZ,.817,.821,.696,.696,darkSteel,56);
    vertical(0,trayZ,.820,.824,.641,.641,steel,56);
    for (let row=-4;row<=4;row++) for (let col=-5;col<=5;col++) {
      const x=(col+(row%2)*.4)*.112, z=row*.113;
      if(x*x+z*z<.35) vertical(x,trayZ+z,.824,.829,.016,.016,graphite,6);
    }
    moving=1;
    for (let i=0;i<3;i++) {
      const a=i*tau/3+.14, tip=[.595*Math.cos(a),.874,trayZ+.595*Math.sin(a)];
      rod([0,.896,trayZ],tip,.024,darkSteel);
      rod(tip,[tip[0]+.046*Math.sin(a),.848,tip[2]-.046*Math.cos(a)],.031,polished);
    }
    moving=0;
    vertical(0,trayZ,.827,.94,.065,.054,polished,24);
    vertical(0,trayZ,.94,.955,.052,.048,graphite,20);
    box(-.16,.35,trayZ+.61,.16,.53,trayZ+.66,darkSteel);
    box(-.115,.378,trayZ+.668,.115,.497,trayZ+.674,graphite);
    rod([-.14,.51,trayZ+.68],[.14,.51,trayZ+.68],.022,polished);
    // Control panel on the operator's side, with a display, dial and pilot lamps.
    box(.59,1.00,-.12,.78,1.48,.45,frame);
    box(.779,1.025,-.10,.798,1.455,.43,polished);
    box(.798,1.228,-.055,.807,1.40,.24,graphite);
    box(.807,1.248,-.035,.810,1.381,.222,[.30,.53,.53,.20]);
    for (let j=0;j<3;j++) rod([.80,1.129,-.04+j*.156],[.833,1.129,-.04+j*.156],.038,[graphite,brass,ruby][j],16);
    // Cyclone, exhaust elbows, and three legs behind the roaster.
    const cx=1.03,cz=-1.25;
    for (let i=0;i<3;i++) {
      const a=i*tau/3;
      const foot=[cx+.34*Math.cos(a),.045,cz+.34*Math.sin(a)];
      rod(foot,[cx+.245*Math.cos(a),1.39,cz+.245*Math.sin(a)],.021,darkSteel);
      vertical(foot[0],foot[2],.02,.045,.059,.059,frame,10);
    }
    vertical(cx,cz,.66,.84,.060,.066,darkSteel,22);
    vertical(cx,cz,.82,1.52,.067,.29,steel,42);
    vertical(cx,cz,1.52,2.12,.29,.29,polished,42);
    for(const y of [1.50,2.10])vertical(cx,cz,y,y+.027,.299,.299,darkSteel,42);
    vertical(cx,cz,2.12,2.15,.29,.19,polished,42);
    vertical(cx,cz,2.14,2.41,.095,.095,darkSteel,30);
    const pipe=[[0,2.00,-.97],[0,2.40,-1.07],[.04,2.51,-1.10],[.14,2.56,-1.13],
      [.86,2.56,-1.25],[.98,2.52,-1.25],[cx,2.42,cz],[cx,2.38,cz]];
    for(let i=1;i<pipe.length;i++) rod(pipe[i-1],pipe[i],.083,steel,24);
    return faces;
  }

  const vertexShader = `
    precision mediump float;
    attribute vec3 point, normal;
    attribute vec4 surface;
    attribute float moving;
    uniform vec3 right, up, eye;
    uniform vec2 scale, sweep;
    varying vec3 direction;
    varying vec4 material;
    void main() {
      vec3 p=point, n=normal;
      if(moving>.5) {
        mat2 spin=mat2(sweep.x,sweep.y,-sweep.y,sweep.x);
        p.xz=spin*(p.xz-vec2(0.,1.35))+vec2(0.,1.35);
        n.xz=spin*n.xz;
      }
      p-=vec3(.20,1.51,.23);
      gl_Position=vec4(dot(p,right)*scale.x,dot(p,up)*scale.y,-dot(p,eye)*.14,1.);
      direction=n;material=surface;
    }`;
  const fragmentShader = `
    precision mediump float;
    varying vec3 direction;
    varying vec4 material;
    uniform vec3 eye;
    void main() {
      vec3 n=normalize(direction);
      float light=max(0.,dot(n,normalize(vec3(-.45,.78,.64))));
      vec3 ref=reflect(-eye,n);
      float lane=(ref.x+.42+ref.y*.21)*4.;
      float band=(ref.y-.28)*9.;
      float strip=exp(-lane*lane), sheen=exp(-band*band);
      float edge=pow(1.-max(0.,dot(n,eye)),3.);
      vec3 color=material.rgb*(.53+.41*light+.06*n.y);
      color+=material.w*(vec3(.25,.24,.19)*strip+vec3(.19,.22,.24)*sheen+vec3(.082,.10,.12)*edge);
      gl_FragColor=vec4(color,1.);
    }`;
  function webgl(canvas, faces) {
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true});
    if (!gl) return null;
    function shader(type,source) {
      const item=gl.createShader(type);
      gl.shaderSource(item,source);gl.compileShader(item);
      if(!gl.getShaderParameter(item,gl.COMPILE_STATUS)) throw Error('metal shader');
      return item;
    }
    const program=gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,vertexShader));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragmentShader));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error('metal program');
    gl.useProgram(program);
    const data=[];
    for(const f of faces) for(let i=1;i<f.points.length-1;i++) for(const j of [0,i,i+1])
      data.push(...f.points[j],...f.normals[j],...f.material,f.moving);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
    for(const [name,size,offset] of [['point',3,0],['normal',3,3],['surface',4,6],['moving',1,10]]) {
      const at=gl.getAttribLocation(program,name);
      gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,size,gl.FLOAT,false,44,offset*4);
    }
    const count=data.length/11, loc={};
    for(const key of ['eye','right','up','scale','sweep']) loc[key]=gl.getUniformLocation(program,key);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
    return ({eye,right,up,px,w,h,a}) => {
      gl.viewport(0,0,w,h);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      for(const [k,v] of [['eye',eye],['right',right],['up',up]]) gl.uniform3fv(loc[k],v);
      gl.uniform2f(loc.scale,2*px/w,2*px/h);gl.uniform2f(loc.sweep,Math.cos(a),Math.sin(a));
      gl.drawArrays(gl.TRIANGLES,0,count);
    };
  }

  // Painters' projection keeps the orbit usable on devices without GPU rendering.
  function canvas2d(canvas,faces) {
    const ctx=canvas.getContext('2d');
    if (!ctx) return null;
    const sun=unit([-.45,.78,.64]);
    return ({eye,right,up,px,w,h,a}) => {
      ctx.clearRect(0,0,w,h);
      const center=[.20,1.51,.23], cs=Math.cos(a), sn=Math.sin(a), entries=[];
      for(const f of faces) {
        const spin=([x,y,z],offset) => [x*cs-(z-offset)*sn,y,x*sn+(z-offset)*cs+offset];
        const n=f.moving ? spin(f.normal,0) : f.normal;
        if(dot(n,eye)<-.005) continue;
        let depth=0;
        const points=f.points.map(raw=>{
          const v=sub(f.moving ? spin(raw,trayZ) : raw,center);
          depth+=dot(v,eye);
          return [w/2+dot(v,right)*px,h/2-dot(v,up)*px];
        });
        const shine=sub(times(n,2*dot(n,eye)),eye), m=f.material;
        const strip=Math.exp(-Math.pow((shine[0]+.42+shine[1]*.21)*4,2));
        const sheen=Math.exp(-Math.pow((shine[1]-.28)*9,2));
        const brightness=.53+.41*Math.max(0,dot(n,sun))+.06*n[1];
        const color=m.slice(0,3).map(v=>Math.round(255*Math.min(1,v*brightness+m[3]*(.23*strip+.20*sheen))));
        entries.push({points,depth:depth/f.points.length,color:'rgb('+color.join(',')+')'});
      }
      entries.sort((a,b)=>a.depth-b.depth);
      ctx.lineWidth=.6;
      for(const entry of entries) {
        ctx.beginPath(); entry.points.forEach(([x,y],i)=>i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
        ctx.closePath();ctx.fillStyle=ctx.strokeStyle=entry.color;ctx.fill();ctx.stroke();
      }
    };
  }

  function attach(plate) {
    let canvas=plate.querySelector('.roaster-model');
    const faces=geometry();
    let draw,renderer='webgl';
    try {draw=webgl(canvas,faces);} catch (_) { /* The independent 2D renderer uses a fresh context. */ }
    if(!draw) {
      const fresh=canvas.cloneNode(false);canvas.replaceWith(fresh);canvas=fresh;
      renderer='canvas2d';draw=canvas2d(canvas,faces);
    }
    if(!draw) return null;
    let x=0,y=0,scroll=0,frame=0;
    function render() {
      frame=0;
      const dpr=Math.min(devicePixelRatio||1,1.8);
      const w=Math.round(canvas.clientWidth*dpr), h=Math.round(canvas.clientHeight*dpr);
      if(!w||!h) return;
      if(canvas.width!==w||canvas.height!==h) {canvas.width=w;canvas.height=h;}
      const yaw=.68+x*.34+scroll*.38, tilt=.30-y*.13+scroll*.21;
      const sy=Math.sin(yaw),cy=Math.cos(yaw),st=Math.sin(tilt),ct=Math.cos(tilt);
      const eye=[sy*ct,st,cy*ct], right=[cy,0,-sy], up=[-sy*st,ct,-cy*st];
      draw({eye,right,up,px:Math.min(w/3.95,h/3.46),w,h,a:scroll*4.2+x*.56});
      plate.dataset.modelRenderer=renderer;plate.dataset.yaw=yaw.toFixed(3);plate.dataset.tilt=tilt.toFixed(3);
    }
    function queue() {if(!frame) frame=requestAnimationFrame(render);}
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();delete plate.dataset.modelRenderer;});
    canvas.addEventListener('webglcontextrestored',()=>{draw=webgl(canvas,faces);queue();});
    new ResizeObserver(queue).observe(canvas);
    queue();
    return (nx,ny,s) => {if(x!==nx||y!==ny||scroll!==s){x=nx;y=ny;scroll=s;queue();}};
  }
  function cycle(section) {
    const figure=section.querySelector('.proc-figure'), track=section.querySelector('.proc-layout');
    const caption=figure.querySelector('.cycle-caption'), overview=caption.textContent;
    const steps=[...section.querySelectorAll('.proc-copy li')], labels=steps.map(step=>step.querySelector('b').textContent);
    const markers=[...figure.querySelectorAll('.cycle-mark')], meter=[...figure.querySelectorAll('.cycle-meter i')];
    const parts=Object.fromEntries(['drum-vanes','cooler-blades','cycle-heat','cycle-air','feed-gate','release-gate'].map(k=>[k,figure.querySelector('.'+k)]));
    const frac=n=>n-Math.floor(n);
    const beans=[...section.querySelectorAll('.batch-bean')].map((node,i)=>{
      const a=frac((i+.5)*.618034), b=frac((i+.5)*.754878), c=frac((i+.5)*.569840);
      return {node, a,b,c, original:node.getAttribute('transform'), color:node.getAttribute('fill'),
        hopper:[142+(b-.5)*(84-54*a),50+a*31], tray:[157+(c-.5)*102,268+(b-.5)*11]};
    });
    const split=(p,start,end)=>clamp((p-start)/(end-start),0,1);
    const lerp=(a,b,t)=>a+(b-a)*t;
    const between=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t)];
    function path(stops,t) {
      const at=t*(stops.length-1), index=Math.min(Math.floor(at),stops.length-2);
      return between(stops[index],stops[index+1],at-index);
    }
    const mix=(a,b,t)=>a.map((v,i)=>Math.round(lerp(v,b[i],t)));
    let previous=null;
    return reduced => {
      const rect=track.getBoundingClientRect();
      const header=document.querySelector('.header').getBoundingClientRect().height;
      const entry=Math.min(innerHeight*.73,innerHeight-65);
      const release=header+12+figure.offsetHeight-rect.height;
      const p=reduced ? -1 : +clamp((entry-rect.top)/Math.max(1,entry-release),0,1).toFixed(4);
      if(p===previous) return;
      previous=p;
      const stage=reduced ? -1 : p<.36 ? 0 : p<.715 ? 1 : 2;
      figure.dataset.phase=reduced ? 'overview' : String(stage+1);
      figure.dataset.progress=reduced ? 'overview' : String(p);
      steps.forEach((el,i)=>{
        for(const item of [el,markers[i],meter[i]]) item.classList.toggle('current',i===stage);
      });
      caption.textContent=reduced ? overview : labels[stage];
      if(reduced) {
        beans.forEach(({node,original,color})=>{node.setAttribute('transform',original);node.setAttribute('fill',color);});
        for(const part of Object.values(parts)) {part.removeAttribute('transform');part.removeAttribute('opacity');}
        return;
      }
      const roast=split(p,.30,.76), opening=split(p,.59,.76), cooling=split(p,.68,1);
      parts['drum-vanes'].setAttribute('transform','rotate('+(p*38+roast*230)+' 325 150)');
      parts['cooler-blades'].setAttribute('transform','rotate('+(cooling*240)+')');
      parts['feed-gate'].setAttribute('transform','translate('+(-13*Math.sin(Math.PI*split(p,0,.43)))+' 0)');
      parts['release-gate'].setAttribute('transform','rotate('+(-66*opening)+' 264 178)');
      parts['cycle-heat'].setAttribute('opacity',String(.12+.88*Math.sin(Math.PI*split(p,.27,.76))));
      parts['cycle-air'].setAttribute('opacity',String(.10+.90*cooling));
      for(const {node,a,b,c,hopper,tray} of beans) {
        const load=split(p,.035+a*.15,.22+a*.15), dump=split(p,.655+b*.13,.845+b*.13);
        const angle=(.20+.61*a)*Math.PI+.38*Math.sin(roast*9+c*tau);
        const radius=25+30*b;
        const drum=[325+radius*Math.cos(angle),150+radius*Math.sin(angle)];
        const pos=load<1 ? path([hopper,[143+(b-.5)*9,94],[148,105],[254,131],drum],load) :
          dump>0 ? path([drum,[278+(a-.5)*7,188],[254,215],[206,247],tray],dump) : drum;
        const t=split(p,.32+c*.06,.64+c*.08);
        const color=t<.55 ? mix([182,195,124],[214,159,87],t/.55) : mix([214,159,87],[142,87,60],(t-.55)/.45);
        node.setAttribute('fill','rgb('+color.join(',')+')');
        node.setAttribute('transform','translate('+pos.map(v=>v.toFixed(2)).join(' ')+') rotate('+(c*168+load*95+roast*105+dump*82).toFixed(1)+')');
      }
    };
  }
  window.KdmBK2={attach,cycle};
})();
