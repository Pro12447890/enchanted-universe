'use strict';
// Порт SpaceGenerator/NameGenerator/PlanetArchetype из мода Enchanted Universe.
// Один и тот же сид даёт тот же каталог, что и в игре.

const NEW_POLICY=typeof window!=='undefined'?window.EUGenerationPolicy:require('./generation-policy.js');
const NEW_GALAXY=typeof window!=='undefined'?window.EUGalaxyDistribution:require('./galaxy-distribution.js');
const MASK48 = (1n << 48n) - 1n;
class JavaRandom {
  constructor(seed) { this.seed = (BigInt.asUintN(64, BigInt(seed)) ^ 0x5DEECE66Dn) & MASK48; }
  next(bits) { this.seed = (this.seed * 0x5DEECE66Dn + 0xBn) & MASK48; return Number(this.seed >> BigInt(48 - bits)); }
  nextInt(bound) {
    if (bound <= 0) throw new Error('bound');
    if ((bound & -bound) === bound) return Number((BigInt(bound) * BigInt(this.next(31))) >> 31n);
    let bits, val;
    do { bits = this.next(31); val = bits % bound; } while (((bits - val + (bound - 1)) | 0) < 0);
    return val;
  }
  nextFloat() { return Math.fround(this.next(24) / 16777216); }
  nextDouble() { return ((this.next(26) * 134217728) + this.next(27)) / 9007199254740992; }
  nextLong() { const hi = this.next(32) | 0; const lo = this.next(32) | 0; return BigInt.asIntN(64, (BigInt(hi) << 32n) + BigInt(lo)); }
}

class MinecraftRandom extends JavaRandom {
  nextDouble(){return Math.fround(Math.fround((this.next(26)*134217728)+this.next(27))*Math.fround(1.110223e-16));}
}

const PREFIX = ['Ael','Bore','Cryo','Dra','Eos','Fen','Gal','Hel','Iri','Jor','Kae','Lum','Mir','Nyx','Oph','Pyr','Quel','Rho','Sol','Tau','Ura','Vex','Wyn','Xen','Yr','Zeph','Astr','Cind','Dorn','Eld'];
const SUFFIX = ['ara','ion','eus','ora','ith','yn','ax','is','un','eth','alis','oria','ium','ae','os','ir','ea','yx','ora','es'];
const FORMAL_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
function systemName(r) { return PREFIX[r.nextInt(PREFIX.length)] + SUFFIX[r.nextInt(SUFFIX.length)]; }
function formalName(r) {
  return FORMAL_LETTERS[r.nextInt(FORMAL_LETTERS.length)] + FORMAL_LETTERS[r.nextInt(FORMAL_LETTERS.length)]
    + FORMAL_LETTERS[r.nextInt(FORMAL_LETTERS.length)] + '-' + (1000 + r.nextInt(9000));
}
function designation(formal, index) { return formal + ' ' + String.fromCharCode(98 + Math.max(0, index)); }

const STAR = {
  red_dwarf: 0.20, yellow_dwarf: 1.00, white_yellow_dwarf: 2.00, white_dwarf: 0.05,
  blue_dwarf: 5.00, white_giant: 40.0, blue_giant: 80.0, yellow_giant: 60.0,
  red_giant: 50.0, yellow_supergiant: 300.0, red_supergiant: 400.0,
  carbon_star:25,brown_dwarf:.01,magnetar:.001,orange_dwarf:.45,white_star:8,white_blue_dwarf:16,white_supergiant:500,blue_supergiant:1000
};
const STAR_COLOR = {
  red_dwarf: '#ff6a4a', yellow_dwarf: '#ffe6b0', white_yellow_dwarf: '#fff4d6', white_dwarf: '#e8f0ff',
  blue_dwarf: '#9fc8ff', white_giant: '#f2f6ff', blue_giant: '#9fc0ff', yellow_giant: '#ffd98a',
  red_giant: '#ff7a4a', yellow_supergiant: '#ffd070', red_supergiant: '#ff6040',
  carbon_star: '#ff8844', brown_dwarf: '#8a3a2a', magnetar: '#bfe0ff'
};

const CATEGORIES = {
  very_hot: [0.20, 0.45, false], hot: [0.45, 0.66, false], temperate: [0.66, 1.00, false],
  habitable: [0.66, 1.50, false], cold_habitable: [1.50, 1.70, false],
  distant: [1.80, 2.50, false], gas_giant: [1.20, 2.50, true]
};

const ARCH = {
  very_hot: ['lava','airless','sulfur','iron','ultrahot','cryovolcanic','pulsar'],
  hot: ['mars_like','desert','airless','iron','rocky_thin','chthonian','toroidal'],
  temperate: ['desert','tundra','rocky_thin','ocean','carbon','sulfur','ammonia','withered'],
  habitable: ['ocean','tidal_eyeball','hycean','snowball','circumbinary','desert','rocky_thin','panthalassic'],
  cold_habitable: ['snowball','tundra','ice','ocean','ammonia','cryovolcanic','panthalassic'],
  distant: ['ice','dwarf_planet','airless','carbon','moon_icy','cryovolcanic','toroidal'],
  gas_giant: ['gas_giant','ice_giant','hot_jupiter','puffy','super_puff','helium_giant','brown_dwarf','gas_dwarf']
};

const AEROSOL_BY_ARCH = {
  mars_like:'dust', desert:'dust', super_earth:'dust', toroidal:'dust',
  sulfur:'sulfur', moon_volcanic:'sulfur',
  carbon:'smoke', rogue:'smoke', evaporating:'smoke', ammonia:'smoke'
};

const GASES = ['H2','HE','CH4','NH3','H2O','CO2','CO','O2','N2','AR','NE','SO2','H2S','HCL','HF','CL2','F2','BR2','I2','FE','O3','NO','NO2','N2O','C2H6','C3H8','C2H2','C2H4','C6H6','CH3OH','C2H5OH','HCN','NH2OH','PH3','PCL3','SIH4','SIF4','SF6','CF4','CCL4','BF3','B2H6','HBR','HI','KR','XE','RN','COS','CS2','OCS','N2H4','CLO2','H2O2'];
const AQUARIA_BIOMES = [
  'minecraft:ocean','minecraft:deep_ocean','minecraft:warm_ocean','minecraft:lukewarm_ocean',
  'minecraft:deep_lukewarm_ocean','minecraft:cold_ocean','minecraft:deep_cold_ocean',
  'minecraft:frozen_ocean','minecraft:deep_frozen_ocean','minecraft:river','minecraft:frozen_river',
  'minecraft:jungle','minecraft:sparse_jungle','minecraft:bamboo_jungle','minecraft:plains','minecraft:sunflower_plains'
];

// Каждый биом получает тег wet/dry; аквария — только если >= 2/3 биомов мокрые.
const WET_BIOME_RE = /(^|:)(ocean|deep_ocean|warm_ocean|lukewarm_ocean|deep_lukewarm_ocean|cold_ocean|deep_cold_ocean|frozen_ocean|deep_frozen_ocean|river|frozen_river)$/;
function isWetBiome(id) {
  const key = String(id || '').includes(':') ? String(id).split(':').pop() : String(id || '');
  return key.includes('ocean') || key.includes('river');
}
function biomeTag(id) { return isWetBiome(id) ? 'wet' : 'dry'; }
function wetCount(list) { return (list || []).filter(isWetBiome).length; }
function isAquaria(planet) {
  const list = planet && planet.biomes || [];
  return list.length > 0 && wetCount(list) / list.length >= 2 / 3;
}

const COLOR_GASES = ['SO2','H2S','NO2','CL2','F2','I2','HI','BR2','O3','CH4','NH3','C6H6','CLO2','FE','HCN','SIH4','CS2','COS','OCS','HBR'];

