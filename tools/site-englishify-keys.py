# -*- coding: utf-8 -*-
"""Английсификатор: переносим оставшиеся «ручные» пары RU/EN в словарь.

В карточках орбит/чёрных дыр английский текст был вписан прямо в шаблоны
(`ru ? 'Эксцентриситет' : 'Eccentricity'`). Теперь это ключи словаря:
одно место правки, и строки попадут в перевод, если языков станет больше.

Запуск: python tools/site-englishify-keys.py [--write]
"""
import pathlib
import re
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]

PAIRS = [
    ("Эксцентриситет", "Eccentricity", "card.ecc"),
    ("Наклон орбиты", "Orbital inclination", "card.incl"),
    ("Игровая орбита", "Game orbit", "card.gameOrbit"),
    ("Период (карта)", "Period (map)", "card.period"),
    ("Полуось", "Semi-major", "card.semi"),
    ("Наклон оси", "Axial tilt", "card.tilt"),
    (" · обратное", " · retrograde", "card.retro"),
    ("Магнитный полюс", "Magnetic pole", "card.magpole"),
    (" от оси", " from axis", "card.fromAxis"),
    ("Овал сияния", "Aurora oval", "card.aurora"),
    ("Чёрная дыра ", "Black hole ", "card.blackHole"),
    ("объект галактики", "galaxy object", "card.galaxyObject"),
    ("Координаты", "Coordinates", "card.coords"),
    ("Ближайшая система", "Nearest system", "card.nearest"),
    ("Текстура", "Texture", "card.texture"),
    ("Источник", "Source", "card.source"),
    ("каталог мира", "world catalog", "card.worldCatalog"),
    ("превью по worldSeed", "worldSeed preview", "card.previewSeed"),
    ("Расстояние до системы считается в световых годах до сжатия карты.",
     "Distance to a system is measured in light years before map compression.", "card.distanceNote"),
]

DICT_ADD = {
    "ru": {
        "doc.desc": "Enchanted Universe — интерактивная карта сидов, планет и симбиозных миров Смешарии.",
    },
    "en": {
        "doc.desc": "Enchanted Universe — an interactive map of seeds, planets and the symbiotic Smesharia worlds.",
    },
}


def main(write):
    problems = []
    total = 0
    for name in ("index.html", "mobile.html"):
        path = ROOT / name
        text = path.read_text(encoding="utf-8")
        for ru, en, key in PAIRS:
            pattern = re.compile(r"ru \? '" + re.escape(ru) + r"' : '" + re.escape(en) + r"'")
            text, count = pattern.subn("T('" + key + "')", text)
            total += count
            if count == 0:
                problems.append(f"{name}: не найдено «{ru}»")
        if write:
            backup = ROOT / "_backup_i18n" / name
            backup.parent.mkdir(exist_ok=True)
            if not backup.exists():
                shutil.copy2(path, backup)
            path.write_text(text, encoding="utf-8", newline="\n")
    print("заменено пар:", total)

    i18n = ROOT / "js/i18n.js"
    text = i18n.read_text(encoding="utf-8")
    for ru, en, key in PAIRS:
        if f"'{key}':" in text:
            continue
        ru_line = f"      '{key}': '{ru}',\n"
        en_line = f"      '{key}': '{en}',\n"
        anchor = "      'card.companionLow': "
        idx = text.find(anchor)
        end = text.find("\n", idx) + 1
        text = text[:end] + ru_line + text[end:]
        idx = text.find(anchor, end)
        end = text.find("\n", idx) + 1
        text = text[:end] + en_line + text[end:]
    for lang, keys in DICT_ADD.items():
        for key, value in keys.items():
            if f"'{key}':" in text:
                continue
            anchor = "      'lang.btn': "
            idx = text.find(anchor)
            if lang == "en":
                idx = text.find(anchor, idx + 1)
            end = text.find("\n", idx) + 1
            text = text[:end] + f"      '{key}': '{value}',\n" + text[end:]
    if write:
        i18n.write_text(text, encoding="utf-8", newline="\n")
        print("словарь обновлён")
    for p in problems:
        print("  !", p)
    return 0 if not problems else 1


if __name__ == "__main__":
    sys.exit(main("--write" in sys.argv))
