# -*- coding: utf-8 -*-
"""Загадочная планета на сайте: генератор (как в Java), класс «???»."""
import io
import sys

PATH = r'C:\MCreatorWorkspaces\enchanted-universe-web\js\generator.js'
text = io.open(PATH, encoding='utf-8').read()

ANCHOR_RETURN = """  return { worldSeed: worldSeed.toString(), systems };
}"""

MYSTERY = r"""  appendMysteryPlanet(systems, worldSeed);
  return { worldSeed: worldSeed.toString(), systems };
}

/* ── Загадочная планета ───────────────────────────────────────────────────────
   Одна на мир с шансом 20 %, последняя в своей системе, орбита 1.0…2.5 а.е.
   Порядок вызовов RNG — КОНТРАКТ с Java SpaceGenerator.appendMysteryPlanet:
   меняешь здесь — меняй там, иначе карта мира и превью по сиду разойдутся. */
const MYSTERY_SALT = 0x4D595354;
function appendMysteryPlanet(systems, worldSeed) {
  const r = new JavaRandom(mix(worldSeed, MYSTERY_SALT));
  if (r.nextFloat() >= 0.20) return;
  const candidates = [];
  systems.forEach((s, idx) => {
    if (!String(s.id || '').startsWith('system_')) return;
    if (!s.planets || !s.planets.length) return;
    if (s.planets.some(p => p.orbitAu >= 2.2)) return;
    candidates.push(idx);
  });
  if (!candidates.length) return;
  const chosen = candidates[r.nextInt(candidates.length)];
  const system = systems[chosen];
  const index = system.planets.length;
  let maxOrbit = 0;
  for (const p of system.planets) maxOrbit = Math.max(maxOrbit, p.orbitAu);
  const orbit = Math.max(1.02, Math.min(2.50, Math.max(maxOrbit * 1.28 + 0.10, 1.02)));
  const diameter = 0.90 + r.nextDouble() * 1.20;
  const moons = r.nextInt(4);
  const rings = r.nextFloat() < 0.15;
  const planetSeed = r.nextLong();
  const systemNumber = Number(system.systemIndex || 0);
  system.planets.push({
    id: 'enchanted_universe:planet_' + BigInt.asUintN(64, BigInt(worldSeed)).toString(16)
      + '_' + systemNumber + '_mystery',
    designation: designation(system.formalName, index),
    name: '???',
    category: 'distant',
    atmosphere: 'none',
    temperatureC: -70,
    gravity: Math.max(0.45, Math.min(2.60, diameter * 1.05)),
    radiation: 0,
    gauss: 0.5,
    rings,
    moons,
    orbitAu: orbit,
    diameterEarth: diameter,
    biomes: [],
    composition: [],
    archetype: 'mystery',
    aerosol: 'none',
    seed: planetSeed.toString(),
    systemIndex: systemNumber,
    index,
    mystery: true,
    canLand: false
  });
}"""

for old, new, tag in ((ANCHOR_RETURN, MYSTERY, 'append'),):
    count = text.count(old)
    if count != 1:
        sys.exit('anchor %s count %d' % (tag, count))
    text = text.replace(old, new)

# класс планеты: «???» вместо «терра»
OLD_CLASS = """function planetClass(p) {
  const i = siteLang() === 'en' ? 1 : 0;"""
NEW_CLASS = """function planetClass(p) {
  if (p && p.mystery) return '???';
  const i = siteLang() === 'en' ? 1 : 0;"""
if text.count(OLD_CLASS) != 1:
    sys.exit('anchor class count %d' % text.count(OLD_CLASS))
text = text.replace(OLD_CLASS, NEW_CLASS)

io.open(PATH, 'w', encoding='utf-8').write(text)
print('generator.js patched, chars', len(text))
