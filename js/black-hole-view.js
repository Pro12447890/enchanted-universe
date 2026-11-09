/* Deterministic metadata parallel to mod BlackHolePhysics; positions are unchanged. */
(function(){'use strict';
 const RS=2.95325008;
 function profile(hole,worldSeed){
  const unit=window.EUOrbits?.unit||((x)=>{let h=2166136261>>>0;for(const c of String(x))h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0)/4294967296});
  const key=String(worldSeed)+':'+String(hole.id);
  const mass=Number(hole.massSolar)>0?Number(hole.massSolar):10**(4.5+4.5*unit(key+':mass'));
  const spin=Number.isFinite(Number(hole.spin))?Number(hole.spin):.05+.93*unit(key+':spin');
  const accretion=Number.isFinite(Number(hole.accretion))?Number(hole.accretion):.01+.49*unit(key+':accretion');
  const temperature=Number(hole.diskTemperatureK)>0?Number(hole.diskTemperatureK):2500+14500*Math.sqrt(accretion)*(1+.45*spin);
  let rgb=hole.diskRgb?('#'+String(hole.diskRgb).replace(/^#/,'')):(temperature<6500?'#ffb05f':temperature<11500?'#fff1c7':'#c4dfff');
  return{massSolar:mass,schwarzschildKm:Number(hole.schwarzschildKm)>0?Number(hole.schwarzschildKm):mass*RS,spin,accretion,diskTemperatureK:temperature,diskColor:rgb};
 }
 const api={RS_KM_PER_SOLAR_MASS:RS,profile};if(typeof window!=='undefined')window.EUBlackHole=api;if(typeof module!=='undefined')module.exports=api;
})();
