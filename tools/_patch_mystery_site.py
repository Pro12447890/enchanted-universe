# -*- coding: utf-8 -*-
"""Загадочная планета на сайте: шар, кольцо, карточка без данных."""
import io
import sys

FILES = [r'C:\MCreatorWorkspaces\enchanted-universe-web\index.html',
         r'C:\MCreatorWorkspaces\enchanted-universe-web\mobile.html']

DRAW_ANCHOR = """function drawPlanet(x, y, r, p, starX, starY) {
  const base = CAT_COLOR[p.category] || '#8a8aa0';"""

DRAW_NEW = r"""/* Загадочная планета на сайте: тёмно-серый шар с холодными дугами и
   собственным свечением — «красивая» версия игровой пиксельной текстуры.
   Свечение рисуется ПОВЕРХ терминатора, как и в игре: ночная сторона тоже
   светится. */
function drawMysteryPlanet(x, y, r, p, starX, starY) {
  let lx = (starX ?? (x + 1)) - x, ly = (starY ?? y) - y;
  const ll = Math.max(1e-4, Math.hypot(lx, ly)); lx /= ll; ly /= ll;
  ctx.save();
  const halo = ctx.createRadialGradient(x, y, r * 0.55, x, y, r * 1.6);
  halo.addColorStop(0, 'rgba(126,168,236,.22)');
  halo.addColorStop(0.55, 'rgba(96,120,190,.09)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r * 1.02);
  g.addColorStop(0, '#4b4662'); g.addColorStop(0.55, '#2a2738'); g.addColorStop(1, '#0f0f18');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  const arcs = [
    { cx: -0.30, cy: -0.34, rr: 0.42, w: 1.1 },
    { cx: -0.30, cy: -0.34, rr: 0.26, w: 0.9 },
    { cx: -0.02, cy: 0.02, rr: 0.72, w: 1.0 },
    { cx: 0.28, cy: 0.18, rr: 0.50, w: 0.8 }
  ];
  ctx.strokeStyle = 'rgba(142,186,255,.85)';
  for (const a of arcs) {
    if (r < 7 && a.w < 0.95) continue;
    ctx.lineWidth = Math.max(1, r * 0.035 * a.w);
    ctx.beginPath(); ctx.arc(x + a.cx * r, y + a.cy * r, a.rr * r, 0, Math.PI * 2); ctx.stroke();
  }
  if (r > 9) {
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.strokeStyle = 'rgba(120,160,230,.55)';
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.98, r * 0.36, -0.5, 0, Math.PI * 2); ctx.stroke();
  }
  // Терминатор: шар темнеет, но свечение поверх остаётся.
  const sh = ctx.createLinearGradient(x + lx * r, y + ly * r, x - lx * r, y - ly * r);
  sh.addColorStop(0, 'rgba(8,10,22,0)');
  sh.addColorStop(0.55, 'rgba(8,10,22,.34)');
  sh.addColorStop(1, 'rgba(8,10,22,.70)');
  ctx.fillStyle = sh; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 0.95);
  glow.addColorStop(0, 'rgba(150,196,255,.16)');
  glow.addColorStop(1, 'rgba(150,196,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
  ctx.restore();
}

function drawPlanet(x, y, r, p, starX, starY) {
  if (p && p.mystery) { drawMysteryPlanet(x, y, r, p, starX, starY); return; }
  const base = CAT_COLOR[p.category] || '#8a8aa0';"""

ORBIT_ANCHOR = """function orbitalSite(p) {
  if (cityLevel(p) === 0) return false;"""
ORBIT_NEW = """function orbitalSite(p) {
  // Загадочная планета: орбитальное кольцо есть всегда.
  if (p && p.mystery) return true;
  if (cityLevel(p) === 0) return false;"""

ATM_ANCHOR = """  const atmDot = p.atmosphere === 'none' ? '' : `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${ac};margin-right:5px;vertical-align:middle"></span>`;"""
ATM_NEW = """  const mystery = !!p.mystery;
  const atmDot = (p.atmosphere === 'none' || mystery) ? '' : `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${ac};margin-right:5px;vertical-align:middle"></span>`;"""

CHIPS_ANCHOR = """  const biomeChips = p.category === 'gas_giant' ? '<span>' + T('biome.unknown') + '</span>'
    : (modGroup + vanGroup || '<span>—</span>');
  const palette = biomePaletteHtml(p);"""
CHIPS_NEW = """  const biomeChips = mystery ? '<span>' + esc(T('info.unknown_data')) + '</span>'
    : p.category === 'gas_giant' ? '<span>' + T('biome.unknown') + '</span>'
    : (modGroup + vanGroup || '<span>—</span>');
  const palette = mystery ? '' : biomePaletteHtml(p);"""

ATM_ROW_ANCHOR = """      <tr><td>${T('info.atmosphere')}</td><td>${atmDot}${esc(atmosphereText(p))}</td></tr>"""
ATM_ROW_NEW = """      <tr><td>${T('info.atmosphere')}</td><td>${mystery ? esc(T('info.unknown_data')) : atmDot + esc(atmosphereText(p))}</td></tr>"""

TRAITS_ANCHOR = """    ${palette}
    <div class="sub">${T('info.traits')}</div>
    <div class="spec">${traits}</div>"""
TRAITS_NEW = """    ${palette}
    ${mystery ? '' : `<div class="sub">${T('info.traits')}</div><div class="spec">${traits}</div>`}"""

COMP_ANCHOR = """    ${comp ? `<div class="sub">${T('atm.composition')}</div><div class="chips">${comp}</div>` : ''}`;"""
COMP_NEW = """    ${(comp && !mystery) ? `<div class="sub">${T('atm.composition')}</div><div class="chips">${comp}</div>` : ''}`;"""

for path in FILES:
    text = io.open(path, encoding='utf-8').read()
    for old, new, tag in ((DRAW_ANCHOR, DRAW_NEW, 'draw'), (ORBIT_ANCHOR, ORBIT_NEW, 'orbit'),
                          (ATM_ANCHOR, ATM_NEW, 'atm'), (CHIPS_ANCHOR, CHIPS_NEW, 'chips'),
                          (ATM_ROW_ANCHOR, ATM_ROW_NEW, 'atmrow'), (TRAITS_ANCHOR, TRAITS_NEW, 'traits'),
                          (COMP_ANCHOR, COMP_NEW, 'comp')):
        count = text.count(old)
        if count != 1:
            raise SystemExit('%s: anchor %s count %d' % (path, tag, count))
        text = text.replace(old, new)
    text = text.replace('js/i18n.js?v=43', 'js/i18n.js?v=44').replace('js/generator.js?v=36', 'js/generator.js?v=37')
    io.open(path, 'w', encoding='utf-8').write(text)
    print(path.split('\\')[-1], 'ok', len(text))

# i18n
I18N = r'C:\MCreatorWorkspaces\enchanted-universe-web\js\i18n.js'
t = io.open(I18N, encoding='utf-8').read()
for old, new in (("      'info.traits': 'Характеристика',",
                  "      'info.traits': 'Характеристика',\n      'info.unknown_data': 'Неизвестно [Данные удалены]',"),
                 ("      'info.traits': 'Traits',",
                  "      'info.traits': 'Traits',\n      'info.unknown_data': 'Unknown [Data deleted]',")):
    if t.count(old) != 1:
        raise SystemExit('i18n anchor %r count %d' % (old, t.count(old)))
    t = t.replace(old, new)
io.open(I18N, 'w', encoding='utf-8').write(t)
print('i18n ok')
