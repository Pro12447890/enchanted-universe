# -*- coding: utf-8 -*-
"""Английсификатор сайта: вторая волна.

Правит index.html и mobile.html:
  • заголовок вкладки и <html lang> — под язык сайта (data-i18n-doc);
  • девять «ручных» RU/EN-тернарников заменены ключами словаря;
  • имена тел (планеты, системы, луны) идут через EUI18N.name();
  • подписи на канве и в результатах поиска — тоже;
  • поиск находит и русское, и английское имя;
  • пояснение про биомы газовых гигантов переведено;
  • toLocaleString берёт локаль сайта.

Запуск: python tools/site-englishify.py [--write]
Без --write печатает, что нашлось, и ничего не меняет.
"""
import pathlib
import re
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
PAGES = ["index.html", "mobile.html"]

# (имя правки, шаблон, замена) — шаблон может быть строкой или regex
PAIRS = [
    ("Тип", ("Тип", "Type"), "card.type"),
    ("Спектр", ("Спектр", "Spectral"), "card.spectral"),
    ("компаньон", ("компаньон", "companion"), "card.companionLow"),
    ("Орбита", ("Орбита", "Orbit"), "card.orbit"),
    ("Главная звезда", ("Главная звезда", "Primary"), "card.primary"),
    ("Спутник", ("Спутник", "Companion"), "card.companion"),
    ("импорт: синтетика", ("Импорт: тики синтетические (0), это не время мира",
                           "Imported: synthetic ticks (0), not world time"), "import.synthetic"),
    ("импорт: ок", ("Импортирован мир: ", "World imported: "), "import.ok"),
    ("импорт: ошибка", ("Импорт не удался: ", "Import failed: "), "import.failed"),
]

NAME_CALLS = [
    ("esc(m.name)", "esc(N(m.name))"),
    ("esc(p.designation)", "esc(N(p.designation))"),
    ("esc(p.name)", "esc(N(p.name))"),
    ("esc(system.name)", "esc(N(system.name))"),
    ("esc(c.name)", "esc(N(c.name))"),
    ("esc(system.companion.name)", "esc(N(system.companion.name))"),
    ("esc(h.name)", "esc(N(h.name))"),
    ("esc(near.system.name)", "esc(N(near.system.name))"),
    ("esc(hit.planet.designation)", "esc(N(hit.planet.designation))"),
    ("esc(hit.planet.name)", "esc(N(hit.planet.name))"),
    ("esc(hit.sys.name)", "esc(N(hit.sys.name))"),
    ("ctx.fillText(s.name,", "ctx.fillText(N(s.name),"),
    ("ctx.fillText(it.m.name,", "ctx.fillText(N(it.m.name),"),
    ("ctx.fillText(best.system.name,", "ctx.fillText(N(best.system.name),"),
]

SEARCH_OLD = """  const hits = [];
  for (const sys of catalog.systems) {
    if (sys.name.toLowerCase().includes(q) || sys.formalName.toLowerCase().includes(q)) hits.push({sys, planet:null});
    for (const p of sys.planets) {
      if (p.designation.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || (p.aliases || []).some(a => String(a).toLowerCase().includes(q))) hits.push({sys, planet:p});
    }
    if (hits.length > 12) break;
  }"""

SEARCH_NEW = """  const hits = [];
  // Ищем и по русскому имени из данных, и по английскому — иначе в EN-режиме
  // запрос «Earth» не нашёл бы Землю.
  const has = (s) => String(s || '').toLowerCase().includes(q) || String(N(s)).toLowerCase().includes(q);
  for (const sys of catalog.systems) {
    if (has(sys.name) || has(sys.formalName)) hits.push({sys, planet:null});
    for (const p of sys.planets) {
      if (has(p.designation) || has(p.name) || (p.aliases || []).some(has)) hits.push({sys, planet:p});
    }
    if (hits.length > 12) break;
  }"""


def patch_pair(text, ru, en, key):
    """EUI18N.current() === 'ru' ? 'ru' : 'en' -> T('key')."""
    pattern = re.compile(
        r"EUI18N\.current\(\)\s*===\s*'ru'\s*\?\s*'" + re.escape(ru) + r"'\s*:\s*'" + re.escape(en) + r"'")
    return pattern.subn("T('" + key + "')", text)


def main(write):
    problems = []
    for page in PAGES:
        path = ROOT / page
        text = path.read_text(encoding="utf-8")
        report = []

        # 1. хелпер имени рядом с T
        if "const N = (s) => EUI18N.name(s);" not in text:
            old = "const T = (k, v) => EUI18N.t(k, v);"
            if old not in text:
                problems.append(f"{page}: нет строки «{old}»")
            else:
                text = text.replace(old, old + "\n  const N = (s) => EUI18N.name(s);", 1)
                report.append("добавлен N()")

        # 2. тернарники RU/EN -> ключи
        for name, (ru, en), key in PAIRS:
            text, count = patch_pair(text, ru, en, key)
            report.append(f"{name}: {count}")
            if count == 0:
                problems.append(f"{page}: не найден тернарник «{name}»")

        # 3. локали в числах
        for variant in ("EUI18N.current()==='ru'?'ru-RU':'en-US'",
                        "EUI18N.current() === 'ru' ? 'ru-RU' : 'en-US'"):
            n = text.count(variant)
            if n:
                text = text.replace(variant, "EUI18N.locale()")
                report.append(f"локаль чисел: {n}")

        # 4. имена в шаблонах и на канве
        for old, new in NAME_CALLS:
            n = text.count(old)
            # не трогаем уже обёрнутые
            n -= text.count("N(" + old[4:]) if old.startswith("esc(") else 0
            if n > 0:
                text = text.replace(old, new)
                report.append(f"{old} -> {n}")

        # 5. биомы газового гиганта
        joke = "<span>Неопределённое вопросительное xD</span>"
        if joke in text:
            text = text.replace(joke, "' + '<span>' + T('biome.unknown') + '</span>' + '")
            report.append("биомы газового гиганта: 1")

        # 6. поиск по двум языкам
        if SEARCH_OLD in text:
            text = text.replace(SEARCH_OLD, SEARCH_NEW, 1)
            report.append("поиск: двуязычный")
        else:
            problems.append(f"{page}: не найден блок поиска")

        # 7. заголовок документа
        doc_key = "doc.index" if page == "index.html" else "doc.mobile"
        if 'data-i18n-doc=' not in text:
            text = re.sub(r"<title>([^<]*)</title>",
                          lambda m: f'<title data-i18n-doc="{doc_key}">{m.group(1)}</title>', text, count=1)
            text = text.replace('<html lang="ru">',
                                f'<html lang="ru" data-doc-key="{doc_key}">', 1)
            report.append("заголовок вкладки")

        print(f"== {page}")
        for line in report:
            print("   ", line)

        if write:
            backup = ROOT / "_backup_i18n" / page
            backup.parent.mkdir(exist_ok=True)
            if not backup.exists():
                shutil.copy2(path, backup)
            path.write_text(text, encoding="utf-8", newline="\n")

    if problems:
        print("\nПРОБЛЕМЫ:")
        for p in problems:
            print("  -", p)
        return 1
    print("\nВсё найдено." + (" Записано." if write else " Режим проверки (--write для записи)."))
    return 0


if __name__ == "__main__":
    sys.exit(main("--write" in sys.argv))
