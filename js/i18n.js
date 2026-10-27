/* Единый словарь сайта: RU/EN + cookie eu_lang */
(function () {
  'use strict';
  const COOKIE = 'eu_lang';
  const DICT = {
    ru: {
      'brand.sub': 'предпросмотр сидов · карта космоса',
      'seed.title': 'Сид мира: десятичный или 0x…',
      'generate': 'Сгенерировать',
      'random': 'Случайный сид',
      'search.ph': 'Поиск: планета, система, спутник…',
      'galaxy': 'Галактика',
      'loading': 'Генерация каталога…',
      'hint': '<b>Колесо</b> — масштаб · <b>перетаскивание</b> — панорама · <b>клик</b> — звезда, система, планета · <b>Esc</b> — назад',
      'hint.mobile': '<b>Один палец</b> — панорама · <b>два пальца</b> — масштаб · <b>тап</b> — выбор',
      'lang.title': 'Выберите язык',
      'lang.prompt': 'Он запомнится в cookie и больше не появится.',
      'lang.ru': 'Русский',
      'lang.en': 'English',
      'lang.btn': 'Язык',
      'cat.very_hot': 'очень горячая',
      'cat.hot': 'горячая',
      'cat.temperate': 'умеренная',
      'cat.habitable': 'обитаемая',
      'cat.cold_habitable': 'холодная обитаемая',
      'cat.distant': 'дальняя',
      'cat.gas_giant': 'газовый гигант',
      'atm.none': 'нет',
      'atm.minimal': 'минимальная',
      'atm.thin': 'тонкая',
      'atm.moderate': 'умеренная',
      'atm.medium': 'средняя',
      'atm.thick': 'плотная',
      'info.category': 'Категория',
      'info.atmosphere': 'Атмосфера',
      'info.gravity': 'Гравитация',
      'info.temperature': 'Температура',
      'info.radiation': 'Радиация',
      'info.orbit': 'Орбита',
      'info.diameter': 'Диаметр',
      'info.rings': 'Кольца',
      'info.moons': 'Спутники',
      'info.no_moons': 'Спутников нет',
      'info.biomes': 'Биомы',
      'info.seed': 'Сид планеты',
      'info.star': 'звезда',
      'info.class': 'Класс',
      'info.temp_k': 'Температура',
      'info.lum': 'Светимость',
      'info.distance': 'Расстояние',
      'info.planets': 'Планет',
      'atm.composition': 'Состав атмосферы',
      'info.moon': 'спутник',
      'info.parent': 'Родитель',
      'info.period': 'Период',
      'unit.min': 'мин',
      'zones': 'Зоны',
      'yes': 'есть',
      'no': 'нет',
      'system.planets': 'планет',
      'unit.g': 'g',
      'unit.c': '°C',
      'unit.au': 'а.е.',
      'unit.re': 'R⊕',
      'unit.ly': 'св. лет',
      'unit.k': 'K',
      'unit.km': 'км',
      'unit.lsun': 'L☉',
      'star.red_dwarf': 'красный карлик', 'star.yellow_dwarf': 'жёлтый карлик',
      'star.white_yellow_dwarf': 'жёлто-белый карлик', 'star.white_dwarf': 'белый карлик',
      'star.blue_dwarf': 'голубой карлик', 'star.white_giant': 'белый гигант',
      'star.blue_giant': 'голубой гигант', 'star.yellow_giant': 'жёлтый гигант',
      'star.red_giant': 'красный гигант', 'star.yellow_supergiant': 'жёлтый сверхгигант',
      'star.red_supergiant': 'красный сверхгигант', 'star.carbon_star': 'углеродная звезда',
      'star.brown_dwarf': 'коричневый карлик', 'star.magnetar': 'магнитар',
      'mobile.version': 'Мобильная версия',
      'desktop.version': 'Полная версия'
    },
    en: {
      'brand.sub': 'seed preview · space map',
      'seed.title': 'World seed: decimal or 0x…',
      'generate': 'Generate',
      'random': 'Random seed',
      'search.ph': 'Search: planet, system, moon…',
      'galaxy': 'Galaxy',
      'loading': 'Generating catalog…',
      'hint': '<b>Wheel</b> — zoom · <b>drag</b> — pan · <b>click</b> — star, system, planet · <b>Esc</b> — back',
      'hint.mobile': '<b>One finger</b> — pan · <b>two fingers</b> — zoom · <b>tap</b> — select',
      'lang.title': 'Choose language',
      'lang.prompt': 'It will be saved in a cookie and won\'t appear again.',
      'lang.ru': 'Русский',
      'lang.en': 'English',
      'lang.btn': 'Language',
      'cat.very_hot': 'very hot',
      'cat.hot': 'hot',
      'cat.temperate': 'temperate',
      'cat.habitable': 'habitable',
      'cat.cold_habitable': 'cold habitable',
      'cat.distant': 'distant',
      'cat.gas_giant': 'gas giant',
      'atm.none': 'none',
      'atm.minimal': 'minimal',
      'atm.thin': 'thin',
      'atm.moderate': 'moderate',
      'atm.medium': 'medium',
      'atm.thick': 'thick',
      'info.category': 'Category',
      'info.atmosphere': 'Atmosphere',
      'info.gravity': 'Gravity',
      'info.temperature': 'Temperature',
      'info.radiation': 'Radiation',
      'info.orbit': 'Orbit',
      'info.diameter': 'Diameter',
      'info.rings': 'Rings',
      'info.moons': 'Moons',
      'info.no_moons': 'No moons',
      'info.biomes': 'Biomes',
      'info.seed': 'Planet seed',
      'info.star': 'star',
      'info.class': 'Class',
      'info.temp_k': 'Temperature',
      'info.lum': 'Luminosity',
      'info.distance': 'Distance',
      'info.planets': 'Planets',
      'atm.composition': 'Atmosphere composition',
      'info.moon': 'moon',
      'info.parent': 'Parent',
      'info.period': 'Period',
      'unit.min': 'min',
      'zones': 'Zones',
      'yes': 'yes',
      'no': 'no',
      'system.planets': 'planets',
      'unit.g': 'g',
      'unit.c': '°C',
      'unit.au': 'AU',
      'unit.re': 'R⊕',
      'unit.ly': 'ly',
      'unit.k': 'K',
      'unit.km': 'km',
      'unit.lsun': 'L☉',
      'star.red_dwarf': 'red dwarf', 'star.yellow_dwarf': 'yellow dwarf',
      'star.white_yellow_dwarf': 'white-yellow dwarf', 'star.white_dwarf': 'white dwarf',
      'star.blue_dwarf': 'blue dwarf', 'star.white_giant': 'white giant',
      'star.blue_giant': 'blue giant', 'star.yellow_giant': 'yellow giant',
      'star.red_giant': 'red giant', 'star.yellow_supergiant': 'yellow supergiant',
      'star.red_supergiant': 'red supergiant', 'star.carbon_star': 'carbon star',
      'star.brown_dwarf': 'brown dwarf', 'star.magnetar': 'magnetar',
      'mobile.version': 'Mobile version',
      'desktop.version': 'Full version'
    }
  };
  function getCookie(name) {
    const m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : null;
  }
  function setCookie(name, value) {
    document.cookie = name + '=' + encodeURIComponent(value) + '; Max-Age=31536000; Path=/; SameSite=Lax';
  }
  let lang = getCookie(COOKIE);
  if (lang !== 'ru' && lang !== 'en') lang = null;

  function current() { return lang || 'ru'; }
  function t(key, vars) {
    let s = (DICT[current()] && DICT[current()][key]) || DICT.ru[key] || key;
    if (vars) for (const k in vars) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
    return s;
  }
  function apply() {
    document.documentElement.lang = current();
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.getAttribute('data-i18n-title')); });
    const btn = document.getElementById('langBtn');
    if (btn) btn.textContent = current() === 'ru' ? 'RU' : 'EN';
    window.dispatchEvent(new Event('eu-lang'));
  }
  function setLang(value, remember) {
    lang = value === 'en' ? 'en' : 'ru';
    if (remember !== false) setCookie(COOKIE, lang);
    apply();
    const modal = document.getElementById('langModal');
    if (modal) modal.classList.add('hidden');
  }
  function init() {
    apply();
    if (!lang) {
      const modal = document.getElementById('langModal');
      if (modal) modal.classList.remove('hidden');
    }
    document.querySelectorAll('#langModal [data-lang]').forEach(b => {
      b.addEventListener('click', () => setLang(b.getAttribute('data-lang')));
    });
    const btn = document.getElementById('langBtn');
    if (btn) btn.addEventListener('click', () => {
      const modal = document.getElementById('langModal');
      if (modal) modal.classList.remove('hidden');
    });
  }
  window.EUI18N = { t, current, setLang, init, apply, hasLang: () => !!lang };
})();
