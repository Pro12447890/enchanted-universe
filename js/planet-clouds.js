/* Profile and field formulas ported from PlanetCloudMath.java; continuous map coordinates. */
(function(){'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),fract=v=>v-Math.floor(v),smooth=(a,b,v)=>{v=clamp((v-a)/(b-a),0,1);return v*v*(3-2*v);};
 const colors=['#f5f7ff','#dbedff','#ebcc87','#b8d4e3','#e8e0bd','#d6e0eb','#b39478'];
 function geometrySeed(seed){let value=BigInt.asUintN(64,BigInt(seed)^0x434c4f55444cn);value=BigInt.asUintN(64,(value^(value>>30n))*0xbf58476d1ce4e5b9n);value=BigInt.asUintN(64,(value^(value>>27n))*0x94d049bb133111ebn);return Number((value^(value>>31n))&65535n);}
 function profile(p){
  const a=String(p.archetype||'').toLowerCase(),cat=p.category||p.type||'',d=clamp(p.atmosphereDensity??EUPlanetClimate.density(p.atmosphere),0,1),t=Number.isFinite(p.temperatureC)?p.temperatureC:15,gas=EUPlanetClimate.fractions(p.composition),gh=EUPlanetClimate.estimate(d,p.composition,t).index;
  const water=gas.H2O||0,methane=gas.CH4||0,ammonia=gas.NH3||0,co2=gas.CO2||0,sulfur=(gas.SO2||0)+(gas.H2S||0),wet=['ocean','hycean','panthalassic','tidal_eyeball','snowball'].includes(a),giant=cat==='gas_giant'||a.includes('giant')||['mini_neptune','puffy','super_puff','gas_dwarf'].includes(a),tidal=a==='tidal_eyeball';
  const top=t-(giant?25+90*d:8+25*d)*(1-.35*gh);let condensate=-1;
  if(t>700&&((gas.FE||0)>.001||(gas.SIH4||0)>.001||(gas.SIO2||0)>.001))condensate=6;
  else if(sulfur>.00001&&t>70&&t<700)condensate=2;
  else if(methane>.003&&top<-110&&t<-75)condensate=3;
  else if((ammonia>.001||a==='ammonia')&&top<-30&&t<30)condensate=4;
  else if(co2>.1&&top<-115&&t<-70)condensate=5;
  else if((water>.000001||wet)&&t<140&&t>-150)condensate=top<-12?1:0;
  else if(giant&&sulfur>.0001&&t<80)condensate=2;
  let family=0;if(d>.04&&condensate>=0&&a!=='airless'){
   if(tidal)family=6;else if(d<.4||condensate===6||(t>80&&condensate!==2))family=2;
   else if(t<-35&&!giant)family=6;else if(condensate===2||(d>=.75&&gh>.8&&t<30))family=5;
   else if(wet&&t>=24&&t<85&&d>=.7)family=4;else if(giant||t<=5||d>=.7)family=3;else family=1;
  }
  if(condensate<0)condensate=0;let humidity=Math.max(wet?.75:(p.clouds||EUSurfaceFacts.life(p))?.25:0,Math.min(1,Math.sqrt(water/.025)));if(condensate!==0&&condensate!==1)humidity=.55;
  let coverage=family===0?0:Math.min(.72,.10+.36*d+.12*humidity+.08*gh+(family===5?.08:0));if(family===2)coverage*=.55;if(family===6&&!tidal)coverage*=.75;
  const stepSeconds=Math.round(clamp(10-4*d-2*gh+(t<-70?1:0),3,10)),morphSeconds=30+15*Math.round(clamp(5-2*d-gh+(family===2?1:0),0,6)),height=clamp(.018+.035*d+.020*gh+(condensate===2||condensate===6?.035:0),.018,.126);
  let seed;try{seed=geometrySeed(p.seed);}catch(_){seed=geometrySeed(BigInt(EUOrbits.fnv1a32(String(p.seed))));}
  return {family,condensate,coverage,geometrySeed:seed,stepSeconds,morphSeconds,cloudHeightFraction:height,greenhouseIndex:gh,tidalEyeball:tidal};
 }
 function hash(x,y,seed){return fract(Math.sin(x*127.1+y*311.7+seed*.173)*43758.5453);}
 function noise(x,y,seed){const ix=Math.floor(x),iy=Math.floor(y);let fx=fract(x),fy=fract(y);fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);const a=hash(ix,iy,seed),b=hash(ix+1,iy,seed),c=hash(ix,iy+1,seed),d=hash(ix+1,iy+1,seed);return(a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;}
 function field(family,x,y,freq,warp,seed,epoch){const px=x*freq+warp*1.5,py=y*freq-warp,n=noise(px,py,seed+epoch*17);
  if(family===2)return .72*noise(x*2+warp,y*22,seed+epoch*17)+.28*n;
  if(family===3)return .62*(1-Math.abs(Math.sin((y*6+x*.8+warp*.8)*Math.PI)))+.38*n;
  if(family===4){const cx=.30+.40*hash(3,7,seed),cy=.30+.40*hash(8,2,seed),dx=x-cx,dy=y-cy,r=Math.hypot(dx,dy),arms=.5+.5*Math.cos(Math.atan2(dy,dx)*3-r*29+warp*2);return(.64*arms+.36*n)*smooth(.025,.07,r)*(1-.3*smooth(.18,.55,r));}
  if(family===5)return .30+.70*n;return .70*n+.30*noise(px*2,py*2,seed+71+epoch*17);
 }
 function sample(p,u,v,seconds,lx=1,ly=0){if(!p.family||!p.coverage)return 0;const time=Math.max(0,seconds),morph=Math.floor(time/p.morphSeconds),phase=smooth(0,1,(time-morph*p.morphSeconds)/p.morphSeconds),drift=time/(p.stepSeconds*256),x=fract(u-drift),y=fract(v-drift*.23),height=Math.round(p.cloudHeightFraction/.018)*.018,freq=7-12*height,warp=noise(x*3+9,y*3+2,p.geometrySeed)-.5;
  const a=field(p.family,x,y,freq,warp,p.geometrySeed,morph),b=field(p.family,x,y,freq,warp,p.geometrySeed,morph+1);let mask=1;
  if(p.family===6){if(p.tidalEyeball){const dx=u*2-1,dy=v*2-1,z=Math.sqrt(Math.max(0,1-dx*dx-dy*dy)),mu=(dx*lx+dy*ly+z*.22)/Math.sqrt(1.0484);const cap=smooth(.25,.78,mu+.14*warp),rim=(1-smooth(.08,.40,Math.abs(mu-.1+.18*warp)))*.75;mask=Math.min(1,Math.max(cap,rim)*(.08+.92*smooth(-.18,.12,mu)));}else mask=.18+.82*smooth(.25,.88,Math.abs(v*2-1));}
  return smooth(.60-.28*p.coverage,.78-.28*p.coverage,a+(b-a)*phase)*p.coverage*mask*.58;
 }
 const snapshots=new WeakMap();let redraws=0;
 function snapshot(body,seconds,lx=1,ly=0){let item=snapshots.get(body);if(!item){item={profile:profile(body),frame:-1,angle:-1,canvas:null};snapshots.set(body,item);}if(!item.profile.family)return item;
  const frame=Math.floor(seconds),angle=item.profile.tidalEyeball?Math.round(Math.atan2(ly,lx)*16/Math.PI):0;if(item.frame===frame)return item;
  item.frame=frame;item.angle=angle;const side=160,cv=item.canvas||document.createElement('canvas');if(!item.canvas){cv.width=cv.height=side;}const c=cv.getContext('2d'),img=c.createImageData(side,side),color=colors[item.profile.condensate],rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
  for(let y=0;y<side;y++)for(let x=0;x<side;x++){const nx=(x+.5)/side*2-1,ny=(y+.5)/side*2-1,q=nx*nx+ny*ny;if(q>=1)continue;const daylight=.12+.88*smooth(-.18,.25,nx*lx+ny*ly+Math.sqrt(1-q)*.22),a=sample(item.profile,(nx+1)*.5,(ny+1)*.5,frame,lx,ly)*smooth(1,.94,Math.sqrt(q)),i=(y*side+x)*4;img.data[i]=rgb[0]*daylight;img.data[i+1]=rgb[1]*daylight;img.data[i+2]=rgb[2]*daylight;img.data[i+3]=Math.min(95,Math.round(a*255));}
  c.putImageData(img,0,0);item.canvas=cv;redraws++;return item;
 }
 function draw(ctx,x,y,r,body,seconds,lx=1,ly=0){if(r<10||!EUPlanetMaterials.transition(r,innerWidth,innerHeight)||x+r<0||y+r<0||x-r>innerWidth||y-r>innerHeight)return;const item=snapshot(body,seconds,lx,ly);if(!item.canvas)return;ctx.save();ctx.globalAlpha*=EUPlanetMaterials.transition(r,innerWidth,innerHeight);ctx.imageSmoothingEnabled=true;ctx.drawImage(item.canvas,x-r,y-r,r*2,r*2);ctx.restore();}
 const api={profile,geometrySeed,sample,snapshot,draw,colors,get redraws(){return redraws}};if(typeof window!=='undefined')window.EUClouds=api;if(typeof module!=='undefined')module.exports=api;
})();
