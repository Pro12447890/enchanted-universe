/* ═════════════════════════════════════════════════════════════════════════════
   js/orbits.js — единая публичная библиотека орбит сайта (Петровские реформы).
   Одна и та же геометрия для отрисовки, попадания курсором и слежения.

   Численный контракт Java (НЕ менять по своему вкусу):
     rateRadiansPerSecond = 0.04 / sqrt(max(0.01, meanRadiusAu))
     periodTicks          = (2π / 0.04) * sqrt(max(0.01, meanRadiusAu)) * 20   (double, без round)
     initialMeanAnomaly   = FNV1a32(десятичная signed-строка seed) / 2^32 * 2π
     угол(t)              = initialMeanAnomaly + 2π * (ticks - epochTicks) / periodTicks
   Это существующая скорость карты Minecraft, а не закон Кеплера: астрономический
   период сюда подставлять нельзя.

   Эксцентриситеты, наклонения и узлы — ТОЛЬКО для веба: игра остаётся круговой.
   Солнечная система берёт реальные e/i (NASA fact sheet, по списку заказчика) и
   реальные Ω/ω (JPL SSD «Approximate Positions», Pluto и карлики — JPL SBDB).
   Вымышленные системы получают детерминированные e/i/node/arg из seed планеты без
   дополнительных RNG-вызовов генератора.
   ═════════════════════════════════════════════════════════════════════════════ */
