# -*- coding: utf-8 -*-
"""Патч: собственный «двигатель» (скроллбар) внутри карточки планеты.
Нативная полоса на Windows авто-скрывается, поэтому рисуем свою: она всегда
видна, когда содержимое не влезает, и её можно тащить."""
import io

FILES = [
    r'C:\MCreatorWorkspaces\enchanted-universe-web\index.html',
    r'C:\MCreatorWorkspaces\enchanted-universe-web\mobile.html',
]

CSS_OLD = """  #info { position:fixed; right:12px; top:64px; width:340px;
          max-height:min(calc(100% - 90px), var(--eu-info-max, 100%)); overflow:auto;
          scrollbar-width:thin; scrollbar-color:#2b4d7d #0b1220; overscroll-behavior:contain;
          background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:14px 16px; z-index:4;"""

CSS_NEW = """  #info { position:fixed; right:12px; top:64px; width:340px; flex-direction:column;
          max-height:min(calc(100% - 90px), var(--eu-info-max, 100%)); overflow:hidden;
          overscroll-behavior:contain;
          background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:0; z-index:4;"""

SCROLL_OLD = """  /* Тёмно-синий «двигатель» внутри карточки: тонкий, скруглённый, только в ней */
  #info::-webkit-scrollbar { width:10px; }
  #info::-webkit-scrollbar-track { background:#0b1220; border-radius:999px; margin:8px 0; }
  #info::-webkit-scrollbar-thumb { background:#24456f; border-radius:999px; border:2px solid #0b1220; }
  #info::-webkit-scrollbar-thumb:hover { background:#33619c; }
"""

SCROLL_NEW = """  /* Тёмно-синий «двигатель» внутри карточки: свой, всегда видимый и таскаемый */
  #info .infoScroll { flex:1 1 auto; min-height:0; overflow-y:auto; overflow-x:hidden;
                      padding:14px 20px 14px 16px; scrollbar-width:none; overscroll-behavior:contain; }
  #info .infoScroll::-webkit-scrollbar { width:0; height:0; }
  #info .infoBar { display:none; position:absolute; right:4px; top:10px; bottom:10px; width:9px;
                   border-radius:999px; background:#0b1220; border:1px solid #17233a; touch-action:none; z-index:3; }
  #info .infoBar.on { display:block; }
  #info .infoThumb { position:absolute; left:0; right:0; top:0; border-radius:999px;
                     background:#24456f; cursor:grab; }
  #info .infoThumb:hover { background:#2f5c92; }
  #info .infoThumb.drag { background:#33619c; cursor:grabbing; }
"""

MOBILE_OLD = """    #info { top:auto; bottom:var(--eu-info-bottom, 150px); left:8px; right:8px; width:auto;
            max-height:min(30vh, var(--eu-sheet-max, 320px)); border-radius:12px; }"""
MOBILE_NEW = """    #info { top:auto; bottom:var(--eu-info-bottom, 150px); left:8px; right:8px; width:auto;
            max-height:min(30vh, var(--eu-sheet-max, 320px)); border-radius:12px; }
    #info .infoBar { display:none !important; }"""

JS_HELPERS_ANCHOR = """/* Кнопка «свернуть блок Тип…Кольца» ставится на любую карточку с таблицей. */"""

