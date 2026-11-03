# -*- coding: utf-8 -*-
"""Английсификатор: страница генератора планет (planets.html).

Страница была целиком русской и не подключала словарь. Теперь:
  • <title> и <html lang> переключаются вместе с языком;
  • у подписей есть data-i18n, у кнопки в шапке — переключатель RU/EN;
  • строка параметров под планетой собирается из шаблона словаря;
  • вызывается EUI18N.init() и перерисовка по событию eu-lang.

Запуск: python tools/site-englishify-planets.py [--write]
"""
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
PAGE = ROOT / "planets.html"

REPLACEMENTS = [
    ('<html lang="ru">', '<html lang="ru" data-doc-key="doc.planets">'),
    ('<title>Генератор планет — Enchanted Universe</title>',
     '<title data-i18n-doc="doc.planets">Генератор планет — Enchanted Universe</title>'),
    ('<h1>Генератор планет <span>— enchanted universe</span></h1>',
     '<h1><span data-i18n="p.title">Генератор планет</span> <span>— enchanted universe</span></h1>'),
    ('<a class="back" href="https://enchanted.daymix.dpdns.org/">← на сайт</a>',
     '<a class="back" href="https://enchanted.daymix.dpdns.org/" data-i18n="p.back">← на сайт</a>\n'
     '    <button id="langBtn" class="back" type="button" aria-label="Язык">RU</button>'),
    ('<label>Сид <input id="seed" type="number" value="7" step="1"></label>',
     '<label><span data-i18n="p.seed">Сид</span> <input id="seed" type="number" value="7" step="1"></label>'),
    ('<button id="rnd">Случайный сид</button>',
     '<button id="rnd" data-i18n="p.random">Случайный сид</button>'),
    ('<label>Тип <select id="type">',
     '<label><span data-i18n="p.type">Тип</span> <select id="type">'),
    ('<option value="gas">газовый гигант</option>',
     '<option value="gas" data-i18n="p.gas">газовый гигант</option>'),
    ('<option value="rocky">каменная</option>',
     '<option value="rocky" data-i18n="p.rocky">каменная</option>'),
    ('<label>Температура, °C',
     '<label><span data-i18n="p.temp">Температура, °C</span>'),
    ('<label>Размер <select id="size">',
     '<label><span data-i18n="p.size">Размер</span> <select id="size">'),
    ('<label>Пиксель <select id="pix">',
     '<label><span data-i18n="p.pixel">Пиксель</span> <select id="pix">'),
    ('<option value="auto" selected>авто</option>',
     '<option value="auto" selected data-i18n="p.auto">авто</option>'),
    ('<label><span>Наклон полос</span>',
     '<label><span data-i18n="p.tilt">Наклон полос</span>'),
    ('<button id="save">Скачать PNG</button>',
     '<button id="save" data-i18n="p.save">Скачать PNG</button>'),
    ('<script>\n"use strict";',
     '<script src="js/i18n.js"></script>\n<script>\n"use strict";\nconst T = (k, v) => EUI18N.t(k, v);'),
    ("""  const info = c.kind === "gas"
    ? `сид ${c.seed} · газовый гигант\\n` +
      `поясов ${P.bandFreq} · искажение ${P.distort.toFixed(2)} · ровность ${P.softness.toFixed(2)}\\n` +
      `ширина ${P.widenAmp.toFixed(2)} · вихрей ${P.spots.length} · пятен ${P.smalls.length}\\n` +
      `шестиугольник ${P.hex ? "есть" : "нет"} · нагрев ${P.heatG > 0.01 ? (P.heatG * 100).toFixed(0) + " %" : "нет"}`
    : `сид ${c.seed} · каменная планета\\n` +
      `материки ${P.continentFreq.toFixed(2)} · детали ${P.detailFreq.toFixed(2)}\\n` +
      `порог суши ${P.landThreshold.toFixed(2)} · шапки ${P.caps ? "есть" : "нет"}`;""",
     """  const yes = T('yes');
  const no = T('no');
  const info = c.kind === "gas"
    ? T('p.info.gas', {
        seed: c.seed, bands: P.bandFreq,
        distort: P.distort.toFixed(2), softness: P.softness.toFixed(2),
        widen: P.widenAmp.toFixed(2), spots: P.spots.length, smalls: P.smalls.length,
        hex: P.hex ? yes : no,
        heat: P.heatG > 0.01 ? T('p.heat', { v: (P.heatG * 100).toFixed(0) }) : no
      })
    : T('p.info.rocky', {
        seed: c.seed,
        cont: P.continentFreq.toFixed(2), detail: P.detailFreq.toFixed(2),
        land: P.landThreshold.toFixed(2), caps: P.caps ? yes : no
      });"""),
    ('document.getElementById("tempv").textContent = document.getElementById("temp").value;\ndraw();',
     'document.getElementById("tempv").textContent = document.getElementById("temp").value;\n'
     'EUI18N.init();\n'
     'addEventListener("eu-lang", () => draw());\ndraw();'),
]


def main(write):
    text = PAGE.read_text(encoding="utf-8")
    problems = []
    for old, new in REPLACEMENTS:
        if new in text:
            continue
        if old not in text:
            problems.append("не найдено: " + old.split("\n")[0][:80])
            continue
        text = text.replace(old, new, 1)
    print("заменено:", len(REPLACEMENTS) - len(problems), "из", len(REPLACEMENTS))
    for p in problems:
        print("  !", p)
    if write and not problems:
        backup = ROOT / "_backup_i18n" / PAGE.name
        backup.parent.mkdir(exist_ok=True)
        if not backup.exists():
            shutil.copy2(PAGE, backup)
        PAGE.write_text(text, encoding="utf-8", newline="\n")
        print("записано")
    return 0 if not problems else 1


if __name__ == "__main__":
    sys.exit(main("--write" in sys.argv))
