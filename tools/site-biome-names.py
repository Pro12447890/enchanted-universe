# -*- coding: utf-8 -*-
"""Человеческие названия биомов на сайте + более отчётливая граница мод/ваниль.

Что делает:
  1. собирает таблицу BIOMES (RU/EN) из языковых файлов мода и ванильного
     клиента (кэш tools/craft-gallery/.cache) и кладёт её в js/i18n.js вместе
     с EUI18N.biome(id);
  2. в карточке планеты чипы биомов показывают название, а не сырой id;
  3. группы «модовые» и «minecraft» разделены подписью, вертикальной чертой
     и разным оформлением чипов.

Запуск: python tools/site-biome-names.py [--write]
"""
import json
import pathlib
import re
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
MOD_LANG = pathlib.Path(r"C:\MCreatorWorkspaces\enchanted_universe"
                        r"\src\main\resources\assets\enchanted_universe\lang")
CACHE = pathlib.Path(r"C:\MCreatorWorkspaces\enchanted_universe\tools\craft-gallery\.cache")
I18N = ROOT / "js/i18n.js"
PAGES = ["index.html", "mobile.html"]

# ванильные названия в кэше британские — на сайте английский US
US_FIX = {"Savannah": "Savanna", "Savannah Plateau": "Savanna Plateau",
          "Windswept Savannah": "Windswept Savanna"}


def title_case(name):
    small = {"of", "the", "and"}
    words = name.split(" ")
    return " ".join(w if i and w.lower() in small else w[:1].upper() + w[1:]
                    for i, w in enumerate(words))


def build_table():
    gen = (ROOT / "js/generator.js").read_text(encoding="utf-8")
    literals = set(re.findall(r"'([a-z0-9_:]+)'", gen))
    ru = json.loads((MOD_LANG / "ru_ru.json").read_text(encoding="utf-8"))
    en = json.loads((MOD_LANG / "en_us.json").read_text(encoding="utf-8"))
    mod_ru = {k.split(".", 2)[2]: v for k, v in ru.items()
              if k.startswith("biome.enchanted_universe.")}
    mod_en = {k.split(".", 2)[2]: v for k, v in en.items()
              if k.startswith("biome.enchanted_universe.")}
    van_ru = json.loads((CACHE / "vanilla-ru_ru.json").read_text(encoding="utf-8"))
    van_en = json.loads((CACHE / "vanilla-en_gb.json").read_text(encoding="utf-8"))

    table = {}
    for literal in literals:
        key = literal.split(":")[-1]
        if literal.startswith("minecraft:"):
            name_ru = van_ru.get("biome.minecraft." + key)
            name_en = van_en.get("biome.minecraft." + key)
            if name_ru and name_en:
                for brit, us in US_FIX.items():
                    name_en = name_en.replace(brit, us)
                table[key] = (name_ru, name_en)
        elif key in mod_ru:
            table[key] = (mod_ru[key], title_case(mod_en.get(key, key)))
    return dict(sorted(table.items()))


def js_table(table):
    lines = ["  /* Биомы: id -> [по-русски, по-английски]. Источник — языковые файлы",
             "   * мода (biome.enchanted_universe.*) и ванильного клиента 1.21.8. */",
             "  const BIOMES = {"]
    for key, (ru, en) in table.items():
        ru_esc = ru.replace("'", "\\'")
        en_esc = en.replace("'", "\\'")
        lines.append(f"    '{key}': ['{ru_esc}', '{en_esc}'],")
    lines.append("  };")
    return "\n".join(lines)


BIOME_FN = """  /** Название биома по id — на языке сайта; неизвестный id приводим к виду. */
  function biome(value) {
    const raw = String(value == null ? '' : value);
    const key = raw.includes(':') ? raw.split(':').pop() : raw;
    const entry = BIOMES[key];
    if (entry) return current() === 'ru' ? entry[0] : entry[1];
    return key.replace(/_/g, ' ').replace(/\\b\\w/g, (ch) => ch.toUpperCase());
  }
"""

CHIPS_OLD = """  const customChips = customBiomes.map(b => `<span>${esc(b.replace('enchanted_universe:',''))}</span>`).join('');
  const vanillaChips = vanillaBiomes.length
    ? (customBiomes.length ? '<span>;</span>' : '') + vanillaBiomes.map(b => `<span class="vanilla">${esc(b.replace('minecraft:',''))}</span>`).join(', ')
    : '';"""