const HOT_BIOMES = ['very_hot_regolithbasin','hot_regolithbasin','light_regolithbasin','cratered_regolithbasin','yellow_regolithbasin','beige_regolithbasin','burgundy_regolithbasin','pale_beige_regolithbasin','ochre_regolithbasin','sulfur_regolithbasin','desert_bare','badlands_bare','minecraft:savanna'];
const TEMPERATE_BIOMES = ['brown_regolithbasin','regolithbasin','cratered_regolithbasin','light_regolithbasin','desert_bare','badlands_bare','minecraft:plains','minecraft:sunflower_plains','minecraft:flower_forest','minecraft:cherry_grove','minecraft:meadow','minecraft:beach','minecraft:savanna','minecraft:savanna_plateau','minecraft:stony_shore','minecraft:windswept_hills','minecraft:windswept_forest'];
const HABITABLE_BIOMES = ['ashy_forest','scarlet_forest','scarlet_plains','golden_groves','windy_forest','windy_plains','greensproutsgroves','dense_mushroom_groves','night_forest','minecraft:plains','minecraft:forest','minecraft:flower_forest','minecraft:birch_forest','minecraft:dark_forest','minecraft:cherry_grove','minecraft:meadow','minecraft:jungle','minecraft:sparse_jungle','minecraft:bamboo_jungle','minecraft:savanna','minecraft:sunflower_plains','minecraft:mushroom_fields','minecraft:beach','minecraft:mangrove_swamp','minecraft:swamp','minecraft:pale_garden','minecraft:windswept_forest','minecraft:windswept_hills'];
const COLD_BIOMES = ['icy_groves','minecraft:snowy_plains','minecraft:snowy_taiga','minecraft:frozen_peaks','minecraft:ice_spikes','minecraft:taiga','minecraft:old_growth_pine_taiga','minecraft:old_growth_spruce_taiga','minecraft:snowy_beach','minecraft:frozen_river','minecraft:grove','minecraft:snowy_slopes','minecraft:jagged_peaks'];
const DRY_BIOMES = ['regolithbasin','light_regolithbasin','cratered_regolithbasin','brown_regolithbasin','beige_regolithbasin','burgundy_regolithbasin','pale_beige_regolithbasin','ochre_regolithbasin','sulfur_regolithbasin','desert_bare','badlands_bare','minecraft:windswept_savanna','minecraft:beach'];

