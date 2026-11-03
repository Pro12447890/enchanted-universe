# -*- coding: utf-8 -*-
"""Реалистичный режим орбит на сайте.

Условный (как сейчас) остаётся по умолчанию; реалистичный включается кнопкой
в панели времени:
  • планеты — T = 8 766 000 · a^1,5 / √(M*/M☉) тиков (сутки MC = 20 мин);
  • луны — Кеплер вокруг своей планеты, по массе из гравитации и радиуса;
  • множитель времени действует на всё вместе, как и раньше.

Запуск: python tools/site-realistic-orbits.py [--write]
"""
import json
import pathlib
import re
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
ORBITS = ROOT / "js/orbits.js"
GEN = ROOT / "js/generator.js"
I18N = ROOT / "js/i18n.js"
PAGES = ["index.html", "mobile.html"]

DICT = {
    "ru": {
        "time.mode.conditional": "Условная",
        "time.mode.realistic": "Реалистичная",
        "time.mode.title": "Условная — прежняя скорость карты. Реалистичная — по Кеплеру: "
                           "оборот Земли 5,07 реальных суток при ×1 и 73 минуты при ×100; "
                           "луны считаются вокруг своей планеты.",
    },
    "en": {
        "time.mode.conditional": "Conventional",
        "time.mode.realistic": "Realistic",
        "time.mode.title": "Conventional — the old map speed. Realistic — Kepler: Earth takes "
                           "5.07 real days per orbit at ×1 and 73 minutes at ×100; moons orbit "
                           "their own planet.",
    },
}


def patch_orbits(text):
    """Период с учётом массы звезды."""
    old = """  function periodTicksFor(meanAu) {
    const a = Math.max(0.01, Number(meanAu) || 1);
    if (realisticMode) return REAL_YEAR_TICKS * Math.pow(a, 1.5);
    return (TAU / RATE_1AU) * Math.sqrt(a) * TICKS_PER_SECOND;
  }"""
    new = """  function periodTicksFor(meanAu, starKey) {
    const a = Math.max(0.01, Number(meanAu) || 1);
    if (realisticMode) {
      // Кеплер: T = год · a^1,5 / √(M*/M☉). Масса звезды — из светимости
      // (L ≈ M^3,5), таблица классов живёт в генераторе.
      const gen = (typeof window !== 'undefined' && window.EUGenerator) || null;
      const lum = gen && gen.starLuminosity ? Math.max(1e-4, gen.starLuminosity(starKey)) : 1;
      const mass = Math.max(0.08, Math.pow(lum, 1 / 3.5));
      return REAL_YEAR_TICKS * Math.pow(a, 1.5) / Math.sqrt(mass);
    }
    return (TAU / RATE_1AU) * Math.sqrt(a) * TICKS_PER_SECOND;
  }"""
    assert old in text, "orbits: нет periodTicksFor"
    text = text.replace(old, new, 1)
    # вызовы внутри baseElement: передаём класс звезды
    text = text.replace("period = periodTicksFor(gameR);", "period = periodTicksFor(gameR, system.star);")
    text = text.replace("period = periodTicksFor(mean);", "period = periodTicksFor(mean, system.star);")
    return text


def patch_generator(text):
    if "function starLuminosity" not in text:
        anchor = "function starSpectral(star) {"
        block = """function starLuminosity(star) {
  return ({
    red_dwarf: 0.04, yellow_dwarf: 1.0, white_yellow_dwarf: 2.0, white_dwarf: 0.005,
    blue_dwarf: 5.0, white_giant: 40.0, blue_giant: 80.0, yellow_giant: 60.0,
    red_giant: 50.0, yellow_supergiant: 300.0, red_supergiant: 400.0,
    carbon_star: 25.0, brown_dwarf: 0.0001, magnetar: 0.000001
  })[star] || 1.0;
}

"""
        assert anchor in text
        text = text.replace(anchor, block + anchor, 1)
    if "periodTicksReal" not in text:
        old = """      temperatureC: climate.temperatureC, radiation
    });"""
        new = """      temperatureC: climate.temperatureC, radiation,
      // Реалистичный режим: период по Кеплеру вокруг своей планеты.
      // Масса планеты — из её гравитации и радиуса, полуось — distanceKm.
      periodTicksReal: realMoonPeriod(distanceKm, radiusParent, planet)
    });"""
        assert old in text, "generator: нет блока moonSpecs"
        text = text.replace(old, new, 1)
        anchor = "function moonSpecs(planet) {"
        block = """function realMoonPeriod(distanceKm, parentRadiusKm, planet) {
  const G = 6.674e-11;
  const rPlanet = Math.max(2e5, parentRadiusKm * 1000);
  const g = Math.max(0.05, Number(planet && planet.gravity != null ? planet.gravity : 1)) * 9.80665;
  const mass = Math.max(1e21, g * rPlanet * rPlanet / G);
  const a = Math.max(1e6, Number(distanceKm) * 1000);
  const seconds = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / (G * mass));
  const days = seconds / 86400;
  return Math.max(60, Math.round(days * 24000));
}

"""
        assert anchor in text
        text = text.replace(anchor, block + anchor, 1)
    if "starLuminosity" in text and "planetClass, starSpectral" in text:
        text = text.replace("window.EUGenerator = { generateCatalog, moonSpecs, planetClass, starSpectral",
                            "window.EUGenerator = { generateCatalog, moonSpecs, planetClass, starSpectral, starLuminosity", 1)
        text = text.replace("module.exports = { generateCatalog, JavaRandom, moonSpecs, planetClass, starSpectral",
                            "module.exports = { generateCatalog, JavaRandom, moonSpecs, planetClass, starSpectral, starLuminosity", 1)
    return text


