(() => {
  'use strict';
  const track = document.querySelector('.assembly-track');
  if (!track || !window.ScrollTrigger || !window.gsap) return;
  const within = selector => track.querySelector(selector);
  const svg = within('.sewing-drawing');
  const wool = within('.sew-wool'), canvas = within('.sew-interlining');
  const facing = within('.sew-facing'), pattern = within('.sew-template');
  const lapel = within('.sew-lapel'), chalk = within('.sew-chalk');
  const chalkTool = within('.tailor-chalk'), needle = within('.sew-needle');
  const cut = within('#sw-cut'), seam = within('#sw-seam-path');
  const seamMask = within('.seam-reveal'), chalkLine = within('.chalk-line');
  const cutLength = cut.getTotalLength(), seamLength = seam.getTotalLength();
  const steps = Array.from(track.querySelectorAll('.assembly-steps li'));
  const phaseName = within('.phase-name'), content = within('.assembly-content');

  const clamp = n => Math.max(0, Math.min(1,n));
  function between(p,a,b) {
    const t = clamp((p-a)/(b-a));
    return t*t*(3-2*t);
  }
  function position(element, x, y, degrees = 0) {
    element.setAttribute('transform', 'translate('+x.toFixed(2)+' '+y.toFixed(2)+') rotate('+degrees.toFixed(2)+' 260 185)');
  }
  function toolAt(element, path, length, fraction, x, y) {
    const tip = path.getPointAtLength(length * fraction);
    element.setAttribute('transform','translate('+(tip.x+x).toFixed(2)+' '+(tip.y+y).toFixed(2)+')');
  }
  function render(p, still = false) {
    const trace = between(p,0,.31);
    const lift = between(p,.18,.43);
    const canvasFit = between(p,.39,.67);
    const shellFit = between(p,.53,.75);
    const roll = between(p,.65,.84);
    const stitches = between(p,.76,.98);
    const center = between(p,.43,.75)*44;
    const paperX = -44 - 98*lift, woolX = 30+center;
    position(pattern,paperX,4+8*lift,-5-7*lift);
    pattern.style.opacity = (1-.38*lift).toFixed(3);
    position(wool,woolX,0);
    position(chalk,woolX,0);
    chalkLine.style.strokeDasharray = cutLength;
    chalkLine.style.strokeDashoffset = cutLength*(1-trace);
    chalk.style.opacity = (1-between(p,.30,.49)).toFixed(3);
    toolAt(chalkTool,cut,cutLength,trace,woolX,0);
    chalkTool.style.opacity = (1-between(p,.28,.38)).toFixed(3);
    position(canvas,180-(180-woolX)*canvasFit,16*(1-canvasFit),9*(1-canvasFit));
    canvas.style.opacity = (.35+.65*lift).toFixed(3);
    position(facing,woolX-31*(1-shellFit),9*(1-shellFit));
    facing.style.opacity = shellFit.toFixed(3);
    position(lapel,woolX+37*(1-roll),-11*(1-roll),11*(1-roll));
    lapel.style.opacity = roll.toFixed(3);
    seamMask.style.strokeDasharray = seamLength+1;
    seamMask.style.strokeDashoffset = (seamLength+1)*(1-stitches);
    toolAt(needle,seam,seamLength,stitches,woolX,0);
    needle.style.opacity = (between(p,.72,.78)*(1-between(p,.97,1))).toFixed(3);
    const current = p<.35 ? 0 : p<.71 ? 1 : 2;
    steps.forEach((step,i) => step.classList.toggle('current', i===current));
    phaseName.textContent = still ? 'Борт для первой примерки' : ['Контур полочки','Шерсть и бортовка','Намётка на лацкане'][current];
    track.style.setProperty('--thread-progress',String(p));
    track.dataset.phase = String(current+1);
    track.dataset.progress = p.toFixed(4);
  }
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    track.classList.add('has-scroll');
    const trigger = ScrollTrigger.create({
      trigger:track,
      start:'top 78%',
      end:() => 'bottom '+(content.getBoundingClientRect().height + document.querySelector('.mast').offsetHeight + 13)+'px',
      invalidateOnRefresh:true,
      onUpdate:self => render(self.progress),
      onRefresh:self => render(self.progress)
    });
    render(trigger.progress);
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => { trigger.kill(); track.classList.remove('has-scroll'); };
  });
  media.add('(prefers-reduced-motion: reduce)', () => render(1,true));
})();
