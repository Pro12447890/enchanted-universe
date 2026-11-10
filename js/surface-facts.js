/* Read-only surface metadata. Catalog seeds, biome lists and world generation stay untouched. */
(function(){'use strict';
 const key=id=>String(id||'').includes(':')?String(id):'enchanted_universe:'+id;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const categories={very_hot:['Раскалённая','Scorching'],hot:['Горячая','Hot'],temperate:['Тёплая','Warm'],habitable:['Умеренная','Temperate'],cold_habitable:['Прохладная','Cool'],distant:['Холодная','Cold'],gas_giant:['Газовый гигант','Gas giant']};
 function material(id){const k=key(id),db=globalThis.EUBiomeMaterials?.biomes||{};return db[k]||{color:[125,120,112],canopy:[102,121,82],water:[63,118,228],vegetation:false,wet:/ocean|river/.test(k),ice:/iced|ice_spikes|frozen|snow/.test(k),block:null};}
 function life(p){
  if(!p||p.mystery||(p.category||p.type)==='gas_giant')return false;
  if(typeof p.life==='boolean')return p.life;
  return (p.biomes||[]).some(id=>{const k=key(id).split(':')[1];if(k==='regolith_river'||/regolith|icy|iced|frozen|ice_spikes|oxidized|desert|badlands/.test(k))return false;return material(id).vegetation||/forest|grove|sprout|jungle|mushroom|meadow|plains|swamp|savanna|garden|ocean|river/.test(k);});
 }
 function fluid(p){
  const t=Number(p.temperatureC),a=p.archetype||'',composition=(p.composition||[]).join(',').toUpperCase();
  const explicit=String(p.surfaceFluid||p.liquid||'').toLowerCase();
  if(explicit)for(const f of ['methane','ammonia','sulfur','lava','water'])if(explicit.includes(f))return f;
  // Same ordered temperature windows as SpaceFluids.surfaceFluid in the mod.
  if(t>=-200&&t<=-100)return 'methane';
  if(t>-100&&t<=-25)return 'ammonia';
  if(t>=0&&t<=100)return 'water';
  if(t>=100&&t<=450&&(/sulfur|lava|moon_volcanic/.test(a)||/SO2|H2S/.test(composition)))return 'sulfur';
  return null;
 }
 function climate(p){
  const category=p.category||p.type,orb=Number(p.orbitAu),lum=Number(p.hostLuminosity)||1;
  const normalized=Number.isFinite(p.distanceMark)&&p.distanceMark>0?p.distanceMark:orb/Math.sqrt(Math.max(.01,lum));
  let cold=category==='habitable'?clamp((normalized-.66)/.84,0,1):category==='temperate'?0:category==='cold_habitable'?1:0;
  if(!Number.isFinite(cold))cold=clamp((30-Number(p.temperatureC))/60,0,1);
  // Moons inherit the host orbit, not their distance from their parent in kilometres.
  let snow=category==='habitable'?.60*cold:category==='cold_habitable'?.62:0;
  const ice=(p.biomes||[]).filter(id=>material(id).ice).length/Math.max(1,(p.biomes||[]).length);
  if(category!=='habitable'&&ice>0)snow=Math.max(snow,Math.min(.86,.3+.5*ice));
  if(Number(p.temperatureC)>60)snow=0;
  return {cold,snow,normalized};
 }
 const api={key,material,life,fluid,climate,categories};if(typeof window!=='undefined')window.EUSurfaceFacts=api;if(typeof module!=='undefined')module.exports=api;
})();
