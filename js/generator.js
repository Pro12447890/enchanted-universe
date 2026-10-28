'use strict';
// Порт SpaceGenerator/NameGenerator/PlanetArchetype из мода Enchanted Universe.
// Один и тот же сид даёт тот же каталог, что и в игре.

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
  nextDouble() { return Math.fround((((this.next(26) * 134217728) + this.next(27)) / 9007199254740992)); }
  nextLong() { const hi = this.next(32) | 0; const lo = this.next(32) | 0; return BigInt.asIntN(64, (BigInt(hi) << 32n) + BigInt(lo)); }
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
  carbon_star: 25.0, brown_dwarf: 0.01, magnetar: 0.001
};
const STAR_COLOR = {
  red_dwarf: '#ff6a4a', yellow_dwarf: '#ffe6b0', white_yellow_dwarf: '#fff4d6', white_dwarf: '#e8f0ff',
  blue_dwarf: '#9fc8ff', white_giant: '#f2f6ff', blue_giant: '#9fc0ff', yellow_giant: '#ffd98a',
  red_giant: '#ff7a4a', yellow_supergiant: '#ffd070', red_supergiant: '#ff6040',
  carbon_star: '#ff8844', brown_dwarf: '#8a3a2a', magnetar: '#bfe0ff'
};

const CATEGORIES = {
  very_hot: [0.25, 0.45, false], hot: [0.45, 0.66, false], temperate: [0.66, 1.00, false],
  habitable: [0.66, 1.50, false], cold_habitable: [1.50, 1.70, false],
  distant: [1.80, 2.50, false], gas_giant: [1.20, 2.50, true]
};

const ARCH = {
  very_hot: ['lava','airless','sulfur','iron','ultrahot','cryovolcanic','pulsar'],
  hot: ['mars_like','desert','airless','iron','rocky_thin','chthonian','toroidal'],
  temperate: ['desert','tundra','rocky_thin','ocean','carbon','sulfur','ammonia'],
  habitable: ['ocean','tidal_eyeball','hycean','snowball','circumbinary','desert','rocky_thin','panthalassic'],
  cold_habitable: ['snowball','tundra','ice','ocean','ammonia','cryovolcanic','panthalassic'],
  distant: ['ice','dwarf_planet','airless','carbon','moon_icy','cryovolcanic','toroidal'],
  gas_giant: ['gas_giant','ice_giant','hot_jupiter','puffy','super_puff','helium_giant','brown_dwarf','gas_dwarf']
};

const AEROSOL_BY_ARCH = {
  mars_like:'dust', desert:'dust', super_earth:'dust',
  sulfur:'sulfur', moon_volcanic:'sulfur',
  carbon:'smoke', rogue:'smoke', evaporating:'smoke'
};

const GASES = ['H2','HE','CH4','NH3','H2O','CO2','CO','O2','N2','AR','NE','SO2','H2S','HCL','HF','CL2','F2','BR2','I2','FE','O3','NO','NO2','N2O','C2H6','C3H8','C2H2','C2H4','C6H6','CH3OH','C2H5OH','HCN','NH2OH','PH3','PCL3','SIH4','SIF4','SF6','CF4','CCL4','BF3','B2H6','HBR','HI','KR','XE','RN','COS','CS2','OCS','N2H4','CLO2','H2O2'];
const AQUARIA_BIOMES = [
  'minecraft:ocean','minecraft:deep_ocean','minecraft:warm_ocean','minecraft:lukewarm_ocean',
  'minecraft:deep_lukewarm_ocean','minecraft:cold_ocean','minecraft:deep_cold_ocean',
  'minecraft:frozen_ocean','minecraft:deep_frozen_ocean','minecraft:river','minecraft:frozen_river',
  'minecraft:jungle','minecraft:sparse_jungle','minecraft:bamboo_jungle','minecraft:plains','minecraft:sunflower_plains'
];
const COLOR_GASES = ['SO2','H2S','NO2','CL2','F2','I2','HI','BR2','O3','CH4','NH3','C6H6','CLO2','FE','HCN','SIH4','CS2','COS','OCS','HBR'];

