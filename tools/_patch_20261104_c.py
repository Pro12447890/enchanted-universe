# -*- coding: utf-8 -*-
"""Патч: на десктопе карточка режется по верхнему краю нижних кнопок."""
import io

FILES = [
    r'C:\MCreatorWorkspaces\enchanted-universe-web\index.html',
    r'C:\MCreatorWorkspaces\enchanted-universe-web\mobile.html',
]

OLD = """  if (innerWidth > 900) {
    handle.classList.add('hidden');
    info.classList.remove('expanded');
    info.style.removeProperty('--eu-info-bottom');
    info.style.removeProperty('--eu-sheet-max');
    info.style.right = '';
    return;
  }"""

NEW = """  if (innerWidth > 900) {
    handle.classList.add('hidden');
    info.classList.remove('expanded');
    info.style.removeProperty('--eu-info-bottom');
    info.style.removeProperty('--eu-sheet-max');
    info.style.right = '';
    // Карточка не уходит под нижние кнопки: обрезаем ровно по их верхнему краю,
    // дальше внутри появляется тёмно-синий «двигатель» (скроллбар).
    const dockEl = document.querySelector('.dock');
    const dockTop = dockEl ? dockEl.getBoundingClientRect().top : innerHeight - 14;
    const infoTop = info.getBoundingClientRect().top;
    const room = Math.max(190, Math.round(dockTop - (infoTop > 0 ? infoTop : 64) - 10));
    info.style.setProperty('--eu-info-max', room + 'px');
    return;
  }"""

for path in FILES:
    text = io.open(path, encoding='utf-8').read()
    if text.count(OLD) != 1:
        raise SystemExit('anchor mismatch in ' + path)
    text = text.replace(OLD, NEW)
    io.open(path, 'w', encoding='utf-8').write(text)
    print(path.split('\\')[-1], 'ok')
