'use strict';
/* Диаграммы генератора Enchanted Universe — живая статистика по каталогу сида.
 *
 * Источник данных один: EUGenerator.generateCatalog(seed, { smesharia:false }) —
 * тот же каталог, что строит карта, поэтому числа здесь совпадают с картой.
 * Страница не делает ни одного сетевого запроса: только генератор и canvas.
 *
 * ── Цвет неба ───────────────────────────────────────────────────────────────
 * В js/generator.js функции цвета неба нет: генератор хранит только физику
 * (категория, атмосфера, состав, аэрозоль, первый биом). Игровое правило живёт
 * в карточке планеты на главной странице (index.html, atmosphereColor), и оно
 * здесь повторено дословно:
 *   1) плотность атмосферы SKY_DENSITY (none…thick) задаёт оптический путь;
 *   2) каждый газ из composition даёт свой цвет неба и оптическую толщину
 *      (GAS_OPTICS); веса — доли состава;
 *   3) если векторы цветов складываются в общий тон (≥ 0.18) — берём
 *      усреднённый тон, иначе цвет самого «весомого» газа;
 *   4) экспоненциальное поглощение tau, «вымывание» белым в плотных
 *      атмосферах, затем аэрозоль (пыль / сера / дым) и оттенок первого биома;
 *   5) у газовых гигантов — палитра по сиду планеты, у миров с орбитой < 0.7 а.е.
 *      небо раскалено (белый → красный → оранжевый → жёлтый).
 * Готовый цвет раскладывается по 11 названиям из игры (bucketOfSky):
 * безвоздушное (чёрное), зелёное, голубое, оранжевое, серо-белое, бирюзовое,
 * жёлтое, красное, синее, розовое, фиолетовое — по тону, насыщенности, яркости.
 */