const HOT_BIOMES = ['very_hot_regolithbasin','hot_regolithbasin','light_regolithbasin','cratered_regolithbasin','yellow_regolithbasin','beige_regolithbasin','burgundy_regolithbasin','pale_beige_regolithbasin','ochre_regolithbasin','sulfur_regolithbasin','enchanted_universe:desert_bare','enchanted_universe:badlands_bare','minecraft:savanna'];
const TEMPERATE_BIOMES = ['brown_regolithbasin','regolithbasin','cratered_regolithbasin','light_regolithbasin','enchanted_universe:desert_bare','enchanted_universe:badlands_bare','minecraft:plains','minecraft:sunflower_plains','minecraft:flower_forest','minecraft:cherry_grove','minecraft:meadow','minecraft:beach','minecraft:savanna','minecraft:savanna_plateau','minecraft:stony_shore','minecraft:windswept_hills','minecraft:windswept_forest'];
const HABITABLE_BIOMES = ['ashy_forest','scarlet_forest','scarlet_plains','golden_groves','windy_forest','windy_plains','greensproutsgroves','dense_mushroom_groves','night_forest','minecraft:plains','minecraft:forest','minecraft:flower_forest','minecraft:birch_forest','minecraft:dark_forest','minecraft:cherry_grove','minecraft:meadow','minecraft:jungle','minecraft:sparse_jungle','minecraft:bamboo_jungle','minecraft:savanna','minecraft:sunflower_plains','minecraft:mushroom_fields','minecraft:beach','minecraft:mangrove_swamp','minecraft:swamp','minecraft:pale_garden','minecraft:windswept_forest','minecraft:windswept_hills'];
const COLD_BIOMES = ['icy_groves','minecraft:snowy_plains','minecraft:snowy_taiga','minecraft:frozen_peaks','minecraft:ice_spikes','minecraft:taiga','minecraft:old_growth_pine_taiga','minecraft:old_growth_spruce_taiga','minecraft:snowy_beach','minecraft:frozen_river','minecraft:grove','minecraft:snowy_slopes','minecraft:jagged_peaks'];
const DRY_BIOMES = ['regolithbasin','stone_regolith','cratered_regolithbasin','brown_regolithbasin','beige_regolithbasin','burgundy_regolithbasin','pale_beige_regolithbasin','ochre_regolithbasin','sulfur_regolithbasin','enchanted_universe:desert_bare','enchanted_universe:badlands_bare','minecraft:windswept_savanna','minecraft:beach'];