'use strict';
(function () {
  const TAU = Math.PI * 2;
  const TICKS_PER_SECOND = 20;      // тиков Minecraft в реальной секунде карты
  const RATE_1AU = 0.04;            // рад/с при 1 а.е. — контракт Java
  const E_CAP = 0.10;               // потолок эксцентриситета вымышленных орбит
  const AU_WORLD_MAX = 2.75;        // радиус самой внешней орбиты системы в мире
  const MAP_Y = 0.86;               // сжатие карты по вертикали (как было на сайте)
  const MAP_Z = 0.55;               // вклад высоты над плоскостью орбиты
  const DEG = Math.PI / 180;

  /* ── FNV-1a 32: тот же hash, что в Java OrbitElements.unit ─────────────────── */
  const utf8 = (typeof TextEncoder !== 'undefined') ? new TextEncoder() : null;
  function fnv1a32(text) {
    let h = 0x811c9dc5 >>> 0;
    if (utf8) {
      const bytes = utf8.encode(String(text));
      for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193) >>> 0; }
    } else {
      const s = String(text);
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) & 0xff; h = Math.imul(h, 0x01000193) >>> 0; }
    }
    return h >>> 0;
  }
  /** unit(key) = FNV1a32(key) / 2^32 — ровно как OrbitElements.unit в Java. */
  function unit(key) { return fnv1a32(key) / 4294967296; }
  /** Начальная фаза планеты: FNV1a32(decimal signed seed) / 2^32 * 2π. */
  function seedPhase(seed) { return unit(String(seed)) * TAU; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function periodTicksFor(meanAu) {
    return (TAU / RATE_1AU) * Math.sqrt(Math.max(0.01, meanAu)) * TICKS_PER_SECOND;
  }
  function rateFor(meanAu) { return RATE_1AU / Math.sqrt(Math.max(0.01, meanAu)); }

  /* ── Реальные элементы Солнечной системы ────────────────────────────────────
     e/i: NASA Planetary Fact Sheet (округления из ТЗ).
     Ω (node) и ω (argument): JPL SSD Approximate Positions, Table 1 (J2000),
     ω = ϖ − Ω. Pluto и карликовые планеты — JPL SBDB API (J2000):
       Pluto 134340, Ceres 1, Haumea 136108, Quaoar 50000,
       Makemake 136472, Eris 136199.
     a для солнечных = старый orbitAu из SpaceGenerator (контракт).            */
  const SOLAR = {
    'Меркурий': { e: 0.206, i: 7.0,  node: 48.33076593, arg: 29.12703035 },
    'Венера':   { e: 0.007, i: 3.4,  node: 76.67984255, arg: 54.92262463 },
    'Земля':    { e: 0.017, i: 0.0,  node: 0.0,         arg: 102.93768193 },
    'Марс':     { e: 0.094, i: 1.8,  node: 49.55953891, arg: 286.49684850 },
    'Церера':   { e: 0.0797, i: 10.6, node: 80.2,       arg: 73.3 },
    'Юпитер':   { e: 0.049, i: 1.3,  node: 100.47390909, arg: 274.25457074 },
    'Сатурн':   { e: 0.052, i: 2.5,  node: 113.66242448, arg: 338.93645383 },
    'Уран':     { e: 0.047, i: 0.8,  node: 74.01692503, arg: 96.93735127 },
    'Нептун':   { e: 0.010, i: 1.8,  node: 131.78422574, arg: 273.18053653 },
    'Плутон':   { e: 0.244, i: 17.2, node: 110,         arg: 114 },
    'Хаумеа':   { e: 0.194, i: 28.2, node: 122,         arg: 241 },
    'Кваоар':   { e: 0.0352, i: 7.99, node: 189,        arg: 163 },
    'Макемаке': { e: 0.159, i: 29.0, node: 79.3,        arg: 297 },
    'Эрида':    { e: 0.438, i: 43.9, node: 36,          arg: 151 }
  };

  /* ── Кэши: ключ — объект системы/планеты, при перегенерации они новые ────── */
  const SYSTEM_ELEMENTS = new WeakMap();
  const PLANET_ELEMENT = new WeakMap();

  function isSolar(system) {
    return !!system && (system.formalName === 'Sol' || system.name === 'Солнечная система');
  }
  function meanAu(p) {
    const v = Number(p && p.orbitAu);
    return Number.isFinite(v) && v > 0 ? v : 0.1;
  }

  /** e вымышленной планеты: около соседей в умеренной зоне почти 0,
      у далёких и изолированных больше. Только seed и соседние средние радиусы.
      spacing = min |a_j − a_i| по ВСЕМ другим планетам / a_i (без cap 1):
      у изолированной планеты gap = Infinity → spacing 1, у совпавших a — 0.
      Именно так Java считает nearestGap/radius. */
  function generatedE(planet, planets, index) {
    const a = meanAu(planet);
    let gap = Infinity;
    for (let j = 0; j < planets.length; j++) {
      if (j === index) continue;
      gap = Math.min(gap, Math.abs(meanAu(planets[j]) - a));
    }
    const spacing = Number.isFinite(gap) ? gap / a : 1;
    const far = clamp((a - 1.0) / 2.5, 0, 1);
    const iso = clamp((spacing - 0.5) / 1.5, 0, 1);
    const hz = a >= 0.66 && a <= 1.5;
    const base = (hz && spacing < 0.55) ? 0.0025 : 0.012 + 0.055 * far + 0.030 * iso;
    const s = String(planet.seed);
    const seeded = 0.70 + 0.30 * unit(s + '|e');
    const jitter = 0.003 * (unit(s + '|ej') - 0.5);
    return clamp(base * seeded + jitter, 0.001, E_CAP);
  }

  function baseElement(system, planet, index, planets) {
    const mean = meanAu(planet);
    const imported = planet.orbitData && typeof planet.orbitData === 'object';
    const solar = !imported && isSolar(system) && SOLAR[planet.name];
    const seeded = seedPhase(planet.seed);
    let e, iRad, nodeRad, argRad, a, m0, period, epoch, gameR, real = false, source = '';
    gameR = mean;
    if (imported) {
      const od = planet.orbitData;
      e = clamp(Number(od.eccentricity) || 0, 0, 0.95);
      iRad = (Number(od.inclinationDeg) || 0) * DEG;
      nodeRad = (Number(od.ascendingNodeDeg) || 0) * DEG;
      argRad = (Number(od.argumentPeriapsisDeg) || 0) * DEG;
      a = Number(od.semiMajorAxisAu);
      if (!(a > 0)) a = mean;
      m0 = Number(od.initialMeanAnomaly);
      if (!Number.isFinite(m0)) m0 = seeded;
      // gameRadiusAu — радиус ИГРОВОЙ (круговой) орбиты; meanRadiusAu остаётся
      // климатическим/средним. У пары NCS-3301 2 они намеренно разные.
      gameR = Number(od.gameRadiusAu);
      if (!(gameR > 0)) gameR = Number(od.meanRadiusAu) || mean;
      period = Number(od.periodTicks);
      if (!(period > 0)) period = periodTicksFor(gameR);
      epoch = Number(od.epochTicks) || 0;
      real = true; source = 'server';
    } else if (solar) {
      e = solar.e;
      iRad = solar.i * DEG;
      nodeRad = solar.node * DEG;
      argRad = solar.arg * DEG;
      a = mean;
      m0 = seeded;
      period = periodTicksFor(mean);
      epoch = 0;
      real = true; source = 'nasa';
    } else {
      e = generatedE(planet, planets, index);
      iRad = (0.6 + 2.4 * unit(String(planet.seed) + '|incl')) * DEG;
      nodeRad = unit(String(planet.seed) + '|node') * TAU;
      argRad = unit(String(planet.seed) + '|arg') * TAU;
      // semiMajorAxis поддерживает прежний средний по времени радиус:
      a = mean / (1 + e * e / 2);
      m0 = seeded;
      period = periodTicksFor(mean);
      epoch = 0;
      source = 'generated';
    }
    return {
      planet, index, meanRadiusAu: mean, gameRadiusAu: gameR, semiMajorAxisAu: a,
      e, iRad, nodeRad, argRad, m0, periodTicks: period, epochTicks: epoch, real, source,
      imported: !!imported, dMax: AU_WORLD_MAX, path: null
    };
  }

  /** Массив элементов системы. Для вымышленных орбит — ровно Java-ограничение
      create(nearestGap): gap = ближайшая по |a| соседняя планета (сама планета
      исключена по identity, совпавшие a дают gap 0 → e 0),
      g = gap / (2·a + gap), e = min(e, 0.40·g, E_CAP).
      Реальные солнечные орбиты не трогаем — у Нептуна и Плутона диапазоны
      честно пересекаются. */
  function elementsFor(system) {
    if (!system || !Array.isArray(system.planets)) return [];
    let els = SYSTEM_ELEMENTS.get(system);
    if (els) return els;
    const planets = system.planets;
    els = planets.map((p, i) => baseElement(system, p, i, planets));
    for (let i = 0; i < els.length; i++) {
      if (els[i].real) continue;
      let gap = Infinity;
      for (let j = 0; j < els.length; j++) {
        if (j === i || els[j].planet === els[i].planet) continue;
        gap = Math.min(gap, Math.abs(els[j].meanRadiusAu - els[i].meanRadiusAu));
      }
      if (!Number.isFinite(gap)) gap = els[i].meanRadiusAu; // единственная планета
      const g = gap / (2 * els[i].meanRadiusAu + gap);
      els[i].e = Math.min(els[i].e, 0.40 * g, E_CAP);
    }
    // Пересчёт a/периода после возможного ограничения e.
    for (const el of els) {
      if (!el.imported && !el.real) el.semiMajorAxisAu = el.meanRadiusAu / (1 + el.e * el.e / 2);
    }
    // NCS-3301 1/2 — намеренная пара вокруг барицентра: одна ИГРОВАЯ орбита и
    // период от первой планеты (.85), климатический meanRadiusAu у второй
    // остаётся своим (1.10). Фазы строго противоположны. Фикс мёртвой ветки
    // «NBC-3301»: реальное имя системы — NCS-3301 (Smesharia 1.1.3);
    // в Java id системы nbc_3301.
    if (system.name === 'NCS-3301' && els.length > 1 && !els[0].imported) {
      const first = els[0];
      const m0 = seedPhase(planets[0].seed);
      for (let i = 0; i < 2; i++) {
        els[i].gameRadiusAu = first.gameRadiusAu;
        els[i].semiMajorAxisAu = first.semiMajorAxisAu;
        els[i].e = first.e;
        els[i].iRad = first.iRad;
        els[i].nodeRad = first.nodeRad;
        els[i].argRad = first.argRad;
        els[i].m0 = m0 + (i === 0 ? 0 : Math.PI);
        els[i].periodTicks = first.periodTicks;
        els[i].epochTicks = first.epochTicks;
      }
    }
    let dMax = 0.01;
    for (const el of els) dMax = Math.max(dMax, el.semiMajorAxisAu * (1 + el.e) * 1.05);
    for (const el of els) {
      el.dMax = dMax;
      el.path = null;
      PLANET_ELEMENT.set(el.planet, el);
    }
    SYSTEM_ELEMENTS.set(system, els);
    return els;
  }

  function elementFor(system, planet) {
    let el = PLANET_ELEMENT.get(planet);
    if (el) return el;
    const els = elementsFor(system);
    return els.find(x => x.planet === planet) || null;
  }

  /* ── Плоскость орбиты → эклиптика → проекция карты ───────────────────────── */
  function ecliptic(x, y, el) {
    const ca = Math.cos(el.argRad), sa = Math.sin(el.argRad);
    const x1 = x * ca - y * sa;
    const y1 = x * sa + y * ca;
    const ci = Math.cos(el.iRad), si = Math.sin(el.iRad);
    const y2 = y1 * ci, z2 = y1 * si;
    const cn = Math.cos(el.nodeRad), sn = Math.sin(el.nodeRad);
    return { x: x1 * cn - y2 * sn, y: x1 * sn + y2 * cn, z: z2 };
  }
  /** Радиальная √-нормировка по системе — как orbitWorld в Java-карте.
      Монотонна, поэтому порядок и пересечения радиальных диапазонов сохраняются. */
  function project(x, y, z, dMax) {
    const px = x;
    const py = y * MAP_Y - z * MAP_Z;
    const d = Math.hypot(px, py);
    if (d < 1e-9) return { x: 0, y: 0 };
    const k = AU_WORLD_MAX * Math.sqrt(d / Math.max(1e-9, dMax)) / d;
    return { x: px * k, y: py * k };
  }
  function perifocal(el, E) {
    const cosE = Math.cos(E), sinE = Math.sin(E);
    return {
      x: el.semiMajorAxisAu * (cosE - el.e),
      y: el.semiMajorAxisAu * Math.sqrt(Math.max(0, 1 - el.e * el.e)) * sinE
    };
  }
  /** Решение уравнения Кеплера M = E − e·sin E (M уже в радианах). */
  function eccentricAnomaly(M, e) {
    M = ((M % TAU) + TAU) % TAU;
    let E = e < 0.8 ? M + e * Math.sin(M) : Math.PI;
    for (let k = 0; k < 8; k++) {
      const f = E - e * Math.sin(E) - M;
      const d = f / (1 - e * Math.cos(E));
      E -= d;
      if (Math.abs(d) < 1e-10) break;
    }
    return E;
  }

  /** Положение планеты относительно звезды в мировых единицах карты. */
  function localPosition(system, planet, ticks) {
    const el = elementFor(system, planet);
    if (!el) return { x: 0, y: 0 };
    const M = el.m0 + TAU * ((ticks - el.epochTicks) / el.periodTicks);
    const E = eccentricAnomaly(M, el.e);
    const pf = perifocal(el, E);
    const ec = ecliptic(pf.x, pf.y, el);
    return project(ec.x, ec.y, ec.z, el.dMax);
  }

  /** Путь орбиты (замкнутая линия) в мировых единицах относительно звезды. */
  function orbitPath(system, planet) {
    const el = elementFor(system, planet);
    if (!el) return null;
    if (el.path) return el.path;
    const N = el.e > 0.2 ? 192 : 128;
    const pts = new Float32Array((N + 1) * 2);
    for (let i = 0; i <= N; i++) {
      const E = (i / N) * TAU;
      const pf = perifocal(el, E);
      const ec = ecliptic(pf.x, pf.y, el);
      const p = project(ec.x, ec.y, ec.z, el.dMax);
      pts[i * 2] = p.x;
      pts[i * 2 + 1] = p.y;
    }
    el.path = pts;
    return pts;
  }

  /** Угол луны: initial = phaseOffset·2π, далее 2π·ticks/periodTicks.
      Без k/count и без mi·1.7 — строго MoonSpec. */
  function moonAngle(m, ticks, epochTicks) {
    const period = Math.max(1, Number(m && m.periodTicks) || 1);
    const phase = Number(m && (m.phaseOffset != null ? m.phaseOffset : m.phase)) || 0;
    const epoch = Number(epochTicks) || 0;
    return phase * TAU + TAU * (ticks - epoch) / period;
  }
  function companionAngle(companion, phase, ticks) {
    const a = Math.max(0.01, Number(companion && companion.orbitAu) || 1);
    return phase + TAU * ticks / periodTicksFor(a);
  }

  /* ── Чёрные дыры (BlackHoleCatalog.java): те же ключи и формулы ─────────────
     Это НЕ системы: отдельный слой галактического LOD. Если каталог пришёл из
     мира (root.blackHoles), берём готовые xLy/zLy; иначе повторяем генерацию
     Java от worldSeed, чтобы автономное превью выглядело так же по смыслу. */
  const BH_TEXTURES = ['black_hole.png', 'dark_black_hole.png', 'reversed_rare_black_hole.png'];
  function javaJitter(seed, index, k1, k2, shift) {
    const v = BigInt.asUintN(64, seed * k1 + BigInt(index) * k2);
    return (Number((v >> BigInt(shift)) & 0xFFFFn) / 65535) - 0.5;
  }
  /** Java BlackHoleCatalog.systemPosition: [xMap, 0, zMap]. */
  function javaSystemLy(worldSeed, index, distanceLy) {
    const seed = BigInt.asIntN(64, BigInt(worldSeed));
    const angle = index * 2.399963229728653;
    const radius = 2600 + distanceLy * 260;
    const jx = javaJitter(seed, index, 0x9E3779B97F4A7C15n, 0xBF58476D1CE4E5B9n, 11);
    const jy = javaJitter(seed, index, 0xC2B2AE3D27D4EB4Fn, 0x94D049BB133111EBn, 13);
    return [
      (Math.cos(angle) * radius + jx * 180) / 260,
      0,
      (Math.sin(angle) * radius * 0.58 + jy * 90) / (260 * 0.58)
    ];
  }
  /** Единственная галактическая compress-функция сайта: ly-координаты Java
      (positionLy систем и xLy/zLy чёрных дыр) → мировые единицы карты.
      Система на distanceLy стоит на 150+√d·48; направление сохраняется.
      Так системы и дыры пространственно согласованы в ОДНОЙ шкале. */
  function galaxyWorld(xLy, zLy) {
    // √-сжатие галактики: внутренние системы не липнут к центру, внешние
    // остаются в кадре; системы и чёрные дыры идут через одну функцию.
    const r = Math.hypot(Number(xLy) || 0, Number(zLy) || 0);
    const ang = Math.atan2(Number(zLy) || 0, Number(xLy) || 0);
    const wr = 150 + Math.sqrt(Math.max(0, r)) * 48;
    return { x: Math.cos(ang) * wr, y: Math.sin(ang) * wr * 0.58 };
  }
  /** Позиция системы: импорт — positionLy через общую compress, иначе null. */
  function systemPosition(system) {
    const pos = system && system.positionLy;
    if (!pos) return null;
    return galaxyWorld(pos.x, pos.z);
  }
  /** Ближайшая к дыре система — расстояние в ly ДО map compression.
      Для импортированного мира берём systems[].positionLy (Java map units),
      для автономного превью — ту же формулу BlackHoleCatalog.systemPosition. */
  function nearestSystemLy(hole, systems, worldSeed) {
    if (!hole || !Array.isArray(systems)) return null;
    const ws = worldSeed != null ? worldSeed : hole.worldSeed;
    const seed = BigInt.asIntN(64, BigInt(ws != null ? ws : 0));
    let best = null, bestD = Infinity;
    systems.forEach((s, i) => {
      const pos = (s.positionLy && typeof s.positionLy === 'object')
        ? s.positionLy
        : (() => { const p = javaSystemLy(seed, i, Number(s.distanceLy) || 0); return { x: p[0], y: p[1], z: p[2] }; })();
      const d = Math.hypot((Number(hole.xLy) || 0) - pos.x,
        (Number(hole.zLy) || 0) - pos.z,
        (Number(hole.yLy) || 0) - (Number(pos.y) || 0));
      if (d < bestD) { bestD = d; best = s; }
    });
    return best ? { system: best, distanceLy: bestD } : null;
  }
  function blackHoles(catalog) {
    if (!catalog) return [];
    const listed = Array.isArray(catalog.blackHoles) ? catalog.blackHoles : null;
    const out = [];
    if (listed && listed.length) {
      listed.forEach((h, i) => {
        const xLy = Number(h.xLy != null ? h.xLy : h.x != null ? h.x : h.centerLy && h.centerLy[0]);
        const zLy = Number(h.zLy != null ? h.zLy : h.z != null ? h.z : h.centerLy && h.centerLy[2]);
        const yLy = Number(h.yLy != null ? h.yLy : h.y) || 0;
        out.push({
          id: String(h.id || ('black_hole_' + i)), name: h.name || null,
          xLy, yLy, zLy, texture: h.texture || BH_TEXTURES[i % BH_TEXTURES.length],
          world: galaxyWorld(xLy, zLy), real: true, worldSeed: String(catalog.worldSeed)
        });
      });
      return out;
    }
    const systems = catalog.systems || [];
    const ws = String(catalog.worldSeed != null ? catalog.worldSeed : 0);
    const seed = BigInt.asIntN(64, BigInt(catalog.worldSeed != null ? catalog.worldSeed : 0));
    const n = systems.length;
    const count = 2 + (unit(ws + ':black-hole-count') >= 0.5 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const key = ws + ':black-hole:' + i;
      const anchor = n <= 1 ? 0 : 1 + Math.floor(unit(key + ':anchor') * (n - 1));
      const center = n ? javaSystemLy(seed, anchor, Number(systems[anchor].distanceLy) || 0) : [0, 0, 0];
      const angle = unit(key + ':angle') * TAU;
      const distance = 8 + unit(key + ':distance') * 14;
      const xLy = center[0] + Math.cos(angle) * distance;
      const zLy = center[2] + Math.sin(angle) * distance;
      const yLy = (unit(key + ':height') - 0.5) * 5;
      out.push({
        id: 'black_hole_' + i, name: null, xLy, yLy, zLy,
        texture: BH_TEXTURES[i % BH_TEXTURES.length], world: galaxyWorld(xLy, zLy),
        real: false, worldSeed: ws
      });
    }
    return out;
  }

  /* ── Проверка импортируемого каталога ДО замены текущего мира ─────────────
     Кривой JSON (1e999 → Infinity, битый seed, periodTicks≤0, NaN в позиции)
     не должен стереть рабочий каталог и оставить пустой холст. */
  function finiteField(v, where) {
    if (v === undefined || v === null) return;
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(where + ': нечисловое значение');
  }
  function positiveField(v, where, required) {
    if (v === undefined || v === null) {
      if (required) throw new Error(where + ': отсутствует');
      return;
    }
    finiteField(v, where);
    if (Number(v) <= 0) throw new Error(where + ': должно быть > 0');
  }
  function nonNegativeField(v, where, required) {
    if (v === undefined || v === null) {
      if (required) throw new Error(where + ': отсутствует');
      return;
    }
    finiteField(v, where);
    if (Number(v) < 0) throw new Error(where + ': должно быть >= 0');
  }
  function seedField(v, where) {
    if (v === undefined || v === null) throw new Error(where + ': отсутствует seed');
    // Число 9007199254740993 в JSON уже округлено до ...992: такие seed
    // молча теряют мир, поэтому принимаем только safe integer или строку.
    if (typeof v === 'number' && !Number.isSafeInteger(v)) {
      throw new Error('seed must be decimalstring');
    }
    const str = String(v);
    if (!/^-?\d+$/.test(str)) throw new Error(where + ': seed не десятичная строка');
    try {
      const b = BigInt(str);
      if (BigInt.asIntN(64, b) !== b) throw new Error(where + ': seed вне int64');
    } catch (e) { throw new Error(where + ': seed вне int64'); }
  }
  function positionField(v, where, required) {
    if (v === undefined || v === null) {
      if (required) throw new Error(where + ': нет координат');
      return;
    }
    if (typeof v !== 'object') throw new Error(where + ': нет координат');
    for (const k of ['x', 'y', 'z']) {
      if (v[k] === undefined || v[k] === null || v[k] === '') {
        if (required) throw new Error(where + '.' + k + ': отсутствует');
        continue;
      }
      finiteField(v[k], where + '.' + k);
    }
  }
  function validateServerCatalog(json) {
    if (!json || !Array.isArray(json.systems)) throw new Error('нет systems[]');
    seedField(json.worldSeed, 'worldSeed');
    finiteField(json.dayTimeTicks, 'dayTimeTicks');
    json.systems.forEach((s, si) => {
      const sb = 'systems[' + si + ']';
      nonNegativeField(s.distanceLy !== undefined ? s.distanceLy : s.distance, sb + '.distanceLy', true);
      positionField(s.positionLy, sb + '.positionLy', true);
      (s.planets || []).forEach((p, pi) => {
        const pb = sb + '.planets[' + pi + ']';
        seedField(p.seed, pb + '.seed');
        // orbitAu — климатический mean; если его нет, схема допускает mean из orbit.
        positiveField(p.orbitAu !== undefined && p.orbitAu !== null ? p.orbitAu : (p.orbit && p.orbit.meanRadiusAu), pb + '.orbitAu', true);
        finiteField(p.temperatureC !== undefined ? p.temperatureC : p.temperature, pb + '.temperatureC');
        finiteField(p.gravity, pb + '.gravity');
        positiveField(p.diameterEarth, pb + '.diameterEarth', true);
        finiteField(p.radiation, pb + '.radiation');
        if (p.orbit) {
          const o = p.orbit;
          positiveField(o.meanRadiusAu, pb + '.orbit.meanRadiusAu');
          positiveField(o.gameRadiusAu, pb + '.orbit.gameRadiusAu');
          positiveField(o.semiMajorAxisAu, pb + '.orbit.semiMajorAxisAu');
          finiteField(o.eccentricity, pb + '.orbit.eccentricity');
          if (o.eccentricity !== undefined && (Number(o.eccentricity) < 0 || Number(o.eccentricity) >= 1)) throw new Error(pb + '.orbit.eccentricity: вне [0,1)');
          finiteField(o.inclinationDeg, pb + '.orbit.inclinationDeg');
          finiteField(o.ascendingNodeDeg, pb + '.orbit.ascendingNodeDeg');
          finiteField(o.argumentPeriapsisDeg, pb + '.orbit.argumentPeriapsisDeg');
          finiteField(o.initialMeanAnomaly, pb + '.orbit.initialMeanAnomaly');
          positiveField(o.periodTicks, pb + '.orbit.periodTicks');
          finiteField(o.epochTicks, pb + '.orbit.epochTicks');
        }
        (p.moonSpecs || []).forEach((m, mi) => {
          const mb = pb + '.moonSpecs[' + mi + ']';
          nonNegativeField(m.distanceKm, mb + '.distanceKm', true);
          positiveField(m.radiusKm, mb + '.radiusKm');
          positiveField(m.periodTicks, mb + '.periodTicks');
          finiteField(m.phaseOffset !== undefined ? m.phaseOffset : m.phase, mb + '.phaseOffset');
        });
      });
    });
    (json.blackHoles || []).forEach((h, hi) => {
      positionField({ x: h.xLy, y: h.yLy, z: h.zLy }, 'blackHoles[' + hi + ']', true);
    });
    return true;
  }

  /* ── Импорт реального каталога мира (schemaVersion 2, /spacecatalog) ───────
     Поля принимаются либерально: старые имена (orbitAu, formal, distance) и
     новые (meanRadiusAu, formalName, distanceLy) дают один и тот же каталог. */
  function adaptServerCatalog(json) {
    if (!json || !Array.isArray(json.systems)) throw new Error('нет systems[]');
    const systems = json.systems.map((s, si) => {
      const planets = (s.planets || []).map((p, pi) => {
        const od = p.orbit || null;
        const mean = Number(od && od.meanRadiusAu != null ? od.meanRadiusAu : (p.meanRadiusAu != null ? p.meanRadiusAu : p.orbitAu));
        const planet = {
          id: String(p.id || ('import_' + si + '_' + pi)),
          designation: String(p.designation || p.name || ('P-' + (pi + 1))),
          name: String(p.name || p.designation || ('P-' + (pi + 1))),
          category: String(p.category || 'distant'),
          atmosphere: String(p.atmosphere || 'none'),
          temperatureC: Number(p.temperatureC != null ? p.temperatureC : p.temperature) || 0,
          gravity: Number(p.gravity) || 1,
          radiation: Number(p.radiation) || 0,
          gauss: Number(p.gauss != null ? p.gauss : p.magneticGauss) || 0.5,
          rings: !!p.rings,
          moons: Number(p.moons != null ? p.moons : (p.moonSpecs ? p.moonSpecs.length : 0)) || 0,
          orbitAu: Number.isFinite(mean) && mean > 0 ? mean : 0.1,
          diameterEarth: Number(p.diameterEarth) || 1,
          aliases: Array.isArray(p.aliases) ? p.aliases : [],
          biomes: Array.isArray(p.biomes) ? p.biomes.map(String) : [],
          composition: Array.isArray(p.composition) ? p.composition.map(String) : [],
          archetype: String(p.archetype || ''),
          aerosol: String(p.aerosol || 'none'),
          seed: String(p.seed != null ? p.seed : '0'),
          systemIndex: si, index: pi
        };
        if (od) planet.orbitData = od;
        if (Array.isArray(p.moonSpecs)) {
          planet.exportMoonSpecs = p.moonSpecs.map((m, mi) => ({
            index: m.index != null ? m.index : mi,
            name: String(m.name || ('Луна ' + (mi + 1))),
            distanceKm: Number(m.distanceKm) || 0,
            radiusKm: Number(m.radiusKm) || 0,
            gravity: Number(m.gravity) || 0.2,
            tiltDeg: Number(m.tiltDeg) || 0,
            yawDeg: Number(m.yawDeg) || 0,
            periodTicks: Number(m.periodTicks) || 72000,
            phaseOffset: Number(m.phaseOffset != null ? m.phaseOffset : m.phase) || 0,
            phase: Number(m.phaseOffset != null ? m.phaseOffset : m.phase) || 0,
            type: String(m.category || m.type || 'distant'),
            category: String(m.category || m.type || 'distant'),
            archetype: String(m.archetype || ''),
            atmosphere: String(m.atmosphere || 'none'),
            composition: Array.isArray(m.composition) ? m.composition.map(String) : [],
            biomes: Array.isArray(m.biomes) ? m.biomes.map(String) : [],
            temperatureC: Number(m.temperatureC) || 0,
            radiation: Number(m.radiation) || 0
          }));
          planet.customMoons = planet.exportMoonSpecs; // moonSpecs() вернёт их как есть
        }
        return planet;
      });
      const pos = s.positionLy || s.position || null;
      return {
        id: String(s.id || ('system_' + si)),
        name: String(s.name || s.formalName || s.formal || ('SYS-' + si)),
        formalName: String(s.formalName || s.formal || s.name || ('SYS-' + si)),
        star: String(s.star || 'yellow_dwarf'),
        distanceLy: Number(s.distanceLy != null ? s.distanceLy : s.distance) || 0,
        positionLy: pos ? {
          x: Number(pos.x) || 0,
          y: Number(pos.y) || 0,
          z: Number(pos.z != null ? pos.z : pos.y) || 0
        } : null,
        smesharia: !!s.smesharia,
        planets
      };
    });
    return {
      worldSeed: String(json.worldSeed != null ? json.worldSeed : (json.seed != null ? json.seed : '0')),
      dayTimeTicks: Number(json.dayTimeTicks) || 0,
      // Синтетические тики — это НЕ время мира: не выдаём их за синхронизацию.
      dayTimeTicksSynthetic: !!json.dayTimeTicksSynthetic,
      sourceCatalog: json.sourceCatalog != null ? String(json.sourceCatalog) : '',
      systems,
      blackHoles: Array.isArray(json.blackHoles) ? json.blackHoles : [],
      imported: true
    };
  }

  const API = {
    TAU, TICKS_PER_SECOND, RATE_1AU, E_CAP, AU_WORLD_MAX,
    fnv1a32, unit, seedPhase, clamp, periodTicksFor, rateFor,
    elementsFor, elementFor, localPosition, orbitPath, moonAngle, companionAngle,
    blackHoles, galaxyWorld, systemPosition, nearestSystemLy, adaptServerCatalog,
    validateServerCatalog,
    solarElements: SOLAR
  };
  if (typeof window !== 'undefined') window.EUOrbits = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
