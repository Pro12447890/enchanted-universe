# -*- coding: utf-8 -*-
"""Одноразовый патч: карточка планеты (атмосфера/характеристика/цвета биомов)
+ кнопка сворачивания. Применяется и к index.html, и к mobile.html."""
import io
import sys

FILES = [
    r'C:\MCreatorWorkspaces\enchanted-universe-web\index.html',
    r'C:\MCreatorWorkspaces\enchanted-universe-web\mobile.html',
]

HELPERS = r'''/* ── Атмосфера: пять ступеней + «Почти/Довольно» по положению в ступени ──── */
const ATM_STAGE_OF = { none: 'none', minimal: 'faint', thin: 'thin', moderate: 'avg', medium: 'avg', thick: 'dense' };
function hashUnit(text) {
  let h = 2166136261 >>> 0;
  const s = String(text == null ? '' : text);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 16777619); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/* Положение внутри СВОЕЙ ступени, 0…1: от сида — стабильно, от сида к сиду — разное. */
function atmosphereStagePosition(p) {
  if (p && typeof p.atmosphereDensity === 'number' && isFinite(p.atmosphereDensity)) {
    const band = { none: [0, 0.12], minimal: [0.12, 0.28], thin: [0.28, 0.46], moderate: [0.46, 0.68], medium: [0.68, 0.87], thick: [0.87, 1] }[p.atmosphere];
    if (band && band[1] > band[0]) return Math.max(0, Math.min(1, (p.atmosphereDensity - band[0]) / (band[1] - band[0])));
  }
  return hashUnit((p && p.seed != null ? p.seed : '') + '|atm|' + (p && p.id ? p.id : ''));
}
function atmosphereText(p) {
  if (!p || p.atmosphere === 'none') return T('atm.stage.none');
  const stage = ATM_STAGE_OF[p.atmosphere] || 'thin';
  const word = T('atm.stage.' + stage);
  const pos = atmosphereStagePosition(p);
  if (pos < 1 / 3) return T('atm.q.low') + ' ' + word.toLowerCase();
  if (pos > 2 / 3) return T('atm.q.high') + ' ' + word.toLowerCase();
  return word;
}

/* ── Характеристика: скафандр, радиация, благоприятность (ESI) ───────────── */
function isEarthPlanet(p) {
  const n = String(p && p.name ? p.name : '').trim().toLowerCase();
  return n === 'земля' || n === 'earth';
}
function suitState(p) {
  const atm = p && p.atmosphere;
  if (!atm || atm === 'none' || atm === 'minimal') return 'required';
  const breaths = (p.composition || []).some(g => String(g).toUpperCase().startsWith('O2'));
  const friendly = p.category === 'habitable' || p.category === 'cold_habitable';
  if (friendly && breaths && p.temperatureC > -25 && p.temperatureC < 60) return 'none';
  return 'unsealed';
}
function radiationState(p) {
  const r = Number(p && p.radiation) || 0;
  if (r < 1) return 'none';
  if (r <= 50) return 'local';
  if (r <= 150) return 'feel';
  return 'strong';
}
/* Индекс подобия Земле (ESI, Schulze-Makuch 2011), адаптированный под мод:
   радиус, плотность (ρ ∝ g/R), вторая космическая (v ∝ √(gR)) и температура
   288.15 K, плюс множители за атмосферу и радиацию. */
function earthSimilarity(p) {
  const R = Math.max(0.05, Number(p.diameterEarth) || 1);
  const g = Math.max(0.05, Number(p.gravity) || 1);
  const rho = g / R;
  const v = Math.sqrt(g * R);
  const T = Math.max(1, (Number(p.temperatureC) || 0) + 273.15);
  const values = [R, rho, v, T], targets = [1, 1, 1, 288.15], weights = [0.57, 1.07, 0.70, 5.58];
  let esi = 1;
  for (let i = 0; i < 4; i++) {
    const x = values[i], x0 = targets[i];
    const term = Math.max(1e-6, 1 - Math.abs((x - x0) / (x + x0)));
    esi *= Math.pow(term, weights[i] / 4);
  }
  const atmFactor = ({ none: 0.55, minimal: 0.72, thin: 0.86, moderate: 1.0, medium: 1.0, thick: 0.93 })[p.atmosphere] || 0.86;
  const radFactor = Math.max(0.6, Math.min(1, 1 - (Number(p.radiation) || 0) / 400));
  return Math.max(0, Math.min(1, esi * atmFactor * radFactor));
}
function habitabilityState(p) {
  if (isEarthPlanet(p)) return 'ideal';
  const esi = earthSimilarity(p);
  if (esi >= 0.90) return 'great';
  if (esi >= 0.75) return 'good';
  if (esi >= 0.55) return 'poor';
  return 'none';
}

/* ── Наборы цветов биомов: главный >50 %, второй ≥25 % ───────────────────── */
function biomeSetOf(id) {
  const k = String(id || '').toLowerCase().split(':').pop();
  if (/ocean|river|sea|lake/.test(k)) return 'water';
  if (/snow|ice|frozen|tundra|cryo|glacier|jagged|peaks/.test(k)) return 'ice';
  if (/scarlet|burgundy|volcan|lava|magma|ember|blood|rust/.test(k)) return 'red';
  if (/desert|badlands|savanna|mesa|dune|sand|ochre|golden|yellow|beige|arid|sulfur|steppe|beach/.test(k)) return 'yellow';
  if (/forest|grove|jungle|plains|meadow|swamp|taiga|cherry|birch|mushroom|garden|greensprout|night_forest|windy|windswept|flower|lush|moss|ashy/.test(k)) return 'green';
  return 'stone';
}
/* Оттенок набора чуть «холоднее/теплее» от сида — как просил заказчик. */
function biomeSetColor(key, p) {
  const base = ({ green: [118, 34, 44], yellow: [44, 52, 56], ice: [190, 40, 72], red: [8, 46, 46], water: [212, 46, 46], stone: [220, 8, 54] })[key] || [220, 8, 50];
  const seed = (p && p.seed != null ? p.seed : '') + '|' + key;
  const hue = (base[0] + (hashUnit(seed + '|h') * 2 - 1) * 14 + 360) % 360;
  const sat = Math.max(8, Math.min(78, base[1] + (hashUnit(seed + '|s') * 2 - 1) * 10));
  const light = Math.max(26, Math.min(76, base[2] + (hashUnit(seed + '|l') * 2 - 1) * 7));
  return 'hsl(' + hue.toFixed(0) + ' ' + sat.toFixed(0) + '% ' + light.toFixed(0) + '%)';
}
function biomePaletteHtml(p) {
  const list = (p && p.biomes ? p.biomes : []).filter(Boolean);
  if (!list.length || p.category === 'gas_giant') return '';
  const counts = new Map();
  for (const b of list) { const k = biomeSetOf(b); counts.set(k, (counts.get(k) || 0) + 1); }
  const rows = [...counts.entries()].map(([k, n]) => ({ k, share: n / list.length })).sort((a, b) => b.share - a.share);
  const main = rows[0].share > 0.5 ? rows[0] : null;
  const shown = main ? rows.filter(r => r === main || r.share >= 0.25).slice(0, 2) : rows.slice(0, 3);
  const pills = shown.map(r => {
    const title = T('biome.set.' + r.k) + ' · ' + Math.round(r.share * 100) + '%';
    return '<span class="' + (main && r === main ? 'main' : '') + '"><i style="background:' + biomeSetColor(r.k, p) + '"></i>' + esc(title) + '</span>';
  }).join('');
  return '<div class="sub">' + T('biome.set.title') + '</div><div class="pal">' + pills + '</div>';
}

/* Кнопка «свернуть блок Тип…Кольца» ставится на любую карточку с таблицей. */
let infoFolded = false;
function installFold() {
  if (!info) return;
  const table = info.querySelector('table');
  const old = info.querySelector('.foldBtn');
  if (!table) { if (old) old.remove(); return; }
  let wrap = table.parentElement;
  if (!wrap || !wrap.classList.contains('foldWrap')) {
    wrap = document.createElement('div');
    wrap.className = 'foldWrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  }
  wrap.classList.toggle('folded', infoFolded);
  let btn = old;
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'foldBtn';
    btn.type = 'button';
    btn.addEventListener('click', () => {
      infoFolded = !infoFolded;
      const w = info.querySelector('.foldWrap');
      if (w) w.classList.toggle('folded', infoFolded);
      btn.textContent = infoFolded ? '▸' : '▾';
      updateInfoSheet();
    });
    info.appendChild(btn);
  }
  btn.textContent = infoFolded ? '▸' : '▾';
  btn.title = T('info.fold');
  btn.setAttribute('aria-label', T('info.fold'));
}
if (info) new MutationObserver(() => installFold()).observe(info, { childList: true });

'''

