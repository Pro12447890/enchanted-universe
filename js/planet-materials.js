/* Cached spherical Perlin materials. Baking is triggered only by visible screen coverage. */
(function(){'use strict';
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t,blend=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t)),smooth=(a,b,x)=>{x=clamp((x-a)/(b-a));return x*x*(3-2*x);};
 const models=new WeakMap(),cache=new Map(),birth=new Map(),session=globalThis.crypto?.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:0x745182;
 function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
 function rng(seed){let s=hash(seed)||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
 function perm(seed){const p=Array.from({length:256},(_,i)=>i),r=rng(seed);for(let i=255;i>0;i--){const j=Math.floor(r()*(i+1));[p[i],p[j]]=[p[j],p[i]];}return p.concat(p);}
 function noise(p,x,y,z){
  const X=Math.floor(x)&255,Y=Math.floor(y)&255,Z=Math.floor(z)&255,a=x-Math.floor(x),b=y-Math.floor(y),c=z-Math.floor(z),f=t=>t*t*t*(t*(t*6-15)+10),g=(h,x,y,z)=>{h&=15;const u=h<8?x:y,v=h<4?y:h===12||h===14?x:z;return(h&1?-u:u)+(h&2?-v:v);};
  const u=f(a),v=f(b),w=f(c),A=p[X]+Y,AA=p[A]+Z,AB=p[A+1]+Z,B=p[X+1]+Y,BA=p[B]+Z,BB=p[B+1]+Z;
  return mix(mix(mix(g(p[AA],a,b,c),g(p[BA],a-1,b,c),u),mix(g(p[AB],a,b-1,c),g(p[BB],a-1,b-1,c),u),v),mix(mix(g(p[AA+1],a,b,c-1),g(p[BA+1],a-1,b,c-1),u),mix(g(p[AB+1],a,b-1,c-1),g(p[BB+1],a-1,b-1,c-1),u),v),w);
 }
 function fb(m,x,y,z,salt=0,frequency=1,octaves=4){let sum=0,amp=.58,norm=0;for(let i=0;i<octaves;i++){sum+=amp*noise(m.perm,x*frequency+salt,y*frequency+salt*.73,z*frequency-salt*.31);norm+=amp;frequency*=2.07;amp*=.49;}return sum/norm;}
 function elevation(m,x,y,z){
  const a=m.rotation,c=Math.cos(a),s=Math.sin(a),xx=x*c+z*s,zz=z*c-x*s;
  const w=fb(m,xx,y,zz,7,1.6,3)*m.warp;
  const n=fb(m,xx+w,y+fb(m,xx,y,zz,15,1.3,2)*m.warp,zz-w*.65,0,m.frequency,5);
  return .5+n*.46+fb(m,xx,y,zz,32,1.1,2)*.095;
 }
 function model(p){
  let m=models.get(p);if(m)return m;
  const key=[p.id||'',p.seed||'',p.category||p.type||'',p.archetype||'',p.temperatureC,(p.biomes||[]).join(','),p.surfaceFluid||'',p.orbitAu,p.hostLuminosity].join('|');
  const r=rng(key+'|'+session),facts=EUSurfaceFacts,biomes=(p.biomes||[]).map(id=>({id,...facts.material(id)})),wet=biomes.filter(b=>b.wet),dry=biomes.filter(b=>!b.wet),phase=facts.fluid(p),climate=facts.climate(p);
  const share=wet.length/Math.max(1,biomes.length);let liquid=phase&&share>0?clamp(share+(r()-.5)*.24):0;
  if(phase==='sulfur'&&share===0)liquid=.1+.05*r();
  if(share===1&&phase)liquid=clamp(liquid,.85,1);
  const defaultLand={id:'rock',color:[123,119,113],canopy:[102,120,83],vegetation:false,ice:false};
  const provinces=[];for(let i=0,n=Math.max(15,Math.min(48,(dry.length||1)*5));i<n;i++){const y=1-2*(i+.5)/n,a=i*2.399963+r()*.5,rad=Math.sqrt(1-y*y);provinces.push({x:Math.cos(a)*rad,y,z:Math.sin(a)*rad,biome:dry[i%Math.max(1,dry.length)]||defaultLand});}
  m={key,seed:String(p.seed),perm:perm(key+'|'+session),biomes,dry,wet,provinces,fluid:phase,water:liquid>0,waterFrac:liquid,landThreshold:liquid,life:facts.life(p),cold:climate.cold,snow:climate.snow,frequency:2.8+r()*3.1,warp:.28+r()*.48,rotation:r()*Math.PI*2,base:[123,119,113],ready:false};
  let color=phase==='water'?blend([17,56,153],[72,162,207],climate.cold):(EUBiomeMaterials.fluids[phase]||[43,90,138]);
  if(phase==='water'&&wet.length){const b=wet.reduce((sum,b)=>sum.map((v,i)=>v+b.water[i]),[0,0,0]).map(v=>v/wet.length);color=blend(color,b,.18);}
  m.liquidColor=color;m.base=(dry.length?dry:biomes).reduce((sum,b)=>sum.map((v,i)=>v+b.color[i]),[0,0,0]).map(v=>v/Math.max(1,(dry.length?dry:biomes).length));
  if(!biomes.length)m.base=[123,119,113];models.set(p,m);return m;
 }
 function snowScore(m,x,y,z,e){return Math.abs(y)+fb(m,x,y,z,53,2.4,4)*.42+fb(m,x,y,z,61,9,3)*.075+(e-.5)*.16;}
 function quantile(a,t){a.sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.max(0,Math.floor(t*(a.length-1))))];}
 function prepare(m){if(m.ready)return;const heights=[],snows=[];for(let i=0,n=3072;i<n;i++){const y=1-2*(i+.5)/n,a=i*2.399963,r=Math.sqrt(1-y*y),x=Math.cos(a)*r,z=Math.sin(a)*r,e=elevation(m,x,y,z);heights.push(e);snows.push(snowScore(m,x,y,z,e));}
  m.landThreshold=m.water?quantile(heights,m.waterFrac):-Infinity;m.snowThreshold=m.snow?quantile(snows,1-m.snow):Infinity;m.ready=true;
 }
 function province(m,x,y,z){let best=-Infinity,second=-Infinity,a=m.provinces[0],b=a;const xx=x+fb(m,x,y,z,80,3.7,4)*.52,yy=y+fb(m,x,y,z,93,4.1,4)*.52,zz=z+fb(m,x,y,z,108,3.5,4)*.52;for(const p of m.provinces){const score=xx*p.x+yy*p.y+zz*p.z;if(score>best){second=best;b=a;best=score;a=p;}else if(score>second){second=score;b=p;}}return {a:a.biome,b:b.biome,blend:(1-smooth(0,.09,best-second))*.5};}
 function landAt(m,x,y){if(!m.water)return true;const q=x*x+y*y;if(q>1)return false;if(!m.ready)return true;return elevation(m,x,-y,Math.sqrt(1-q))>m.landThreshold;}
 function colorAt(m,x,y,z,e){
  const water=e<=m.landThreshold,hill=fb(m,x,y,z,23,8,3),detail=fb(m,x,y,z,43,36,2);let col;
  if(water){const depth=clamp((m.landThreshold-e)*7);col=m.liquidColor.map(v=>v*(1.16-depth*.43+detail*.045));}
  else{
   const p=province(m,x,y,z),biome=p.a;col=blend(biome.color,p.b.color,p.blend);
   if(biome.vegetation){let canopy=blend(biome.color,biome.canopy,/forest|grove|jungle|taiga/.test(biome.id)?.34:.12);col=blend(col,canopy,.45);if(col[1]>col[0]*1.12&&col[1]>col[2]*1.07)col=blend(col,[140,142,89],(1-m.cold)*.18);}
   const relief=1+hill*.45+detail*.13;col=col.map(v=>v*relief);
   if(!biome.vegetation&&!biome.ice){const crack=Math.pow(Math.max(0,1-Math.abs(fb(m,x,y,z,91,16,2))*18),5);col=col.map(v=>v*(1-.08*crack));}
  }
  const frost=m.snow?smooth(m.snowThreshold-.014,m.snowThreshold+.014,snowScore(m,x,y,z,e)):0;
  if(frost>0){const snow=blend([210,225,229],[246,249,248],clamp(.56+hill*.8));col=blend(col,snow,frost);}
  return col.map(v=>clamp(v,0,255));
 }
 function bake(p,m=model(p)){prepare(m);const side=256,cv=document.createElement('canvas');cv.width=cv.height=side;const ctx=cv.getContext('2d'),image=ctx.createImageData(side,side);let liquid=0,snow=0,count=0;
  for(let py=0;py<side;py++)for(let px=0;px<side;px++){const x=(px+.5)/side*2-1,y=1-(py+.5)/side*2,q=x*x+y*y;if(q>1)continue;const z=Math.sqrt(1-q),e=elevation(m,x,y,z),c=colorAt(m,x,y,z,e),i=(py*side+px)*4,limb=.79+.21*z;
   image.data[i]=c[0]*limb;image.data[i+1]=c[1]*limb;image.data[i+2]=c[2]*limb;image.data[i+3]=255;count++;if(e<=m.landThreshold)liquid++;if(snowScore(m,x,y,z,e)>m.snowThreshold)snow++;
  }ctx.putImageData(image,0,0);cv.surfaceStats={liquidPixels:liquid/count,snowPixels:snow/count,targetLiquid:m.waterFrac,targetSnow:m.snow,fluid:m.fluid};return cv;
 }
 function transition(radius,width,height){const old=Math.sqrt(width*height*.005/Math.PI),start=old/2.5;return smooth(start,start*1.65,radius);}
 function visible(x,y,r,w,h){
  const dx=Math.max(0,-x,x-w),dy=Math.max(0,-y,y-h);if(dx*dx+dy*dy>=r*r)return false;
  const intersection=Math.max(0,Math.min(w,x+r)-Math.max(0,x-r))*Math.max(0,Math.min(h,y+r)-Math.max(0,y-r));
  return intersection>w*h*.005/6.25;
 }
 function promo(ctx,x,y,r,m){const color=m.water?m.liquidColor:m.base;const g=ctx.createRadialGradient(x-r*.3,y-r*.3,r*.05,x,y,r);g.addColorStop(0,'rgb('+color.map(v=>Math.min(255,v*1.3)).join(',')+')');g.addColorStop(1,'rgb('+color.map(v=>v*.55).join(',')+')');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
 function draw(ctx,x,y,r,p,m=model(p),width=innerWidth,height=innerHeight){
  let alpha=transition(r,width,height);if(!visible(x,y,r,width,height)){promo(ctx,x,y,r,m);return;}
  let tex=cache.get(m.key);if(alpha>0&&!tex){tex=bake(p,m);cache.set(m.key,tex);birth.set(m.key,performance.now());}
  if(tex)alpha*=smooth(0,240,performance.now()-(birth.get(m.key)||0));if(alpha<1)promo(ctx,x,y,r,m);if(alpha<=0||!tex)return;
  ctx.save();ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(tex,x-r,y-r,r*2,r*2);ctx.restore();
 }
 const api={model,bake,draw,landAt,transition,cache,session,elevation};if(typeof window!=='undefined')window.EUPlanetMaterials=api;if(typeof module!=='undefined')module.exports=api;
})();