CHIPS_NEW = """  // Чипы биомов: человеческое название, сырой id — в подсказке.
  const customChips = customBiomes
    .map(b => `<span class="biome mod" title="${esc(b)}">${esc(EUI18N.biome(b))}</span>`).join('');
  const vanillaChips = vanillaBiomes
    .map(b => `<span class="biome vanilla" title="${esc(b)}">${esc(EUI18N.biome(b))}</span>`).join('');
  const modTag = customBiomes.length ? `<span class="biome-tag mod">${T('biome.mod')}</span>` : '';
  const vanTag = vanillaBiomes.length ? `<span class="biome-tag vanilla">${T('biome.vanilla')}</span>` : '';
  const modGroup = customBiomes.length ? modTag + customChips : '';
  const vanGroup = vanillaBiomes.length
    ? (customBiomes.length ? '<span class="biome-sep" aria-hidden="true"></span>' : '') + vanTag + vanillaChips
    : '';"""

BIOME_CHIPS_OLD = """  const biomeChips = p.category === 'gas_giant' ? '' + '<span>' + T('biome.unknown') + '</span>' + ''
    : (customChips + vanillaChips || '<span>—</span>');"""

BIOME_CHIPS_NEW = """  const biomeChips = p.category === 'gas_giant' ? '<span>' + T('biome.unknown') + '</span>'
    : (modGroup + vanGroup || '<span>—</span>');"""

CSS_OLD = "  .chips span.vanilla { color:#8fa0c0; border-color:#243250; }"

CSS_NEW = """  /* Биомы: модовые и ванильные различаются цветом, подписью и разделителем */
  .chips span.biome.mod { color:#c3ece6; border-color:#2f6f6a; background:rgba(63,160,150,.10); }
  .chips span.biome.vanilla { color:#8fa0c0; border-color:#243250; background:transparent; }
  .chips span.biome-tag { border:0; background:none; padding:3px 2px 3px 0; font-size:9px;
                          letter-spacing:.09em; text-transform:uppercase; color:#5f7196; }
  .chips span.biome-tag.vanilla { color:#4e5f7d; }
  .chips span.biome-sep { border:0; width:1px; height:13px; padding:0; margin:3px 8px 0 4px;
                          background:#2b3a58; vertical-align:middle; }"""

DICT_ADD = {
    "ru": {"biome.mod": "модовые", "biome.vanilla": "minecraft"},
    "en": {"biome.mod": "modded", "biome.vanilla": "minecraft"},
}


def main(write):
    problems = []
    table = build_table()
    text = I18N.read_text(encoding="utf-8")

    if "const BIOMES = {" not in text:
        anchor = "  function getCookie(name) {"
        block = js_table(table) + "\n\n"
        assert anchor in text
        text = text.replace(anchor, block + anchor, 1)
    if "function biome(value)" not in text:
        anchor = "  /** Язык по браузеру:"
        assert anchor in text
        text = text.replace(anchor, BIOME_FN + anchor, 1)
    if "t, name, biome, current" not in text:
        text = text.replace("t, name, current, locale, num, suggested, setLang, init, apply",
                            "t, name, biome, current, locale, num, suggested, setLang, init, apply", 1)
    for lang, keys in DICT_ADD.items():
        for key, value in keys.items():
            if f"'{key}':" in text:
                continue
            marker = "      'biome.unknown': "
            idx = text.find(marker)
            if lang == "en":
                idx = text.find(marker, idx + 1)
            end = text.find("\n", idx) + 1
            text = text[:end] + f"      '{key}': '{value}',\n" + text[end:]

    for page in PAGES:
        path = ROOT / page
        html = path.read_text(encoding="utf-8")
        for old, new, label in ((CHIPS_OLD, CHIPS_NEW, "чипы"),
                                (BIOME_CHIPS_OLD, BIOME_CHIPS_NEW, "газовый гигант"),
                                (CSS_OLD, CSS_NEW, "css")):
            if new in html:
                continue
            if old not in html:
                problems.append(f"{page}: не найдено «{label}»")
                continue
            html = html.replace(old, new, 1)
        if write:
            backup = ROOT / "_backup_i18n" / page
            backup.parent.mkdir(exist_ok=True)
            if not backup.exists():
                shutil.copy2(path, backup)
            path.write_text(html, encoding="utf-8", newline="\n")

    if write:
        shutil.copy2(I18N, ROOT / "_backup_i18n" / "i18n.js") if (ROOT / "_backup_i18n" / "i18n.js").exists() else None
        I18N.write_text(text, encoding="utf-8", newline="\n")
    print(f"биомов в таблице: {len(table)}")
    for p in problems:
        print("  !", p)
    if write and not problems:
        print("записано")
    return 0 if not problems else 1


if __name__ == "__main__":
    sys.exit(main("--write" in sys.argv))
