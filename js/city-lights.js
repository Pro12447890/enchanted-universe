/* Fine districts, local branch roads and coastal clusters inspired by SurfaceMaterialMath.cities. */
(function(){'use strict';
 const cached=new WeakMap();const fract=x=>x-Math.floor(x);
 function hash(x,y,seed){return fract(Math.sin(x*127.1+y*311.7+seed*.173)*43758.5453);}
 function level(p){if(/^(земля|earth)$/i.test(p.name||''))return 1;if(!['habitable','cold_habitable'].includes(p.category||p.type))return 0;return orbital(p)===2?2:1;}
 function orbital(p){if(/^(земля|earth)$/i.test(p.name||''))return 1;if(p.category!=='habitable')return 0;let seed;try{seed=BigInt(p.seed);}catch(_){seed=0n;}let h=BigInt.asIntN(64,seed*0x9e3779b97f4a7c15n^BigInt(javaHash(p.id||'')));h=BigInt.asIntN(64,h^BigInt.asUintN(64,h)>>33n);h=BigInt.asIntN(64,h*0xff51afd7ed558ccdn);h=BigInt.asIntN(64,h^BigInt.asUintN(64,h)>>33n);const mod=(v,n)=>Number((v%n+n)%n);if(mod(h,10000n)>=120)return 0;return mod(h/10000n,1000n)<225?2:1;}
 function javaHash(s){let h=0;for(let i=0;i<s.length;i++)h=(Math.imul(h,31)+s.charCodeAt(i))|0;return h;}
 function build(p,m){const type=level(p);if(!type)return null;const material=EUPlanetMaterials.materialMask(p,m);if(!material)return null;const side=material.side,seed=EUOrbits.fnv1a32(String(p.seed)+'|cities'),settle=material.settleable,eligible=[];for(let i=0;i<settle.length;i++)if(settle[i])eligible.push(i);if(!eligible.length)return null;
  const cv=document.createElement('canvas');cv.width=cv.height=side;const ctx=cv.getContext('2d'),temp=document.createElement('canvas');temp.width=temp.height=side;const t=temp.getContext('2d'),nodes=[];
  const districts=type===2?16:11;
  for(let n=0;n<districts;n++){let chosen=-1,best=-1;for(let k=0;k<180;k++){const at=eligible[Math.floor(hash(k,n,seed)*eligible.length)],x=at%side,y=Math.floor(at/side),near=nodes.length?Math.min(...nodes.map(v=>Math.hypot(x-v.x,y-v.y))):side;if(near<side*.065)continue;const score=near*(.5+hash(k,n+5,seed));if(score>best){best=score;chosen=at;}}
   if(chosen<0)continue;const center={x:chosen%side,y:Math.floor(chosen/side)};nodes.push(center);const hubs=[center],rx=side*(.025+.042*hash(n,7,seed)),ry=rx*(.55+.35*hash(n,9,seed));
   for(let j=1;j<90;j++){const angle=j*2.399963+.5*hash(j,n,seed),radius=Math.sqrt(hash(j,n+19,seed))*1.9,point={x:center.x+Math.cos(angle)*rx*radius,y:center.y+Math.sin(angle)*ry*radius};const xx=Math.round(point.x),yy=Math.round(point.y);if(xx<0||yy<0||xx>=side||yy>=side||!settle[yy*side+xx])continue;let prev=hubs[0],min=Infinity;for(const h of hubs){const distance=Math.hypot(point.x-h.x,point.y-h.y);if(distance<min){min=distance;prev=h;}}hubs.push(point);
    t.strokeStyle=type===2?'rgba(143,216,255,.36)':'rgba(255,200,110,.34)';t.lineWidth=.30+.25*hash(j,n+21,seed);t.beginPath();t.moveTo(prev.x,prev.y);t.quadraticCurveTo((point.x+prev.x)*.5+(hash(j,n+31,seed)-.5)*3,(point.y+prev.y)*.5+(hash(j,n+33,seed)-.5)*3,point.x,point.y);t.stroke();
    t.fillStyle=type===2?'rgba(169,224,255,.90)':'rgba(255,218,159,.90)';t.beginPath();t.arc(point.x,point.y,.22+.45*hash(j,n+41,seed),0,Math.PI*2);t.fill();
    for(let k=0;k<4;k++){const x=point.x+(hash(j*4+k,n+43,seed)-.5)*rx*.24,y=point.y+(hash(j*4+k,n+51,seed)-.5)*ry*.24;t.globalAlpha=.5;t.fillRect(x,y,.28,.28);}t.globalAlpha=1;
   }
  }
  // Every road/dot is clipped by the identical water/snow/biome mask used for the rendered surface.
  const pixels=t.getImageData(0,0,side,side);let lights=0,waterLights=0;for(let i=0;i<settle.length;i++){if(!settle[i])pixels.data[i*4+3]=0;if(pixels.data[i*4+3]){lights++;if(material.liquid[i])waterLights++;}}ctx.putImageData(pixels,0,0);
  return {canvas:cv,lights,waterLights,districts:nodes.length,side};
 }
 function draw(ctx,x,y,r,p,m,lx,ly,seconds){if(r<14||!level(p)||!EUPlanetMaterials.transition(r,innerWidth,innerHeight)||x+r<0||y+r<0||x-r>innerWidth||y-r>innerHeight)return;let item=cached.get(p);if(!cached.has(p)){if(!EUPlanetMaterials.materialMask(p))return;item=build(p,m);cached.set(p,item);}if(!item)return;
  ctx.save();ctx.globalAlpha*=EUPlanetMaterials.transition(r,innerWidth,innerHeight);// Shading uses a reusable canvas, never allocates one per frame.
  let shaded=item.shaded;if(!shaded){shaded=document.createElement('canvas');shaded.width=shaded.height=item.side;item.shaded=shaded;}
  const sector=Math.round(Math.atan2(ly,lx)*48/Math.PI),frame=Math.floor(seconds);const c=shaded.getContext('2d');if(item.sector!==sector||item.frame!==frame){item.sector=sector;item.frame=frame;c.clearRect(0,0,item.side,item.side);c.drawImage(item.canvas,0,0);c.globalCompositeOperation='destination-in';const g=c.createLinearGradient(item.side*(.5+lx*.5),item.side*(.5+ly*.5),item.side*(.5-lx*.5),item.side*(.5-ly*.5));g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.40,'rgba(0,0,0,0)');g.addColorStop(.62,'rgba(0,0,0,.5)');g.addColorStop(1,'rgba(0,0,0,1)');c.fillStyle=g;c.fillRect(0,0,item.side,item.side);c.globalCompositeOperation='destination-out';const clouds=EUClouds.snapshot(p,seconds,lx,ly);if(clouds.canvas){c.globalAlpha=.86;c.drawImage(clouds.canvas,0,0,item.side,item.side);c.globalAlpha=1;}c.globalCompositeOperation='source-over';}ctx.globalCompositeOperation='screen';ctx.drawImage(shaded,x-r,y-r,2*r,2*r);ctx.restore();
 }
 const api={level,orbital,build,draw,get:p=>cached.get(p)};if(typeof window!=='undefined')window.EUCities=api;if(typeof module!=='undefined')module.exports=api;
})();