function pickCategoryLegacy(r, index) {
  const f = r.nextFloat();
  if (index === 0) {
    if (f < 0.18) return 'very_hot'; if (f < 0.42) return 'hot';
    if (f < 0.72) return 'temperate'; return 'habitable';
  }
  if (index === 1) {
    if (f < 0.22) return 'hot'; if (f < 0.55) return 'temperate';
    if (f < 0.85) return 'habitable'; if (f < 0.93) return 'cold_habitable';
    return 'gas_giant';
  }
  if (f < 0.15) return 'habitable'; if (f < 0.35) return 'cold_habitable';
  if (f < 0.75) return 'distant'; return 'gas_giant';
}
function pickAtmosphere(r, category) {
  if (category === 'very_hot' || category === 'hot') return 'none';
  const f = r.nextFloat();
  if (f < 0.12) return 'none'; if (f < 0.28) return 'minimal'; if (f < 0.46) return 'thin';
  if (f < 0.68) return 'moderate'; if (f < 0.87) return 'medium'; return 'thick';
}
function composition(r, atmosphere, category) {
  if (atmosphere === 'none') return [];
  const out = [];
  if (category === 'habitable' || category === 'cold_habitable') {
    out.push('N2', 'O2');
    if (r.nextFloat() < 0.5) out.push('Ar');
    if (r.nextFloat() < 0.35) out.push('H2O');
  } else {
    const count = 1 + r.nextInt(4);
    // «Цветной» газ в большинстве миров — как в Java-генераторе.
    if (r.nextFloat() < 0.65) {
      const colored = COLOR_GASES[r.nextInt(COLOR_GASES.length)];
      if (!out.includes(colored)) out.push(colored);
    }
    for (let i = out.length; i < count; i++) {
      const gas = GASES[r.nextInt(GASES.length)];
      if (!out.includes(gas)) out.push(gas);
    }
  }
  return out;
}
function baseRadiation(r, category) {
  const has = r.nextFloat() < 0.15;
  if (category === 'very_hot' || category === 'hot') return r.nextFloat() < 0.85 ? 200 : 0;
  if (category === 'cold_habitable' || category === 'distant') return r.nextFloat() < 0.15 ? 30 : 0;
  return has ? 100 : 0;
}
function magneticFactor(gauss) {
  if (gauss < 6) return 1; if (gauss < 11) return 0.9; if (gauss < 16) return 0.8;
  if (gauss < 21) return 0.65; if (gauss < 26) return 0.5; if (gauss < 30) return 1.1; return 1.25;
}
function temperatureFor(category, orbit, star) {
  const base = { very_hot: 450, hot: 220, temperate: 15, habitable: 10, cold_habitable: -25, distant: -120, gas_giant: -80 }[category];
  return base + (1-Math.min(2.5,orbit))*35+Math.fround(Math.fround(STAR[star])-1)*2;
}
function shuffle(list, r) {
  for (let i = list.length; i > 1; i--) { const j = r.nextInt(i); const t = list[i - 1]; list[i - 1] = list[j]; list[j] = t; }
}
function biomes(r, category, atmosphere, archetype,comp=[]) {
  if (category === 'gas_giant') return [];
  if (['gas_giant','ice_giant','hot_jupiter'].includes(archetype)) return [];
  let pool;
  if (archetype === 'withered') return ['enchanted_universe:ashy_groves'];
  if (archetype === 'panthalassic' || archetype === 'ocean' || archetype === 'hycean') return AQUARIA_BIOMES.slice();
  if (archetype === 'ammonia') pool = COLD_BIOMES;
  else if (['ice','snowball','moon_icy','cryovolcanic'].includes(archetype)) pool = COLD_BIOMES;
  else if (['sulfur','lava','ultrahot','pulsar'].includes(archetype)) pool = HOT_BIOMES;
  else if (category !== 'habitable' && (category === 'distant' || atmosphere === 'none')) pool = DRY_BIOMES;
  else pool = { very_hot: HOT_BIOMES, hot: HOT_BIOMES, temperate: TEMPERATE_BIOMES, habitable: HABITABLE_BIOMES, cold_habitable: COLD_BIOMES, distant: DRY_BIOMES, gas_giant: HABITABLE_BIOMES }[category];
  const list = pool.slice();
  shuffle(list, new JavaRandom(r.nextLong()));
  const count = 2 + r.nextInt(4);
  const selected = list.slice(0, Math.min(count, list.length));
  const forest = 'scarlet_forest', plains = 'scarlet_plains';
  const hasForest = selected.includes(forest), hasPlains = selected.includes(plains);
  if (hasForest !== hasPlains) {
    selected.push(hasForest ? plains : forest);
    if (selected.length > 5) {
      for (let i = selected.length - 1; i >= 0; i--) if (selected[i] !== forest && selected[i] !== plains) selected.splice(i, 1);
    }
  }
  let normalized=selected.map(id=>id.includes(':')?id:'enchanted_universe:'+id);if(atmosphere==='none'){normalized=normalized.filter(id=>!vegetated(id));if(!normalized.length)normalized=['enchanted_universe:cratered_regolithbasin'];}return withLifelessRiver(normalized,comp);
}
function pickStar(r) {
  const roll = r.nextInt(100);
  if (roll < 25) return 'red_dwarf'; if (roll < 50) return 'yellow_dwarf';
  if (roll < 62) return 'white_yellow_dwarf'; if (roll < 67) return 'white_dwarf';
  if (roll < 72) return 'blue_dwarf'; if (roll < 75) return 'white_giant';
  if (roll < 77) return 'blue_giant'; if (roll < 82) return 'yellow_giant';
  if (roll < 87) return 'red_giant'; if (roll < 89) return 'yellow_supergiant';
  if (roll < 91) return 'red_supergiant'; if (roll < 95) return 'carbon_star';
  if (roll < 98) return 'brown_dwarf'; return 'magnetar';
}
function mix(seed, index) {
  let z = BigInt.asUintN(64, BigInt(seed) + 0x9E3779B97F4A7C15n * BigInt(index + 1));
  z = BigInt.asUintN(64, (z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n);
  z = BigInt.asUintN(64, (z ^ (z >> 27n)) * 0x94D049BB133111EBn);
  return BigInt.asIntN(64, z ^ (z >> 31n));
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function createPlanetLegacy(r, systemIndex, index, formal, star, worldSeed, previousOrbit = 0) {
  let category = pickCategoryLegacy(r, index);
  let orbit = CATEGORIES[category][0] + r.nextDouble() * (CATEGORIES[category][1] - CATEGORIES[category][0]);
  orbit *= Math.sqrt(Math.max(0.01, STAR[star]));
  const diameter = 0.2 + r.nextDouble() * 3.8;
  const gravity = clamp(diameter * (0.55 + r.nextDouble() * 0.65), 0.20, 4.0);
  const temperature = temperatureFor(category, orbit, star);
  let atmosphere = pickAtmosphere(r, category);
  let archetype = ARCH[category][r.nextInt(ARCH[category].length)];
  if (archetype === 'withered') {
    category = 'temperate';
    orbit = 0.80 + r.nextDouble() * 0.10;
    atmosphere = 'thick';
  }
  // Не даём планетам слипаться в одну орбиту: минимум 34% разноса.
  if (previousOrbit > 0) orbit = Math.max(orbit, previousOrbit * 1.34 + 0.22);
  const aerosol = AEROSOL_BY_ARCH[archetype] || 'none';
  let comp = composition(r, atmosphere, category);
  if (archetype === 'withered') comp = ['N2:0.70','CO2:0.18','SO2:0.08','AR:0.04'];
  const baseRad = baseRadiation(r, category);
  const gauss = 0.5 + r.nextDouble() * 44.5;
  const radiation = clamp(baseRad * (1 - { none: 0, minimal: 50, thin: 75, moderate: 90, medium: 95, thick: 99 }[atmosphere] / 100) * magneticFactor(gauss), 0, 1000);
  const rings = category === 'gas_giant' ? r.nextFloat() < 0.55 : r.nextFloat() < 0.12;
  const moons = r.nextInt(6);
  let biomeList = biomes(r, category, atmosphere, archetype);
  if (category === 'distant' && orbit > 1.8 && ['red_dwarf','brown_dwarf','magnetar'].includes(star)) {
    const h = BigInt.asIntN(64, BigInt(worldSeed) ^ (BigInt(systemIndex) * 0x9E3779B97F4A7C15n)
      ^ (BigInt(index) * 0xBF58476D1CE4E5B9n) ^ 0x4E49474854n);
    if ((h & 3n) === 0n) biomeList = ['enchanted_universe:night_forest'];
  }
  // Аквария определяется биомами, а не названием архетипа.
  if (biomeList.length && wetCount(biomeList) / biomeList.length >= 2 / 3) archetype = 'ocean';
  const desig = designation(formal, index);
  const nameTag = BigInt.asIntN(64, BigInt(worldSeed) ^ (BigInt(systemIndex) * 0x9E3779B97F4A7C15n) ^ (BigInt(index) * 0xBF58476D1CE4E5B9n));
  let suffix = BigInt.asUintN(64, nameTag).toString(36);
  if (suffix.length < 3) suffix = '00' + suffix;
  const name = systemName(r) + '-' + suffix.slice(-3);
  const id = 'enchanted_universe:planet_' + BigInt.asUintN(64, BigInt(worldSeed)).toString(16) + '_' + systemIndex + '_' + index;
  const planetSeed = r.nextLong();
  return {
    id, designation: desig, name, category, atmosphere, temperatureC: temperature,
    gravity, radiation, gauss, rings, moons, orbitAu: orbit, diameterEarth: diameter,
    biomes: biomeList, composition: comp, archetype, aerosol, seed: planetSeed.toString(),
    systemIndex, index
  };
}

// Current new-catalog model: same pools, mass-radius laws and gas bands as Java SpaceGenerator.
const GAS_MASS_RADIUS=[[1,1],[2.04,1.23],[5,1.74],[10,2.55],[14.5,4.01],[17.1,3.88],[30,5.6],[95.2,9.45],[318,11.21],[954,11.50],[4132,10.60],[23837,10.90]];
const GAS_BANDS={gas_giant:[95.2,4132,.98,1.02],hot_jupiter:[95.2,1600,1.05,1.25],evaporating:[30,1000,1,1.15],ice_giant:[10,20,.96,1.04],helium_giant:[30,300,1,1.20],mini_neptune:[4,13,.95,1.05],gas_dwarf:[8,30,.92,1],puffy:[2,6,1.15,1.45],super_puff:[1,3,1.7,2.4],brown_dwarf:[4132,23837,1,1.08]};
const GAS_COMPOSITION={ice_giant:['H2:0.78','HE:0.16','CH4:0.05','H2S:0.01'],mini_neptune:['H2:0.72','HE:0.20','CH4:0.06','H2O:0.02'],gas_dwarf:['H2:0.80','HE:0.18','CH4:0.02'],puffy:['H2:0.90','HE:0.09','H2O:0.01'],super_puff:['H2:0.94','HE:0.05','CH4:0.01'],helium_giant:['HE:0.75','H2:0.22','CH4:0.03'],hot_jupiter:['H2:0.75','HE:0.20','FE:0.04','CO:0.01'],evaporating:['H2:0.70','HE:0.20','FE:0.06','SIH4:0.04'],brown_dwarf:['H2:0.55','HE:0.42','CH4:0.02','CO:0.01'],gas_giant:['H2:0.86','HE:0.12','CH4:0.015','NH3:0.005']};
function visualUnit(text){let h=0x811c9dc5;for(let i=0;i<String(text).length;i++)h=Math.imul(h^String(text).charCodeAt(i),0x01000193);return(h>>>0)/4294967296;}
function pickCategory(r,index){const v=r.nextFloat();if(index===0)return v<.18?'very_hot':v<.42?'hot':v<.72?'temperate':'habitable';if(index===1)return v<.20?'hot':v<.52?'temperate':v<.82?'habitable':v<.90?'cold_habitable':'gas_giant';return v<.15?'habitable':v<.34?'cold_habitable':v<.60?'distant':'gas_giant';}
function pickGas(r,t){const v=r.nextFloat();if(t>600)return v<.6?'hot_jupiter':'evaporating';return v<.31?'gas_giant':v<.49?'ice_giant':v<.65?'mini_neptune':v<.74?'gas_dwarf':v<.82?'puffy':v<.86?'super_puff':v<.92?'helium_giant':v<.98?'brown_dwarf':'hot_jupiter';}
function logUniform(r,a,b){return Math.exp(Math.log(a)+r.nextDouble()*Math.log(b/a));}
function gasRadius(m){for(let i=1;i<GAS_MASS_RADIUS.length;i++){const[a,x]=GAS_MASS_RADIUS[i-1],[b,y]=GAS_MASS_RADIUS[i];if(m<=b)return Math.exp(Math.log(x)+Math.log(m/a)/Math.log(b/a)*Math.log(y/x));}return 10.9;}
function rockyRadius(r,category,archetype){const bands={habitable:[.35,9],cold_habitable:[.35,9],temperate:[.08,6],hot:[.04,9],very_hot:[.04,9],distant:[.008,3]},mass=logUniform(r,...(bands[category]||[.05,5]));const density=['iron','chthonian'].includes(archetype)?[.78,.90]:['ocean','hycean','panthalassic','ammonia','moon_titan'].includes(archetype)?[1.02,1.12]:['ice','snowball','moon_icy','tundra','cryovolcanic'].includes(archetype)?[.98,1.10]:archetype==='carbon'?[.94,1.02]:[.94,1.06];const radius=Math.max(.10,mass**.28)*(density[0]+r.nextDouble()*(density[1]-density[0]));return {radius,gravity:clamp(mass/radius**2,.25,4)};}
function livingBiome(id){const p=String(id).split(':').pop();if(p==='regolith_river'||/icy|iced|regolith|frozen|ice_spikes/.test(p))return false;return /forest|groves|sprouts|jungle|plains|mushroom|windy|golden|scarlet|ocean|river|beach/.test(p);}
function withLifelessRiver(list,comp){if(list.some(livingBiome)||list.includes('enchanted_universe:regolith_river')||!list.length)return list;return (list.some(isWetBiome)||comp.some(v=>v.toUpperCase().startsWith('H2O')))?[...list,'enchanted_universe:regolith_river']:list;}

function vegetated(id){const path=id.split(':').pop();if(!id.startsWith('minecraft:'))return livingBiome(id);return ['plains','forest','savanna','meadow','jungle','taiga','grove','swamp','cherry','birch','dark_forest','flower','mushroom','mangrove','pale_garden','snowy_plains','windswept'].some(k=>path.includes(k));}
function oxygenFraction(comp){if(!comp.length)return 0;const explicit=comp.some(s=>s.includes(':'));let total=0,o2=0;for(const raw of comp){const [g,v]=raw.split(':'),f=explicit&&v!==undefined?Math.fround(Math.max(0,Number(v)||0)):Math.fround(1/comp.length);total=Math.fround(total+f);if(g.trim().toUpperCase()==='O2')o2=Math.fround(o2+f);}return total>0?Math.fround(o2/total):0;}
function archetypeFrom(p){if(p.atmosphere==='none')return p.category==='distant'?'dwarf_planet':'airless';const gas=(p.composition||[]).join(',').toUpperCase();if(p.category==='gas_giant')return p.temperatureC>700?'hot_jupiter':gas.includes('CH4')&&p.temperatureC<-160?'ice_giant':'gas_giant';if(gas.includes('SO2')||gas.includes('H2S'))return 'sulfur';if(gas.includes('CH4')&&p.category==='cold_habitable')return 'moon_titan';if(p.category==='very_hot')return p.temperatureC>1000?'lava':'ultrahot';if(p.category==='hot')return gas.includes('CO2')?'mars_like':'desert';if(p.category==='cold_habitable')return p.temperatureC<-80?'ice':'snowball';if(p.category==='habitable')return gas.includes('O2')?'ocean':'hycean';if(p.category==='distant')return p.temperatureC<-150?'ice':'dwarf_planet';return 'desert';}

function createPlanet(r,systemIndex,index,formal,star,worldSeed,previousOrbit=0,climate=false,total=0,systemSeed=0n){
 let category=pickCategory(r,index),orbit=(CATEGORIES[category][0]+r.nextDouble()*(CATEGORIES[category][1]-CATEGORIES[category][0]))*Math.sqrt(Math.max(.01,Math.fround(STAR[star])));if(climate){const gas=NEW_GALAXY.gas(systemSeed,index,total,NEW_POLICY.normalizedOrbit(orbit,Math.fround(STAR[star])));if(gas)category='gas_giant';else if(category==='gas_giant')category=NEW_POLICY.normalizedOrbit(orbit,Math.fround(STAR[star]))>1.7?'distant':'habitable';}let temperature=temperatureFor(category,orbit,star);if(orbit<.2)temperature=Math.max(temperature,278.3*Math.max(.000001,Math.fround(STAR[star]))**.25/Math.sqrt(Math.max(.005,orbit))-273.15);
 const pool=ARCH[category].slice();if(['temperate','habitable'].includes(category))pool.push('super_earth');let archetype=category==='gas_giant'?pickGas(r,temperature):pool[r.nextInt(pool.length)],atmosphere;
 if(archetype==='withered'){orbit=.80+r.nextDouble()*.10;category='temperate';atmosphere='thick';}else atmosphere=category==='gas_giant'?(['ice_giant','mini_neptune','gas_dwarf'].includes(archetype)?'medium':'thick'):pickAtmosphere(r,category);
 let diameter,gravity,comp;if(category==='gas_giant'){const[a,b,c,d]=GAS_BANDS[archetype],mass=logUniform(r,a,b);diameter=gasRadius(mass)*(c+r.nextDouble()*(d-c));gravity=clamp(mass/diameter**2,.2,400);comp=GAS_COMPOSITION[archetype].slice();}else{const rock=rockyRadius(r,category,archetype);diameter=rock.radius;gravity=rock.gravity;comp=composition(r,atmosphere,category);if(archetype==='withered')comp=['N2:0.70','CO2:0.18','SO2:0.08','AR:0.04'];}
 if(previousOrbit>0)orbit=Math.max(orbit,previousOrbit*1.34+.22);const baseRad=baseRadiation(r,category),gauss=.5+r.nextDouble()*44.5,radiation=clamp(baseRad*(1-{none:0,minimal:50,thin:75,moderate:90,medium:95,thick:99}[atmosphere]/100)*magneticFactor(gauss),0,1000);
 let moons=category==='gas_giant'?2+r.nextInt(5):r.nextInt(4);const rings=r.nextFloat()<(category==='gas_giant'?.55:.12);let biomeList=category==='gas_giant'?[]:biomes(r,category,atmosphere,archetype,comp);
 if(category!=='gas_giant'&&!biomeList.length)biomeList=['enchanted_universe:cratered_regolithbasin'];
 if(category==='distant'&&orbit>1.8&&['red_dwarf','brown_dwarf','magnetar'].includes(star)){const h=BigInt.asIntN(64,worldSeed^BigInt(systemIndex)*0x9e3779b97f4a7c15n^BigInt(index)*0xbf58476d1ce4e5b9n^0x4e49474854n);if((h&3n)===0n)biomeList=['enchanted_universe:night_forest'];}
 if(isAquaria({biomes:biomeList}))archetype='ocean';const desig=designation(formal,index),nameTag=BigInt.asIntN(64,worldSeed^BigInt(systemIndex)*0x9e3779b97f4a7c15n^BigInt(index)*0xbf58476d1ce4e5b9n);let suffix=BigInt.asUintN(64,nameTag).toString(36).padStart(3,'0');const name=systemName(r)+'-'+suffix.slice(-3),id='enchanted_universe:planet_'+BigInt.asUintN(64,worldSeed).toString(16)+'_'+systemIndex+'_'+index;
 if(archetype==='brown_dwarf'){r.nextFloat();} // Same palette brightness RNG consumption as the game's current new-catalog path.
 const seed=r.nextLong().toString();if(category==='habitable'&&atmosphere!=='none'&&oxygenFraction(comp)>=.10&&visualUnit(seed+'|taiga')<.4){const taiga=['taiga','old_growth_pine_taiga','old_growth_spruce_taiga'][Math.floor(visualUnit(seed+'|taiga-kind')*3)];if(!biomeList.includes('minecraft:'+taiga))biomeList.push('minecraft:'+taiga);}
   const body={id,designation:desig,name,category,atmosphere,temperatureC:temperature,gravity,radiation,gauss,rings,moons,orbitAu:orbit,diameterEarth:diameter,biomes:biomeList,composition:comp,archetype,aerosol:AEROSOL_BY_ARCH[archetype]||'none',seed,systemIndex,index,generationModel:climate?'ClassicClimateV1':'Classic'};
  if(climate){body.biomes=NEW_POLICY.biomes(seed,category,atmosphere,orbit,Math.fround(STAR[star]),biomeList);body.moons=NEW_POLICY.moons(seed,moons,category==='gas_giant',orbit,Math.fround(STAR[star]));
   const specs=moonSpecs(body);body.customMoons=specs.map(m=>{const ms=BigInt.asIntN(64,BigInt(seed)^(0x9e3779b97f4a7c15n*BigInt(m.index+1)));return {...m,radiusKm:Math.min(m.radiusKm,6371*diameter*.45),biomes:NEW_POLICY.biomes(ms,m.category,m.atmosphere,orbit,Math.fround(STAR[star]),m.biomes)};});
  }return body;
}

function solarPlanet(index, name, category, orbit, diameter, gravity, temp, atmosphere, comp, moons, rings, biome, seed) {
  const id = 'enchanted_universe:planet_' + BigInt.asUintN(64, BigInt(seed)).toString(16) + '_sol_' + index;
  return { id, designation: name, name, category, atmosphere, temperatureC: temp, gravity, radiation: 0,
    gauss: 0.5, rings, moons, orbitAu: orbit, diameterEarth: diameter, biomes: [biome], composition: comp, archetype: '', seed: String(seed) };
}

function solarSystem(worldSeed) {
  const p = [
    [0,'Меркурий','hot',0.39,0.38,0.38,167,'none',[],0,false,'cratered_regolithbasin'],
    [1,'Венера','very_hot',0.72,0.95,0.90,464,'thick',['CO2','N2','SO2'],0,false,'very_hot_regolithbasin'],
    [2,'Земля','habitable',1.0,1.0,1.0,15,'moderate',['N2','O2','AR'],1,false,'greensproutsgroves'],
    [3,'Марс','hot',1.52,0.53,0.38,-60,'thin',['CO2','N2','AR'],2,false,'oxidized_plains'],
    [4,'Церера','distant',2.77,0.07,0.03,-105,'none',[],0,false,'cratered_regolithbasin'],
    [5,'Юпитер','gas_giant',5.2,11.2,2.53,-145,'thick',['H2','HE','CH4','NH3'],4,true,'brown_regolithbasin'],
    [6,'Сатурн','gas_giant',9.58,9.45,1.07,-178,'thick',['H2','HE','CH4'],5,true,'brown_regolithbasin'],
    [7,'Уран','gas_giant',19.2,4.0,0.89,-224,'medium',['H2','HE','CH4'],5,true,'cratered_regolithbasin'],
    [8,'Нептун','gas_giant',30.1,3.88,1.14,-218,'thick',['H2','HE','CH4'],5,true,'cratered_regolithbasin'],
    [9,'Плутон','distant',39.5,0.19,0.06,-229,'minimal',['N2','CH4'],5,false,'iced_regolithbasin'],
    [10,'Хаумеа','distant',43.1,0.16,0.04,-241,'none',[],2,true,'iced_regolithbasin'],
    [11,'Кваоар','distant',43.7,0.11,0.03,-220,'none',[],2,false,'cratered_regolithbasin'],
    [12,'Макемаке','distant',45.8,0.14,0.03,-239,'none',[],1,false,'iced_regolithbasin'],
    [13,'Эрида','distant',67.8,0.23,0.08,-231,'none',[],1,false,'iced_regolithbasin']
  ];
  const hex = BigInt.asUintN(64, BigInt(worldSeed)).toString(16);
  return { name:'Солнечная система', formalName:'Sol', star:'yellow_dwarf', distanceLy:0, planets: p.map(x => {
    const seed = BigInt.asIntN(64, BigInt(worldSeed) ^ (0x101n * BigInt(x[0] + 1)));
    return { id:'enchanted_universe:planet_'+hex+'_sol_'+x[0], designation:x[1], name:x[1], category:x[2], orbitAu:x[3],
      diameterEarth:x[4], gravity:Math.max(0.20, x[5]), temperatureC:x[6], atmosphere:x[7], composition:x[8], moons:x[9], rings:x[10],
      biomes: x[2] === 'gas_giant' ? [] : ['enchanted_universe:'+x[11]].concat(x[0] === 1 ? ['enchanted_universe:beige_regolithbasin','enchanted_universe:ochre_regolithbasin'] : []), radiation:Math.max(0, 20 - x[0]*1.2), gauss:0.5, seed:seed.toString() };
  }) };
}

function demos(worldSeed) {
  const W = BigInt(worldSeed);
  function dp(prefix, index, name, category, orbit, diameter, gravity, temp, atmosphere, comp, moons, rings, biome, xor) {
    return { id:'enchanted_universe:planet_demo_'+prefix+'_'+index, designation:name, name, category, orbitAu:orbit,
      diameterEarth:diameter, gravity:Math.max(0.20, gravity), temperatureC:temp, atmosphere, composition:comp, moons, rings,
      biomes: category === 'gas_giant' ? [] : ['enchanted_universe:'+biome], radiation:12, gauss:0.5, seed:BigInt.asIntN(64, W ^ BigInt(xor)).toString() };
  }
  return [
    { name:'Астерион', formalName:'Asterion', star:'yellow_dwarf', distanceLy:12.0, planets:[
      dp('asterion',0,'Терра Нова','habitable',1.00,1.02,1.0,22,'moderate',['N2:0.70','O2:0.25','AR:0.05'],1,false,'greensproutsgroves',0xA1),
      dp('asterion',1,'Аэрис','habitable',1.15,0.94,0.9,28,'medium',['O2:0.86','N2:0.11','AR:0.03'],0,false,'windy_forest',0xA2),
      dp('asterion',2,'Веспер','very_hot',0.58,0.95,0.9,462,'thick',['CO2:0.95','SO2:0.04','N2:0.01'],0,false,'very_hot_regolithbasin',0xA3),
      dp('asterion',3,'Ноктис','habitable',1.35,0.72,0.6,16,'moderate',['N2:0.74','O2:0.23','AR:0.03'],2,false,'night_forest',0xA4),
      dp('asterion',4,'Кронос','gas_giant',5.2,9.5,2.3,-145,'thick',['H2:0.86','HE:0.12','CH4:0.02'],4,true,'brown_regolithbasin',0xA5),
      { id:'enchanted_universe:planet_demo_aquaria', designation:'Аквария', name:'Аквария', category:'habitable',
        orbitAu:1.05, diameterEarth:1.08, gravity:1.0, temperatureC:24, atmosphere:'moderate',
        composition:['N2:0.78','O2:0.21','AR:0.01'], moons:2, rings:false, biomes:AQUARIA_BIOMES,
        radiation:12, gauss:0.5, seed: BigInt.asIntN(64, W ^ 0xA6n).toString() }
    ] },
    { name:'Бетельгейзе', formalName:'Betelgeuse', star:'red_supergiant', distanceLy:640.0, planets:[
      dp('betelgeuse',0,'Пепел','hot',2.4,1.4,1.5,180,'thin',['CO2:0.80','N2:0.15','SO2:0.05'],1,false,'oxidized_plains',0xB1),
      dp('betelgeuse',1,'Исполин','gas_giant',7.5,13.0,3.0,900,'thick',['H2:0.75','HE:0.20','FE:0.05'],5,true,'brown_regolithbasin',0xB2)
    ] },
    { name:'Сингулярность', formalName:'Singularity', star:'magnetar', distanceLy:26.0, planets:[
      dp('singularity',0,'Обсидиан','hot',0.7,0.55,0.4,40,'none',[],0,false,'cratered_regolithbasin',0xC1)
    ] },
    { name:'Ригель', formalName:'Rigel', star:'blue_giant', distanceLy:860.0, planets:[
      dp('rigel',0,'Лазурь','habitable',4.0,1.1,1.1,12,'moderate',['N2:0.66','O2:0.30','AR:0.04'],1,false,'windy_plains',0xD1),
      dp('rigel',1,'Пух','gas_giant',12.0,6.0,0.3,300,'minimal',['H2:0.90','HE:0.10'],2,false,'brown_regolithbasin',0xD2)
    ] }
  ];
}


function smeshariaSystems(worldSeed) {
 const W=BigInt(worldSeed),p=(id,name,desig,category,archetype,atmosphere,comp,gravity,temp,orbit,diameter,moons,rings,biomes,seed)=>({id:'enchanted_universe:'+id,designation:desig,name,category,archetype,atmosphere,composition:comp,gravity,temperatureC:temp,orbitAu:orbit,diameterEarth:diameter,moons,rings,biomes,radiation:8,gauss:.5,seed:BigInt.asIntN(64,W^BigInt(seed)).toString(),smesharia:true});
 const nbc=[
  p('nbc_3301_1','NCS-3301 1','NCS-3301 1','temperate','ocean','moderate',['N2:0.76','O2:0.22','AR:0.02'],.92,18,.85,1,0,false,['smesharia:crystallisplains'],0xE101),
  p('nbc_3301_2','NCS-3301 2','NCS-3301 2','temperate','ocean','moderate',['N2:0.74','O2:0.24','AR:0.02'],.95,16,.85,1,0,false,['smesharia:crystallisplains_2'],0xE102),
  p('nbc_3301_3','NCS-3301C-2','NCS-3301 3','gas_giant','gas_giant','thick',['H2:0.82','HE:0.14','CH4:0.04'],2.6,-120,2.2,9.2,6,false,['smesharia:crystallisplains'],0xE103),
  p('nbc_3301_4','NCS-3301 4','NCS-3301 4','cold_habitable','ice','thin',['N2:0.80','CH4:0.18','AR:0.02'],.72,-85,1.6,1,0,false,['smesharia:crystallisplains_2'],0xE104)];
 nbc[2].aliases=['Crystallis','NCS-3301C-2'];nbc[2].customMoons=['A','B','Crystallis','D','E','F'].map((name,i)=>({index:i,name,distanceKm:380000+i*90000,radiusKm:i===2?2700:800,gravity:i===2?.8:.15,tiltDeg:12+i*4,yawDeg:8-i*2,periodTicks:24000+i*900,phase:i/6,category:i===2?'cold_habitable':'distant',archetype:i===2?'ice':'forbidden',atmosphere:i===2?'minimal':'none',composition:i===2?['O2','H2O']:[],biomes:i===2?['smesharia:crystallisplains','smesharia:crystallisplains_2']:['enchanted_universe:cratered_regolithbasin'],temperatureC:i===2?-40:-120,radiation:4}));
 const fallen=(W&1n)!==0n,dvn=[
  p('dvn_03_1','DVN-03 1','DVN-03 1','hot','mars_like','thin',['CO2:0.90','N2:0.08','SO2:0.02'],.68,190,.55,1,0,false,['smesharia:fallen_plains'],0xE201),
  p('dvn_03_2','DVN-03 2','DVN-03 2','temperate','desert','moderate',['N2:0.74','O2:0.24','AR:0.02'],.82,26,.95,1,0,false,['smesharia:drevonid_plains'],0xE202),
  p('dvn_03_b','DVN-03 b',fallen?'Выжженный Древонид':'Древонид','habitable',fallen?'lava':'ocean','moderate',['N2:0.70','O2:0.24','CO2:0.05','AR:0.01'],.60,fallen?48:14,1.05,1,0,false,[fallen?'smesharia:fallen_plains':'smesharia:drevonid_plains'],0xE203),
  p('dvn_03_3','DVN-03 3','DVN-03 3','cold_habitable','ice','thin',['N2:0.86','CH4:0.12','AR:0.02'],.70,-75,2.1,1,0,false,['smesharia:fallen_plains'],0xE204),
  p('dvn_03_4','DVN-03 4','DVN-03 4','distant','airless','none',[],.35,-160,3.2,1,0,false,['smesharia:fallen_plains'],0xE205)];
 const systems=[
  {id:'enchanted_universe:system_nbc_3301',name:'NCS-3301',formalName:'NCS-3301',star:'white_yellow_dwarf',distanceLy:34,planets:nbc,smesharia:true},
  {id:'enchanted_universe:system_dvn_03',name:'DVN-03',formalName:'DVN-03',star:'red_dwarf',distanceLy:52,planets:dvn,smesharia:true},
  {id:'enchanted_universe:system_junglya',name:'Джунгля',formalName:'Junglya',star:'yellow_dwarf',distanceLy:47,planets:[p('junglya','Junglya','Джунгля','habitable','ocean','medium',['N2:0.72','O2:0.26','AR:0.02'],1,8,1.42,1.16,2,false,['smesharia:junglyaforest','smesharia:junglyariversandlakes'],0xE301)],smesharia:true},
  {id:'enchanted_universe:system_uranium',name:'Ураниум',formalName:'Uranium',star:'blue_giant',distanceLy:61,planets:[p('uranium_planet','Uranium','Ураниум','distant','radioactive','thin',['CO2:0.70','N2:0.20','AR:0.10'],.5,-90,1.8,.9,1,false,['smesharia:uraniumplains'],0xE401)],smesharia:true},
  {id:'enchanted_universe:system_centra_alphara',name:'Центра-Альфара',formalName:'Centra-Alphara',star:'yellow_dwarf',distanceLy:18,planets:[p('centra_alphara','Centra-Alphara','Центра-Альфара','habitable','ocean','moderate',['N2:0.71','O2:0.25','AR:0.04'],1,14,1,1,0,false,['smesharia:centraplains'],0xE501)],smesharia:true}];
 return systems;
}

function moonNameFor(parent, index) {
  const p = (parent || '').toLowerCase();
  if (p.includes('земля') || p.includes('earth')) return index === 0 ? 'Луна' : 'Луна ' + (index + 1);
  if (p.includes('марс') || p.includes('mars')) return index === 0 ? 'Фобос' : index === 1 ? 'Деймос' : 'Марс ' + (index + 1);
  if (p.includes('юпитер') || p.includes('jupiter')) return ['Ио','Европа','Ганимед','Каллисто'][index] || ('Юпитер ' + (index + 1));
  if (p.includes('сатурн') || p.includes('saturn')) return ['Мимас','Энцелад','Тефия','Рея','Титан'][index] || ('Сатурн ' + (index + 1));
  if (p.includes('уран') || p.includes('uranus')) return ['Миранда','Ариэль','Умбриэль','Титания','Оберон'][index] || ('Уран ' + (index + 1));
  if (p.includes('нептун') || p.includes('neptune')) return ['Тритон','Нереида','Протей','Ларисса','Галатея'][index] || ('Нептун ' + (index + 1));
  if (p.includes('плутон') || p.includes('pluto')) return ['Харон','Никта','Гидра','Кербер','Стикс'][index]||('Плутон '+(index+1));
  if(p.includes('хаумеа')||p.includes('haumea'))return ['Хииака','Намака'][index]||('Луна '+(index+1));
  if(p.includes('кваоар')||p.includes('quaoar'))return index===0?'Вейвот':('Луна '+(index+1));
  if(p.includes('макемаке')||p.includes('makemake'))return index===0?'MK 2':('Луна '+(index+1));
  if(p.includes('эрида')||p.includes('eris'))return index===0?'Дисномия':('Луна '+(index+1));
  return 'Луна ' + (index + 1);
}
// Климат луны — те же правила, что в MoonSpec.generate (мод Enchanted Universe):
// категория, архетип, атмосфера, состав, биомы и температура. Порядок важен.
function moonClimate(gas,hz,index,radiusKm,dRatio,seed=0n){
 const roll=Number((BigInt.asUintN(64,seed)>>41n)%5n);let c;
 if(gas&&hz&&radiusKm>2200&&index>0)c={category:'habitable',archetype:'ocean',atmosphere:'moderate',composition:['N2','O2','AR','H2O'],biomes:AQUARIA_BIOMES.slice(),temperatureC:14};
 else if(radiusKm<300)c={category:'distant',archetype:'asteroid',atmosphere:'none',composition:[],biomes:['cratered_regolithbasin'],temperatureC:-120};
 else if(dRatio<7.5)c={category:'very_hot',archetype:roll===0?'moon_volcanic':'sulfur',atmosphere:'thin',composition:['SO2','H2S','CO2'],biomes:['very_hot_regolithbasin','sulfur_regolithbasin'],temperatureC:120};
 else if(hz&&dRatio<14&&radiusKm>1200){const a=roll===0?'ocean':roll===1?'hycean':roll===2?'tundra':'rocky_thin',thin=a==='tundra';c={category:'habitable',archetype:a,atmosphere:thin?'thin':'moderate',composition:thin?['N2','CO2','AR']:['N2','O2','AR','H2O'],biomes:['ocean','hycean'].includes(a)?AQUARIA_BIOMES.slice():['greensproutsgroves','windy_forest'],temperatureC:thin?-18:16};}
 else if(hz&&dRatio<20&&radiusKm>700)c={category:'temperate',archetype:roll===0?'mars_like':'desert',atmosphere:'thin',composition:['CO2','N2','AR'],biomes:['oxidized_plains','desert_bare'],temperatureC:8};
 else if(radiusKm>3000&&!hz)c={category:'cold_habitable',archetype:'moon_titan',atmosphere:'thick',composition:['N2','CH4','H2'],biomes:['sulfur_regolithbasin','regolithbasin','cratered_regolithbasin','regolith_river'],temperatureC:-145};
 else if(dRatio>12&&dRatio<28){const a=roll===0?'cryovolcanic':roll===1?'ammonia':'ice';c={category:'cold_habitable',archetype:a,atmosphere:a==='ice'?'minimal':'thin',composition:a==='ammonia'?['NH3','N2','CH4']:['O2','H2O','N2'],biomes:['iced_regolithbasin','light_regolithbasin'],temperatureC:-110};}
 else c={category:'distant',archetype:roll===0?'dwarf_planet':'airless',atmosphere:'none',composition:[],biomes:['cratered_regolithbasin','regolithbasin'],temperatureC:-70};
 return c;
}

function realMoonPeriod(distanceKm, parentRadiusKm, planet) {
  const G = 6.674e-11;
  const rPlanet = Math.max(2e5, parentRadiusKm * 1000);
  const g = Math.max(0.05, Number(planet && planet.gravity != null ? planet.gravity : 1)) * 9.80665;
  const mass = Math.max(1e21, g * rPlanet * rPlanet / G);
  const a = Math.max(1e6, Number(distanceKm) * 1000);
  const seconds = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / (G * mass));
  const days = seconds / 86400;
  return Math.max(60, Math.round(days * 24000));
}

function moonSpecs(planet) {
  if (planet.customMoons) return planet.customMoons;
  const count = Math.max(0, planet.moons | 0);
  if (!count) return [];
  const parentSeed = BigInt(planet.seed);
  const radiusParent = Math.max(500, 6371 * planet.diameterEarth);
  const gas = radiusParent >= 20000;
  const gauss = Number(planet.gauss != null ? planet.gauss : 10);
  const hz = planet.orbitAu >= 0.66 && planet.orbitAu <= 1.5;
  const out = [];
  for (let i = 0; i < count; i++) {
    const seed = BigInt.asIntN(64, parentSeed ^ BigInt.asIntN(64, 0x9E3779B97F4A7C15n * BigInt(i + 1)));
    const u = BigInt.asUintN(64, seed);
    const dRatio = gas
      ? 5.5 + (Number((u >> 9n) & 0x3FFFn) / 16383) * 4
      : 30 + (Number((u >> 9n) & 0x3FFFn) / 16383) * 30;
    const radiusFactor = gas
      ? 0.004 + (Number((u >> 25n) & 0x7FFn) / 2047) * 0.036
      : 0.03 + (Number((u >> 25n) & 0x7FFn) / 2047) * 0.24;
    let radiusKm = Math.max(60, radiusParent * radiusFactor);
    let distanceKm = radiusParent * dRatio;
    let climate = moonClimate(gas,hz,i,radiusKm,dRatio,seed);const name=moonNameFor(planet.name,i);
    const facts=typeof window!=='undefined'?window.EUMoonFacts:require('./moon-facts.js');const fact=facts?.[name];if(fact){radiusKm=fact.radiusKm;distanceKm=fact.distanceKm;climate={...fact,biomes:fact.biomes.slice()};}
    if(!fact)climate.biomes=withLifelessRiver(climate.biomes.map(b=>b.includes(':')?b:'enchanted_universe:'+b),climate.composition);
    const shield = { none: 0, minimal: 0.25, thin: 0.65, moderate: 0.90, medium: 0.95, thick: 0.99 }[climate.atmosphere] || 0;
    const beltRatio=distanceKm/radiusParent;const belt=beltRatio>0&&beltRatio<=22?gauss*Math.pow(12/beltRatio,2)*5.5:0;
    const radiation = Math.max(name==='Титан'?42:0,Math.min(1000,Math.min(1000,belt*(1-shield))*(fact?.radiationFactor||1)));
    out.push({
      index: i, name, distanceKm, radiusKm,
      gravity: fact?.gravity??Math.max(0.01,0.08+(radiusKm/radiusParent)*2.2),
      tiltDeg: Number((u >> 7n) % 121n) - 60,
      yawDeg: Number((u >> 23n) % 91n) - 45,
      periodTicks: fact?Math.round(fact.periodDays*72000):22000+Math.abs(Number((u>>11n)%80000n)),
      phase:Math.fround(Number((u>>31n)&0xFFFFn)/65535),
      type: climate.category, category: climate.category, archetype: climate.archetype,
      atmosphere: climate.atmosphere, composition: climate.composition,
      biomes: climate.biomes.map(b => String(b).includes(':') ? b : 'enchanted_universe:' + b),
      temperatureC: Number.isFinite(planet.temperatureC)?planet.temperatureC:climate.temperatureC, radiation,
      // Реалистичный режим: период по Кеплеру вокруг своей планеты.
      // Масса планеты — из её гравитации и радиуса, полуось — distanceKm.
      periodTicksReal: realMoonPeriod(distanceKm, radiusParent, planet)
    });
  }
  return out;
}

function companionFor(r, formal, star) {
  if (r.nextFloat() >= 0.15) return null;
  const giants = ['white_giant','blue_giant','yellow_giant','red_giant','yellow_supergiant','red_supergiant'];
  const kind = giants.includes(star) ? 'giant_white_dwarf' : 'binary';
  let comp = star;
  if (kind === 'giant_white_dwarf') comp = 'white_dwarf';
  else if (r.nextFloat() >= 0.5) {
    const pool = ['red_dwarf','yellow_dwarf','white_yellow_dwarf','blue_dwarf','white_dwarf','red_giant','yellow_giant'];
    comp = pool[r.nextInt(pool.length)];
  }
  return { star: comp, name: formal + ' B', orbitAu: 0, kind };
}

function generateCatalog(worldSeed, options = {}) {
  const climate=!options.generationModel||options.generationModel==='ClassicClimateV1';
  worldSeed = BigInt.asIntN(64, BigInt(worldSeed));
  const systems=[solarSystem(worldSeed),...demos(worldSeed)];
  for(const p of systems[0].planets)p.archetype=archetypeFrom(p);
  const demoTypes=[['ocean','ocean','sulfur','rocky_thin','gas_giant','ocean'],['rocky_thin','hot_jupiter'],['airless'],['ocean','super_puff']];
  for(let i=1;i<systems.length;i++){systems[i].id='enchanted_universe:system_demo_'+['asterion','betelgeuse','singularity','rigel'][i-1];for(let j=0;j<systems[i].planets.length;j++)systems[i].planets[j].archetype=demoTypes[i-1][j];}
  systems[0].id='enchanted_universe:system_sol';
  const betel = systems.find(x => x.formalName === 'Betelgeuse');
  if (betel) betel.companion = { star: 'white_dwarf', name: 'Сиварха', orbitAu: 4.0, kind: 'giant_white_dwarf', real: true };
  if (options && options.smesharia) systems.push(...smeshariaSystems(worldSeed));
  const systemCount=climate?NEW_GALAXY.COUNT:96,starDeck=climate?NEW_GALAXY.deck(worldSeed,systemCount):[];
  for (let i = 0; i < systemCount; i++) {
    const systemSeed = mix(worldSeed, i);
    const r = new MinecraftRandom(systemSeed);
    const jitter=r.nextDouble(),distance=climate?NEW_GALAXY.distance(worldSeed,i,jitter):4+i*3.15+jitter*.8;
    const rolled=pickStar(r),star=climate?starDeck[i]:rolled;
    // Порядок как в Java SpaceGenerator.generate(): компаньон тянется ДО имён,
    // а его орбита — уже после планет. Иначе имена систем и планеты в системах
    // с компаньоном не совпадали бы с игрой.
    const companion = companionFor(r, '', star);
    const name = systemName(r);
    const formal = formalName(r);
    if (companion) companion.name = formal + ' B';
    let planetCount=1+r.nextInt(5);if(climate&&!NEW_GALAXY.planets(worldSeed,i))planetCount=0;
    const planets = [];
    let previousOrbit = 0;
    for (let p = 0; p < planetCount; p++) {
      const planet=createPlanet(r,i,p,formal,star,worldSeed,previousOrbit,climate,planetCount,systemSeed);
      planets.push(planet);
      previousOrbit = planet.orbitAu;
    }
    if (companion) companion.orbitAu = 1.5 + r.nextDouble() * 4.5;
    systems.push({ name, formalName: formal, star, companion, distanceLy: distance, planets, systemIndex:i,seed:String(systemSeed),id:'enchanted_universe:system_'+i });
  }
  // Магнитары в Java StarSystem получают префикс PSR- (нормализация старых имён).
  // Добавляем его и в веб-каталог, чтобы названия совпадали с игрой.
  for (const s of systems) {
    if (s.star !== 'magnetar') continue;
    if (!String(s.name).startsWith('PSR-')) s.name = 'PSR-' + s.name;
    if (!String(s.formalName).startsWith('PSR-')) s.formalName = 'PSR-' + s.formalName;
  }
  appendMysteryPlanet(systems, worldSeed);
  return { worldSeed: worldSeed.toString(), generationType:climate?'ClassicClimateV1':'Classic',generationModel:climate?'ClassicClimateV1':'Classic',systems };
}

/* ── Загадочная планета ───────────────────────────────────────────────────────
   Одна на мир с шансом 20 %, последняя в своей системе, орбита 1.0…2.5 а.е.
   Порядок вызовов RNG — КОНТРАКТ с Java SpaceGenerator.appendMysteryPlanet:
   меняешь здесь — меняй там, иначе карта мира и превью по сиду разойдутся. */
const MYSTERY_SALT = 0x4D595354;
function appendMysteryPlanet(systems, worldSeed) {
  const r = new MinecraftRandom(mix(worldSeed, MYSTERY_SALT));
  if (r.nextFloat() >= 0.20) return;
  const candidates = [];
  systems.forEach((s, idx) => {
    const path=String(s.id||'').split(':').pop();if(!path.startsWith('system_')||path.startsWith('system_demo'))return;
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
}


// Классы планет: [по-русски, по-английски]. Русские строки — канон (как в игре),
// английские подставляются, когда сайт переключён на en.
const CLASS_BASE = {
  terria: ['терра', 'terran'],
  ferria: ['феррия', 'ferrian'],
  carbonia: ['карбония', 'carbonian'],
  ammonia: ['аммиачная аквария', 'ammonia aquaria'],
  panthalassic: ['панталассическая аквария', 'panthalassic aquaria'],
  cryovolcanic: ['криовулканическая аквария', 'cryovolcanic aquaria'],
  pulsar: ['пульсарная терра', 'pulsar terran'],
  toroidal: ['тороидальная терра', 'toroidal terran'],
  gas_dwarf: ['газовый карлик', 'gas dwarf'],
  aquaria: ['аквария', 'aquaria'],
  ice: ['ледяная терра', 'icy terran'],
  neptune: ['нептун', 'neptune'],
  jupiter: ['юпитер', 'jovian'],
  chthonia: ['хтония', 'chthonian'],
  brown_dwarf: ['коричневый карлик', 'brown dwarf'],
  tidal: ['приливно-захваченная планета', 'tidally locked planet'],
  withered: ['вянущая терра', 'withered terran'],
  asteroid: ['астероид', 'asteroid']
};
const CLASS_TEMP = {
  very_hot: ['раскалённая', 'scorching'],
  hot: ['горячая', 'hot'],
  temperate: ['тёплая', 'warm'],
  habitable: ['умеренная', 'temperate'],
  cold_habitable: ['прохладная', 'cool'],
  distant: ['холодная', 'cold'],
  gas_giant: ['холодная', 'cold']
};
const CLASS_SIZE = {
  '': ['', ''],
  mini: ['мини-', 'mini-'],
  sub: ['суб-', 'sub-'],
  super: ['супер-', 'super-']
};

function siteLang() {
  return (typeof window !== 'undefined' && window.EUI18N) ? window.EUI18N.current() : 'ru';
}

function planetClass(p) {
  if (p && p.mystery) return '???';
  const i = siteLang() === 'en' ? 1 : 0;
  const archetype = String(p.archetype || '');
  let key='terria';
  const gas=p.category==='gas_giant';if(gas&&!['ice_giant','mini_neptune','gas_dwarf','brown_dwarf'].includes(archetype))key='jupiter';
  if(!gas&&['ferria','iron'].includes(archetype)) key = 'ferria';
  else if(!gas&&['carbonia','carbon'].includes(archetype)) key = 'carbonia';
  else if (archetype === 'ammonia') key = 'ammonia';
  else if (archetype === 'panthalassic') key = 'panthalassic';
  else if (archetype === 'hycean') key = isAquaria(p) ? 'aquaria' : 'terria';
  else if (archetype === 'cryovolcanic') key = 'cryovolcanic';
  else if (archetype === 'pulsar') key = 'pulsar';
  else if (archetype === 'toroidal') key = 'toroidal';
  else if (archetype === 'gas_dwarf') key = 'gas_dwarf';
  else if (archetype === 'aquaria') key = 'aquaria';
  else if(!gas&&archetype==='ocean') key = isAquaria(p) ? 'aquaria' : 'terria';
  else if(!gas&&['ice','snowball','moon_icy'].includes(archetype)) key = 'ice';
  else if (['neptune', 'ice_giant', 'mini_neptune'].includes(archetype)) key = 'neptune';
  else if (['jupiter', 'gas_giant', 'hot_jupiter', 'puffy', 'super_puff', 'helium_giant'].includes(archetype)) key = 'jupiter';
  else if (['chthonia', 'chthonian'].includes(archetype)) key = 'chthonia';
  else if (archetype === 'brown_dwarf') key = 'brown_dwarf';
  else if (archetype === 'tidal_eyeball') key = 'tidal';
  else if (archetype === 'withered') key = 'withered';
  else if (['asteroid', 'comet'].includes(archetype)) key = 'asteroid';
  const temp = (CLASS_TEMP[p.category] || ['', ''])[i];
  const d = Number(p.diameterEarth || 1);
  const size = CLASS_SIZE[d < 0.5 ? 'mini' : d < 0.8 ? 'sub' : d > 1.5 ? 'super' : ''][i];
  return (temp + ' ' + size + CLASS_BASE[key][i]).trim();
}

function starLuminosity(star) {
  return ({
    red_dwarf: 0.04, yellow_dwarf: 1.0, white_yellow_dwarf: 2.0, white_dwarf: 0.005,
    blue_dwarf: 5.0, white_giant: 40.0, blue_giant: 80.0, yellow_giant: 60.0,
    red_giant: 50.0, yellow_supergiant: 300.0, red_supergiant: 400.0,
    carbon_star: 25.0, brown_dwarf: 0.0001, magnetar: 0.000001
  })[star] || 1.0;
}

function starSpectral(star) {
  return ({
    red_dwarf:'M4V', yellow_dwarf:'G2V', white_yellow_dwarf:'F8V', white_dwarf:'DA2',
    blue_dwarf:'B8V', white_giant:'A2III', blue_giant:'O9III', yellow_giant:'G8III',
    red_giant:'K5III', yellow_supergiant:'G2I', red_supergiant:'M2I',
    carbon_star:'C5III', brown_dwarf:'T6V', magnetar:'NS'
  })[star] || '';
}

if (typeof module !== 'undefined') module.exports = { generateCatalog,gasRadius,pickGas,moonClimate,GAS_BANDS,GAS_COMPOSITION, JavaRandom,MinecraftRandom, moonSpecs, planetClass, starSpectral, starLuminosity, isWetBiome, biomeTag, isAquaria };
if (typeof window !== 'undefined') window.EUGenerator = { generateCatalog, moonSpecs, planetClass, starSpectral, starLuminosity, isWetBiome, biomeTag, isAquaria };