JS_HELPERS = r'''/* Свой «двигатель» внутри карточки: содержимое живёт в .infoScroll,
   полоса — в самой карточке, поэтому она не уезжает вместе с текстом. */
function infoParts() {
  if (!info) return null;
  let scroller = null;
  for (const child of info.children) if (child.classList && child.classList.contains('infoScroll')) scroller = child;
  if (!scroller) {
    scroller = document.createElement('div');
    scroller.className = 'infoScroll';
    [...info.children].forEach((child) => {
      if (child.classList && (child.classList.contains('infoBar') || child.classList.contains('foldBtn'))) return;
      scroller.appendChild(child);
    });
    info.appendChild(scroller);
  }
  let bar = null;
  for (const child of info.children) if (child.classList && child.classList.contains('infoBar')) bar = child;
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'infoBar';
    const thumb = document.createElement('div');
    thumb.className = 'infoThumb';
    bar.appendChild(thumb);
    info.appendChild(bar);
    let dragging = false, startY = 0, startTop = 0;
    thumb.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dragging = true; startY = e.clientY; startTop = scroller.scrollTop;
      thumb.classList.add('drag');
      thumb.setPointerCapture(e.pointerId);
    });
    thumb.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const track = bar.clientHeight - thumb.offsetHeight;
      const maxScroll = scroller.scrollHeight - scroller.clientHeight;
      if (track <= 0 || maxScroll <= 0) return;
      scroller.scrollTop = startTop + (e.clientY - startY) * (maxScroll / track);
    });
    const stop = (e) => {
      dragging = false;
      thumb.classList.remove('drag');
      if (thumb.hasPointerCapture && thumb.hasPointerCapture(e.pointerId)) thumb.releasePointerCapture(e.pointerId);
    };
    thumb.addEventListener('pointerup', stop);
    thumb.addEventListener('pointercancel', stop);
    // Клик по дорожке — прыжок на это место.
    bar.addEventListener('pointerdown', (e) => {
      if (e.target === thumb) return;
      const rect = bar.getBoundingClientRect();
      const frac = (e.clientY - rect.top - thumb.offsetHeight / 2) / Math.max(1, rect.height - thumb.offsetHeight);
      scroller.scrollTop = Math.max(0, Math.min(1, frac)) * (scroller.scrollHeight - scroller.clientHeight);
    });
    scroller.addEventListener('scroll', () => updateInfoBar(), { passive: true });
  }
  return { scroller, bar };
}
function updateInfoBar() {
  const parts = infoParts();
  if (!parts) return;
  const { scroller, bar } = parts;
  const track = scroller.scrollHeight;
  const view = scroller.clientHeight;
  if (!track || !view || track - view < 2) { bar.classList.remove('on'); return; }
  bar.classList.add('on');
  const thumb = bar.firstElementChild;
  const barH = bar.clientHeight;
  const ratio = Math.max(0.08, Math.min(1, view / track));
  const thumbH = Math.max(30, Math.round(barH * ratio));
  thumb.style.height = thumbH + 'px';
  const maxScroll = track - view;
  const top = maxScroll > 0 ? (scroller.scrollTop / maxScroll) * (barH - thumbH) : 0;
  thumb.style.top = Math.max(0, Math.min(barH - thumbH, top)) + 'px';
}

/* Кнопка «свернуть блок Тип…Кольца» ставится на любую карточку с таблицей. */'''

FOLD_END_OLD = """  btn.textContent = infoFolded ? '▸' : '▾';
  btn.title = T('info.fold');
  btn.setAttribute('aria-label', T('info.fold'));
}"""
FOLD_END_NEW = """  btn.textContent = infoFolded ? '▸' : '▾';
  btn.title = T('info.fold');
  btn.setAttribute('aria-label', T('info.fold'));
  const parts = infoParts();
  if (parts) parts.scroller.scrollTop = Math.min(parts.scroller.scrollTop, parts.scroller.scrollHeight);
  updateInfoBar();
}"""

SHEET_OLD = """function updateInfoSheet() {
  const handle = document.getElementById('infoHandle');
  if (!handle) return;"""
SHEET_NEW = """function updateInfoSheet() {
  const handle = document.getElementById('infoHandle');
  if (typeof updateInfoBar === 'function') updateInfoBar();
  if (!handle) return;"""

for path in FILES:
    text = io.open(path, encoding='utf-8').read()
    for old, new, tag in ((CSS_OLD, CSS_NEW, 'css-info'), (SCROLL_OLD, SCROLL_NEW, 'css-scroll'),
                          (MOBILE_OLD, MOBILE_NEW, 'css-mobile'), (JS_HELPERS_ANCHOR, JS_HELPERS, 'js-helpers'),
                          (FOLD_END_OLD, FOLD_END_NEW, 'js-fold'), (SHEET_OLD, SHEET_NEW, 'js-sheet')):
        n = text.count(old)
        if n != 1:
            raise SystemExit('%s: anchor %s count %d' % (path, tag, n))
        text = text.replace(old, new)
    # карточка теперь flex-контейнер
    text = text.replace("info.style.display = 'block'", "info.style.display = 'flex'")
    io.open(path, 'w', encoding='utf-8').write(text)
    print(path.split('\\')[-1], 'ok, chars', len(text))
