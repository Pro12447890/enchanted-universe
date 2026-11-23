# -*- coding: utf-8 -*-
"""Обновляет карту BIOMES в js/i18n.js по языковым файлам мода.

Источник правды — lang/ru_ru.json и lang/en_us.json мода Enchanted Universe
(ключи biome.enchanted_universe.<id>). Ванильные названия из прежней карты
сохраняются, потому что этих биомов в моде нет.
"""
import io
import json
import os
import re
import sys

MOD_LANG = r"C:\MCreatorWorkspaces\enchanted_universe\src\main\resources\assets\enchanted_universe\lang"
SITE = r"C:\MCreatorWorkspaces\enchanted-universe-web\js\i18n.js"


def load(locale):
    path = os.path.join(MOD_LANG, locale + ".json")
    data = json.load(io.open(path, encoding="utf-8-sig"))
    out = {}
    for key, value in data.items():
        if not key.startswith("biome.enchanted_universe."):
            continue
        out[key[len("biome.enchanted_universe."):]] = value
    return out


def parse_current(text):
    """Достаёт пары 'id': ['ru', 'en'] из существующего литерала."""
    start = text.index("const BIOMES = {")
    end = text.index("\n  };", start)
    block = text[start:end]
    pairs = {}
    for match in re.finditer(r"^\s*'([^']+)':\s*\['((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'\],?\s*$",
                             block, re.M):
        pairs[match.group(1)] = (match.group(2), match.group(3))
    return pairs, start, end


def build_line(key, ru, en):
    def esc(s):
        return s.replace("\\", "\\\\").replace("'", "\\'")
    return "  '%s': ['%s', '%s']," % (key, esc(ru), esc(en))


def main():
    check = "--check" in sys.argv
    ru = load("ru_ru")
    en = load("en_us")
    raw = io.open(SITE, "rb").read()
    crlf = b"\r\n" in raw
    # Внутри работаем с \n: иначе ^…$ в регэкспе спотыкается о \r.
    text = raw.decode("utf-8").replace("\r\n", "\n")
    pairs, start, end = parse_current(text)

    added, replaced, kept_vanilla = [], [], []
    for key in sorted(set(ru) | set(en)):
        ru_name = ru.get(key)
        en_name = en.get(key)
        if not ru_name:
            # русского нет — оставляем как есть, если уже было
            if key in pairs:
                continue
            ru_name = en_name
        if not en_name:
            en_name = pairs[key][1] if key in pairs else ru_name
        if key in pairs:
            if pairs[key] != (ru_name, en_name):
                replaced.append((key, pairs[key], (ru_name, en_name)))
        else:
            added.append(key)
        pairs[key] = (ru_name, en_name)

    for key in list(pairs):
        if key not in ru and key not in en:
            kept_vanilla.append(key)

    lines = [build_line(key, *pairs[key]) for key in sorted(pairs)]
    new_block = "const BIOMES = {\n" + "\n".join(lines) + "\n"
    new_text = text[:start] + new_block + text[end + 1:]

    print("биомов в новой карте:", len(pairs))
    print("добавлено из мода:", len(added))
    print("исправлено названий:", len(replaced))
    print("ванильных сохранено:", len(kept_vanilla))
    for key, old, new in replaced[:10]:
        print("  %s: %s → %s" % (key, old[0], new[0]))
    if added[:8]:
        print("  примеры добавленных:", ", ".join(added[:8]))

    if check:
        print("PASS: карта биомов полная." if not added and not replaced else "НУЖНО ОБНОВИТЬ.")
        return 0 if not added and not replaced else 1

    data = new_text.encode("utf-8")
    if crlf:
        data = data.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
    io.open(SITE, "wb").write(data)
    print("записано:", SITE)
    return 0


if __name__ == "__main__":
    sys.exit(main())
