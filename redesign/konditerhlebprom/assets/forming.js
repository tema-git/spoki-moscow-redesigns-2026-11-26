'use strict';
(() => {
  const stage = document.querySelector('.drawing-stage');
  const machine = stage.querySelector('.machine');
  const hero = stage.closest('.hero');
  const section = document.getElementById('process');
  const sticky = section.querySelector('.process-stick');
  section.classList.add('cycle-ready');
  const mast = document.querySelector('.head-in');
  const parts = Object.fromEntries(Array.from(section.querySelectorAll('[data-part]'), node => [node.dataset.part, node]));
  const steps = Array.from(section.querySelectorAll('.process-steps li'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cap = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
  const smooth = (p, a, b) => {
    const t = cap((p - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const scene = Array.from(machine.querySelectorAll('[data-xyz]'), node => ({
    node,
    tag: node.localName,
    coords: node.dataset.xyz.trim().split(/\s+/).map(Number),
    part: node.closest('.hopper') ? 'hopper' : node.closest('.biscuits, .baking-sheet') ? 'sheet' : node.closest('.belt-hatch') ? 'belt' : ''
  }));
  let pointerX = 0, pointerY = 0, frame = 0, lastCamera = '', lastCycle = -1;

  function drawMachine(scroll) {
    const key = [pointerX, pointerY, scroll].map(x => x.toFixed(3)).join(',');
    if (key === lastCamera) return;
    lastCamera = key;
    const yaw = .59 + pointerX * .31 - scroll * .21;
    const tilt = .44 + pointerY * .13 + scroll * .095;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const rise = Math.sin(tilt), height = Math.cos(tilt) * .97;
    // Project each actual vertex; a change of viewpoint exposes different faces.
    const project = (x, y, z) => {
      const dx = x - 222, dy = y - 58;
      return [314 + 1.18 * (dx * cos + dy * sin), 239 + rise * (dx * sin - dy * cos) - (z - 140) * height];
    };
    const origin = project(0, 0, 0);
    const lift = 57 * smooth(scroll, .03, .84);
    const travel = 23 * smooth(scroll, .12, .95);
    for (const {node, tag, coords, part} of scene) {
      const dx = part === 'sheet' ? travel : part === 'belt' ? 5 * scroll : 0;
      const dz = part === 'hopper' ? lift : 0;
      const points = [];
      for (let i = 0; i < coords.length; i += 3) {
        points.push(project(coords[i] + dx, coords[i + 1], coords[i + 2] + dz));
      }
      if (tag === 'ellipse') {
        node.setAttribute('cx', points[0][0].toFixed(2));
        node.setAttribute('cy', points[0][1].toFixed(2));
      } else if (tag === 'use') {
        node.setAttribute('x', (points[0][0] - origin[0]).toFixed(2));
        node.setAttribute('y', (points[0][1] - origin[1]).toFixed(2));
      } else {
        const pairs = points.map(([x,y]) => x.toFixed(2) + ',' + y.toFixed(2));
        if (tag === 'path') node.setAttribute('d', 'M' + pairs[0] + ' Q' + pairs[1] + ' ' + pairs[2]);
        else node.setAttribute('points', pairs.join(' '));
      }
    }
    stage.style.setProperty('--hx', pointerX);
    stage.style.setProperty('--hy', pointerY);
  }

  function drawCycle(progress, still) {
    const p = still ? 1 : Math.round(progress * 1000) / 1000;
    if (p === lastCycle && section.classList.contains('scrubbing') === !still) return;
    lastCycle = p;
    section.classList.toggle('scrubbing', !still);
    const phase = p < .245 ? 0 : p < .505 ? 1 : p < .735 ? 2 : 3;
    steps.forEach((step, i) => step.classList.toggle('current', i === phase && !still));
    const feed = smooth(p, 0, .53);
    const extrusion = smooth(p, .22, .55);
    const cut = smooth(p, .50, .72);
    const fall = smooth(p, .71, .865);
    const advance = smooth(p, .83, 1);
    parts.feed.setAttribute('transform', 'translate(0 ' + (-13 * (1 - smooth(p, 0, .22))) + ')');
    parts.reservoir.setAttribute('transform', 'translate(0 ' + (14 * feed) + ')');
    parts['left-roll'].setAttribute('transform', 'rotate(' + (feed * 130) + ')');
    parts['right-roll'].setAttribute('transform', 'rotate(' + (-feed * 130) + ')');
    parts.wire.setAttribute('transform', 'translate(' + (221 * cut) + ' 0)');
    parts.tray.setAttribute('transform', 'translate(' + (-23 + advance * 59) + ' 0)');
    parts.pieces.setAttribute('transform', 'translate(' + (advance * 59) + ' ' + (218 + 36 * fall) + ') scale(1 ' + (.025 + .975 * extrusion) + ')');
  }

  function paint() {
    frame = 0;
    const box = hero.getBoundingClientRect();
    if (box.bottom > -35 && box.top < innerHeight) {
      drawMachine(reduced.matches ? 0 : cap((mast.offsetHeight - box.top) / (box.height * .81)));
    }
    const bounds = section.getBoundingClientRect();
    if (bounds.top > innerHeight + 40 || bounds.bottom < -40) return;
    const pin = getComputedStyle(sticky).position === 'sticky';
    const top = mast.offsetHeight;
    const approach = cap((innerHeight - bounds.top) / Math.max(1, innerHeight - top));
    const run = Math.max(1, section.offsetHeight - sticky.offsetHeight);
    const progress = pin
      ? .16 * approach + .84 * cap((top - bounds.top) / (run * .94))
      : cap((innerHeight * .86 - bounds.top) / (innerHeight * .65 + bounds.height * .5));
    drawCycle(progress, reduced.matches);
  }
  function queue() {
    if (!frame) frame = requestAnimationFrame(paint);
  }
  function aim(event) {
    if (reduced.matches) return;
    const box = stage.getBoundingClientRect();
    pointerX = cap(2 * (event.clientX - box.left) / box.width - 1, -1, 1);
    pointerY = cap(1 - 2 * (event.clientY - box.top) / box.height, -1, 1);
    queue();
  }
  function center() {
    pointerX = pointerY = 0;
    queue();
  }
  stage.addEventListener('pointermove', aim, {passive:true});
  stage.addEventListener('pointerdown', aim, {passive:true});
  stage.addEventListener('pointerleave', center);
  stage.addEventListener('pointercancel', center);
  stage.addEventListener('pointerup', event => { if (event.pointerType === 'touch') center(); });
  reduced.addEventListener('change', center);
  addEventListener('scroll', queue, {passive:true});
  addEventListener('resize', queue, {passive:true});
  document.fonts.ready.then(queue);
  queue();
})();
