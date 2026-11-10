/* One catalog index, no textures or second generator. Positions are uncompressed ly. */
(function(){'use strict';
 const AU_LY=1/63241.07708427,KM_LY=1/9460730472580.8;
 const text=v=>String(v??'').toLocaleLowerCase().replace(/ё/g,'е');
 const finite=v=>typeof v==='number'&&Number.isFinite(v);
 const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
 const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
 function esi(p){
  if(!finite(p.temperatureC)||!finite(p.gravity)||!finite(p.diameterEarth)||p.category==='gas_giant')return null;
  const R=Math.max(.05,p.diameterEarth),g=Math.max(.05,p.gravity),values=[R,g/R,Math.sqrt(g*R),Math.max(1,p.temperatureC+273.15)],targets=[1,1,1,288.15],weights=[.57,1.07,.70,5.58];
  let n=1;values.forEach((x,i)=>n*=Math.max(1e-6,1-Math.abs((x-targets[i])/(x+targets[i])))**(weights[i]/4));
  return Math.max(0,Math.min(1,n*({none:.55,minimal:.72,thin:.86,moderate:1,medium:1,thick:.93}[p.atmosphere]??.86)*Math.max(.6,Math.min(1,1-(p.radiation||0)/400))));
 }
 function habitable(p){
  if(p.mystery||!['moderate','medium'].includes(p.atmosphere))return false;
  const parts=(p.composition||[]).filter(Boolean),explicit=parts.some(v=>v.includes(':'));let total=0,oxygen=0;
  for(const raw of parts){const [gas,value]=raw.split(':'),amount=explicit&&value!==undefined?Math.max(0,Number(value)||0):1/parts.length;total+=amount;if(gas.trim().toUpperCase()==='O2')oxygen+=amount;}
  return total>0&&oxygen/total>=.10;
 }
 function index(catalog,adapter){
  const entries=[],byKey=new Map();
  const put=e=>{e.name=String(e.name||e.key);e.biomes=e.biomes||[];e.gases=e.gases||[];e.search=text([e.name,e.id,e.designation,e.system?.name,e.star,e.category,e.archetype,...e.biomes,...e.gases,...(e.aliases||[]),adapter.name?.(e.name)].join(' '));entries.push(e);byKey.set(e.key,e);return e};
  for(const [si,s] of catalog.systems.entries()){
   const common={system:s,si,sm:!!s.smesharia,id:s.id};
   put({...common,key:'system:'+si,kind:'system',name:s.name,star:s.star,moons:s.planets.reduce((n,p)=>n+(p.moons||0),0),planets:s.planets.length});
   for(const kind of ['star','companion']){
    if(kind==='companion'&&!s.companion)continue;const key=kind==='star'?s.star:s.companion.star,d=adapter.star(key);
    put({...common,key:kind+':'+si,kind,name:kind==='star'?s.name:s.companion.name,star:key,temperatureK:d.t,luminosity:d.lum,mass:kind==='star'?(s.massSolar||adapter.mass(key)):(s.companion.massSolar||adapter.mass(key))});
   }
   for(const [pi,p] of s.planets.entries()){
    const body={...common,pi,planet:p,category:p.category,archetype:p.archetype,atmosphere:p.atmosphere,temperatureC:p.mystery?null:p.temperatureC,gravity:p.mystery?null:p.gravity,radiation:p.mystery?null:p.radiation,field:p.mystery?null:(p.gauss??p.magneticGauss),diameter:p.diameterEarth,radiusKm:p.diameterEarth*6371,moons:p.moons,rings:!!p.rings,land:p.category!=='gas_giant'&&!p.mystery&&!['forbidden','brown_dwarf'].includes(p.archetype),biomes:p.biomes,gases:(p.composition||[]).map(x=>x.split(':')[0].trim().toUpperCase()),esi:p.mystery?null:esi(p),habitable:habitable(p)};
    put({...body,key:`planet:${si}:${pi}`,kind:'planet',name:p.name,designation:p.designation,id:p.id,aliases:p.aliases,star:s.star});
    for(const m of adapter.moons(p)){
     const cat=m.category||m.type,diameter=2*m.radiusKm/12742,mp={...m,category:cat,diameterEarth:diameter};
     put({...common,pi,planet:p,moon:m,key:`moon:${si}:${pi}:${m.index}`,kind:'moon',name:m.name,star:s.star,category:cat,archetype:m.archetype,temperatureC:m.temperatureC,gravity:m.gravity,radiation:m.radiation,diameter,radiusKm:m.radiusKm,atmosphere:m.atmosphere,biomes:m.biomes,gases:(m.composition||[]).map(x=>x.split(':')[0].trim().toUpperCase()),rings:false,land:cat!=='gas_giant'&&m.archetype!=='forbidden',habitable:habitable(m),esi:esi(mp)});
    }
   }
  }
  for(const [hi,h] of adapter.holes().entries()){
   const d=adapter.holeProfile(h,catalog.worldSeed);put({key:'hole:'+h.id,id:h.id,name:h.name||`BH-${hi+1}`,kind:'hole',hole:h,hi,mass:d.massSolar,rs:d.schwarzschildKm,spin:d.spin,accretion:d.accretion,diskTemperature:d.diskTemperatureK,sm:false});
  }
  return{entries,byKey};
 }
 function position(e,catalog,adapter,ticks){
  if(e.kind==='hole')return[e.hole.xLy,e.hole.yLy,e.hole.zLy];
  const s=e.system,pos=s.positionLy;let origin=pos?[Number(pos.x),Number(pos.y||0),Number(pos.z)]:adapter.systemLy(catalog.worldSeed,e.si,s.distanceLy);
  if(!origin.every(Number.isFinite))return null;
  const binary=adapter.binary(s,ticks),offset=(part)=>{
   if(!binary)return[0,0,0];const share=part==='primary'?-binary.m2/(binary.m1+binary.m2):binary.m1/(binary.m1+binary.m2);
   return[Math.cos(binary.angle)*binary.separationAu*share*AU_LY,Math.sin(binary.angle)*Math.sin(binary.inclination)*binary.separationAu*share*AU_LY,Math.sin(binary.angle)*Math.cos(binary.inclination)*binary.separationAu*share*AU_LY];
  };
  if(e.kind==='system')return origin;
  if(e.kind==='star')return add(origin,offset('primary'));
  if(e.kind==='companion')return add(origin,offset('secondary'));
  if(!String(e.planet.archetype||'').includes('circumbinary'))origin=add(origin,offset('primary'));
  const p=adapter.planetAu(s,e.planet,ticks);if(!p)return null;
  origin=add(origin,[p.x*AU_LY,p.z*AU_LY,p.y*AU_LY]);
  if(e.kind==='moon'){
   const m=e.moon,a=adapter.moonAngle(m,ticks),tilt=(m.tiltDeg||0)*Math.PI/180,yaw=(m.yawDeg||0)*Math.PI/180,r=m.distanceKm*KM_LY;
   const x=Math.cos(a)*r,z=Math.sin(a)*Math.cos(tilt)*r;
   origin=add(origin,[x*Math.cos(yaw)-z*Math.sin(yaw),Math.sin(a)*Math.sin(tilt)*r,x*Math.sin(yaw)+z*Math.cos(yaw)]);
  }
  return origin;
 }
 function query(entries,filters,ref,catalog,adapter,ticks){
  const ranges=filters.ranges||{},wanted=filters.biomes||[],gases=(filters.gases||'').split(/[ ,;]+/).map(x=>x.trim().toUpperCase()).filter(Boolean),q=text(filters.text).trim();
  const out=[];for(const e of entries){
   if(q&&!e.search.includes(q)&&!text(adapter.name?.(e.name)).includes(q)&&!e.biomes.some(b=>text(adapter.biome?.(b)).includes(q)))continue;
   if(filters.kind&&e.kind!==filters.kind)continue;
   if(filters.star&&e.star!==filters.star)continue;
   if(filters.category&&e.category!==filters.category)continue;
   if(filters.atmosphere&&e.atmosphere!==filters.atmosphere)continue;
   if(filters.archetype&&e.archetype!==filters.archetype)continue;
   let ok=true;for(const k of ['rings','land','habitable','sm'])if(filters[k]!==undefined&&filters[k]!==''&&e[k]!==filters[k])ok=false;if(!ok)continue;
   if(wanted.length&&!(filters.biomeMode==='all'?wanted.every(b=>e.biomes.includes(b)):wanted.some(b=>e.biomes.includes(b))))continue;
   if(gases.length&&!gases.every(g=>e.gases.includes(g)))continue;
   for(const [k,r] of Object.entries(ranges)){
    if(r.min==null&&r.max==null)continue;
    if(!finite(e[k])||(r.min!=null&&e[k]<r.min)||(r.max!=null&&e[k]>r.max)){ok=false;break;}
   }if(!ok)continue;
   const p=position(e,catalog,adapter,ticks),raw=p&&ref?distance(p,ref):null,d=finite(raw)?raw:null;
   if((filters.distanceMin!=null||filters.distanceMax!=null)&&(!finite(d)||(filters.distanceMin!=null&&d<filters.distanceMin)||(filters.distanceMax!=null&&d>filters.distanceMax)))continue;
   out.push({entry:e,distance:d});
  }
  const sort=filters.sort||'distance';out.sort((a,b)=>sort==='name'?a.entry.name.localeCompare(b.entry.name):sort==='esi'?(b.entry.esi??-1)-(a.entry.esi??-1):(a.distance??Infinity)-(b.distance??Infinity)||a.entry.name.localeCompare(b.entry.name));return out;
 }
 const api={index,position,query,esi,habitable,distance,AU_LY,KM_LY};if(typeof window!=='undefined')window.EUObjectIndex=api;if(typeof module!=='undefined')module.exports=api;
})();
