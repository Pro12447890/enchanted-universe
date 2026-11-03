/* Единый словарь сайта: RU/EN, имена небесных тел, cookie eu_lang.
 *
 * Возможности:
 *   EUI18N.t(key, vars)      — строка по ключу с подстановкой {var}
 *   EUI18N.name(value)       — имя тела на языке сайта (Меркурий → Mercury)
 *   EUI18N.locale()          — 'ru-RU' / 'en-US' для toLocaleString
 *   EUI18N.num(value, opts)  — число в локали сайта
 *   EUI18N.current()         — 'ru' | 'en'
 *   EUI18N.setLang(lang)     — переключить и запомнить
 *   EUI18N.init()            — применить разметку и повесить обработчики
 *
 * Разметка:
 *   data-i18n           — textContent
 *   data-i18n-html      — innerHTML (для подсказок с <b>)
 *   data-i18n-ph        — placeholder
 *   data-i18n-title     — title (подсказка)
 *   data-i18n-doc       — текст <title> и og:title документа
 *   data-i18n-hide="en" — скрыть элемент в перечисленных языках
 */
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
      'time.title': 'Реалистичное время: локальные тики, не синхронизировано с миром',
      'time.speedTitle': 'Скорость времени · клик — ×1',
      'time.mode': 'Реалистичный',
      'time.ticks': 'лок. тики',
      'time.ticksTitle': 'Локальные тики с начала эпохи. Не синхронизировано с миром: введи значение вручную или импортируй каталог.',
      'import.title': 'Импорт JSON каталога мира (/spacecatalog)',
      'bar.toggle': 'Показать/скрыть панель',
      'loading': 'Генерация каталога…',
      'hint': '<b>Колесо</b> — масштаб · <b>перетаскивание</b> — панорама · <b>клик</b> — звезда, система, планета · <b>Esc</b> — назад',
      'hint.mobile': '<b>Один палец</b> — панорама · <b>два пальца</b> — масштаб · <b>тап</b> — выбор',
      'lang.title': 'Выберите язык',
      'lang.prompt': 'Он запомнится в cookie и больше не появится.',
      'lang.ru': 'Русский',
      'lang.en': 'English',
      'lang.btn': 'Язык',
      'lang.suggested': 'совпадает с языком браузера',
      'doc.desc': 'Enchanted Universe — интерактивная карта сидов, планет и симбиозных миров Смешарии.',
      'desktop.short': 'Полная',
      'seed.label': 'сид',
      'seed.import': 'импорт',
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
      'info.belt_radiation': 'Радиация пояса',
      'unit.min': 'мин',
      'zones': 'Зоны',
      'rings3d.title': '3D-кольца и тень планеты на кольце',
      'rings3d.on': '3D-кольца и тень планеты включены',
      'rings3d.off': '3D-кольца выключены',
      'smesharia.version': 'Версия со Смешарией',
      'smesharia.badge': 'Smesharia',
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
      'desktop.version': 'Полная версия',
      'tgk': 'ТГК мода',
      'tgk.title': 'Телеграм-канал мода',
      'planets': 'Генератор планет',
      'planets.title': 'Генератор планет в браузере',
      'avail': 'Доступно на:',
      'avail.mi': 'Minecraft Inside',
      'avail.cf': 'CurseForge',
      'avail.mr': 'Modrinth',
      'ver.title': 'Последняя версия мода',
      // --- добавлено: подписи карточек и служебные строки ---
      'doc.index': 'Enchanted Universe — карта космоса по сиду',
      'doc.mobile': 'Enchanted Universe — карта космоса (мобильная)',
      'doc.planets': 'Генератор планет — Enchanted Universe',
      'card.type': 'Тип',
      'card.spectral': 'Спектр',
      'card.orbit': 'Орбита',
      'card.primary': 'Главная звезда',
      'card.companion': 'Спутник',
      'card.star': 'звезда',
      'card.planet': 'планета',
      'card.moon': 'спутник',
      'card.companionLow': 'компаньон',
      'card.distanceNote': 'Расстояние до системы считается в световых годах до сжатия карты.',
      'card.previewSeed': 'превью по worldSeed',
      'card.worldCatalog': 'каталог мира',
      'card.source': 'Источник',
      'card.texture': 'Текстура',
      'card.nearest': 'Ближайшая система',
      'card.coords': 'Координаты',
      'card.galaxyObject': 'объект галактики',
      'card.blackHole': 'Чёрная дыра ',
      'card.aurora': 'Овал сияния',
      'card.fromAxis': ' от оси',
      'card.magpole': 'Магнитный полюс',
      'card.retro': ' · обратное',
      'card.tilt': 'Наклон оси',
      'card.semi': 'Полуось',
      'card.period': 'Период (карта)',
      'card.gameOrbit': 'Игровая орбита',
      'card.incl': 'Наклон орбиты',
      'card.ecc': 'Эксцентриситет',
      'import.synthetic': 'Импорт: тики синтетические (0), это не время мира',
      'import.ok': 'Импортирован мир: ',
      'import.failed': 'Импорт не удался: ',
      'biome.unknown': 'Неопределённое вопросительное xD',
      'err.prefix': 'Импорт: ',
      'err.value': 'нечисловое значение',
      'err.missing': 'отсутствует',
      'err.positive': 'должно быть > 0',
      'err.nonneg': 'должно быть >= 0',
      'err.seedMissing': 'отсутствует seed',
      'err.seedFormat': 'seed не десятичная строка',
      'err.seedRange': 'seed вне int64',
      'err.coords': 'нет координат',
      'err.systems': 'нет systems[]',
      'err.ecc': 'вне [0,1)',
      // --- планеты: отдельная страница ---
      'p.back': '← на сайт',
      'p.title': 'Генератор планет',
      'p.seed': 'Сид',
      'p.random': 'Случайный сид',
      'p.type': 'Тип',
      'p.gas': 'газовый гигант',
      'p.rocky': 'каменная',
      'p.temp': 'Температура, °C',
      'p.size': 'Размер',
      'p.pixel': 'Пиксель',
      'p.auto': 'авто',
      'p.tilt': 'Наклон полос',
      'p.save': 'Скачать PNG',
      'p.info.gas': 'сид {seed} · газовый гигант\nпоясов {bands} · искажение {distort} · ровность {softness}\nширина {widen} · вихрей {spots} · пятен {smalls}\nшестиугольник {hex} · нагрев {heat}',
      'p.info.rocky': 'сид {seed} · каменная планета\nматерики {cont} · детали {detail}\nпорог суши {land} · шапки {caps}',
      'p.heat': '{v} %'
    },
    en: {
      'brand.sub': 'seed preview · space map',
      'seed.title': 'World seed: decimal or 0x…',
      'generate': 'Generate',
      'random': 'Random seed',
      'search.ph': 'Search: planet, system, moon…',
      'galaxy': 'Galaxy',
      'time.title': 'Realistic time: local ticks, not synced with the world',
      'time.speedTitle': 'Time speed · click for ×1',
      'time.mode': 'Realistic',
      'time.ticks': 'local ticks',
      'time.ticksTitle': 'Local ticks since the epoch. Not synced with the world: type a value or import a catalog.',
      'import.title': 'Import a world catalog JSON (/spacecatalog)',
      'bar.toggle': 'Show/hide panel',
      'loading': 'Generating catalog…',
      'hint': '<b>Wheel</b> — zoom · <b>drag</b> — pan · <b>click</b> — star, system, planet · <b>Esc</b> — back',
      'hint.mobile': '<b>One finger</b> — pan · <b>two fingers</b> — zoom · <b>tap</b> — select',
      'lang.title': 'Choose your language',
      'lang.prompt': 'Your choice is stored in a cookie and this dialog won’t appear again.',
      'lang.ru': 'Русский',
      'lang.en': 'English',
      'lang.btn': 'Language',
      'lang.suggested': 'matches your browser language',
      'doc.desc': 'Enchanted Universe — an interactive map of seeds, planets and the symbiotic Smesharia worlds.',
      'desktop.short': 'Full',
      'seed.label': 'seed',
      'seed.import': 'import',
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
      'info.belt_radiation': 'Belt radiation',
      'unit.min': 'min',
      'zones': 'Zones',
      'rings3d.title': '3D rings and the planet’s shadow on the ring',
      'rings3d.on': '3D rings and planet shadow are on',
      'rings3d.off': '3D rings are off',
      'smesharia.version': 'Smesharia version',
      'smesharia.badge': 'Smesharia',
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
      'star.white_yellow_dwarf': 'yellow-white dwarf', 'star.white_dwarf': 'white dwarf',
      'star.blue_dwarf': 'blue dwarf', 'star.white_giant': 'white giant',
      'star.blue_giant': 'blue giant', 'star.yellow_giant': 'yellow giant',
      'star.red_giant': 'red giant', 'star.yellow_supergiant': 'yellow supergiant',
      'star.red_supergiant': 'red supergiant', 'star.carbon_star': 'carbon star',
      'star.brown_dwarf': 'brown dwarf', 'star.magnetar': 'magnetar',
      'mobile.version': 'Mobile version',
      'desktop.version': 'Full version',
      'tgk': 'Telegram',
      'tgk.title': 'The mod’s Telegram channel',
      'planets': 'Planet generator',
      'planets.title': 'Planet generator in the browser',
      'avail': 'Available on:',
      'avail.mi': 'Minecraft Inside',
      'avail.cf': 'CurseForge',
      'avail.mr': 'Modrinth',
      'ver.title': 'Latest mod version',
      // --- added: card labels and service strings ---
      'doc.index': 'Enchanted Universe — a space map for your seed',
      'doc.mobile': 'Enchanted Universe — space map (mobile)',
      'doc.planets': 'Planet generator — Enchanted Universe',
      'card.type': 'Type',
      'card.spectral': 'Spectral class',
      'card.orbit': 'Orbit',
      'card.primary': 'Primary star',
      'card.companion': 'Companion',
      'card.star': 'star',
      'card.planet': 'planet',
      'card.moon': 'moon',
      'card.companionLow': 'companion',
      'card.distanceNote': 'Distance to a system is measured in light years before map compression.',
      'card.previewSeed': 'worldSeed preview',
      'card.worldCatalog': 'world catalog',
      'card.source': 'Source',
      'card.texture': 'Texture',
      'card.nearest': 'Nearest system',
      'card.coords': 'Coordinates',
      'card.galaxyObject': 'galaxy object',
      'card.blackHole': 'Black hole ',
      'card.aurora': 'Aurora oval',
      'card.fromAxis': ' from axis',
      'card.magpole': 'Magnetic pole',
      'card.retro': ' · retrograde',
      'card.tilt': 'Axial tilt',
      'card.semi': 'Semi-major',
      'card.period': 'Period (map)',
      'card.gameOrbit': 'Game orbit',
      'card.incl': 'Orbital inclination',
      'card.ecc': 'Eccentricity',
      'import.synthetic': 'Imported: synthetic ticks (0) — this is not world time',
      'import.ok': 'World imported: ',
      'import.failed': 'Import failed: ',
      'biome.unknown': 'Undetermined and slightly questionable xD',
      'err.prefix': 'Import: ',
      'err.value': 'not a number',
      'err.missing': 'missing',
      'err.positive': 'must be > 0',
      'err.nonneg': 'must be >= 0',
      'err.seedMissing': 'seed is missing',
      'err.seedFormat': 'seed is not a decimal string',
      'err.seedRange': 'seed is outside int64',
      'err.coords': 'no coordinates',
      'err.systems': 'no systems[]',
      'err.ecc': 'outside [0,1)',
      // --- planet generator page ---
      'p.back': '← back to site',
      'p.title': 'Planet generator',
      'p.seed': 'Seed',
      'p.random': 'Random seed',
      'p.type': 'Type',
      'p.gas': 'gas giant',
      'p.rocky': 'rocky',
      'p.temp': 'Temperature, °C',
      'p.size': 'Size',
      'p.pixel': 'Pixel',
      'p.auto': 'auto',
      'p.tilt': 'Band tilt',
      'p.save': 'Download PNG',
      'p.info.gas': 'seed {seed} · gas giant\nbands {bands} · distortion {distort} · softness {softness}\nwidth {widen} · vortices {spots} · spots {smalls}\nhexagon {hex} · heating {heat}',
      'p.info.rocky': 'seed {seed} · rocky planet\ncontinents {cont} · detail {detail}\nland threshold {land} · caps {caps}',
      'p.heat': '{v} %'
    }
  };

  /* Имена небесных тел: в данных сайта и в импортированных каталогах они
   * записаны по-русски (так их генерирует мод), а в английском режиме должны
   * читаться по-английски. Латинские имена (Aelara, NCS-3301) проходят как есть. */
  const NAMES = {
    'Солнечная система': 'Solar System',
    'Меркурий': 'Mercury', 'Венера': 'Venus', 'Земля': 'Earth', 'Марс': 'Mars',
    'Церера': 'Ceres', 'Юпитер': 'Jupiter', 'Сатурн': 'Saturn', 'Уран': 'Uranus',
    'Нептун': 'Neptune', 'Плутон': 'Pluto', 'Хаумеа': 'Haumea', 'Кваоар': 'Quaoar',
    'Макемаке': 'Makemake', 'Эрида': 'Eris',
    'Луна': 'Moon', 'Фобос': 'Phobos', 'Деймос': 'Deimos',
    'Ио': 'Io', 'Европа': 'Europa', 'Ганимед': 'Ganymede', 'Каллисто': 'Callisto',
    'Мимас': 'Mimas', 'Энцелад': 'Enceladus', 'Тефия': 'Tethys', 'Рея': 'Rhea',
    'Титан': 'Titan', 'Миранда': 'Miranda', 'Ариэль': 'Ariel', 'Умбриэль': 'Umbriel',
    'Титания': 'Titania', 'Оберон': 'Oberon', 'Тритон': 'Triton', 'Нереида': 'Nereid',
    'Харон': 'Charon',
    'Астерион': 'Asterion', 'Терра Нова': 'Terra Nova', 'Аэрис': 'Aeris',
    'Веспер': 'Vesper', 'Ноктис': 'Noctis', 'Кронос': 'Kronos', 'Аквария': 'Aquaria',
    'Бетельгейзе': 'Betelgeuse', 'Пепел': 'Ash', 'Исполин': 'Colossus',
    'Сингулярность': 'Singularity', 'Обсидиан': 'Obsidian', 'Ригель': 'Rigel',
    'Лазурь': 'Azure', 'Пух': 'Puff', 'Сиварха': 'Sivarkha',
    'Выжженный Древонид': 'Scorched Drevoid', 'Древонид': 'Drevoid',
    'Джунгля': 'Junglya', 'Ураниум': 'Uranium', 'Центра-Альфара': 'Centra-Alphara'
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
  function locale() { return current() === 'ru' ? 'ru-RU' : 'en-US'; }
  function num(value, options) {
    const n = Number(value);
    if (!isFinite(n)) return String(value);
    try { return n.toLocaleString(locale(), options); } catch (e) { return String(n); }
  }
  function t(key, vars) {
    let s = (DICT[current()] && DICT[current()][key]) || DICT.ru[key] || key;
    if (vars) for (const k in vars) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
    return s;
  }
  /** Имя тела на языке сайта; числовые хвосты («Луна 2») и PSR- сохраняются. */
  function name(value) {
    const text = value == null ? '' : String(value);
    if (!text) return text;
    const direct = NAMES[text];
    if (direct) return current() === 'ru' ? text : direct;
    if (current() === 'ru') return text;
    const tail = /^(.+?)(\s+\d+)$/.exec(text);
    if (tail && NAMES[tail[1]]) return NAMES[tail[1]] + tail[2];
    const psr = /^(PSR-)(.+)$/.exec(text);
    if (psr) return psr[1] + (NAMES[psr[2]] || psr[2]);
    return text;
  }
  /** Язык по браузеру: для русскоязычных браузеров — ru, иначе en. */
  function suggested() {
    const list = (navigator.languages && navigator.languages.length)
      ? navigator.languages : [navigator.language || 'ru'];
    const first = String(list[0] || '').toLowerCase();
    return /^(ru|uk|be|kk|ky|uz|tt|ba|hy|ka|az)(-|$)/.test(first) ? 'ru' : 'en';
  }

  function apply() {
    document.documentElement.lang = current();
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.getAttribute('data-i18n-title')); });
    document.querySelectorAll('[data-i18n-doc]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n-doc')); });
    // Заголовок вкладки и описания для поисковиков и соцсетей — на языке сайта.
    const docKey = document.documentElement.getAttribute('data-doc-key') || 'doc.index';
    document.querySelectorAll('meta[property="og:title"]').forEach(el => el.setAttribute('content', t(docKey)));
    document.querySelectorAll('meta[name="description"], meta[property="og:description"]')
      .forEach(el => el.setAttribute('content', t('doc.desc')));
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute('content', current() === 'ru' ? 'ru_RU' : 'en_US');
    // data-i18n-hide="en" — элемент скрыт в перечисленных языках (например, магазин без EN-страницы)
    document.querySelectorAll('[data-i18n-hide]').forEach(el => {
      const langs = String(el.getAttribute('data-i18n-hide') || '').split(',').map(s => s.trim());
      el.style.display = langs.indexOf(current()) >= 0 ? 'none' : '';
    });
    const btn = document.getElementById('langBtn');
    if (btn) {
      btn.textContent = current() === 'ru' ? 'RU' : 'EN';
      btn.title = t('lang.btn');
      btn.setAttribute('aria-label', t('lang.btn'));
    }
    window.dispatchEvent(new Event('eu-lang'));
  }

  let modalOpen = false, lastFocus = null;
  function focusables(modal) {
    return [...modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.disabled && el.offsetParent !== null);
  }
  function setBackgroundInert(on) {
    const modal = document.getElementById('langModal');
    for (const el of document.body.children) {
      if (el === modal || el.tagName === 'SCRIPT') continue;
      if (on) { el.inert = true; el.setAttribute('data-eu-inert', '1'); }
      else if (el.hasAttribute('data-eu-inert')) { el.inert = false; el.removeAttribute('data-eu-inert'); }
    }
  }
  function openLangModal() {
    const modal = document.getElementById('langModal');
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.classList.remove('hidden');
    modalOpen = true;
    setBackgroundInert(true);
    const hint = suggested();
    modal.querySelectorAll('[data-lang]').forEach(b => {
      const isHint = b.getAttribute('data-lang') === hint;
      b.classList.toggle('is-suggested', isHint);
      if (isHint) b.title = t('lang.suggested'); else b.removeAttribute('title');
    });
    const first = modal.querySelector('[data-lang="' + hint + '"]') || focusables(modal)[0];
    if (first) setTimeout(() => first.focus(), 0);
  }
  function closeLangModal() {
    const modal = document.getElementById('langModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modalOpen = false;
    setBackgroundInert(false);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }
  function modalKeydown(e) {
    const modal = document.getElementById('langModal');
    if (!modalOpen || !modal) return;
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      if (!lang) setLang(current(), true); else closeLangModal();
      return;
    }
    if (e.key === 'Tab') {
      const f = focusables(modal);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1);
      e.preventDefault(); f[next].focus();
    }
  }
  document.addEventListener('keydown', modalKeydown, true);

  function setLang(value, remember) {
    lang = value === 'en' ? 'en' : 'ru';
    if (remember !== false) setCookie(COOKIE, lang);
    apply();
    closeLangModal();
  }

  function init() {
    apply();
    const modal = document.getElementById('langModal');
    if (!lang) {
      // Без модалки (например, страница генератора планет) — сразу язык браузера,
      // но не запоминаем: cookie поставит только явный выбор.
      if (modal) openLangModal(); else setLang(suggested(), false);
    }
    document.querySelectorAll('#langModal [data-lang]').forEach(b => {
      b.addEventListener('click', () => setLang(b.getAttribute('data-lang')));
    });
    const btn = document.getElementById('langBtn');
    if (btn) btn.addEventListener('click', () => {
      if (modal) openLangModal(); else setLang(current() === 'ru' ? 'en' : 'ru', true);
    });
  }

  window.EUI18N = {
    t, name, current, locale, num, suggested, setLang, init, apply,
    hasLang: () => !!lang,
    names: NAMES
  };
})();