PAGE_MARKUP = {
    "index.html": (
        '<span class="timeMode" data-i18n="time.mode">Реалистичный</span>',
        '<button id="orbitMode" class="timeMode" type="button" data-i18n-title="time.mode.title">'
        '<span data-i18n="time.mode.conditional">Условная</span></button>',
    ),
    "mobile.html": (
        '<span class="timeMode" data-i18n="time.mode">Реалистичный</span>',
        '<button id="orbitMode" class="timeMode" type="button" data-i18n-title="time.mode.title">'
        '<span data-i18n="time.mode.conditional">Условная</span></button>',
    ),
}

PAGE_JS_ANCHOR = "if (timeBack) timeBack.addEventListener('click', () => setSpeedIndex(speedIndex - 1));"

PAGE_JS = """// Режим орбит: условная (как в игре) или реалистичная (по Кеплеру).
const ORBIT_MODE_KEY = 'eu_orbit_mode';
function applyOrbitMode(realistic, remember) {
  const on = EUOrbits.setRealistic(realistic);
  MOON_CACHE.clear();
  const btn = document.getElementById('orbitMode');
  if (btn) {
    const label = on ? T('time.mode.realistic') : T('time.mode.conditional');
    btn.innerHTML = '<span>' + esc(label) + '</span>';
    btn.classList.toggle('is-realistic', on);
  }
  if (remember !== false) {
    try { localStorage.setItem(ORBIT_MODE_KEY, on ? 'realistic' : 'conditional'); } catch (e) {}
  }
  if (selected) {
    if (selected.kind === 'planet') showPlanet(selected.planet, selected.system);
    else if (selected.kind === 'star') showStar(selected.system);
  }
  draw(performance.now());
}
function initOrbitMode() {
  let saved = null;
  try { saved = localStorage.getItem(ORBIT_MODE_KEY); } catch (e) {}
  applyOrbitMode(saved === 'realistic', false);
  const btn = document.getElementById('orbitMode');
  if (btn) btn.addEventListener('click', () => applyOrbitMode(!EUOrbits.isRealistic(), true));
}
window.addEventListener('eu-lang', () => {
  const btn = document.getElementById('orbitMode');
  if (!btn) return;
  btn.innerHTML = '<span>' + esc(EUI18N.t(EUOrbits.isRealistic() ? 'time.mode.realistic' : 'time.mode.conditional')) + '</span>';
});
initOrbitMode();
"""

CSS_ANCHOR = ".timebar .timeTag { font-size:10px;"
CSS_ADD = """  .timebar button.timeMode { width:auto; padding:0 9px; font-size:9.5px; letter-spacing:.08em;
                             text-transform:uppercase; color:#9fb0d8; border-color:#2a3550; }
  .timebar button.timeMode.is-realistic { color:#5fe6ff; border-color:#2f6f6a; background:rgba(63,160,150,.10); }
"""


def main(write):
    problems = []

    # --- orbits.js
    text = ORBITS.read_text(encoding="utf-8")
    if "REAL_YEAR_TICKS * Math.pow(a, 1.5) / Math.sqrt(mass)" not in text:
        text = patch_orbits(text)
    if write:
        ORBITS.write_text(text, encoding="utf-8", newline="\n")

    # --- generator.js
    gen = GEN.read_text(encoding="utf-8")
    if "realMoonPeriod" not in gen:
        gen = patch_generator(gen)
    if write:
        GEN.write_text(gen, encoding="utf-8", newline="\n")

    # --- словарь
    i18n = I18N.read_text(encoding="utf-8")
    for lang, keys in DICT.items():
        for key, value in keys.items():
            if f"'{key}':" in i18n:
                continue
            anchor = "      'time.mode': "
            idx = i18n.find(anchor)
            if lang == "en":
                idx = i18n.find(anchor, idx + 1)
            end = i18n.find("\n", idx) + 1
            escaped = value.replace("'", "\\'")
            i18n = i18n[:end] + f"      '{key}': '{escaped}',\n" + i18n[end:]
    if write:
        I18N.write_text(i18n, encoding="utf-8", newline="\n")

    # --- страницы
    for page in PAGES:
        path = ROOT / page
        html = path.read_text(encoding="utf-8")
        old, new = PAGE_MARKUP[page]
        if new not in html:
            if old not in html:
                problems.append(f"{page}: не найдена панель режима")
            else:
                html = html.replace(old, new, 1)
        if "function initOrbitMode" not in html:
            if PAGE_JS_ANCHOR not in html:
                problems.append(f"{page}: не найден якорь для скрипта режима")
            else:
                html = html.replace(PAGE_JS_ANCHOR, PAGE_JS + "\n" + PAGE_JS_ANCHOR, 1)
        if ".timebar button.timeMode" not in html:
            if CSS_ANCHOR not in html:
                problems.append(f"{page}: не найден css timeTag")
            else:
                html = html.replace(CSS_ANCHOR, CSS_ADD + CSS_ANCHOR, 1)
        if write:
            backup = ROOT / "_backup_i18n" / page
            backup.parent.mkdir(exist_ok=True)
            if backup.exists():
                pass
            else:
                shutil.copy2(path, backup)
            path.write_text(html, encoding="utf-8", newline="\n")

    for p in problems:
        print("  !", p)
    print("готово" if not problems else "есть проблемы")
    return 0 if not problems else 1


if __name__ == "__main__":
    sys.exit(main("--write" in sys.argv))
