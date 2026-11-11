/* NEW-galaxy quota deck: identical ordering and rounding to GalaxyDistribution.java. */
(function(){'use strict';
 const policy=globalThis.EUGenerationPolicy||(typeof module!=='undefined'?require('./generation-policy.js'):null);
 const COUNT=127,unit=(seed,salt)=>policy.unit(String(seed)+'|galaxy-v1|'+salt),order=(seed,salt,items)=>items.sort((a,b)=>unit(seed,salt+a)-unit(seed,salt+b)||a-b);
 function deck(seed,count=COUNT){const weights=[.44,.23,.07,.08,.06,.05,.07],q=weights.map(w=>Math.floor(w*count));let sum=q.reduce((a,b)=>a+b,0);for(let k=sum;k<count;k++){let best=0;for(let i=1;i<q.length;i++)if(weights[i]*count-q[i]>weights[best]*count-q[best])best=i;q[best]++;}
  const groups=q.flatMap((n,i)=>Array(n).fill(i)),slots=order(seed,'color-order|',Array.from({length:count},(_,i)=>i)),color=Array(count),size=Array(count).fill(0);slots.forEach((slot,i)=>color[slot]=groups[i]);
  const eligible=order(seed,'size-order|',slots.filter(i=>color[i]!==6)),supers=Math.floor(count*.02+.5),giants=Math.floor(count*.09+.5);for(let i=0;i<eligible.length&&i<supers+giants;i++)size[eligible[i]]=i<supers?2:1;
  return color.map((group,i)=>{if(group===6)return unit(seed,'compact|'+i)<.64?'magnetar':'white_dwarf';if(size[i]===2)return group===0?'red_supergiant':group<=2?'yellow_supergiant':group<=4?'white_supergiant':'blue_supergiant';if(size[i]===1)return group===0?'red_giant':group<=2?'yellow_giant':group===3?'white_giant':'blue_giant';return group===0?(unit(seed,'orange|'+i)<.5?'red_dwarf':'orange_dwarf'):group===1?'yellow_dwarf':group===2?'white_yellow_dwarf':group===3?'white_star':group===4?'white_blue_dwarf':'blue_dwarf';});
 }
 function gas(seed,index,total,normalizedOrbit){const chance=normalizedOrbit<.66?.25:normalizedOrbit<=1.7?.40:.55,picked=unit(seed,'gas|'+index)<chance;if(total<=3)return picked;const indices=order(seed,'gas|',Array.from({length:total},(_,i)=>i));return picked&&indices.indexOf(index)<Math.floor(total*.70);}
 function distance(seed,index,jitter){const old=4+index*(95*3.15/126)+jitter*.8;return(10+old)*1.15-10;}
 const api={COUNT,unit,deck,gas,distance,planets:(seed,i)=>unit(seed,'planets|'+i)>=.10,farBrightness:k=>['red_dwarf','orange_dwarf'].includes(k)?.36:k==='yellow_dwarf'?.62:1};if(typeof window!=='undefined')window.EUGalaxyDistribution=api;if(typeof module!=='undefined')module.exports=api;
})();
