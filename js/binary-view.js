/* Circular two-body model shared with Java BinaryOrbitMath; display scaling is separate. */
(function(){'use strict';
 const TAU=2*Math.PI;
 const MASS={brown_dwarf:.055,white_dwarf:.6,magnetar:1.4,red_dwarf:.35,white_yellow_dwarf:1.3,blue_dwarf:2.2,red_giant:2,carbon_star:2,yellow_giant:3,white_giant:4,blue_giant:8,yellow_supergiant:12,red_supergiant:16};
 function phase(id){let h=0x811c9dc5;for(let i=0;i<String(id).length;i++)h=Math.imul(h^String(id).charCodeAt(i),0x01000193);return(h>>>0)/4294967296*TAU;}
 function mass(key){return MASS[key]||1;}
 function at(system,ticks,realistic){
  if(!system?.companion)return null;
  const m1=Number(system.massSolar)>0?Number(system.massSolar):mass(system.star);
  const m2=Number(system.companion.massSolar)>0?Number(system.companion.massSolar):mass(system.companion.star);
  const a=Math.max(.01,Number(system.companion.orbitAu)||1),total=m1+m2;
  const period=(realistic?8766000*a**1.5:TAU/.04*20*Math.sqrt(a))/Math.sqrt(total);
  const id=system.id||system.formalName||system.name||'';
  const angle=phase(id+'|binary')+TAU*((Number(ticks)||0)%period)/period;
  const inclination=(4+8*Math.sin(phase(id)))*Math.PI/180;
  const relative={x:Math.cos(angle)*a,y:Math.sin(angle)*Math.cos(inclination)*a*.86-Math.sin(angle)*Math.sin(inclination)*a*.55};
  return {m1,m2,separationAu:a,periodTicks:period,primary:{x:-relative.x*m2/total,y:-relative.y*m2/total},secondary:{x:relative.x*m1/total,y:relative.y*m1/total},inclination,angle};
 }
 const api={mass,phase,at};if(typeof window!=='undefined')window.EUBinary=api;if(typeof module!=='undefined')module.exports=api;
})();
