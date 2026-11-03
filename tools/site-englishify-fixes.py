# -*- coding: utf-8 -*-
"""Английсификатор: добивка мелочей после основной правки.

  • «сид: …» в шапке — через словарь (seed.label);
  • кнопка «Полная» в мобильной версии — через словарь (desktop.short);
  • update.json не дёргается при открытии с диска (file://) — нечего ругаться в консоль;
  • кнопка языка на странице генератора не уезжает вправо.

Запуск: python tools/site-englishify-fixes.py [--write]
"""
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]

FIXES = {
    "index.html": [
        ("seedLabel.textContent = 'сид: ' + seed.toString();",
         "seedLabel.textContent = T('seed.label') + ': ' + seed.toString();"),
        ("const out = pill.querySelector('span');\n  fetch('update.json', { cache: 'no-store' })",
         "const out = pill.querySelector('span');\n"
         "  if (location.protocol === 'file:') return; // с диска относительный fetch не работает\n"
         "  fetch('update.json', { cache: 'no-store' })"),
    ],
    "mobile.html": [
        ("seedLabel.textContent = 'сид: ' + seed.toString();",
         "seedLabel.textContent = T('seed.label') + ': ' + seed.toString();"),
        ('<button id="full" onclick="location.href=\'index.html?desktop=1\'">Полная</button>',
         '<button id="full" onclick="location.href=\'index.html?desktop=1\'" data-i18n="desktop.short">Полная</button>'),
        ("const out = pill.querySelector('span');\n  fetch('update.json', { cache: 'no-store' })",
         "const out = pill.querySelector('span');\n"
         "  if (location.protocol === 'file:') return; // с диска относительный fetch не работает\n"
         "  fetch('update.json', { cache: 'no-store' })"),
    ],
    "planets.html": [
        ("  @media (max-width: 420px) { label { flex-wrap: wrap; } }",
         "  #langBtn { margin-left: 0; }\n"
         "  @media (max-width: 420px) { label { flex-wrap: wrap; } }"),
    ],
}

DICT_ADD = {
    "ru": {"seed.label": "сид", "desktop.short": "Полная"},
    "en": {"seed.label": "seed", "desktop.short": "Full"},
}


def main(write):
    problems = []
    for name, pairs in FIXES.items():
        path = ROOT / name
        text = path.read_text(encoding="utf-8")
        for old, new in pairs:
            if new in text:
                continue
            if old not in text:
                problems.append(f"{name}: не найдено «{old.splitlines()[0][:70]}»")
                continue
            text = text.replace(old, new, 1)
        if write:
            backup = ROOT / "_backup_i18n" / name
            backup.parent.mkdir(exist_ok=True)
            if not backup.exists():
                shutil.copy2(path, backup)
            path.write_text(text, encoding="utf-8", newline="\n")
    # словарь
    i18n = ROOT / "js/i18n.js"
    text = i18n.read_text(encoding="utf-8")
    for lang, keys in DICT_ADD.items():
        for key, value in keys.items():
            marker = "'lang.btn':"
            line = f"      '{key}': '{value}',\n"
            if f"'{key}':" in text:
                continue
            # вставляем после блока lang.* своего языка (ru — первый, en — второй)
            idx = text.find("'lang.btn':")
            if lang == "en":
                idx = text.find("'lang.btn':", idx + 1)
            end = text.find("\n", idx) + 1
            text = text[:end] + line + text[end:]
    if write:
        backup = ROOT / "_backup_i18n" / "i18n.js"
        backup.parent.mkdir(exist_ok=True)
        if not backup.exists():
            shutil.copy2(i18n, backup)
        i18n.write_text(text, encoding="utf-8", newline="\n")
        print("записано")
    for p in problems:
        print("  !", p)
    return 0 if not problems else 1


if __name__ == "__main__":
    sys.exit(main("--write" in sys.argv))
