/* 3D-кольца карты: настоящая плоскость кольца и тень планеты на ней.
   Экран — ортографическая проекция; свет — параллельный, от звезды на карте.
   Тень считается по сфере: точка кольца P в тени, если луч P→звезда проходит
   ближе радиуса планеты к её центру. Это тот же критерий, что в шейдере неба
   SpaceVoidSkyMixin (проекция на плоскость кольца), только без GPU. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;

  function smooth(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 1e-6)));
    return t * t * (3 - 2 * t);
  }

  /** rgba(...) или #rrggbb → [r,g,b,a]. */
  function parseColor(c) {
    const m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i.exec(c || '');
    if (m) return [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]];
    const h = /^#([0-9a-f]{6})$/i.exec(c || '');
    if (h) return [parseInt(h[1].slice(0, 2), 16), parseInt(h[1].slice(2, 4), 16), parseInt(h[1].slice(4, 6), 16), 1];
    return [180, 160, 110, 0.6];
  }

  /* Плоскость кольца: наклон к эклиптике и поворот вокруг нормали.
     roll=0 — кольцо горизонтально, как у Saturn на снимках. */
  const TILT = 0.98;   // rad; cos = 0.557 — тот же эллипс, что был у карты
  const ROLL = 0;

  /** Точка кольца (r, θ) в мире и её ортографическая экранная проекция. */
  function project(r, theta, opts) {
    const tilt = opts && opts.tilt != null ? opts.tilt : TILT;
    const roll = opts && opts.roll != null ? opts.roll : ROLL;
    const ct = Math.cos(tilt), st = Math.sin(tilt), cr = Math.cos(roll), sr = Math.sin(roll);
    const c = Math.cos(theta), s = Math.sin(theta);
    return {
      x: r * (c * cr - s * ct * sr),
      y: r * (c * sr + s * ct * cr),
      z: r * s * st,
    };
  }

  /**
   * 0…1 — насколько точка P в тени сферы радиуса R.
   * L — единичное направление на звезду в той же системе координат.
   * Точка тени: dot(P,L) < 0 (планета между кольцом и звездой) и
   * расстояние от P до луча к звезде меньше R.
   */
  function shadowAt(P, L, R, soft) {
    const dot = P.x * L.x + P.y * L.y + P.z * L.z;
    if (dot >= 0) return 0;
    const d2 = P.x * P.x + P.y * P.y + P.z * P.z - dot * dot;
    const d = Math.sqrt(Math.max(0, d2));
    const k = soft == null ? 0.16 : soft;
    return 1 - smooth(R * (1 - k), R * (1 + k), d);
  }

  function quad(ctx, a, b, c, d) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Нарисовать половину кольца.
   * @param ctx canvas 2D
   * @param x,y центр планеты
   * @param R радиус диска планеты
   * @param style {color,width,radius} из ringStyle()
   * @param starX,starY экранная звезда
   * @param back true — дальняя половина, false — ближняя
   * @param enabled если false — обычный плоский эллипс
   */
  function draw(ctx, x, y, R, style, starX, starY, back, enabled) {
    if (!enabled || !style || R < 5) return drawFlat(ctx, x, y, R, style, back);
    const inner = R * (style.radius - style.width * 0.5);
    const outer = R * (style.radius + style.width * 0.5);
    if (outer <= R * 1.01) return drawFlat(ctx, x, y, R, style, back);
    const color = parseColor(style.color);
    let dx = (starX == null ? x + 1 : starX) - x;
    let dy = (starY == null ? y : starY) - y;
    const dl = Math.hypot(dx, dy);
    if (dl < 1e-4) { dx = 1; dy = 0; } else { dx /= dl; dy /= dl; }
    const L = { x: dx, y: dy, z: 0 };
    const seg = R > 64 ? 168 : R > 28 ? 112 : R > 12 ? 72 : 48;
    const bands = style.width > 0.12 ? 4 : style.width > 0.055 ? 3 : 2;
    const bandAlpha = [1, 0.82, 0.64, 0.9];
    const gap = bands > 1 ? 0.08 : 0;
    const span = outer - inner;
    const tilt = TILT, roll = ROLL;
    const ct = Math.cos(tilt), st = Math.sin(tilt), cr = Math.cos(roll), sr = Math.sin(roll);

    for (let b = 0; b < bands; b++) {
      const r0 = inner + span * (b / bands + (b ? gap / bands : 0));
      const r1 = inner + span * ((b + 1) / bands - (b < bands - 1 ? gap / bands : 0));
      if (r1 - r0 < 0.15) continue;
      const alpha = color[3] * (bandAlpha[b] || 0.75);
      for (let i = 0; i < seg; i++) {
        const th0 = i / seg * TAU;
        const th1 = (i + 1) / seg * TAU + 0.0012; // нахлёст: нет щелей между квадами
        const mid = (th0 + th1) * 0.5;
        const zMid = Math.sin(mid) * st;
        if (back ? zMid >= 0 : zMid < 0) continue;
        const c0 = Math.cos(th0), s0 = Math.sin(th0);
        const c1 = Math.cos(th1), s1 = Math.sin(th1);
        const a = { x: x + r0 * (c0 * cr - s0 * ct * sr), y: y + r0 * (c0 * sr + s0 * ct * cr) };
        const bb = { x: x + r0 * (c1 * cr - s1 * ct * sr), y: y + r0 * (c1 * sr + s1 * ct * cr) };
        const cc = { x: x + r1 * (c1 * cr - s1 * ct * sr), y: y + r1 * (c1 * sr + s1 * ct * cr) };
        const dd = { x: x + r1 * (c0 * cr - s0 * ct * sr), y: y + r1 * (c0 * sr + s0 * ct * cr) };
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
        quad(ctx, a, bb, cc, dd);
        const rm = (r0 + r1) * 0.5;
        const P = {
          x: rm * (Math.cos(mid) * cr - Math.sin(mid) * ct * sr),
          y: rm * (Math.cos(mid) * sr + Math.sin(mid) * ct * cr),
          z: rm * Math.sin(mid) * st,
        };
        const sh = shadowAt(P, L, R * 0.98, 0.20);
        if (sh > 0.01) {
          ctx.fillStyle = `rgba(0,0,0,${0.66 * sh * (bandAlpha[b] || 0.8)})`;
          quad(ctx, a, bb, cc, dd);
        }
      }
    }
  }

  /** Старый плоский эллипс — для далёкого вида и выключенного 3D. */
  function drawFlat(ctx, x, y, R, style, back) {
    if (!style) return;
    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = Math.max(0.8, R * style.width);
    ctx.beginPath();
    if (back) ctx.ellipse(x, y, R * style.radius, R * 0.54, 0, Math.PI, Math.PI * 2);
    else ctx.ellipse(x, y, R * style.radius, R * 0.54, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  window.EURings3D = { draw, drawFlat, project, shadowAt, TILT, ROLL, version: 1 };
})();
