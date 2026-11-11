/* Temperature self-emission copied from ThermalEmissionMath.java; no catalog temperature edits. */
(function(){'use strict';
 function planck(w,t){if(!Number.isFinite(t)||t<=0||w<=0)return 0;const x=.01438776877/(w*t);return x>700?0:1.191042972e-16/(w**5*Math.expm1(x));}
 function visible(c){const t=Math.max(20,Math.min(6000,c+273.15)),r=planck(650e-9,t),g=planck(550e-9,t),b=planck(450e-9,t),max=Math.max(r,g,b);return max<=0?{color:[0,0,0],strength:0}:{color:[r/max,g/max,b/max],strength:1-Math.exp(-r/planck(650e-9,1800)*.70)};}
 function heat(p){let c=Number(p.temperatureC)||0;const equilibrium=278.3*Math.max(.000001,p.hostLuminosity||1)**.25/Math.sqrt(Math.max(.01,p.orbitAu||1))-273.15;c=Math.max(c,equilibrium);if(/lava|magma/.test((p.biomes||[]).join(',')))c=Math.max(c,1250);return c;}
 function draw(ctx,x,y,r,p){const v=visible(heat(p));if(v.strength<.001)return;ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha*=v.strength*.72;const c=v.color.map(a=>Math.round(a*255));ctx.fillStyle='rgb('+c.join(',')+')';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();}
 const api={planck,visible,heat,draw};if(typeof window!=='undefined')window.EUThermal=api;if(typeof module!=='undefined')module.exports=api;
})();