function pickCategory(r, index) {
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
  return base + (1 - Math.min(2.5, orbit)) * 35 + (STAR[star] - 1) * 2;
}
function shuffle(list, r) {
  for (let i = list.length; i > 1; i--) { const j = r.nextInt(i); const t = list[i - 1]; list[i - 1] = list[j]; list[j] = t; }
}
function biomes(r, category, atmosphere, archetype) {
  if (category === 'gas_giant') return [];
  if (['gas_giant','ice_giant','hot_jupiter'].includes(archetype)) return [];
  let pool;
  if (archetype === 'panthalassic') return AQUARIA_BIOMES.slice();
  if (archetype === 'ammonia') pool = COLD_BIOMES;
  else if (archetype === 'ocean' || archetype === 'hycean') pool = HABITABLE_BIOMES;
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
  return selected.map(id => id.includes(':') ? id : 'enchanted_universe:' + id);
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

function createPlanet(r, systemIndex, index, formal, star, worldSeed) {
  const category = pickCategory(r, index);
  let orbit = CATEGORIES[category][0] + r.nextDouble() * (CATEGORIES[category][1] - CATEGORIES[category][0]);
  orbit *= Math.sqrt(Math.max(0.01, STAR[star]));
  const diameter = 0.2 + r.nextDouble() * 3.8;
  const gravity = clamp(diameter * (0.55 + r.nextDouble() * 0.65), 0.20, 4.0);
  const temperature = temperatureFor(category, orbit, star);
  const atmosphere = pickAtmosphere(r, category);
  const archetype = ARCH[category][r.nextInt(ARCH[category].length)];
  const aerosol = AEROSOL_BY_ARCH[archetype] || 'none';
  const comp = composition(r, atmosphere, category);
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


function moonNameFor(parent, index) {
  const p = (parent || '').toLowerCase();
  if (p.includes('земля') || p.includes('earth')) return index === 0 ? 'Луна' : 'Луна ' + (index + 1);
  if (p.includes('марс') || p.includes('mars')) return index === 0 ? 'Фобос' : index === 1 ? 'Деймос' : 'Марс ' + (index + 1);
  if (p.includes('юпитер') || p.includes('jupiter')) return ['Ио','Европа','Ганимед','Каллисто'][index] || ('Юпитер ' + (index + 1));
  if (p.includes('сатурн') || p.includes('saturn')) return ['Мимас','Энцелад','Тефия','Рея','Титан'][index] || ('Сатурн ' + (index + 1));
  if (p.includes('уран') || p.includes('uranus')) return ['Миранда','Ариэль','Умбриэль','Титания','Оберон'][index] || ('Уран ' + (index + 1));
  if (p.includes('нептун') || p.includes('neptune')) return ['Тритон','Нереида'][index] || ('Нептун ' + (index + 1));
  if (p.includes('плутон') || p.includes('pluto')) return index === 0 ? 'Харон' : 'Плутон ' + (index + 1);
  return 'Луна ' + (index + 1);
}
// Климат луны — те же правила, что в MoonSpec.generate (мод Enchanted Universe):
// категория, архетип, атмосфера, состав, биомы и температура. Порядок важен.
function moonClimate(gas, hz, index, radiusKm, dRatio) {
  if (gas && hz && radiusKm > 2200 && index > 0) return {
    category: 'habitable', archetype: 'ocean', atmosphere: 'moderate',
    composition: ['N2', 'O2', 'AR', 'H2O'],
    biomes: AQUARIA_BIOMES, temperatureC: 14
  };
  if (dRatio < 7.5) return {
    category: 'very_hot', archetype: 'sulfur', atmosphere: 'thin',
    composition: ['SO2', 'H2S', 'CO2'],
    biomes: ['very_hot_regolithbasin', 'sulfur_regolithbasin'], temperatureC: 120
  };
  if (radiusKm > 2400 && !hz) return {
    category: 'cold_habitable', archetype: 'moon_titan', atmosphere: 'thick',
    composition: ['N2', 'CH4', 'H2'],
    biomes: ['dense_mushroom_groves'], temperatureC: -145
  };
  if (dRatio > 12 && dRatio < 28) return {
    category: 'cold_habitable', archetype: 'ice', atmosphere: 'minimal',
    composition: ['O2', 'H2O'],
    biomes: ['icy_groves', 'iced_regolithbasin'], temperatureC: -110
  };
  return {
    category: 'distant', archetype: 'airless', atmosphere: 'none',
    composition: [], biomes: ['cratered_regolithbasin'], temperatureC: -70
  };
}

function moonSpecs(planet) {
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
    const radiusKm = Math.max(60, radiusParent * radiusFactor);
    const climate = moonClimate(gas, hz, i, radiusKm, dRatio);
    const shield = { none: 0, minimal: 0.25, thin: 0.65, moderate: 0.90, medium: 0.95, thick: 0.99 }[climate.atmosphere] || 0;
    const belt = dRatio > 0 && dRatio <= 22 ? gauss * Math.pow(12 / dRatio, 2) * 5.5 : 0;
    const radiation = Math.max(0, Math.min(1000, belt * (1 - shield)));
    out.push({
      index: i, name: moonNameFor(planet.name, i), distanceKm: radiusParent * dRatio, radiusKm,
      gravity: Math.max(0.20, 0.08 + (radiusKm / radiusParent) * 2.2),
      tiltDeg: Number((u >> 7n) % 121n) - 60,
      yawDeg: Number((u >> 23n) % 91n) - 45,
      periodTicks: 22000 + Math.abs(Number((u >> 11n) % 80000n)),
      phase: Number((u >> 31n) & 0xFFFFn) / 65535,
      type: climate.category, category: climate.category, archetype: climate.archetype,
      atmosphere: climate.atmosphere, composition: climate.composition,
      biomes: climate.biomes.map(b => String(b).includes(':') ? b : 'enchanted_universe:' + b),
      temperatureC: climate.temperatureC, radiation
    });
  }
  return out;
}

function generateCatalog(worldSeed) {
  worldSeed = BigInt.asIntN(64, BigInt(worldSeed));
  const systems = [solarSystem(worldSeed), ...demos(worldSeed)];
  for (let i = 0; i < 96; i++) {
    const systemSeed = mix(worldSeed, i);
    const r = new JavaRandom(systemSeed);
    const distance = 4.0 + i * 3.15 + r.nextDouble() * 0.8;
    const star = pickStar(r);
    const name = systemName(r);
    const formal = formalName(r);
    const planetCount = 1 + r.nextInt(5);
    const planets = [];
    for (let p = 0; p < planetCount; p++) planets.push(createPlanet(r, i, p, formal, star, worldSeed));
    systems.push({ name, formalName: formal, star, distanceLy: distance, planets, systemIndex: i, id: 'system_' + i });
  }
  return { worldSeed: worldSeed.toString(), systems };
}


function planetClass(p) {
  const archetype = String(p.archetype || '');
  let base = 'терра';
  if (['ferria','iron'].includes(archetype)) base = 'феррия';
  else if (['carbonia','carbon'].includes(archetype)) base = 'карбония';
  else if (['aquaria','ocean','hycean','ice','snowball','moon_icy','panthalassic','ammonia','cryovolcanic'].includes(archetype)) base = 'аквария';
  else if (['neptune','ice_giant','mini_neptune','gas_dwarf'].includes(archetype)) base = 'нептун';
  else if (['jupiter','gas_giant','hot_jupiter','puffy','super_puff','helium_giant'].includes(archetype)) base = 'юпитер';
  else if (['chthonia','chthonian'].includes(archetype)) base = 'хтония';
  else if (archetype === 'brown_dwarf') base = 'коричневый карлик';
  else if (archetype === 'tidal_eyeball') base = 'приливно-захваченная планета';
  else if (['asteroid','comet'].includes(archetype)) base = 'астероид';
  const temp = ({
    very_hot:'раскалённая', hot:'горячая', temperate:'тёплая', habitable:'умеренная',
    cold_habitable:'прохладная', distant:'холодная', gas_giant:'холодная'
  })[p.category] || '';
  const d = Number(p.diameterEarth || 1);
  const size = d < 0.5 ? 'мини-' : d < 0.8 ? 'суб-' : d > 1.5 ? 'супер-' : '';
  return (temp + ' ' + size + base).trim();
}

function starSpectral(star) {
  return ({
    red_dwarf:'M4V', yellow_dwarf:'G2V', white_yellow_dwarf:'F8V', white_dwarf:'DA2',
    blue_dwarf:'B8V', white_giant:'A2III', blue_giant:'O9III', yellow_giant:'G8III',
    red_giant:'K5III', yellow_supergiant:'G2I', red_supergiant:'M2I',
    carbon_star:'C5III', brown_dwarf:'T6V', magnetar:'NS'
  })[star] || '';
}

if (typeof module !== 'undefined') module.exports = { generateCatalog, JavaRandom, moonSpecs, planetClass, starSpectral };
if (typeof window !== 'undefined') window.EUGenerator = { generateCatalog, moonSpecs, planetClass, starSpectral };
