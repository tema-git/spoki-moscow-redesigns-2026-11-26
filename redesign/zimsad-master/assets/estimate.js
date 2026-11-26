(() => {
  'use strict';
  const form = document.getElementById('estimator');
  if (!form) return;
  const el = (id) => document.getElementById(id);
  const num = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const money = (value) => num.format(value) + ' ₽';
  const rates = {
    equal: [38000, 36000, 34000, 31000],
    large: [45000, 38000, 36000, 32000],
    small: [37000, 35000, 32000, 30000],
  };
  const ratios = {
    equal: 'Крыша и фасады сопоставимы',
    large: 'Крыша значительно больше фасадов',
    small: 'Крыша значительно меньше фасадов',
  };
  const openings = [
    ['sash', 'Створки КПТ-74', 34000],
    ['door', 'Двери КПТ-74', 39000],
    ['pask', 'Schüco PASK', 95000],
    ['hatch', 'Люки GEZE', 45000],
  ];
  const labels = ['до 25 м²', '25–50 м²', '50–100 м²', 'свыше 100 м²'];
  const output = el('estimate-result').querySelector('.estimate-output'),
    initial = output.innerHTML;
  const selected = (name) => form.querySelector('input[name="' + name + '"]:checked').value;
  const choose = (name, value) => {
    form.querySelector('input[name="' + name + '"][value="' + value + '"]').checked = true;
  };
  const two = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
  let last = '',
    derived = '',
    previousTransfer = '';
  function number(id, emptyAllowed = false) {
    const field = el(id),
      s = field.value.trim().replace(',', '.');
    if (emptyAllowed && s === '') return 0;
    if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(s) || !Number.isFinite(Number(s))) return NaN;
    return Number(s);
  }
  function showError(id, field, message) {
    el(id).textContent = message;
    if (field) {
      for (let a = field.parentElement; a && a !== form; a = a.parentElement)
        if (a.tagName === 'DETAILS') a.open = true;
      field.setAttribute('aria-invalid', 'true');
      field.focus();
    }
  }
  function clear() {
    last = '';
    output.innerHTML = initial;
    el('estimate-error').textContent = '';
    for (const f of form.querySelectorAll('[aria-invalid]')) f.removeAttribute('aria-invalid');
  }
  form.addEventListener('input', (event) => {
    clear();
    el('dim-error').textContent = '';
    if (['roof', 'facade'].includes(event.target.id) || event.target.name === 'shape') derived = '';
  });
  el('dimensions').addEventListener('click', () => {
    const ids = ['dim-length', 'dim-width', 'dim-high', 'dim-low'];
    const values = ids.map((id) => number(id));
    const bad = values.findIndex((x) => !Number.isFinite(x) || x <= 0);
    if (bad >= 0) {
      showError(
        'dim-error',
        el(ids[bad]),
        'Введите положительный размер в метрах, до двух знаков после запятой.',
      );
      return;
    }
    const [length, width, high, low] = values;
    if (high < low) {
      showError('dim-error', el('dim-high'), 'Высота у стены должна быть не ниже высоты снаружи.');
      return;
    }
    const roof = two(length * Math.hypot(width, high - low)),
      facade = two(length * low + width * (high + low));
    if (roof === 0 || facade === 0 || !Number.isSafeInteger(Math.round(100 * (roof + facade)))) {
      showError('dim-error', el('dim-length'), 'Проверьте размеры пристройки и единицы измерения.');
      return;
    }
    clear();
    el('roof').value = String(roof).replace('.', ',');
    el('facade').value = String(facade).replace('.', ',');
    choose('shape', 'Пристройка к дому');
    derived =
      'Односкатная пристройка. Длина ' +
      num.format(length) +
      ' м, вынос ' +
      num.format(width) +
      ' м, высоты у дома и снаружи ' +
      num.format(high) +
      ' и ' +
      num.format(low) +
      ' м. Площади по геометрии округлены до 0,01 м².';
    el('dim-error').textContent = 'Подставлены площади. Проверьте соотношение крыши и фасадов.';
    el('roof').focus();
  });
  function brackets(area) {
    if (area === 25) return [0, 1];
    if (area === 50) return [1, 2];
    if (area < 25) return [0];
    if (area < 50) return [1];
    if (area <= 100) return [2];
    return [3];
  }
  function span(values, fn) {
    const sorted = [...new Set(values)].sort((a, b) => a - b);
    return sorted.length === 1 ? fn(sorted[0]) : fn(sorted[0]) + ' – ' + fn(sorted[sorted.length - 1]);
  }
  function node(tag, content, className) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    n.textContent = content;
    return n;
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clear();
    const roof = number('roof'),
      facade = number('facade'),
      area = two(roof + facade);
    for (const [id, value] of [
      ['roof', roof],
      ['facade', facade],
    ]) {
      if (!Number.isFinite(value) || value <= 0) {
        showError(
          'estimate-error',
          el(id),
          'Укажите площадь больше нуля в м², до двух десятичных знаков. Для отдельного фасада или фонаря применимость прайса уточняет мастерская.',
        );
        return;
      }
    }
    const ratio = selected('ratio');
    if ((ratio === 'large' && roof <= facade) || (ratio === 'small' && roof >= facade)) {
      showError(
        'estimate-error',
        form.querySelector('input[name="ratio"]:checked'),
        'Выбранная строка противоречит площадям. Проверьте соотношение крыши и фасадов.',
      );
      return;
    }
    const sketch = el('sketch').value.trim();
    if (sketch && !/^(?:[1-9]|1[0-4])$/.test(sketch)) {
      showError(
        'estimate-error',
        el('sketch'),
        'Укажите номер эскиза от 1 до 14 или оставьте поле пустым.',
      );
      return;
    }
    const preferences = [...form.querySelectorAll('input[name="preferences"]:checked')].map((i) => i.value);
    if (preferences.includes('Готовое основание') && preferences.includes('Нужно основание')) {
      showError(
        'estimate-error',
        form.querySelector('input[value="Нужно основание"]'),
        'Выберите один вариант основания.',
      );
      return;
    }
    const wishes = [
      sketch ? 'Эскиз мастерской № ' + sketch + '.' : '',
      preferences.length ? 'Для обсуждения отдельно: ' + preferences.join(', ') + '.' : '',
    ].filter(Boolean);
    const spec = [],
      extras = {};
    let surcharge = 0;
    for (const [id, label, rate] of openings) {
      const qty = number(id, true);
      if (!Number.isFinite(qty)) {
        showError('estimate-error', el(id), 'Укажите площадь изделия в м² или оставьте поле пустым.');
        return;
      }
      extras[id] = qty;
      if (qty > 0) {
        surcharge = two(surcharge + qty * rate);
        spec.push(
          label + ' · ' + num.format(qty) + ' м² × ' + money(rate) + '/м² = ' + money(two(qty * rate)),
        );
      }
    }
    if (two(extras.sash + extras.door + extras.pask) > facade || extras.hatch > roof) {
      const wrong =
        extras.hatch > roof ? 'hatch' : openings.find(([id]) => id !== 'hatch' && extras[id] > 0)[0];
      showError(
        'estimate-error',
        el(wrong),
        'Площадь люков должна помещаться в крышу, а суммарная площадь створок и дверей — в фасады.',
      );
      return;
    }
    const col = brackets(area),
      system = selected('system'),
      brand = system === 'sial' ? '«Сиал» КП-50К' : 'Schüco';
    const rate = col.map((i) => rates[ratio][i] * (system === 'schuco' ? 1.5 : 1)),
      base = rate.map((r) => two(r * area)),
      total = base.map((b) => two(b + surcharge));
    if (total.some((value) => !Number.isSafeInteger(Math.round(value * 100)))) {
      showError(
        'estimate-error',
        el('roof'),
        'Значение слишком велико для точного расчёта. Проверьте размер и единицы площади.',
      );
      return;
    }
    const boundary =
      col.length > 1
        ? 'На границе ' +
          num.format(area) +
          ' м² прайс допускает две соседние ставки. Применимую строку площади уточнит мастерская.'
        : '';
    const profileNote =
      system === 'schuco'
        ? 'Для Schüco применён средний коэффициент 1,5 только к базовой ставке. Точная стоимость зависит от выбранного профиля.'
        : '';
    const parts = [
      ['Остекление', num.format(area) + ' м²'],
      ['Ставка', span(rate, money) + '/м²'],
      ['Базовая стоимость', span(base, money)],
      ['Проёмы без стекла', money(surcharge)],
    ];
    output.replaceChildren(
      node('p', 'Ориентир по прайсу', 'sum-label'),
      node('strong', span(total, money), 'sum'),
    );
    const dl = document.createElement('dl');
    dl.className = 'calc-lines';
    for (const [title, value] of parts) {
      const row = document.createElement('div');
      row.append(node('dt', title), node('dd', value));
      dl.append(row);
    }
    output.append(dl);
    for (const text of [
      ratios[ratio] + '. Диапазон площади: ' + col.map((i) => labels[i]).join(' и ') + '.',
      ...spec,
      boundary,
      profileNote,
      derived,
      ...wishes,
    ])
      if (text) output.append(node('p', text, 'calc-foot'));
    last = [
      selected('shape') + '. ' + brand + '.',
      'Крыша ' + num.format(roof) + ' м², фасады ' + num.format(facade) + ' м². ' + ratios[ratio] + '.',
      'Общая площадь ' + num.format(area) + ' м². Применённая ставка ' + span(rate, money) + '/м².',
      'База ' + span(base, money) + '. Проёмы без стекла ' + money(surcharge) + '.',
      ...spec,
      'Предварительный итог ' + span(total, money) + '.',
      boundary,
      profileNote,
      derived,
      ...wishes,
    ]
      .filter(Boolean)
      .join('\n');
    const transfer = node('button', 'Перенести в черновик', 'button teal');
    transfer.type = 'button';
    transfer.id = 'transfer';
    transfer.insertAdjacentHTML(
      'beforeend',
      '<svg class="arrow" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.65"/></svg>',
    );
    output.append(transfer);
    el('estimate-result').focus();
  });
  output.addEventListener('click', (event) => {
    if (!event.target.closest('#transfer') || !last) return;
    const brief = el('brief');
    let other = brief.value.trim();
    if (previousTransfer && other.includes(previousTransfer))
      other = other.replace(previousTransfer, '').trim();
    brief.value = [other, last].filter(Boolean).join('\n\n');
    previousTransfer = last;
    el('request-form').hidden = false;
    el('form-success').hidden = true;
    location.hash = 'request';
    el('brief').focus({ preventScroll: true });
    el('request').scrollIntoView({ block: 'start' });
  });
  el('reset-calc').addEventListener('click', () => {
    const brief = el('brief');
    if (previousTransfer && brief.value.includes(previousTransfer))
      brief.value = brief.value.replace(previousTransfer, '').trim();
    previousTransfer = '';
    form.reset();
    for (const fold of form.querySelectorAll('details')) fold.open = false;
    derived = '';
    el('dim-error').textContent = '';
    clear();
    el('roof').focus();
  });
  const seeds = JSON.parse(document.getElementById('work-seeds')?.textContent || '{}');
  const seed = seeds[new URLSearchParams(location.search).get('object')];
  if (seed) {
    el('roof').value = '';
    el('facade').value = '';
    const note = node(
      'p',
      'Пример из каталога: ' +
        seed[0] +
        (seed[1] ? ' · ' + seed[1] + ' м² остекления' : '') +
        '. Для своего расчёта укажите отдельно площади крыши и фасадов.',
      'seed-note',
    );
    form.prepend(note);
    el('brief').value = 'Ориентир из каталога: ' + seed[0] + '.';
  }
})();