(function () {
  const I18N = window.EUI18N || null;
  const T = (key, vars) => (I18N ? I18N.t(key, vars) : key);
  const NUM = (v) => (I18N ? I18N.num(v) : String(v));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* Длительность перехода значений: 250–400 мс по заданию. */
  const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const DUR = REDUCED ? 0 : 320;

  /* ─────────────────────────── цвет неба: оптика газов ─────────────────────── */

  const SKY_DENSITY = { none: 0, minimal: 0.15, thin: 0.35, moderate: 0.55, medium: 0.75, thick: 0.9 };
  const AEROSOL = { none: [0, 0x000000], dust: [3, 0xC9A47A], sulfur: [1.5, 0xE8D060], smoke: [5, 0x6A4A38] };
  const BIOME_SKY = [
    ['night_forest', 0x152640], ['mushroom', 0x1C2238], ['scarlet', 0x8A2222], ['golden', 0xC29624],
    ['icy', 0xC8E4F0], ['iced', 0xC8E4F0], ['frozen', 0xC8E4F0], ['ashy', 0x3C3D3A], ['windy', 0x324838],
    ['oxidized', 0xC9A47A], ['brown', 0xC9A47A], ['greensprouts', 0x3A78D8], ['forest', 0x3A78D8], ['plains', 0x3A78D8]
  ];
  /* Газ → [оптическая толщина, цвет неба, поглощение RGB]. */
  const GAS_OPTICS = {
    H2: [0.05, 0x2C4E86, [0, 0, 0]],
    HE: [0.02, 0x2C4E86, [0, 0, 0]],
    CH4: [2.4, 0x3FB6C6, [0, 0.02, 0.10]],
    NH3: [2.5, 0xD8DCE8, [0.05, 0.02, 0.02]],
    H2O: [1.1, 0x3F74C8, [0, 0, 0]],
    CO2: [2.2, 0x6E96D2, [0, 0, 0]],
    CO: [1.0, 0x3F74C8, [0, 0, 0]],
    O2: [0.9, 0x3FB6C6, [0, 0, 0]],
    N2: [1.0, 0x3F74C8, [0, 0, 0]],
    AR: [0.9, 0x3F74C8, [0, 0, 0]],
    NE: [0.3, 0x3F74C8, [0, 0, 0]],
    SO2: [2.6, 0xC6C478, [0.12, 0.03, 0.01]],
    H2S: [2.3, 0xC6C478, [0.12, 0.03, 0.01]],
    HCL: [1.8, 0xD8DCE8, [0, 0, 0]],
    HF: [1.2, 0xD8DCE8, [0, 0, 0]],
    CL2: [3.0, 0xAFCB6A, [0.45, 0.10, 0]],
    F2: [2.2, 0xE4E2A4, [0.30, 0.06, 0]],
    BR2: [3.6, 0xA07050, [0.50, 0.25, 0.05]],
    I2: [4.0, 0x7C5CA6, [0.08, 0.30, 0.45]],
    FE: [4.2, 0xA07050, [0.20, 0.12, 0.06]],
    O3: [1.6, 0x3558BE, [0.08, 0.45, 0.25]],
    NO: [1.1, 0x3F74C8, [0.05, 0.01, 0]],
    NO2: [2.0, 0xA07A55, [1.60, 0.45, 0.10]],
    N2O: [1.8, 0x3F74C8, [0, 0, 0]],
    C2H6: [2.6, 0x3F74C8, [0, 0, 0]],
    C3H8: [3.4, 0x3F74C8, [0, 0, 0]],
    C2H2: [2.6, 0xA07A55, [0.02, 0.01, 0.01]],
    C2H4: [2.6, 0xA07A55, [0, 0, 0]],
    C6H6: [5.0, 0x6E665E, [0.25, 0.18, 0.12]],
    CH3OH: [2.2, 0x3F74C8, [0, 0, 0]],
    C2H5OH: [3.2, 0x3F74C8, [0, 0, 0]],
    HCN: [1.8, 0x6E665E, [0, 0, 0]],
    NH2OH: [2.0, 0x3F74C8, [0, 0, 0]],
    PH3: [2.8, 0x3F74C8, [0, 0, 0]],
    PCL3: [6.0, 0xD8DCE8, [0, 0, 0]],
    SIH4: [3.0, 0xA07A55, [0, 0, 0]],
    SIF4: [2.4, 0xD8DCE8, [0, 0, 0]],
    SF6: [4.5, 0xD8DCE8, [0, 0, 0]],
    CF4: [2.6, 0x6E96D2, [0, 0, 0]],
    CCL4: [5.5, 0x6E96D2, [0, 0, 0]],
    BF3: [2.2, 0xD8DCE8, [0, 0, 0]],
    B2H6: [3.2, 0x6E96D2, [0, 0, 0]],
    HBR: [2.4, 0xA07A55, [0.10, 0.20, 0.30]],
    HI: [3.2, 0x7C5CA6, [0.05, 0.20, 0.35]],
    KR: [1.6, 0x3F74C8, [0, 0, 0]],
    XE: [3.0, 0x6E96D2, [0, 0, 0]],
    RN: [3.4, 0x3F74C8, [0, 0, 0]],
    COS: [2.8, 0xC6C478, [0.10, 0.03, 0.01]],
    CS2: [4.0, 0xC6C478, [0.12, 0.04, 0.01]],
    OCS: [2.8, 0xC6C478, [0.10, 0.03, 0.01]],
    N2H4: [2.0, 0x3F74C8, [0, 0, 0]],
    CLO2: [3.0, 0xAFCB6A, [0.40, 0.10, 0]],
    H2O2: [1.2, 0xD8DCE8, [0, 0, 0]]
  };

  function hsvToRgb(h, s, v) {
    h = (((h % 360) + 360) % 360) / 60;
    const c = v * s, x = c * (1 - Math.abs((h % 2) - 1)), m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 1) { r = c; g = x; }
    else if (h < 2) { r = x; g = c; }
    else if (h < 3) { g = c; b = x; }
    else if (h < 4) { g = x; b = c; }
    else if (h < 5) { r = x; b = c; }
    else { r = c; b = x; }
    return [r + m, g + m, b + m];
  }
  function rgbToHsv(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d > 1e-5) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, max <= 1e-5 ? 0 : d / max, max];
  }

  /* Порт atmosphereColor() с главной страницы: возвращает RGB 0..1. */
  function skyRgb(p) {
    if (p.atmosphere === 'none') return [0, 0, 0];
    const raw = (p.composition || []).map((v) => String(v));
    let total = 0;
    const parts = raw.map((v) => {
      const split = v.split(':');
      const f = split.length > 1 ? Math.max(0, parseFloat(split[1]) || 0) : 1;
      total += f;
      return [split[0].trim().toUpperCase(), f];
    });
    if (!total) return [0.62, 0.72, 0.85];
    const dens = SKY_DENSITY[p.atmosphere] || 0;
    let hx = 0, hy = 0, sw = 0, satSum = 0, valSum = 0;
    let bestW = -1, bestH = 215, bestS = 0.55, bestV = 0.72;
    const tau = [0, 0, 0];
    for (const [gas, f0] of parts) {
      const opt = GAS_OPTICS[gas];
      if (!opt) continue;
      const f = f0 / total;
      const beta = Math.max(0.05, opt[0]);
      const w = f * beta;
      const sky = opt[1];
      const hsv = rgbToHsv(((sky >> 16) & 255) / 255, ((sky >> 8) & 255) / 255, (sky & 255) / 255);
      const rad = hsv[0] * Math.PI / 180;
      hx += Math.cos(rad) * w;
      hy += Math.sin(rad) * w;
      satSum += hsv[1] * w;
      valSum += hsv[2] * w;
      sw += w;
      if (w > bestW) { bestW = w; bestH = hsv[0]; bestS = hsv[1]; bestV = hsv[2]; }
      const abs = opt[2] || [0, 0, 0];
      for (let i = 0; i < 3; i++) tau[i] += f * abs[i];
    }
    if (!sw) return [0.62, 0.72, 0.85];
    let hue = bestH, sat = bestS;
    if (Math.hypot(hx, hy) / sw >= 0.18) {
      hue = Math.atan2(hy, hx) * 180 / Math.PI;
      if (hue < 0) hue += 360;
      sat = satSum / sw;
    }
    const val = Math.max(0.34, Math.min(0.92, valSum / sw));
    const rgb = hsvToRgb(hue, Math.max(0.18, Math.min(0.82, sat)), val);
    const path = 1 + 1.8 * dens;
    for (let i = 0; i < 3; i++) rgb[i] *= Math.exp(-tau[i] * path * 2.2);
    const wash = Math.max(0, Math.min(0.30, (dens - 0.5) * 0.55));
    for (let i = 0; i < 3; i++) rgb[i] = rgb[i] * (1 - wash) + wash;
    // Аэрозоль поверх химии: 1−e^(−τ/2), как в игре.
    const air = AEROSOL[p.aerosol || 'none'];
    if (air && air[0] > 0) {
      const k = Math.min(0.85, 1 - Math.exp(-air[0] / 2));
      const tint = air[1];
      rgb[0] = rgb[0] * (1 - k) + (((tint >> 16) & 255) / 255) * k;
      rgb[1] = rgb[1] * (1 - k) + (((tint >> 8) & 255) / 255) * k;
      rgb[2] = rgb[2] * (1 - k) + ((tint & 255) / 255) * k;
    }
    const max = Math.max(rgb[0], rgb[1], rgb[2]);
    if (max > 1e-5) { const k = val / max; for (let i = 0; i < 3; i++) rgb[i] = clamp(rgb[i] * k, 0, 1); }
    // Биом даёт оттенок поверх готовой палитры (45 %), как biomePalette в игре.
    const biomeName = String((p.biomes && p.biomes[0]) || '').toLowerCase();
    const biome = BIOME_SKY.find(([key]) => biomeName.includes(key));
    if (biome) {
      const tint = biome[1];
      const tr = ((tint >> 16) & 255) / 255, tg = ((tint >> 8) & 255) / 255, tb = (tint & 255) / 255;
      rgb[0] = rgb[0] * 0.55 + tr * 0.45;
      rgb[1] = rgb[1] * 0.55 + tg * 0.45;
      rgb[2] = rgb[2] * 0.55 + tb * 0.45;
    }
    if (p.category === 'gas_giant') {
      const gasPalette = [[216, 182, 133], [111, 200, 216], [216, 138, 154], [200, 160, 224], [232, 192, 96], [138, 200, 160]];
      let h = 2166136261 >>> 0;
      const s = String(p.seed);
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      const c = gasPalette[Math.abs(h) % gasPalette.length];
      return [c[0] / 255, c[1] / 255, c[2] / 255];
    }
    const orbit = Number(p.orbitAu || 1);
    if (orbit < 0.7) {
      const heat = Math.max(0, Math.min(1, (0.7 - orbit) / 0.5));
      const stops = [[255, 255, 255], [255, 199, 184], [255, 89, 64], [255, 140, 38], [255, 217, 64], [255, 255, 235]];
      const x = heat * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
      const mix = [0, 1, 2].map((k) => (stops[i][k] + (stops[i + 1][k] - stops[i][k]) * f) / 255);
      return mix;
    }
    return rgb;
  }

  const SKY_KEYS = ['airless', 'green', 'lightblue', 'orange', 'gray', 'turquoise', 'yellow', 'red', 'blue', 'pink', 'purple'];
  const SKY_COLOR = {
    airless: '#12151f', green: '#4fbf6a', lightblue: '#9fd0ff', orange: '#f0a24a',
    gray: '#d6dae4', turquoise: '#38d6c4', yellow: '#e8d264', red: '#e2503f',
    blue: '#4a7fe0', pink: '#e88ab0', purple: '#9c6ce0'
  };

  /* Раскладка цвета по 11 названиям из игры. */
  function bucketOfSky(p) {
    if (p.atmosphere === 'none') return 'airless';
    const rgb = skyRgb(p);
    const hsv = rgbToHsv(rgb[0], rgb[1], rgb[2]);
    const h = hsv[0], s = hsv[1], v = hsv[2];
    if (v < 0.12) return 'airless';
    if (s < 0.14 || (s < 0.22 && v > 0.80)) return 'gray';
    if (h < 18) return 'red';
    if (h < 45) return 'orange';
    if (h < 70) return 'yellow';
    if (h < 168) return 'green';
    if (h < 192) return 'turquoise';
    if (h < 218) return 'lightblue';
    if (h < 252) return 'blue';
    if (h < 300) return 'purple';
    if (h >= 345) return s >= 0.45 ? 'red' : 'pink';
    if (h >= 330) return s >= 0.50 ? 'red' : 'pink';
    return s < 0.55 ? 'pink' : 'purple';
  }

  /* ─────────────────────── словари подписей (RU/EN) ─────────────────────── */

  const CAT_KEYS = ['very_hot', 'hot', 'temperate', 'habitable', 'cold_habitable', 'distant', 'gas_giant'];
  const CAT_COLOR = {
    very_hot: '#c8562e', hot: '#c08050', temperate: '#7fa06a', habitable: '#3f7fc0',
    cold_habitable: '#a8d8f0', distant: '#6a5a80', gas_giant: '#c8a878'
  };
  const ATM_KEYS = ['none', 'minimal', 'thin', 'moderate', 'medium', 'thick'];
  const ATM_COLOR = {
    none: '#2a3040', minimal: '#3d5a86', thin: '#4f86b8',
    moderate: '#5fe6ff', medium: '#8fb6ff', thick: '#cfe0ff'
  };

  /* Человеческие названия архетипов: [ru, en]. Сырые id на графике не светятся. */
  const ARCH_NAME = {
    lava: ['лавовый мир', 'lava world'],
    airless: ['безвоздушный мир', 'airless world'],
    sulfur: ['серный мир', 'sulfur world'],
    iron: ['железный мир', 'iron world'],
    ultrahot: ['раскалённый мир', 'ultra-hot world'],
    cryovolcanic: ['криовулканический мир', 'cryovolcanic world'],
    pulsar: ['мир пульсара', 'pulsar world'],
    mars_like: ['марсианский мир', 'Mars-like world'],
    desert: ['пустынный мир', 'desert world'],
    rocky_thin: ['скалистый мир', 'rocky world'],
    chthonian: ['хтония', 'chthonian world'],
    toroidal: ['тороидальный мир', 'toroidal world'],
    tundra: ['тундровый мир', 'tundra world'],
    ocean: ['океанический мир', 'ocean world'],
    carbon: ['углеродный мир', 'carbon world'],
    ammonia: ['аммиачный мир', 'ammonia world'],
    withered: ['вянущий мир', 'withered world'],
    tidal_eyeball: ['мир-глаз', 'eyeball world'],
    hycean: ['гикеановый мир', 'hycean world'],
    snowball: ['мир-снежок', 'snowball world'],
    circumbinary: ['циркумбинарный мир', 'circumbinary world'],
    panthalassic: ['панталассический мир', 'panthalassic world'],
    ice: ['ледяной мир', 'icy world'],
    dwarf_planet: ['карликовая планета', 'dwarf planet'],
    moon_icy: ['ледяная луна', 'icy moon'],
    gas_giant: ['газовый гигант', 'gas giant'],
    ice_giant: ['ледяной гигант', 'ice giant'],
    hot_jupiter: ['горячий юпитер', 'hot Jupiter'],
    puffy: ['рыхлый гигант', 'puffy giant'],
    super_puff: ['сверхрыхлый гигант', 'super-puff giant'],
    helium_giant: ['гелиевый гигант', 'helium giant'],
    brown_dwarf: ['коричневый карлик', 'brown dwarf'],
    gas_dwarf: ['газовый карлик', 'gas dwarf']
  };
  function archName(id) {
    const entry = ARCH_NAME[id];
    if (entry) return entry[I18N && I18N.current() === 'en' ? 1 : 0];
    return String(id || '').replace(/_/g, ' ');
  }

  /* ───────────────────────────── сид и каталог ───────────────────────────── */

  function parseSeed(text) {
    let t = String(text == null ? '' : text).trim().toLowerCase().replace(/_/g, '');
    if (!t) return null;
    const neg = t.startsWith('-');
    if (neg) t = t.slice(1);
    try {
      let v;
      if (t.startsWith('0x')) v = BigInt('0x' + t.slice(2));
      else if (/^[0-9a-f]+$/.test(t) && /[a-f]/.test(t)) v = BigInt('0x' + t);
      else v = BigInt(t);
      return BigInt.asIntN(64, neg ? -v : v);
    } catch (e) { return null; }
  }
  function randomSeed() {
    try {
      const a = new BigInt64Array(1);
      crypto.getRandomValues(a);
      return a[0];
    } catch (e) {
      return BigInt.asIntN(64, BigInt(Math.floor(Math.random() * 1e12)) * 1000003n);
    }
  }

  const state = { seed: null, catalog: null, stats: null };

  function hasNightForest(p) {
    return (p.biomes || []).some((b) => String(b).toLowerCase().indexOf('night_forest') >= 0);
  }

  function buildStats(catalog) {
    const sky = new Map(), cats = new Map(), atms = new Map(), arch = new Map(), night = new Map();
    let planets = 0, nightTotal = 0;
    const bump = (map, key) => map.set(key, (map.get(key) || 0) + 1);
    for (const sys of catalog.systems) {
      for (const p of sys.planets) {
        planets++;
        bump(sky, bucketOfSky(p));
        bump(cats, p.category || 'distant');
        bump(atms, p.atmosphere || 'none');
        if (p.archetype) bump(arch, p.archetype);
        const cat = p.category || 'distant';
        const row = night.get(cat) || { n: 0, total: 0 };
        row.total++;
        if (hasNightForest(p)) { row.n++; nightTotal++; }
        night.set(cat, row);
      }
    }
    return { planets, systems: catalog.systems.length, nightTotal, sky, cats, atms, arch, night };
  }

  /* ─────────────────────────── движок диаграмм ─────────────────────────── */

  const ALL = [];

  function makeChart(kind, canvas, opts) {
    const ch = {
      kind: kind,
      canvas: canvas,
      legendEl: (opts && opts.legendEl) || null,
      rowH: (opts && opts.rowH) || 26,
      scale: (opts && opts.scale) || 'max',
      valueW: (opts && opts.valueW) || 86,
      keys: [], labels: {}, colors: {}, textOf: null,
      cur: {}, from: {}, to: {}, start: 0, legendRows: new Map()
    };
    ALL.push(ch);
    return ch;
  }

  function setData(ch, rows, animate) {
    const prev = ch.cur || {};
    const from = {};
    ch.keys = rows.map((r) => r.key);
    ch.labels = {};
    ch.colors = {};
    for (const r of rows) {
      ch.labels[r.key] = r.label;
      ch.colors[r.key] = r.color;
      from[r.key] = r.key in prev ? prev[r.key] : 0;
    }
    ch.from = from;
    ch.to = {};
    for (const r of rows) ch.to[r.key] = r.value;
    ch.cur = {};
    for (const r of rows) ch.cur[r.key] = from[r.key];
    if (!animate || DUR === 0) {
      for (const r of rows) ch.cur[r.key] = r.value;
      ch.start = 0;
      drawChart(ch);
      return;
    }
    ch.start = performance.now();
    kick();
  }

  let rafId = 0;
  function kick() {
    if (!rafId) rafId = requestAnimationFrame(tick);
  }
  function tick(now) {
    let active = false;
    for (const ch of ALL) {
      if (!ch.start) continue;
      const p = Math.min(1, (now - ch.start) / DUR);
      const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      for (const k of ch.keys) {
        const a = ch.from[k] == null ? 0 : ch.from[k];
        const b = ch.to[k] == null ? 0 : ch.to[k];
        ch.cur[k] = a + (b - a) * e;
      }
      if (p >= 1) {
        ch.start = 0;
        for (const k of ch.keys) ch.cur[k] = ch.to[k];
      } else {
        active = true;
      }
      drawChart(ch);
    }
    rafId = active ? requestAnimationFrame(tick) : 0;
  }

  function drawChart(ch) {
    if (ch.kind === 'donut') drawDonut(ch);
    else drawBars(ch);
  }

  function fitCanvas(cv, cssHeight) {
    if (cssHeight != null) {
      const px = cssHeight + 'px';
      if (cv.style.height !== px) cv.style.height = px;
    }
    const rect = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  function sumValues(ch) {
    let total = 0;
    for (const k of ch.keys) total += Math.max(0, ch.cur[k] || 0);
    return total;
  }

  function drawDonut(ch) {
    const fit = fitCanvas(ch.canvas, null);
    const ctx = fit.ctx, w = fit.w, h = fit.h;
    const cx = w / 2, cy = h / 2;
    const r = Math.max(22, Math.min(w, h) / 2 - 8);
    const lw = Math.max(12, Math.round(r * 0.30));
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(40, 52, 80, .55)';
    ctx.lineWidth = lw;
    ctx.stroke();
    const total = sumValues(ch);
    let ang = -Math.PI / 2;
    for (const k of ch.keys) {
      const v = Math.max(0, ch.cur[k] || 0);
      if (v <= 0 || total <= 0) continue;
      const sweep = (v / total) * Math.PI * 2;
      const gap = sweep > 0.12 ? 0.035 : 0.008;
      ctx.beginPath();
      ctx.strokeStyle = ch.colors[k] || '#5fe6ff';
      ctx.lineWidth = lw;
      ctx.lineCap = 'butt';
      ctx.arc(cx, cy, r, ang + gap, Math.max(ang + gap + 0.002, ang + sweep - gap));
      ctx.stroke();
      ang += sweep;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8cf8a';
    ctx.font = '600 ' + Math.round(clamp(r * 0.52, 15, 32)) + 'px "Segoe UI",system-ui,sans-serif';
    ctx.fillText(NUM(Math.round(total)), cx, cy - Math.round(r * 0.08));
    ctx.fillStyle = '#8b97b8';
    ctx.font = '400 ' + Math.round(clamp(r * 0.20, 9, 12)) + 'px "Segoe UI",system-ui,sans-serif';
    ctx.fillText(T('ch.worlds'), cx, cy + Math.round(r * 0.32));
    updateLegend(ch, total);
  }

  function updateLegend(ch, total) {
    if (!ch.legendEl) return;
    for (const k of ch.keys) {
      let row = ch.legendRows.get(k);
      if (!row) {
        const li = document.createElement('li');
        const sw = document.createElement('i');
        sw.className = 'sw';
        const nm = document.createElement('span');
        nm.className = 'nm';
        const vl = document.createElement('span');
        vl.className = 'vl';
        li.appendChild(sw);
        li.appendChild(nm);
        li.appendChild(vl);
        ch.legendEl.appendChild(li);
        row = { li: li, sw: sw, nm: nm, vl: vl };
        ch.legendRows.set(k, row);
      }
      const v = Math.max(0, ch.cur[k] || 0);
      row.sw.style.background = ch.colors[k] || '#5fe6ff';
      row.nm.textContent = ch.labels[k] || k;
      row.nm.title = ch.labels[k] || k;
      const pct = total > 0 ? Math.round((v / total) * 100) : 0;
      row.vl.textContent = NUM(Math.round(v)) + (pct > 0 ? ' · ' + T('ch.pct', { p: pct }) : '');
      row.li.style.opacity = v > 0 ? '1' : '.42';
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function fitText(ctx, text, maxW) {
    const s = String(text == null ? '' : text);
    if (!maxW || ctx.measureText(s).width <= maxW) return s;
    let cut = s;
    while (cut.length > 1 && ctx.measureText(cut + '…').width > maxW) cut = cut.slice(0, -1);
    return cut + '…';
  }

  function drawBars(ch) {
    const rowH = ch.rowH;
    const rows = Math.max(1, ch.keys.length);
    const fit = fitCanvas(ch.canvas, rows * rowH);
    const ctx = fit.ctx, w = fit.w, h = fit.h;
    ctx.clearRect(0, 0, w, h);
    if (!ch.keys.length) return;

    ctx.textBaseline = 'middle';
    ctx.font = '12px "Segoe UI",system-ui,sans-serif';
    let labelMax = 0;
    for (const k of ch.keys) labelMax = Math.max(labelMax, ctx.measureText(ch.labels[k] || k).width);
    const labelW = Math.round(clamp(labelMax + 10, 92, Math.max(92, w * 0.46)));
    const valueW = ch.valueW;
    const x0 = labelW + 10;
    const x1 = Math.max(x0 + 24, w - valueW - 6);
    const barH = 8;

    let max = 0;
    for (const k of ch.keys) max = Math.max(max, ch.cur[k] || 0);
    const denom = ch.scale === 'hundred' ? 100 : (max || 1);

    ch.keys.forEach((k, i) => {
      const cy = i * rowH + rowH / 2;
      const v = Math.max(0, ch.cur[k] || 0);
      const by = cy - barH / 2;

      ctx.textAlign = 'left';
      ctx.font = '12px "Segoe UI",system-ui,sans-serif';
      ctx.fillStyle = '#c3cee4';
      ctx.fillText(fitText(ctx, ch.labels[k] || k, labelW - 4), 0, cy);

      ctx.fillStyle = 'rgba(30, 40, 62, .85)';
      roundRect(ctx, x0, by, x1 - x0, barH, 4);
      ctx.fill();

      const frac = clamp(v / denom, 0, 1);
      if (frac > 0.001) {
        ctx.fillStyle = ch.colors[k] || '#5fe6ff';
        roundRect(ctx, x0, by, Math.max(4, (x1 - x0) * frac), barH, 4);
        ctx.fill();
      }

      ctx.textAlign = 'right';
      ctx.font = '12px ui-monospace,Consolas,monospace';
      ctx.fillStyle = v > 0 ? '#dfe7ff' : '#5f7196';
      ctx.fillText(ch.textOf ? ch.textOf(k, v) : NUM(Math.round(v)), w - 2, cy);
    });
  }

  /* ────────────────────────── сборка данных ────────────────────────── */

  const chartSky = makeChart('donut', document.getElementById('skyCv'), { legendEl: document.getElementById('skyLegend') });
  const chartCat = makeChart('donut', document.getElementById('catCv'), { legendEl: document.getElementById('catLegend') });
  const chartAtm = makeChart('donut', document.getElementById('atmCv'), { legendEl: document.getElementById('atmLegend') });
  const chartArch = makeChart('bars', document.getElementById('archCv'), { rowH: 26, valueW: 92, scale: 'max' });
  const chartNight = makeChart('bars', document.getElementById('nightCv'), { rowH: 28, valueW: 104, scale: 'hundred' });

  function rankColor(i, n) {
    const t = n <= 1 ? 0 : i / (n - 1);
    const a = [216, 192, 122], b = [95, 230, 255];
    const c = a.map((v, k) => Math.round(v + (b[k] - v) * t));
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  }

  function paintStats(st) {
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = NUM(value);
    };
    set('stPlanets', st.planets);
    set('stSystems', st.systems);
    set('stNight', st.nightTotal);
    let skyTypes = 0;
    for (const v of st.sky.values()) if (v > 0) skyTypes++;
    set('stSky', skyTypes);
  }

  function refresh(animate) {
    const st = state.stats;
    const planets = st.planets || 1;

    paintStats(st);

    setData(chartSky, SKY_KEYS.map((k) => ({
      key: k, label: T('ch.sky.' + k), color: SKY_COLOR[k], value: st.sky.get(k) || 0
    })), animate);

    setData(chartCat, CAT_KEYS.map((k) => ({
      key: k, label: T('cat.' + k), color: CAT_COLOR[k], value: st.cats.get(k) || 0
    })), animate);

    setData(chartAtm, ATM_KEYS.map((k) => ({
      key: k, label: T('atm.' + k), color: ATM_COLOR[k], value: st.atms.get(k) || 0
    })), animate);

    const top = Array.from(st.arch.entries())
      .sort((a, b) => (b[1] - a[1]) || String(a[0]).localeCompare(String(b[0])))
      .slice(0, 10);
    chartArch.textOf = (key, v) => NUM(Math.round(v)) + ' · ' + T('ch.pct', { p: Math.round((v / planets) * 100) });
    setData(chartArch, top.map(([key, value], i) => ({
      key: key,
      label: archName(key),
      color: rankColor(i, top.length),
      value: value
    })), animate);

    const nightRows = CAT_KEYS
      .map((k) => ({ k: k, row: st.night.get(k) }))
      .filter((x) => x.row && x.row.total > 0)
      .map(({ k, row }) => {
        const value = (row.n / row.total) * 100;
        return {
          key: k,
          label: T('cat.' + k),
          color: value > 0 ? '#5fe6ff' : '#2a4a5c',
          value: value,
          n: row.n,
          total: row.total
        };
      });
    const nightMeta = new Map(nightRows.map((r) => [r.key, r]));
    chartNight.textOf = (key, v) => {
      const m = nightMeta.get(key);
      if (!m) return T('ch.pct', { p: Math.round(v) });
      return m.n + ' / ' + m.total + ' · ' + T('ch.pct', { p: Math.round(v) });
    };
    setData(chartNight, nightRows, animate);

    // Локализованные подписи для скринридеров.
    const label = (id, text) => {
      const cv = document.getElementById(id);
      if (cv) cv.setAttribute('aria-label', text);
    };
    label('skyCv', T('ch.sky') + ' — ' + T('ch.worlds') + ': ' + st.planets);
    label('catCv', T('ch.categories') + ' — ' + T('ch.worlds') + ': ' + st.planets);
    label('atmCv', T('ch.atmospheres') + ' — ' + T('ch.worlds') + ': ' + st.planets);
    label('archCv', T('ch.archetypes'));
    label('nightCv', T('ch.nightTitle'));
  }

  /* ─────────────────────────── страница ─────────────────────────── */

  const seedInput = document.getElementById('seed');
  const backLink = document.getElementById('back');
  let debounce = 0;

  function updateBackLink(seed) {
    if (!backLink) return;
    backLink.href = 'index.html?seed=' + encodeURIComponent(seed.toString());
  }

  function applySeed(seed, opts) {
    const syncInput = !opts || opts.syncInput !== false;
    const animate = !opts || opts.animate !== false;
    const s = BigInt.asIntN(64, BigInt(seed));
    state.seed = s;
    state.catalog = window.EUGenerator.generateCatalog(s, { smesharia: false });
    state.stats = buildStats(state.catalog);
    if (syncInput && seedInput) seedInput.value = s.toString();
    const url = new URL(location.href);
    url.searchParams.set('seed', s.toString());
    try { history.replaceState(null, '', url); } catch (e) { /* file:// и приватный режим */ }
    try { localStorage.setItem('eu_seed', s.toString()); } catch (e) { /* приватный режим */ }
    updateBackLink(s);
    refresh(animate);
  }

  function submitTyped() {
    const s = parseSeed(seedInput ? seedInput.value : '');
    if (s === null) {
      if (seedInput) seedInput.classList.add('bad');
      return false;
    }
    if (seedInput) seedInput.classList.remove('bad');
    // Текст в поле не переписываем: человек может ещё печатать «0x1f».
    applySeed(s, { animate: true, syncInput: false });
    return true;
  }

  if (seedInput) {
    seedInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(submitTyped, 200);
    });
    seedInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      clearTimeout(debounce);
      submitTyped();
    });
  }

  const randomBtn = document.getElementById('random');
  if (randomBtn) randomBtn.addEventListener('click', () => applySeed(randomSeed(), { animate: true, syncInput: true }));

  window.addEventListener('eu-lang', () => {
    // Событие приходит и до первой генерации — тогда пересобирать нечего.
    if (!state.catalog || !state.stats) return;
    state.stats = buildStats(state.catalog);
    refresh(false);
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { for (const ch of ALL) drawChart(ch); }, 120);
  });

  /* Старт: ?seed= → localStorage['eu_seed'] → случайный. */
  if (I18N) I18N.init();
  let initial = parseSeed(new URLSearchParams(location.search).get('seed') || '');
  if (initial === null) {
    try { initial = parseSeed(localStorage.getItem('eu_seed') || ''); } catch (e) { initial = null; }
  }
  if (initial === null) initial = randomSeed();
  applySeed(initial, { animate: true, syncInput: true });

  /* Маленький отладочный API — им же пользуюсь в проверках. */
  window.EUCharts = {
    seed: () => (state.seed == null ? null : state.seed.toString()),
    state: () => {
      const st = state.stats;
      const top = {};
      const arch = Array.from(st.arch.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
      for (const [k, v] of arch) top[k] = v;
      const night = {};
      for (const [k, v] of st.night) night[k] = { n: v.n, total: v.total };
      const sky = {}, cats = {}, atms = {};
      for (const [k, v] of st.sky) sky[k] = v;
      for (const [k, v] of st.cats) cats[k] = v;
      for (const [k, v] of st.atms) atms[k] = v;
      return { seed: state.seed.toString(), planets: st.planets, systems: st.systems,
        nightTotal: st.nightTotal, sky: sky, cats: cats, atms: atms, arch: top, night: night };
    },
    setSeed: (value) => {
      const s = parseSeed(String(value));
      if (s === null) return false;
      applySeed(s, { animate: true, syncInput: false });
      return true;
    },
    skyRgbOf: (planet) => skyRgb(planet),
    bucketOf: (planet) => bucketOfSky(planet)
  };
})();
