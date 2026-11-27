(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s),
    $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)'),
    fine = matchMedia('(hover:hover) and (pointer:fine)');
  const button = $('.nav-toggle'),
    menu = $('#mobile-nav');
  function closeMenu(focus = false) {
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Открыть меню');
    if (focus) button.focus();
  }
  button.addEventListener('click', () => {
    if (!menu.hidden) {
      closeMenu();
      return;
    }
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-label', 'Закрыть меню');
  });
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) {
      e.preventDefault();
      closeMenu(true);
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !e.target.closest('.bar')) closeMenu();
  });
  document.addEventListener('focusin', (e) => {
    if (!menu.hidden && !e.target.closest('.bar')) closeMenu();
  });
  matchMedia('(min-width: 1081px)').addEventListener('change', (e) => {
    if (e.matches) closeMenu();
  });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const magnets = $$('.magnet');
  for (const target of magnets) {
    target.addEventListener('pointermove', (e) => {
      if (!fine.matches || reduced.matches) return;
      const r = target.getBoundingClientRect();
      target.style.setProperty('--move-x', (((e.clientX - r.left) / r.width - 0.5) * 6).toFixed(1) + 'px');
      target.style.setProperty('--move-y', (((e.clientY - r.top) / r.height - 0.5) * 5).toFixed(1) + 'px');
    });
    target.addEventListener('pointerleave', () => {
      target.style.removeProperty('--move-x');
      target.style.removeProperty('--move-y');
    });
  }
  for (const panel of $$('[data-react]')) {
    let queued = 0,
      x = 0,
      y = 0;
    panel.addEventListener('pointermove', (e) => {
      if (!fine.matches || reduced.matches) return;
      const r = panel.getBoundingClientRect();
      x = clamp((e.clientX - r.left) / r.width, 0, 1);
      y = clamp((e.clientY - r.top) / r.height, 0, 1);
      if (!queued)
        queued = requestAnimationFrame(() => {
          queued = 0;
          panel.style.setProperty('--rx', ((x - 0.5) * 12).toFixed(1) + 'px');
          panel.style.setProperty('--ry', ((y - 0.5) * 9).toFixed(1) + 'px');
          panel.style.setProperty('--light-x', (x * 100).toFixed(1) + '%');
        });
    });
    panel.addEventListener('pointerleave', () => {
      cancelAnimationFrame(queued);
      queued = 0;
      for (const key of ['--rx', '--ry', '--light-x']) panel.style.removeProperty(key);
    });
  }
  const hero = $('.hero'),
    stage = $('.model-stage'),
    canvas = $('.model-stage canvas');
  if (canvas && window.Pavilion) {
    let x = 0,
      y = 0,
      touch = null,
      pending = 0,
      heroVisible = true;
    function modelSemantics() {
      stage.tabIndex = reduced.matches ? -1 : 0;
      stage.setAttribute('role', reduced.matches ? 'img' : 'slider');
      stage.setAttribute(
        'aria-label',
        reduced.matches
          ? 'Архитектурный эскиз двускатного зимнего сада'
          : 'Ракурс модели двускатного зимнего сада',
      );
      if (reduced.matches) {
        for (const key of ['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext'])
          stage.removeAttribute(key);
      } else {
        stage.setAttribute('aria-valuemin', '-13');
        stage.setAttribute('aria-valuemax', '13');
      }
    }
    modelSemantics();
    reduced.addEventListener('change', modelSemantics);
    stage.addEventListener('keydown', (event) => {
      if (
        reduced.matches ||
        !['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)
      )
        return;
      event.preventDefault();
      if (event.key === 'Home') x = -1;
      else if (event.key === 'End') x = 1;
      else x = clamp(x + (['ArrowRight', 'ArrowUp'].includes(event.key) ? 0.25 : -0.25), -1, 1);
      queue();
    });
    function paint() {
      pending = 0;
      if (heroVisible) {
        const box = canvas.getBoundingClientRect();
        const density = Math.min(devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(box.width * density)),
          height = Math.max(1, Math.round(box.height * density));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        const progress = reduced.matches
          ? 0
          : clamp(-hero.getBoundingClientRect().top / (hero.offsetHeight * 0.9), 0, 1);
        const yaw = 0.53 + (reduced.matches ? 0 : x * 0.23) + progress * 0.09,
          tilt = 0.365 + (reduced.matches ? 0 : y * 0.105);
        window.Pavilion.render(canvas, yaw, tilt, progress * 0.62);
        stage.classList.add('painted');
        if (!reduced.matches) {
          const degrees = Math.round(x * 13);
          stage.setAttribute('aria-valuenow', String(degrees));
          stage.setAttribute(
            'aria-valuetext',
            degrees === 0
              ? 'Исходный ракурс'
              : Math.abs(degrees) + '° ' + (degrees > 0 ? 'вправо' : 'влево'),
          );
        }
        stage.dataset.yaw = yaw.toFixed(3);
        stage.dataset.lift = (progress * 0.62).toFixed(3);
      }
    }
    function queue() {
      if (!pending) pending = requestAnimationFrame(paint);
    }
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      if (heroVisible) queue();
    }, { rootMargin: '90px 0px' }).observe(hero);
    new ResizeObserver(queue).observe(stage);
    addEventListener(
      'scroll',
      () => {
        if (heroVisible) queue();
      },
      { passive: true },
    );
    addEventListener('resize', queue);
    reduced.addEventListener('change', queue);
    stage.addEventListener('pointermove', (e) => {
      if (reduced.matches) return;
      if (e.pointerType === 'touch') {
        if (!touch) return;
        x = clamp(touch.angle + (e.clientX - touch.x) / 105, -1, 1);
        y = 0;
      } else {
        const r = stage.getBoundingClientRect();
        x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
        y = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      }
      queue();
    });
    stage.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') touch = { x: e.clientX, angle: x };
    });
    for (const event of ['pointerup', 'pointercancel'])
      stage.addEventListener(event, () => {
        touch = null;
      });
    stage.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'touch') {
        x = y = 0;
        queue();
      }
    });
    queue();
  }
  const archive = $('.catalog, .article-index');
  if (archive) {
    const input = $('input[type="search"]', archive);
    const rows = $$('[data-archive]', archive);
    const count = $('[role="status"]', archive);
    const showAll = $('.show-all', archive);
    const empty = $('#work-empty', archive);
    const noun = empty ? 'Объектов' : 'Материалов';
    const allLabel = showAll.textContent;
    let all = false;
    function applyFilter() {
      const text = input.value.trim().toLocaleLowerCase('ru');
      const group = $('input[name="work-group"]:checked', archive)?.value || 'all';
      const filtering = text !== '' || group !== 'all';
      let n = 0;
      for (const row of rows) {
        const onPage = all || filtering || row.dataset.archive === archive.dataset.current;
        const title = row.dataset.search || row.textContent.toLocaleLowerCase('ru');
        row.hidden = !onPage || !title.includes(text) || (group !== 'all' && row.dataset.group !== group);
        if (!row.hidden) n++;
      }
      count.textContent = noun + ': ' + n + ' из ' + rows.length;
      if (!n && !empty) count.textContent += '. Материалы по этому запросу не найдены.';
      if (empty) empty.hidden = n !== 0;
      showAll.hidden = filtering;
      showAll.setAttribute('aria-pressed', String(all));
      showAll.textContent = all ? 'Вернуться к странице ' + archive.dataset.current : allLabel;
    }
    input.addEventListener('input', applyFilter);
    for (const radio of $$('input[name="work-group"]', archive)) radio.addEventListener('change', applyFilter);
    showAll.addEventListener('click', () => { all = !all; applyFilter(); });
    if (empty) $('#clear-search', archive).addEventListener('click', () => {
      input.value = '';
      $('input[name="work-group"][value="all"]', archive).checked = true;
      all = true;
      applyFilter();
      input.focus();
    });
    applyFilter();
  }
  for (const album of $$('[data-album]')) {
    const links = $$('.frame-link', album);
    if (!links.length) continue;
    const prev = $('.prev-frame', album),
      next = $('.next-frame', album),
      reader = $('.album-reader', album),
      show = $('.original-frame', album),
      count = $('.reader-count', album);
    let current = 0;
    function update() {
      const item = links[current];
      show.href = item.href;
      count.textContent =
        item.textContent.trim() +
        ' из ' +
        links.length +
        ' · ' +
        item.parentElement.querySelector('small').textContent;
      show.setAttribute('aria-label', 'Открыть оригинал, ' + item.textContent.trim());
      prev.disabled = current === 0;
      next.disabled = current === links.length - 1;
    }
    function change(delta) {
      current = clamp(current + delta, 0, links.length - 1);
      update();
    }
    prev.addEventListener('click', () => change(-1));
    next.addEventListener('click', () => change(1));
    reader.hidden = false;
    update();
  }
  const form = $('#request-form');
  if (form) {
    const name = $('#customer'),
      phone = $('#phone'),
      brief = $('#brief'),
      success = $('#form-success');
    const invalid = (field, id, message) => {
      field.setAttribute('aria-invalid', 'true');
      $(id).textContent = message;
    };
    function clear(field, id) {
      field.removeAttribute('aria-invalid');
      $(id).textContent = '';
    }
    name.addEventListener('input', () => clear(name, '#err-name'));
    phone.addEventListener('input', () => clear(phone, '#err-phone'));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      clear(name, '#err-name');
      clear(phone, '#err-phone');
      if (name.value.trim().length < 2) invalid(name, '#err-name', 'Введите имя, минимум два символа.');
      const p = phone.value.trim(),
        digits = p.replace(/\D/g, '');
      if (!/^\+?[\d\s()\-]+$/.test(p) || digits.length < 7 || digits.length > 15)
        invalid(phone, '#err-phone', 'Укажите телефон с кодом, от 7 до 15 цифр.');
      const first = $('[aria-invalid="true"]', form);
      if (first) {
        first.focus();
        return;
      }
      $('.draft-text', success).textContent = [name.value.trim(), phone.value.trim(), brief.value.trim()]
        .filter(Boolean)
        .join('\n');
      form.hidden = true;
      success.hidden = false;
      success.focus();
    });
    $('#edit-draft').addEventListener('click', () => {
      form.hidden = false;
      success.hidden = true;
      brief.focus();
    });
    $('#new-draft').addEventListener('click', () => {
      form.reset();
      brief.value = '';
      $('.draft-text', success).textContent = '';
      clear(name, '#err-name');
      clear(phone, '#err-phone');
      form.hidden = false;
      success.hidden = true;
      name.focus();
    });
  }
})();
