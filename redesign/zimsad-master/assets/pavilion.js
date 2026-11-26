/* Axonometric conservatory. Geometry is shared by the static first paint and the interactive canvas. */
(function (global) {
  'use strict';
  const A = -3.03,
    B = 3.03,
    N = -1.55,
    F = 1.55,
    wall = 2.03,
    peak = 3.12;
  const shapes = [];
  let active = 'body';
  function polygon(points, color, edge = '', width = 1) {
    shapes.push({ points, color, edge, width, layer: active, closed: true });
  }
  function line(points, color, width = 1) {
    shapes.push({ points, color: '', edge: color, width, layer: active, closed: false });
  }
  function brick(x1, z1, x2, z2, y1, y2, top, front, side, edge = '') {
    polygon(
      [
        [x1, y1, z1],
        [x1, y2, z1],
        [x1, y2, z2],
        [x1, y1, z2],
      ],
      side,
      edge,
    );
    polygon(
      [
        [x1, y1, z2],
        [x1, y2, z2],
        [x2, y2, z2],
        [x2, y1, z2],
      ],
      front,
      edge,
    );
    polygon(
      [
        [x1, y2, z1],
        [x2, y2, z1],
        [x2, y2, z2],
        [x1, y2, z2],
      ],
      top,
      edge,
    );
  }
  function frame(points, w = 2.5) {
    line(points, '#284c48', w);
    line(
      points.map(([x, y, z]) => [x, y + 0.012, z]),
      '#95aca0',
      Math.max(0.55, w * 0.23),
    );
  }
  function ellipse(x, y, z, rx, rz, color, edge = '', w = 0.7) {
    polygon(
      Array.from({ length: 24 }, (_, i) => [
        x + rx * Math.cos((i * Math.PI) / 12),
        y,
        z + rz * Math.sin((i * Math.PI) / 12),
      ]),
      color,
      edge,
      w,
    );
  }
  // The slate foundation, paved terrace and its projecting entrance steps.
  polygon(
    [
      [A - 0.34, -0.13, N - 0.14],
      [B + 0.17, -0.13, N - 0.14],
      [B + 1.22, -0.13, F + 0.48],
      [A + 0.07, -0.13, F + 0.86],
    ],
    'rgba(66,88,65,.19)',
  );
  brick(A - 0.16, N - 0.16, B + 0.16, F + 0.16, -0.21, 0.05, '#cfccad', '#a8a486', '#b3b49b', '#697e70');
  brick(A - 0.11, N - 0.1, B + 0.11, F + 0.1, 0.05, 0.13, '#dfd7b8', '#c2bda2', '#9dada1', '#859285');
  for (let x = A; x < B; x += 0.43)
    line(
      [
        [x, 0.135, N],
        [x, 0.135, F],
      ],
      '#b3b39d',
      0.58,
    );
  for (let z = N; z < F; z += 0.46)
    line(
      [
        [A, 0.135, z],
        [B, 0.135, z],
      ],
      '#bbc0ab',
      0.55,
    );
  for (let i = 0; i < 3; i++)
    brick(
      -0.82,
      F + 0.08,
      0.87,
      F + 0.69 - i * 0.16,
      -0.22,
      -0.13 + i * 0.09,
      '#d6d0b4',
      '#b1ad91',
      '#aaa98f',
      '#8c9787',
    );
  // Rear glass walls and their framing, drawn before the furnishings.
  const bays = 7,
    longX = Array.from({ length: bays + 1 }, (_, i) => A + ((B - A) * i) / bays);
  const ends = Array.from({ length: 5 }, (_, i) => N + ((F - N) * i) / 4);
  const height = (z) => wall + (peak - wall) * (1 - (Math.abs(z) / (F - N)) * 2);
  polygon(
    [
      [A, 0.14, N],
      [B, 0.14, N],
      [B, wall, N],
      [A, wall, N],
    ],
    'rgba(154,194,176,.34)',
  );
  polygon(
    [
      [B, 0.14, N],
      [B, 0.14, F],
      [B, wall, F],
      [B, peak, 0],
      [B, wall, N],
    ],
    'rgba(118,163,147,.32)',
  );
  for (const x of longX)
    frame(
      [
        [x, 0.13, N],
        [x, wall, N],
      ],
      1.9,
    );
  for (const z of ends)
    frame(
      [
        [B, 0.13, z],
        [B, height(z), z],
      ],
      1.9,
    );
  frame(
    [
      [A, 1.49, N],
      [B, 1.49, N],
    ],
    1.55,
  );
  frame(
    [
      [B, 1.49, N],
      [B, 1.49, F],
    ],
    1.55,
  );
  // Furnishings and botanical silhouettes sit behind the front glass.
  let seed = 3083;
  function random() {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  }
  function pot(x, z, r, tall) {
    const y = 0.15,
      top = y + tall;
    const base = [],
      rim = [];
    for (let i = 0; i < 24; i++) {
      const a = (Math.PI * i) / 12;
      base.push([x + Math.cos(a) * r * 0.68, y, z + Math.sin(a) * r * 0.68]);
      rim.push([x + Math.cos(a) * r, top, z + Math.sin(a) * r]);
    }
    polygon([...rim.slice(0, 14), ...base.slice(0, 14).reverse()], '#b38b60', '#736c52', 0.7);
    ellipse(x, top, z, r, r, '#735e43', '#9e825e');
    return top;
  }
  function shrub(x, z, size, n, dense = false) {
    const y = pot(x, z, 0.19 * size, 0.36 * size);
    const colors = ['#476f4c', '#6a8a56', '#829963', '#34705b', '#597e50', '#8da36d'];
    for (let i = 0; i < n; i++) {
      const a = random() * Math.PI * 2,
        spread = (0.26 + random() * 0.6) * size;
      const dx = Math.cos(a) * spread,
        dz = Math.sin(a) * spread;
      const top = y + (0.38 + random() * (dense ? 0.75 : 1.14)) * size,
        mid = y + (top - y) * 0.71,
        w = 0.049 * size;
      const tip = [x + dx, top, z + dz],
        tip2 = [x + dx * 0.5, mid + w * 2, z + dz * 0.5],
        stem = [x, y, z];
      polygon(
        [
          stem,
          [x + dx * 0.3 + Math.sin(a) * w, mid - 0.12 * size, z + dz * 0.3 + Math.cos(a) * w],
          tip2,
          tip,
          [x + dx * 0.62 - Math.sin(a) * w, mid, z + dz * 0.62 - Math.cos(a) * w],
        ],
        colors[i % colors.length],
      );
      line([stem, tip2, tip], 'rgba(43,84,59,.49)', 0.62);
      if (dense) {
        for (let j = 1; j <= 6; j++) {
          const t = j / 8,
            et = (j + 1.5) / 9,
            bx = x + dx * t,
            by = y + (top - y) * t,
            bz = z + dz * t,
            l = 0.16 * (1 - t) * size;
          for (const s of [-1, 1])
            polygon(
              [
                [bx, by, bz],
                [x + dx * et + s * Math.sin(a) * l, by + l, z + dz * et + s * Math.cos(a) * l],
                [bx + dx * 0.05, by + 0.07, bz + dz * 0.05],
              ],
              colors[(i + j) % colors.length],
            );
        }
      }
    }
  }
  function palm(x, z, size) {
    const y = pot(x, z, 0.245 * size, 0.49 * size),
      top = y + 1.12 * size;
    line(
      [
        [x, y, z],
        [x - 0.04, top, z],
      ],
      '#756b4d',
      3.4,
    );
    for (let i = 0; i < 15; i++) {
      const a = i * 2.4,
        reach = (0.53 + random() * 0.35) * size,
        up = (0.32 + random() * 0.35) * size;
      const stem = [];
      for (let j = 0; j <= 12; j++) {
        const t = j / 12;
        stem.push([
          x + Math.cos(a) * reach * t,
          top + up * Math.sin(t * 2.85) - 0.15 * t,
          z + Math.sin(a) * reach * t,
        ]);
      }
      line(stem, '#3f6953', 1.2);
      for (let j = 2; j < 12; j++) {
        const [bx, by, bz] = stem[j],
          w = (0.15 * Math.sin((j * Math.PI) / 13) + 0.07) * size;
        for (const s of [-1, 1])
          polygon(
            [
              [bx, by, bz],
              [
                bx + Math.cos(a) * 0.1 + s * Math.sin(a) * w,
                by - 0.16 * size,
                bz + Math.sin(a) * 0.1 - s * Math.cos(a) * w,
              ],
              stem[j + 1],
            ],
            j % 2 ? '#517950' : '#71915b',
          );
      }
    }
  }
  palm(1.77, -0.86, 1.0);
  shrub(2.45, -0.13, 0.83, 28, true);
  shrub(0.77, -0.98, 0.86, 29);
  palm(-1.98, -0.84, 0.85);
  // Central bench with timber slats.
  brick(-0.91, -0.85, 0.5, -0.45, 0.52, 0.6, '#b48e62', '#937554', '#897651');
  for (const x of [-0.78, 0.37])
    for (const z of [-0.78, -0.52])
      line(
        [
          [x, 0.14, z],
          [x, 0.53, z],
        ],
        '#506656',
        2.7,
      );
  for (let x = -0.85; x < 0.5; x += 0.115)
    line(
      [
        [x, 0.6, -0.84],
        [x, 0.6, -0.45],
      ],
      '#775f48',
      0.65,
    );
  shrub(-2.33, 0.49, 0.8, 22, true);
  shrub(2.34, 0.77, 0.69, 17);
  shrub(-1.13, 0.9, 0.46, 16, true);
  // Alternate front panes, opening doors, mullions and little continuous transoms.
  for (let i = 0; i < bays; i++) {
    const x1 = longX[i],
      x2 = longX[i + 1];
    polygon(
      [
        [x1, 0.15, F],
        [x2, 0.15, F],
        [x2, wall, F],
        [x1, wall, F],
      ],
      i % 3 === 1 ? 'rgba(181,217,205,.24)' : 'rgba(210,231,222,.20)',
    );
    if (i % 3 !== 1)
      polygon(
        [
          [x1 + 0.02, 1.79, F],
          [x2 - 0.1, wall, F],
          [x2 - 0.02, wall, F],
          [x1 + 0.02, 1.41, F],
        ],
        'rgba(248,250,224,.26)',
      );
  }
  for (const x of longX)
    frame(
      [
        [x, 0.13, F],
        [x, wall, F],
      ],
      3.35,
    );
  frame(
    [
      [A, 0.16, F],
      [B, 0.16, F],
    ],
    3.6,
  );
  frame(
    [
      [A, 1.49, F],
      [B, 1.49, F],
    ],
    2.4,
  );
  frame(
    [
      [A, wall, F],
      [B, wall, F],
    ],
    4,
  );
  frame(
    [
      [A, wall, N],
      [B, wall, N],
    ],
    3.3,
  );
  const dx1 = longX[3] + 0.06,
    dx2 = longX[4] - 0.06;
  frame(
    [
      [dx1, 0.17, F + 0.012],
      [dx1, 1.48, F + 0.012],
      [dx2, 1.48, F + 0.012],
      [dx2, 0.17, F + 0.012],
      [dx1, 0.17, F + 0.012],
    ],
    1.7,
  );
  line(
    [
      [dx2 - 0.09, 0.78, F + 0.03],
      [dx2 - 0.09, 0.84, F + 0.03],
    ],
    '#ac8552',
    2.6,
  );
  polygon(
    [
      [A, 0.15, N],
      [A, 0.15, F],
      [A, wall, F],
      [A, peak, 0],
      [A, wall, N],
    ],
    'rgba(153,200,184,.23)',
  );
  for (const z of ends)
    frame(
      [
        [A, 0.14, z],
        [A, height(z), z],
      ],
      2.7,
    );
  frame(
    [
      [A, 0.16, N],
      [A, 0.16, F],
    ],
    3.3,
  );
  frame(
    [
      [A, 1.49, N],
      [A, 1.49, F],
    ],
    2.3,
  );
  frame(
    [
      [A, wall, N],
      [A, wall, F],
    ],
    2.7,
  );
  // The two roof pitches have distinct transmission, edge bands and roof vents.
  active = 'roof';
  for (const side of [-1, 1]) {
    const z = side * F;
    for (let i = 0; i < bays; i++) {
      const x1 = longX[i],
        x2 = longX[i + 1];
      polygon(
        [
          [x1, wall, z],
          [x2, wall, z],
          [x2, peak, 0],
          [x1, peak, 0],
        ],
        side < 0 ? 'rgba(128,183,172,.43)' : i % 2 ? 'rgba(163,207,196,.46)' : 'rgba(194,226,212,.40)',
      );
      polygon(
        [
          [x1 + 0.04, wall + 0.045, z * 0.96],
          [x1 + 0.14, wall + 0.045, z * 0.96],
          [x2 - 0.25, peak - 0.035, z * 0.035],
          [x2 - 0.37, peak - 0.035, z * 0.035],
        ],
        'rgba(252,249,221,.29)',
      );
    }
    for (const x of longX)
      frame(
        [
          [x, wall + 0.012, z],
          [x, peak + 0.012, 0],
        ],
        3.0,
      );
    frame(
      [
        [A, wall + 0.015, z],
        [B, wall + 0.015, z],
      ],
      4.1,
    );
    const midz = z * 0.52;
    frame(
      [
        [A, height(midz), midz],
        [B, height(midz), midz],
      ],
      2.0,
    );
  }
  frame(
    [
      [A - 0.045, peak + 0.02, 0],
      [B + 0.045, peak + 0.02, 0],
    ],
    4.3,
  );
  const vx = longX[4] + 0.045,
    vx2 = longX[5] - 0.045;
  polygon(
    [
      [vx, height(0.8) + 0.135, 0.8],
      [vx2, height(0.8) + 0.135, 0.8],
      [vx2, height(0.06) + 0.025, 0.06],
      [vx, height(0.06) + 0.025, 0.06],
    ],
    'rgba(132,180,168,.50)',
    '#375d53',
    1.7,
  );
  line(
    [
      [vx, height(0.77), 0.77],
      [vx, height(0.77) + 0.12, 0.77],
    ],
    '#416158',
    1.1,
  );
  function projector(yaw, tilt, lift) {
    const c = Math.cos(yaw),
      s = Math.sin(yaw),
      ct = Math.cos(tilt),
      st = Math.sin(tilt);
    return ([x, y, z], roof) => [
      333 + 76 * (x * c + z * s),
      288 + 76 * ((-x * s + z * c) * st - (y + (roof ? lift : 0)) * ct),
    ];
  }
  function render(canvas, yaw = 0.53, tilt = 0.365, lift = 0) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(canvas.width / 660, 0, 0, canvas.height / 420, 0, 0);
    ctx.clearRect(0, 0, 660, 420);
    const project = projector(yaw, tilt, lift);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const shape of shapes) {
      ctx.beginPath();
      shape.points.forEach((pt, i) => {
        const [x, y] = project(pt, shape.layer === 'roof');
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      if (shape.closed) ctx.closePath();
      if (shape.color) {
        ctx.fillStyle = shape.color;
        ctx.fill();
      }
      if (shape.edge) {
        ctx.strokeStyle = shape.edge;
        ctx.lineWidth = shape.width;
        ctx.stroke();
      }
    }
  }
  function svg() {
    const project = projector(0.53, 0.365, 0);
    const inner = shapes
      .map((shape) => {
        const points = shape.points
          .map((p) =>
            project(p, shape.layer === 'roof')
              .map((i) => i.toFixed(1))
              .join(','),
          )
          .join(' ');
        return (
          '<' +
          (shape.closed ? 'polygon' : 'polyline') +
          ' points="' +
          points +
          '" fill="' +
          (shape.color || 'none') +
          '"' +
          (shape.edge ? ' stroke="' + shape.edge + '" stroke-width="' + shape.width + '"' : '') +
          '/>'
        );
      })
      .join('');
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 420" stroke-linecap="round" stroke-linejoin="round">' +
      inner +
      '</svg>'
    );
  }
  if (typeof module === 'object' && module.exports) module.exports = { svg };
  else global.Pavilion = { render };
})(typeof window === 'object' ? window : {});
