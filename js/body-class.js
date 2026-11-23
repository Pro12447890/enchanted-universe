/* Классификация тел по массе: звезда / коричневый карлик / газовый гигант / планета.
 *
 * Зачем: в каталоге коричневый карлик исторически жил в двух местах — как класс
 * звезды (StarClass, MASS в binary-policy) и как архетип планеты внутри
 * category 'gas_giant'. Из-за этого правила расходились. Здесь одна функция,
 * которая по массе говорит, чем тело является и что с ним можно делать.
 *
 * Пороги — из спецификации «термофизика планет» (§4.2–4.4):
 *   0.414 M_Юп (131.6 M_⊕) — конец юпитерианского режима, начало газовых оболочек;
 *   13 M_Юп               — зажигание дейтерия (IAU: коричневый карлик);
 *   75–84 M_Юп            — горение водорода, тело становится звездой главной
 *                            последовательности. Берём 80 M_Юп как границу.
 *
 * Флаги, которые реально нужны остальному коду:
 *   selfLuminous — светит своим теплом (коричневый карлик и звезда), рисовать диск
 *                  со свечением, а не отражающий спрайт;
 *   canFuse      — идёт термоядерный синтез (только звезда);
 *   canHost      — может быть центром системы.
 */
(function () {
  'use strict';
  const THRESHOLDS = Object.freeze({ JOVIAN: 0.414, DEUTERIUM: 13, HYDROGEN: 80 });
  const JUPITER_PER_SUN = 1047.566;      // M☉ → M_Юп
  const JUPITER_PER_EARTH = 317.8;       // M⊕ → M_Юп
  // Массы звёздных классов в M☉ — те же числа, что в js/binary-policy.js.
  const STAR_MASS = {
    brown_dwarf: .055, white_dwarf: .6, magnetar: 1.4, red_dwarf: .35, orange_dwarf: .7,
    yellow_dwarf: 1, yellow_dwarf_strong: 1.1, white_yellow_dwarf: 1.3, white_star: 2,
    blue_dwarf: 2.2, white_blue_dwarf: 2.6, blue_supergiant: 20, red_supergiant: 15,
    yellow_supergiant: 12, red_giant: 1.2, orange_giant: 1.5, carbon_star: 1.5, neutron: 1.4
  };
  const GAS_ARCHETYPES = ['gas_giant', 'ice_giant', 'hot_jupiter', 'puffy', 'super_puff',
    'helium_giant', 'gas_dwarf', 'brown_dwarf', 'mini_neptune', 'evaporating'];

  const num = v => (typeof v === 'bigint' ? Number(v) : Number(v));
  const finite = v => Number.isFinite(v);

  /** Масса в массах Юпитера: явное поле, архетип, радиус или класс звезды. */
  function massOf(body) {
    if (!body) return null;
    // 1. Явные поля массы — самый надёжный источник.
    for (const key of ['massMoj', 'massJupiter', 'massJup', 'jupiterMasses']) {
      const v = num(body[key]);
      if (finite(v) && v > 0) return v;
    }
    // 2. Архетип коричневого карлика — это класс объекта, а не его радиус.
    if (String(body.archetype || '') === 'brown_dwarf') return STAR_MASS.brown_dwarf * JUPITER_PER_SUN;
    // 3. Радиус в радиусах Земли есть у планет и лун. Если он задан, перед нами
    //    тело в системе, и класс звезды (если он тут тоже есть) — родительский.
    const r = num(body.diameterEarth);
    if (finite(r) && r > 0) {
      const gas = GAS_ARCHETYPES.includes(String(body.archetype || ''));
      return r * r * r * (gas ? 0.30 : 1.0) / JUPITER_PER_EARTH;
    }
    // 4. Класс светила — только когда радиуса нет, то есть запись про звезду.
    for (const key of ['starClass', 'bodyKind']) {
      const k = String(body[key] || '');
      if (STAR_MASS[k]) return STAR_MASS[k] * JUPITER_PER_SUN;
    }
    if (finite(num(body.massSolar)) && num(body.massSolar) > 0) return num(body.massSolar) * JUPITER_PER_SUN;
    if (finite(num(body.massEarth)) && num(body.massEarth) > 0) return num(body.massEarth) / JUPITER_PER_EARTH;
    return null;
  }

  /** Физический класс по массе в M_Юпитера. */
  function classify(massMj) {
    const m = num(massMj);
    if (!finite(m) || m <= 0) {
      return { kind: 'planet', selfLuminous: false, canFuse: false, canHost: false, massMj: null };
    }
    if (m < THRESHOLDS.JOVIAN) {
      return { kind: 'planet', selfLuminous: false, canFuse: false, canHost: false, massMj: m };
    }
    if (m < THRESHOLDS.DEUTERIUM) {
      return { kind: 'gas_giant', selfLuminous: false, canFuse: false, canHost: false, massMj: m };
    }
    if (m < THRESHOLDS.HYDROGEN) {
      // Коричневый карлик: дейтерий выгорает за 3–40 млн лет, дальше только остывание.
      return { kind: 'substellar', selfLuminous: true, canFuse: false, canHost: true, massMj: m };
    }
    return { kind: 'star', selfLuminous: true, canFuse: true, canHost: true, massMj: m };
  }

  /** Коричневый карлик — и по массе, и по прямому признаку в данных каталога. */
  function isSubstellar(body) {
    if (!body) return false;
    // body.star сюда не входит намеренно: это класс родительской звезды.
    const direct = String(body.starClass || body.bodyKind || body.archetype || '');
    if (direct === 'brown_dwarf' || direct === 'substellar') {
      const m = massOf(body);
      // Прямой признак уважаем, если масса не противоречит: не превращаем звезду в карлик.
      return !finite(m) || (m >= THRESHOLDS.DEUTERIUM && m < THRESHOLDS.HYDROGEN);
    }
    const c = classify(massOf(body));
    return c.kind === 'substellar';
  }

  /**
   * Эффективная температура коричневого карлика, K.
   * Радиус у них почти постоянный (~1 R_Юп), поэтому светимость и температура
   * падают с возрастом: молодая пара — 2500–3000 K, старая — 500–800 K.
   * Показатели подобраны так, чтобы 50 M_Юп в 1–3 млрд лет давали 1400–1800 K
   * (L/T-карлики), а 13 M_Юп — тёмный T/Y-карлик.
   */
  function temperatureK(massMj, ageGyr) {
    const m = finite(num(massMj)) && num(massMj) > 0 ? num(massMj) : 40;
    const age = finite(num(ageGyr)) && num(ageGyr) > 0.01 ? num(ageGyr) : 3;
    const t = 1750 * Math.pow(m / 50, .45) * Math.pow(age / 3, -.30);
    return Math.max(300, Math.min(3200, t));
  }

  function kindLabel(kind, lang) {
    const ru = {
      planet: 'Планета', gas_giant: 'Газовый гигант', substellar: 'Коричневый карлик',
      star: 'Звезда', moon: 'Луна', system: 'Система', companion: 'Компаньон', hole: 'Чёрная дыра'
    };
    const en = {
      planet: 'Planet', gas_giant: 'Gas giant', substellar: 'Brown dwarf',
      star: 'Star', moon: 'Moon', system: 'System', companion: 'Companion', hole: 'Black hole'
    };
    const table = String(lang || '').startsWith('ru') ? ru : en;
    return table[kind] || table.planet;
  }

  const API = { THRESHOLDS, JUPITER_PER_SUN, JUPITER_PER_EARTH, STAR_MASS, classify, massOf, isSubstellar, temperatureK, kindLabel };
  if (typeof window !== 'undefined') window.EUBodyClass = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
