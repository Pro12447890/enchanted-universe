# -*- coding: utf-8 -*-
"""Пересчитывает ?v= у ассетов в index.html и других страницах.

Правило проекта: у файлов с хешем версия — первые 10 символов sha256 от
содержимого с переводами строк LF (в git лежит LF, в рабочем дереве CRLF,
поэтому считать надо по LF). Короткие ручные версии вроде ?v=3 не трогаем.

    python tools/bust.py           — пересчитать и записать
    python tools/bust.py --check   — только показать расхождения
"""
import hashlib
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = ["index.html", "charts.html"]
LINK = re.compile(r'(?P<attr>src|href)="(?P<path>[^"?]+)\?v=(?P<ver>[0-9a-f]{10})"')


def digest(path):
    raw = io.open(os.path.join(ROOT, path), "rb").read()
    return hashlib.sha256(raw.replace(b"\r\n", b"\n")).hexdigest()[:10]


def main():
    check = "--check" in sys.argv
    stale, fresh = [], 0
    for page in PAGES:
        full = os.path.join(ROOT, page)
        if not os.path.exists(full):
            continue
        raw = io.open(full, "rb").read()
        crlf = b"\r\n" in raw
        text = raw.decode("utf-8").replace("\r\n", "\n")

        def swap(match):
            nonlocal fresh
            path, ver = match.group("path"), match.group("ver")
            if not os.path.exists(os.path.join(ROOT, path)):
                return match.group(0)
            new = digest(path)
            if new == ver:
                fresh += 1
                return match.group(0)
            stale.append((page, path, ver, new))
            return '%s="%s?v=%s"' % (match.group("attr"), path, new)

        updated = LINK.sub(swap, text)
        if updated != text and not check:
            data = updated.encode("utf-8")
            if crlf:
                data = data.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
            io.open(full, "wb").write(data)

    for page, path, old, new in stale:
        print("%s: %s  %s → %s" % (page, path, old, new))
    print("актуальных ссылок: %d, устаревших: %d" % (fresh, len(stale)))
    if check:
        print("PASS: все версии актуальны." if not stale else "ЕСТЬ УСТАРЕВШИЕ.")
        return 0 if not stale else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
