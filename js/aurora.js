/* Порт модели полярного сияния и магнитного поля из мода (Java → JS).
 *
 * Источники, перенесённые один в один:
 *   AuroraPaletteMath.java  — палитра по составу/категории/сиду, три слоя по высоте;
 *   AuroraEnvironmentMath.java — давление звёздного ветра, широта овала, высота завесы;
 *   AuroraPowerMath.java    — обёртка каталога: видимость по классу атмосферы;
 *   PlanetAurora.java       — наклон магнитной оси и порог поля.
 *
 * Палитра — художественная, а не спектр: у газовых гигантов видимый RGB это
 * false colour (их сияние в основном УФ/ИК). Так и в моде, комментарии сохранены.
 */
(function () {
  'use strict';
  const EARTH_FIELD = .5, MIN_FIELD = .02, VISIBLE_CAP = .24;
  const MASK64 = (1n << 64n) - 1n;
  const bounded = (v, lo, hi, fb) => Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fb;
  const clamp01 = v => Math.max(0, Math.min(1, v));

  function mix64(z) {
    z = BigInt.asUintN(64, z);
    z = BigInt.asUintN(64, (z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n);
    z = BigInt.asUintN(64, (z ^ (z >> 27n)) * 0x94D049BB133111EBn);
    return BigInt.asUintN(64, z ^ (z >> 31n));
  }
  const unit = hash => Number(BigInt.asUintN(64, hash) >> 11n) * 2 ** -53;
  const rotl64 = (v, k) => BigInt.asUintN(64, (BigInt.asUintN(64, v) << BigInt(k)) | (BigInt.asUintN(64, v) >> BigInt(64 - k)));

  /* ── палитра ──────────────────────────────────────────────────────────────── */
  const STOPS = {
    AQUA_O: { motif: 'TURQUOISE', core: 0x20FFD0, mid: 0x32CCFF, top: 0xFF638C },
    LIME_YELLOW: { motif: 'LIME_YELLOW', core: 0x8AFF24, mid: 0xDFFF38, top: 0xFF7960 },
    LIME_VIOLET: { motif: 'LIME_VIOLET', core: 0x80FF28, mid: 0x9560FF, top: 0xDC4AFF },
    RED_O: { motif: 'RED_VIOLET', core: 0xB74FFF, mid: 0xFF48CF, top: 0xFF4B69 },
    AQUA_UV: { motif: 'TURQUOISE', core: 0x25F9FF, mid: 0x467EFF, top: 0xB64FFF },
    RED_UV: { motif: 'RED_VIOLET', core: 0xFF5278, mid: 0xDD48FF, top: 0x7651FF },
    BLUE_UV: { motif: 'BLUE_VIOLET', core: 0x427CFF, mid: 0x824DFF, top: 0xFF4BCD },
  };
  const O_ONLY = [STOPS.AQUA_O, STOPS.LIME_YELLOW];
  const O_N = [STOPS.AQUA_O, STOPS.LIME_YELLOW, STOPS.LIME_VIOLET, STOPS.RED_O];
  const N_ONLY = [STOPS.AQUA_UV, STOPS.RED_UV, STOPS.BLUE_UV];
  const H2_REMAP = [STOPS.AQUA_UV, STOPS.RED_UV, STOPS.BLUE_UV];
  const S_REMAP = [STOPS.RED_UV, STOPS.AQUA_UV, STOPS.LIME_YELLOW];
  const OTHER = [STOPS.AQUA_O, STOPS.LIME_YELLOW, STOPS.LIME_VIOLET, STOPS.RED_UV];
  const PALETTE_SALT = 0x4155524F5241504Cn;

  function tokens(composition) {
    const set = new Set();
    String(composition == null ? '' : composition).toUpperCase().split(/[^A-Z0-9]+/).forEach(t => { if (t) set.add(t); });
    return set;
  }
  function family(composition, category) {
    const atoms = tokens(composition);
    const giant = String(category || '').toLowerCase() === 'gas_giant';
    const oxygen = atoms.has('O2') || atoms.has('O');
    // H2O не должно совпадать с H2: смешанная окисленная атмосфера — не водородный гигант.
    if (giant || (atoms.has('H2') && !oxygen && !atoms.has('CO2') && !atoms.has('H2O'))) return 'HYDROGEN_FALSE_COLOR';
    if (oxygen) return 'OXYGEN';
    if (atoms.has('CO2')) return 'CARBON_OXYGEN';
    if (atoms.has('SO2') || atoms.has('H2S')) return 'SULFUR_ARTISTIC';
    if (atoms.has('N2') || atoms.has('N')) return 'NITROGEN';
    return 'OTHER_ARTISTIC';
  }
  function channels(rgb) { return [((rgb >>> 16) & 255) / 255, ((rgb >>> 8) & 255) / 255, (rgb & 255) / 255]; }
  function pack(r, g, b) {
    return (Math.round(clamp01(r) * 255) << 16) | (Math.round(clamp01(g) * 255) << 8) | Math.round(clamp01(b) * 255);
  }
  function grade(rgb, shift, saturationScale) {
    const c = channels(rgb);
    const max = Math.max(c[0], c[1], c[2]), min = Math.min(c[0], c[1], c[2]), d = max - min;
    let hue = 0;
    if (d > 1e-12) {
      if (max === c[0]) hue = (c[1] - c[2]) / d;
      else if (max === c[1]) hue = (c[2] - c[0]) / d + 2;
      else hue = (c[0] - c[1]) / d + 4;
      hue /= 6;
    }
    hue = hue + shift - Math.floor(hue + shift);
    const s = max > 0 ? d / max * saturationScale : 0;
    // value = 1 всегда: сид не умножает физическую амплитуду свечения.
    const x = hue * 6, f = x - Math.floor(x), p = 1 - s, q = 1 - s * f, t = 1 - s * (1 - f);
    switch (Math.floor(x)) {
      case 0: return pack(1, t, p);
      case 1: return pack(q, 1, p);
      case 2: return pack(p, 1, t);
      case 3: return pack(p, q, 1);
      case 4: return pack(t, p, 1);
      default: return pack(1, p, q);
    }
  }
  function paletteKey(planetSeed, worldSeed) {
    return mix64(BigInt.asUintN(64, BigInt(planetSeed)) ^ rotl64(BigInt(worldSeed), 23) ^ PALETTE_SALT);
  }
  /** Ширина перехода по высоте — параметр отрисовки, не толщина слоя. */
  function transitionWidth(planetSeed, worldSeed) {
    return .026 + .030 * unit(mix64(paletteKey(planetSeed, worldSeed) ^ 0x42414E44n));
  }
  function palette(opts) {
    const o = opts || {};
    const fam = family(o.composition, o.category);
    const atoms = tokens(o.composition);
    const nitrogen = atoms.has('N2') || atoms.has('N');
    const choices = fam === 'OXYGEN' || fam === 'CARBON_OXYGEN' ? (nitrogen ? O_N : O_ONLY)
      : fam === 'NITROGEN' ? N_ONLY
      : fam === 'HYDROGEN_FALSE_COLOR' ? H2_REMAP
      : fam === 'SULFUR_ARTISTIC' ? S_REMAP : OTHER;
    const key = paletteKey(o.planetSeed == null ? 0 : o.planetSeed, o.worldSeed == null ? 0 : o.worldSeed);
    const stops = choices[Math.floor(unit(key) * choices.length) % choices.length];
    const hueShift = (unit(mix64(key ^ 0x485545n)) - .5) * .026;
    const saturation = (.96 + .04 * unit(mix64(key ^ 0x534154n))) * (.78 + .22 * bounded(o.density, 0, 1, 0));
    const core = grade(stops.core, hueShift, saturation);
    const mid = grade(stops.mid, hueShift, saturation);
    const top = grade(stops.top, hueShift, saturation);
    return { core, mid, top, family: fam, motif: stops.motif, falseColor: /HYDROGEN|SULFUR|OTHER/.test(fam),
      transitionWidth: transitionWidth(o.planetSeed == null ? 0 : o.planetSeed, o.worldSeed == null ? 0 : o.worldSeed) };
  }
  /** Цвет по высоте завесы: три слоя, как в шейдере мода. */
  function colorAt(pal, altitude, alongPhase) {
    const h = clamp01(altitude), phase = Number.isFinite(alongPhase) ? alongPhase : 0;
    const seam = .025 * Math.sin(phase);
    const width = pal.transitionWidth * (.70 + .30 * (.5 + .5 * Math.sin(phase + 1.2)));
    const smooth = (lo, hi, x) => { const t = clamp01((x - lo) / (hi - lo)); return t * t * (3 - 2 * t); };
    const lower = smooth(.30 + seam - width, .30 + seam + width, h);
    const upper = smooth(.72 + seam - width, .72 + seam + width, h);
    const core = channels(pal.core), mid = channels(pal.mid), top = channels(pal.top), out = [0, 0, 0];
    for (let i = 0; i < 3; i++) out[i] = (core[i] * (1 - lower) + mid[i] * lower) * (1 - upper) + top[i] * upper;
    return pack(out[0], out[1], out[2]);
  }

  /* ── окружение: ветер, давление, широта овала ─────────────────────────────── */
  const NONE = Object.freeze({ relativePower: 0, activity: 0, magnetopauseRadii: 0, ovalLatitudeDeg: 67, shell: 0,
    curtainHeight: 0, curtainFold: 0, visibleEmission: 0, incidentRadiation: 0, irradiance: 0, windPressure: 0 });

  function stellarProxy(key, luminosity, temperatureK) {
    const l = bounded(luminosity, 0, 1000, 1);
    const mass = Math.pow(Math.max(.001, l), 1 / 3.5);
    let loss = bounded(mass, .08, 8, 1), speed = 1;
    const k = String(key == null ? '' : key);
    if (k.includes('supergiant')) { loss = 12; speed = .45; }
    else if (k.includes('giant')) { loss = 8; speed = .55; }
    else if (k === 'white_dwarf') { loss = .08; }
    else if (k === 'brown_dwarf') { loss = .04; speed = .7; }
    else if (k === 'magnetar') { loss = 2; speed = 2; }
    const t = bounded(temperatureK, 1000, 1000000, 5800);
    const hardness = bounded(Math.exp(157800 * (1 / 5800 - 1 / t)), .05, 80, 1);
    return { luminosity: l, massLoss: loss, windSpeed: speed, ionizingLuminosity: l * hardness };
  }
  function nightVisibility(atmosphere) {
    switch (atmosphere) {
      case 'none': return 0;
      case 'minimal': return .012;
      case 'thin': return .08;
      case 'moderate': return 1;
      case 'medium': return .5;
      case 'thick': return .18;
      default: return atmosphere == null ? 0 : .5;
    }
  }
  function flux(source, distance) {
    if (!source || !Number.isFinite(distance) || distance <= 0) return [0, 0, 0, 0];
    const d = Math.max(.05, distance), dilution = 1 / (d * d);
    const loss = bounded(source.massLoss, 0, 10000, 0), speed = bounded(source.windSpeed, 0, 10, 0);
    return [loss * speed * dilution, loss * speed * speed * dilution,
      bounded(source.ionizingLuminosity, 0, 100000, 0) * dilution, bounded(source.luminosity, 0, 10000, 0) * dilution];
  }
  /** Окружение планеты: то же, что AuroraEnvironmentMath.sample. */
  function sample(planet, primary, primaryDistanceAu, companion, companionDistanceAu) {
    if (!planet || !Number.isFinite(planet.gauss) || planet.gauss <= MIN_FIELD
      || !(planet.atmosphereDensity > 0) || !(planet.night > 0)) return { ...NONE };
    const r = bounded(planet.radiusEarth, .05, 100, 1);
    const b = bounded(planet.gauss / EARTH_FIELD, 0, 20000, 0);
    const a = flux(primary, primaryDistanceAu), c = flux(companion, companionDistanceAu);
    const pressure = a[0] + c[0], energy = a[1] + c[1], radiation = a[2] + c[2], photons = a[3] + c[3];
    if (pressure <= 0 || energy <= 0) return { ...NONE };
    const mp = bounded(10 * Math.pow(b * b / pressure, 1 / 6), 1, 80, 1);
    const closed = bounded((mp - 1) / .5, 0, 1, 0);
    const conductance = bounded(Math.sqrt((1 + .25 * radiation) / 1.25), .8, 1.8, 1);
    const power = r * r * Math.pow(mp / 10, 2) * energy * conductance * closed;
    const surface = power / (r * r);
    const activity = surface / (1 + surface);
    let latitude = Math.acos(Math.sqrt(1 / Math.max(1.1, .66 * mp))) * 180 / Math.PI;
    latitude = bounded(latitude, 48, 82, 67);
    const heating = bounded(Math.log1p(radiation) / Math.log(2), 0, 3, 0);
    const shell = bounded((100 / 6371 / r) * (1 + .08 * heating), .006, .075, .016);
    const height = bounded((260 / 6371 / r) * (.65 + .70 * activity + .08 * heating), .012, .18, .045);
    const fold = bounded(.28 + .60 * activity + .035 * heating, 0, .95, .4);
    const visibleSurface = surface * (planet.gas ? .35 : 1);
    const emission = VISIBLE_CAP * visibleSurface / (1 + visibleSurface) * bounded(planet.night, 0, 1, 0);
    return { relativePower: power, activity, magnetopauseRadii: mp, ovalLatitudeDeg: latitude, shell,
      curtainHeight: height, curtainFold: fold, visibleEmission: bounded(emission, 0, VISIBLE_CAP, 0),
      incidentRadiation: radiation, irradiance: photons, windPressure: pressure };
  }

  /** Единичный диполь вокруг единичной оси вращения; азимут+фаза не зависят от наклона оси. */
  function magneticAxis(x, y, z, tiltRad, azimuthRad) {
    let len = Math.sqrt(x * x + y * y + z * z);
    if (!Number.isFinite(len) || len < 1e-12) { x = 0; y = 1; z = 0; len = 1; }
    x /= len; y /= len; z /= len;
    let ux = Math.abs(y) > .999 ? 0 : z;
    let uy = Math.abs(y) > .999 ? -z : 0;
    let uz = Math.abs(y) > .999 ? y : -x;
    const ul = Math.sqrt(ux * ux + uy * uy + uz * uz);
    ux /= ul; uy /= ul; uz /= ul;
    const vx = y * uz - z * uy, vy = z * ux - x * uz, vz = x * uy - y * ux;
    const tilt = bounded(tiltRad, 0, Math.PI, 0);
    const phase = Number.isFinite(azimuthRad) ? azimuthRad : 0;
    const c = Math.cos(tilt), s = Math.sin(tilt), ca = Math.cos(phase), sa = Math.sin(phase);
    return [x * c + s * (ux * ca + vx * sa), y * c + s * (uy * ca + vy * sa), z * c + s * (uz * ca + vz * sa)];
  }

  /** Ортонормированный базис вокруг оси: u, v — плоскость овала. */
  function basis(axis) {
    const [ax, ay, az] = axis;
    let ux = 0, uy = 0, uz = 0;
    if (Math.abs(ay) > .9) { ux = 1; } else { ux = -az; uy = 0; uz = ax; }
    const ul = Math.hypot(ux, uy, uz) || 1;
    ux /= ul; uy /= ul; uz /= ul;
    return [[ux, uy, uz], [ay * uz - az * uy, az * ux - ax * uz, ax * uy - ay * ux]];
  }

  const API = { palette, family, colorAt, sample, stellarProxy, nightVisibility, magneticAxis, basis,
    transitionWidth, unit, mix64, EARTH_FIELD, MIN_FIELD, VISIBLE_CAP, NONE };
  if (typeof window !== 'undefined') window.EUAurora = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
