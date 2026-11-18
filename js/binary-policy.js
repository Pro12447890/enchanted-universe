/* Holman-Wiegert stability policy shared with BinaryOrbitPolicy.java. */
(function(){'use strict';
 const MASS={brown_dwarf:.055,white_dwarf:.6,magnetar:1.4,red_dwarf:.35,orange_dwarf:.7,white_yellow_dwarf:1.3,white_star:2,blue_dwarf:2.2,white_blue_dwarf:3.5,red_giant:2,carbon_star:2,yellow_giant:3,white_giant:4,blue_giant:8,yellow_supergiant:12,red_supergiant:16,white_supergiant:18,blue_supergiant:25};
 const mass=k=>MASS[k]||1,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function unit(text){let h=0x811c9dc5;for(let i=0;i<String(text).length;i++)h=Math.imul(h^String(text).charCodeAt(i),0x01000193);return(h>>>0)/4294967296;}
 function eccentricity(id){return .02+.43*unit(String(id||'')+'|binary-e-v2');}
 function sCritical(separation,eccentricity,hostMass,perturberMass){const total=Math.max(.001,hostMass+perturberMass),mu=perturberMass/total,e=clamp(eccentricity,0,.8),fit=.464-.380*mu-.631*e+.586*mu*e+.150*e*e-.198*mu*e*e;return Math.max(.04,separation*Math.max(.04,fit));}
 function pCritical(separation,eccentricity,m1,m2){const total=Math.max(.001,m1+m2),mu=Math.min(m1,m2)/total,e=clamp(eccentricity,0,.8),fit=1.60+5.10*e-2.22*e*e+4.12*mu-4.27*e*mu-5.09*mu*mu+4.61*e*e*mu*mu;return separation*Math.max(1.6,fit);}
 const safeS=(a,e,m,p)=>.82*sCritical(a,e,m,p),safeP=(a,e,m1,m2)=>1.18*pCritical(a,e,m1,m2),comparable=(m1,m2)=>Math.min(m1,m2)/Math.max(m1,m2)>=.35;
 function host(system,index,planet){if(!system?.companion||system.generationModel!=='ClassicClimateV2')return'primary';const m1=mass(system.star),m2=mass(system.companion.star),e=eccentricity(system.id),p=safeP(system.companion.orbitAu,e,m1,m2);if(Number(planet.orbitAu)>=p-1e-8)return'barycenter';return comparable(m1,m2)&&(index&1)?'secondary':'primary';}
 function effectiveLuminosity(host,orbit,separation,l1,l2){const a=Math.max(.01,orbit),binary=Math.max(.05,separation);return host==='primary'?l1+l2*a*a/(binary*binary):host==='secondary'?l2+l1*a*a/(binary*binary):l1+l2;}
 const api={mass,eccentricity,sCritical,pCritical,safeS,safeP,comparable,host,effectiveLuminosity};if(typeof window!=='undefined')window.EUBinaryPolicy=api;if(typeof module!=='undefined')module.exports=api;
})();
