(() => {
  'use strict';
  const track = document.querySelector('.assembly-track');
  if (!track || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const figure = track.querySelector('.cutaway');
  const panel = track.querySelector('.assembly-grid');
  const bar = document.querySelector('.bar');
  function stageTop() {
    const header = bar.getBoundingClientRect().height;
    return Math.round(header + Math.max(9, (innerHeight - header - panel.offsetHeight) * 0.43));
  }
  const steps = [...track.querySelectorAll('[data-step]')];
  const groups = [...figure.querySelectorAll('[data-layer]')];
  const bolts = figure.querySelector('[data-bolts]');
  const reflection = figure.querySelector('.glass-reflection');
  const phases = [
    { start: 0, end: 0.33, x: -52, y: 13, opacity: 1 },
    { start: 0.29, end: 0.54, x: -32, y: -69, opacity: 0.42 },
    { start: 0.52, end: 0.79, x: 56, y: -80, opacity: 0.38 },
    { start: 0.77, end: 0.97, x: 72, y: -53, opacity: 0.4 }
  ];
  function fraction(progress, start, end) {
    return Math.max(0, Math.min(1, (progress - start) / (end - start)));
  }
  function draw(progress, staticView = false) {
    let active = 0;
    for (const [i, phase] of phases.entries()) {
      const t = fraction(progress, phase.start, phase.end);
      const eased = t * t * (3 - 2 * t);
      groups[i].setAttribute('transform', 'translate(' + (phase.x * (1 - eased)).toFixed(2) + ' ' + (phase.y * (1 - eased)).toFixed(2) + ')');
      groups[i].setAttribute('opacity', (phase.opacity + (1 - phase.opacity) * eased).toFixed(3));
      if (progress >= phase.start) active = i;
    }
    const fasteners = fraction(progress, 0.91, 1);
    bolts.setAttribute('transform', 'translate(0 ' + (-19 * (1 - fasteners)).toFixed(2) + ')');
    bolts.setAttribute('opacity', (0.25 + 0.75 * fasteners).toFixed(3));
    reflection.setAttribute('opacity', (0.22 + 0.6 * Math.sin(Math.PI * fraction(progress, 0.54, 0.83))).toFixed(3));
    for (const [i, step] of steps.entries()) {
      if (!staticView && i === active) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    }
    figure.dataset.progress = progress.toFixed(4);
    figure.dataset.phase = staticView ? 'assembled' : groups[active].dataset.layer;
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let trigger;
  function setup() {
    if (trigger) trigger.kill();
    track.classList.toggle('is-scrubbed', !reduced.matches);
    if (reduced.matches) {
      draw(1, true);
      return;
    }
    draw(0);
    trigger = ScrollTrigger.create({
      id: 'roof-assembly',
      trigger: track,
      start: 'clamp(top 88%)',
      end: () => 'clamp(bottom ' + Math.min(innerHeight - 10, stageTop() + panel.offsetHeight + 25) + 'px)',
      invalidateOnRefresh: true,
      onRefreshInit: () => track.style.setProperty('--scene-top', stageTop() + 'px'),
      onUpdate: self => draw(self.progress),
      onRefresh: self => draw(self.progress)
    });
    draw(trigger.progress);
  }
  setup();
  reduced.addEventListener('change', setup);
  document.fonts.ready.then(() => { if (trigger && !reduced.matches) trigger.refresh(); });
})();