NEW_SHOW = r'''function showPlanet(p, system) {
  info.style.display = 'block';
  info.classList.remove('expanded');
  const moons = EUGenerator.moonSpecs(p);
  let moonHtml = '';
  if (moons.length) {
    moonHtml = `<div class="sub">${T('info.moons')} · ${moons.length}</div>`;
    moons.forEach((m, idx) => {
      moonHtml += `<div class="moon" data-moon="${idx}" style="cursor:pointer"><span>${esc(N(m.name))}</span><span>${Math.round(m.distanceKm).toLocaleString(EUI18N.locale())} ${T('unit.km')} · ${m.radiusKm.toFixed(0)} ${T('unit.km')} · ${m.gravity.toFixed(2)} ${T('unit.g')}</span></div>`;
    });
  } else {
    moonHtml = `<div class="sub">${T('info.no_moons')}</div>`;
  }
  const ac = atmosphereColor(p);
  const atmDot = p.atmosphere === 'none' ? '' : `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${ac};margin-right:5px;vertical-align:middle"></span>`;
  const comp = (p.composition || []).map(c => `<span style="border-color:${atmosphereColor(p)}55">${esc(c)}</span>`).join('');
  const customBiomes = (p.biomes || []).filter(b => !String(b).startsWith('minecraft:'));
  const vanillaBiomes = (p.biomes || []).filter(b => String(b).startsWith('minecraft:'));
  const chipsFor = (list, cls) => list
    .map(b => `<span class="biome ${cls}" title="${esc(b)}">${esc(EUI18N.biome(b))}</span>`).join('');
  const modGroup = customBiomes.length
    ? `<div class="biome-group"><span class="biome-tag mod">${T('biome.mod')}</span>${chipsFor(customBiomes, 'mod')}</div>`
    : '';
  const vanGroup = vanillaBiomes.length
    ? `<div class="biome-group"><span class="biome-tag vanilla">${T('biome.vanilla')}</span>${chipsFor(vanillaBiomes, 'vanilla')}</div>`
    : '';
  const biomeChips = p.category === 'gas_giant' ? '<span>' + T('biome.unknown') + '</span>'
    : (modGroup + vanGroup || '<span>—</span>');
  const palette = biomePaletteHtml(p);
  const typeLabel = T('card.type');
  const spectralLabel = T('card.spectral');
  const oe = EUOrbits.elementFor(system, p);
  const oeRows = oe ? `
      <tr><td>${T('card.ecc')}</td><td>${oe.e.toFixed(3)}</td></tr>
      <tr><td>${T('card.incl')}</td><td>${(oe.iRad * 180 / Math.PI).toFixed(1)}°</td></tr>
      ${Math.abs(oe.gameRadiusAu - oe.meanRadiusAu) > 0.001 ? `<tr><td>${T('card.gameOrbit')}</td><td>${oe.gameRadiusAu.toFixed(2)} ${T('unit.au')}</td></tr>` : ''}
      <tr><td>${T('card.period')}</td><td>${periodText(oe.periodTicks)}</td></tr>
      <tr><td>${T('card.semi')}</td><td>${oe.semiMajorAxisAu.toFixed(3)} ${T('unit.au')}</td></tr>
` : '';
  const rot = EUOrbits.rotationOf(p);
  const rotRows = rot ? `
      <tr><td>${T('card.tilt')}</td><td>${rot.obliquityDeg.toFixed(1)}°${rot.retrograde ? (T('card.retro')) : ''}</td></tr>
      ${rot.magneticTiltDeg > 0 ? `<tr><td>${T('card.magpole')}</td><td>${rot.magneticTiltDeg.toFixed(1)}°${T('card.fromAxis')}</td></tr>` : ''}
      ${rot.auroraLatitudeDeg != null ? `<tr><td>${T('card.aurora')}</td><td>${rot.auroraLatitudeDeg.toFixed(0)}°</td></tr>` : ''}
` : '';
  // Характеристика: три строки с тонкими перегородками между блоками.
  const habState = habitabilityState(p);
  const habValue = T('trait.hab.' + habState) + (habState === 'ideal' ? '' : ' · ' + earthSimilarity(p).toFixed(2));
  const traits = `
      <div><span>${T('trait.suit')}</span><span>${T('trait.suit.' + suitState(p))}</span></div>
      <div><span>${T('trait.rad')}</span><span>${T('trait.rad.' + radiationState(p))}</span></div>
      <div><span>${T('trait.hab')}</span><span>${esc(habValue)}</span></div>`;
  info.innerHTML = `
    ${system.smesharia ? `<div class="smeshariaBadge">${T('smesharia.badge')}</div>` : ''}
    <h2>${esc(N(p.designation))}</h2>
    <div class="sub">${esc(N(p.name))} · ${esc(N(system.name))}</div>
    <table>
      <tr><td>${typeLabel}</td><td>${esc(EUGenerator.planetClass(p))}${cityLevel(p) === 2 ? ' · высокоразвитая' : cityLevel(p) === 1 ? ' · развитая' : ''}</td></tr>
      <tr><td>${spectralLabel}</td><td>${esc(EUGenerator.starSpectral(system.star))}</td></tr>
      <tr><td>${T('info.atmosphere')}</td><td>${atmDot}${esc(atmosphereText(p))}</td></tr>
      <tr><td>${T('info.gravity')}</td><td>${p.gravity.toFixed(2)} ${T('unit.g')}</td></tr>
      <tr><td>${T('info.temperature')}</td><td>${p.temperatureC.toFixed(0)} ${T('unit.c')}</td></tr>
      <tr><td>${T('info.radiation')}</td><td>${p.radiation.toFixed(0)}</td></tr>
      <tr><td>${T('info.orbit')}</td><td>${p.orbitAu.toFixed(2)} ${T('unit.au')}</td></tr>
      ${oeRows}
      ${rotRows}
      <tr><td>${T('info.diameter')}</td><td>${p.diameterEarth.toFixed(2)} ${T('unit.re')}</td></tr>
      <tr><td>${T('info.rings')}</td><td>${p.rings ? T('yes') : T('no')}</td></tr>
    </table>
    ${moonHtml}
    <div class="sub">${T('info.biomes')}</div>
    <div class="chips">${biomeChips}</div>
    ${palette}
    <div class="sub">${T('info.traits')}</div>
    <div class="spec">${traits}</div>
    <div class="sub">${T('info.seed')}</div>
    <div class="seed">${esc(p.seed)}</div>
    ${comp ? `<div class="sub">${T('atm.composition')}</div><div class="chips">${comp}</div>` : ''}`;
  info.querySelectorAll('.moon[data-moon]').forEach(el => {
    el.onclick = () => showMoon(moons[Number(el.dataset.moon)], p, system);
  });
}

'''

for path in FILES:
    text = io.open(path, encoding='utf-8').read()
    start = text.find('function showPlanet(p, system) {')
    stop = text.find('function showMoon(m, p, system) {')
    if start < 0 or stop < 0 or stop <= start:
        sys.exit('markers not found: ' + path)
    text = text[:start] + NEW_SHOW + HELPERS + text[stop:]
    io.open(path, 'w', encoding='utf-8').write(text)
    print(path.split('\\')[-1], 'patched, chars', len(text))
