/* Card navigation uses the same catalog/reference/focus adapter as the star browser. */
(function(){'use strict';
 function mount(adapter,selection){
  const info=document.getElementById('info');let source=null,index=null,queued=false;
  function db(){const cat=adapter.catalog();if(source!==cat){source=cat;index=EUObjectIndex.index(cat,adapter);}return index;}
  function name(e){return adapter.name(e.name);}
  function button(e,text){const b=document.createElement('button');b.type='button';b.className='object-link';b.dataset.euObject=e.key;b.textContent=text||name(e);b.title=EUI18N.current()==='ru'?'Выбрать объект':'Select object';return b;}
  function update(){
   queued=false;if(!info.querySelector('h2')||info.querySelector('[data-related-objects]'))return;
   const data=db(),key=adapter.referenceKey(data),ref=data.byKey.get(key),ctx=selection();
   info.dataset.objectKind=ref?.kind||ctx?.kind||'planet';
   const system=ref?.system||ctx?.system,si=source.systems.indexOf(system);
   if(system){
    const candidates=data.entries.filter(e=>e.si===si&&e.key!==key),nodes=[...info.querySelectorAll('.chips>span:not(.biome),td,.sub')];
    for(const n of nodes){if(n.querySelector('button,input,a')||n.closest('[data-related-objects]'))continue;const text=n.textContent.trim();let match=candidates.find(e=>text===name(e)||text===e.name||e.kind==='planet'&&text===adapter.name(e.designation));
     if(match){n.replaceChildren(button(match,text));continue;}
     if(n.classList.contains('sub')&&text.includes(adapter.name(system.name))){const label=adapter.name(system.name),at=text.lastIndexOf(label);if(at>=0)n.replaceChildren(document.createTextNode(text.slice(0,at)),button(data.byKey.get('system:'+si),label),document.createTextNode(text.slice(at+label.length)));}
    }
   }
   const wrap=document.createElement('section');wrap.dataset.relatedObjects='';wrap.className='card-related';
   const heading=document.createElement('div');heading.className='sub';heading.textContent=EUI18N.current()==='ru'?'Рядом с объектом':'Nearby objects';wrap.append(heading);
   const origin=ref?EUObjectIndex.position(ref,source,adapter,adapter.ticks()):null;
   if(origin){const hits=EUObjectIndex.query(data.entries,{sort:'distance'},origin,source,adapter,adapter.ticks()).filter(h=>h.entry.key!==key&&h.entry.kind!=='system').slice(0,6);
    for(const h of hits){const row=document.createElement('div');row.className='related-row';row.append(button(h.entry));const dist=document.createElement('small');dist.textContent=(h.distance<.001?h.distance.toExponential(2):h.distance.toLocaleString(EUI18N.locale(),{maximumFractionDigits:3}))+' '+(EUI18N.current()==='ru'?'св. лет':'ly');row.append(dist);wrap.append(row);}}
   const scroller=info.querySelector('.infoScroll')||info;scroller.append(wrap);
  }
  function schedule(){if(!queued){queued=true;queueMicrotask(update);}}
  info.addEventListener('click',e=>{const target=e.target.closest('[data-eu-object]');if(!target)return;const entry=db().byKey.get(target.dataset.euObject);if(entry){e.preventDefault();e.stopPropagation();adapter.focus(entry);}});
  new MutationObserver(schedule).observe(info,{childList:true});window.addEventListener('eu-lang',()=>{info.querySelector('[data-related-objects]')?.remove();schedule();});schedule();
  return{refresh:schedule};
 }
 window.EUCardNavigation={mount};
})();
