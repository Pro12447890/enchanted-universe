/* Shared NEW-catalog policy, ported line-for-line from GenerationPolicy.java. */
(function(){'use strict';
 const MODEL='climate-20261111-v1';
 const pools=globalThis.EUGenerationPools||(typeof module!=='undefined'?require('./generation-pools.js'):null);
 const {ALIEN,COLD_LAND,NORMAL_LAND,WARM_LAND,DRY,COLD_WATER,NORMAL_WATER,WARM_WATER}=pools;
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function unit(text){let h=0x811c9dc5;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),0x01000193);return(h>>>0)/4294967296;}
 const u=(seed,salt)=>unit(String(seed)+'|'+MODEL+'|'+salt);
 const normalizedOrbit=(orbit,luminosity)=>orbit/Math.sqrt(Math.max(.01,luminosity));
 function snowFraction(category,orbit,luminosity){const x=normalizedOrbit(orbit,luminosity);return category==='habitable'?.75*clamp((x-.66)/.84,0,1):['cold_habitable','distant'].includes(category)?.75:0;}
 const wet=id=>/ocean|river|lake|estuary|shelf|inland_sea|archipelago_sea|frozen_basin|frozen_archipelago/.test(id);
 const snow=id=>id.includes('snow')||id.includes('frozen')||id.includes('icy')||id.includes('iced')||id.includes('ice_spikes')||id.endsWith(':grove')||id.endsWith('_grove')&&!id.endsWith('cherry_grove')||id.includes('jagged_peaks');
 function living(id){if(/bare_|lifeless_|regolith|icy|iced|oxidized|desert|badlands|peaks|ice_spikes/.test(id))return false;return /forest|grove|sprout|jungle|plains|taiga|meadow|swamp|savanna/.test(id)||wet(id);}
 function barren(id){if(id.startsWith('minecraft:'))return 'enchanted_universe:bare_'+id.slice(10);if(id.startsWith('enchanted_universe:snowy_'))return 'enchanted_universe:bare_'+id.slice(19);return id;}
 function choose(out,pool,count,seed,salt,weight){const candidates=[...new Set(pool)].filter(id=>!out.includes(id));const score=id=>-Math.log(Math.max(1e-10,u(seed,salt+'|'+id)))/Math.max(.001,weight(id));candidates.sort((a,b)=>score(a)-score(b)||(a<b?-1:a>b?1:0));for(const id of candidates){if(count--<=0)break;out.push(id);}}
 const underlying=id=>id.startsWith('enchanted_universe:bare_')?'minecraft:'+id.slice('enchanted_universe:bare_'.length):id;
 function thermalWeight(id,cold){const base=underlying(id);if(WARM_LAND.includes(base)||WARM_WATER.includes(base))return .75-.70*cold;if(base.includes('taiga')||base.includes('cold_ocean'))return .05+.70*cold;return .20;}
 function biomes(seed,category,atmosphere,orbit,luminosity,old){
  if(category==='gas_giant')return [];
  if(old.length===1&&old[0]==='enchanted_universe:night_forest')return ['enchanted_universe:night_forest','minecraft:river'];
  const alive=atmosphere!=='none'&&old.some(living),count=2+Math.floor(u(seed,'biome-count')*19),snowCount=Math.floor(count*snowFraction(category,orbit,luminosity)+.5),cold=clamp((normalizedOrbit(orbit,luminosity)-.66)/.84,0,1),wetShare=old.length?old.filter(wet).length/old.length:0;let waterCount=Math.min(count,Math.floor(count*wetShare+.5));if(category==='distant')waterCount=Math.min(waterCount,snowCount);let snowWater=Math.min(waterCount,Math.floor(snowCount*wetShare+.5)),snowLand=snowCount-snowWater;if(category==='distant'){snowWater=waterCount;snowLand=snowCount-snowWater;}
  const result=[],iceLand=[],iceWater=[];
  for(const id of COLD_LAND){iceLand.push(barren(id));if(alive)iceLand.push(id);}
  for(const id of ['minecraft:frozen_ocean','minecraft:deep_frozen_ocean','minecraft:frozen_river']){iceWater.push(barren(id));if(alive)iceWater.push(id);}
  for(const id of ['enchanted_universe:frozen_lake','enchanted_universe:frozen_deep_lake','enchanted_universe:frozen_estuary','enchanted_universe:frozen_basin','enchanted_universe:frozen_shelf','enchanted_universe:frozen_archipelago'])iceWater.push(alive?id:id.replace('enchanted_universe:','enchanted_universe:bare_'));
  choose(result,iceLand,snowLand,seed,'snow-land',id=>alive?(living(id)?1.5:1):1);
  choose(result,iceWater,snowWater,seed,'snow-water',()=>1);
  if(result.length<snowCount)choose(result,iceLand,snowCount-result.length,seed,'snow-fill',()=>1);
  const alien=alive?Math.min(count-result.length,Math.floor(u(seed,'alien-count')*Math.min(4,count))):0;choose(result,ALIEN,alien,seed,'alien',()=>1);
  let waters=[];const land=[];
  for(const list of [NORMAL_WATER,WARM_WATER,COLD_WATER])for(const id of list)if(!snow(id))waters.push(alive?id:barren(id));
  for(const id of ['enchanted_universe:lake','enchanted_universe:deep_lake','enchanted_universe:estuary','enchanted_universe:shelf_sea','enchanted_universe:inland_sea','enchanted_universe:archipelago_sea'])waters.push(alive?id:id.replace('enchanted_universe:','enchanted_universe:bare_'));
  if(category==='distant')waters=[...iceWater];
  choose(result,waters,Math.min(count-result.length,Math.max(0,waterCount-result.filter(wet).length)),seed,'water',id=>thermalWeight(id,cold));
  if(alive){for(const list of [NORMAL_LAND,WARM_LAND])for(const id of list)if(!snow(id))land.push(id);}
  else {land.push(...DRY);for(const id of ['desert','badlands','eroded_badlands','stony_shore','windswept_hills','beach','savanna','savanna_plateau'])land.push(barren('minecraft:'+id));}
  for(const id of old)if(!wet(id)&&!snow(id)&&!id.includes('night_forest'))land.push(!alive?barren(id):id);
  choose(result,land,count-result.length,seed,'land',id=>thermalWeight(id,cold));
  if(result.length<count)choose(result,DRY,count-result.length,seed,'fallback',()=>1);
  return result.slice(0,count);
 }
 function moons(seed,oldCount,gas,orbit,luminosity){if(u(seed,'moon-upgrade')>=.30)return oldCount;const x=normalizedOrbit(orbit,luminosity),r=u(seed,'moon-presence'),n=u(seed,'moon-number');if(x<.66){const t=clamp((x-.20)/.46,0,1);if(r>=.50+.05*t)return 0;return t<.5?(n<.25?2:1):(n<.15?3:n<.4?2:1);}if(x<=1.7){if(gas){if(r<.15)return 0;return 1+Math.min(9,Math.floor(Math.sqrt(n)*10));}if(r<.28)return 0;return 1+Math.min(4,Math.floor(Math.sqrt(n)*5));}if(r<(gas?.08:.18))return 0;return gas?3+Math.min(9,Math.floor(Math.sqrt(n)*10)):1+Math.min(6,Math.floor(Math.sqrt(n)*7));}
 const api={MODEL,unit,normalizedOrbit,snowFraction,wet,snow,living,barren,biomes,moons};if(typeof window!=='undefined')window.EUGenerationPolicy=api;if(typeof module!=='undefined')module.exports=api;
})();
