/* Catalog browser: filter snapshots, no texture baking, no per-frame search. */
(function(){'use strict';
 const L=(ru,en)=>window.EUI18N.current()==='ru'?ru:en;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const kinds={system:['Система','System'],star:['Звезда','Star'],companion:['Компаньон','Companion'],planet:['Планета','Planet'],moon:['Луна','Moon'],hole:['Чёрная дыра','Black hole']};
 const ranges={temperatureC:['Температура поверхности, °C','Surface temperature, °C'],temperatureK:['Температура звезды, K','Star temperature, K'],esi:['Индекс подобия Земле · модель, 0–1','Earth similarity · model, 0–1'],radiusKm:['Радиус, км','Radius, km'],diameter:['Диаметр, D⊕','Diameter, D⊕'],gravity:['Гравитация, g⊕','Gravity, g⊕'],radiation:['Радиация · игровой индекс','Radiation · game index'],field:['Поле, Гс','Field, G'],moons:['Количество лун','Moon count'],planets:['Количество планет','Planet count'],luminosity:['Светимость, L☉','Luminosity, L☉'],mass:['Масса звезды/ЧД, M☉','Star/BH mass, M☉'],rs:['Радиус Шварцшильда, км','Schwarzschild radius, km'],spin:['Спин ЧД, 0–1','BH spin, 0–1'],accretion:['Аккреция ЧД · модель','BH accretion · model'],diskTemperature:['Температура диска ЧД, K','BH disk temperature, K']};
 function mount(adapter){
  const dialog=el('dialog','object-browser');dialog.id='star-browser';document.body.append(dialog);
  let db=null,source=null,language=null,refKey=null,ticks=0,matched=[],grouped=[],page=0,opener=null,inputs={},biomes=[],timer=0,controls,results,status,origin,query,biomeBox,biomeQuery;
  function select(key,label,values){const lab=el('label','ob-control');lab.append(el('span','',label));const s=el('select');s.dataset.filter=key;for(const [value,name]of values){const option=el('option','',name);option.value=value;s.append(option);}lab.append(s);inputs[key]=s;controls.append(lab);return s;}
  function range(key,label){const box=el('label','ob-control ob-range');box.append(el('span','',label));const row=el('span','ob-range-inputs');for(const part of ['min','max']){const i=el('input');i.type='number';i.step='any';i.placeholder=part==='min'?L('от','min'):L('до','max');i.dataset.range=key;i.dataset.bound=part;i.setAttribute('aria-label',label+' '+i.placeholder);inputs[key+'_'+part]=i;row.append(i);}box.append(row);controls.append(box);}
  const number=k=>{const s=inputs[k]?.value.trim();return s===''||s==null?null:Number(s);};
  function filters(){const f={ranges:{},biomes:biomes.filter(b=>b.input.checked).map(b=>b.id)};
   for(const k of ['kind','star','category','archetype','atmosphere','sort','biomeMode'])f[k]=inputs[k]?.value||'';
   for(const k of ['rings','land','habitable','life','sm'])f[k]=inputs[k]?.value===''?'':inputs[k]?.value==='true';
   f.text=query.value;f.gases=inputs.gases.value;f.distanceMin=number('distance_min');f.distanceMax=number('distance_max');
   for(const k of Object.keys(ranges))f.ranges[k]={min:number(k+'_min'),max:number(k+'_max')};return f;
  }
  function originLabel(){const ref=db.byKey.get(refKey);origin.textContent=L('Отсчёт: ','Origin: ')+(ref?adapter.name(ref.name):L('не выбран','not selected'))+' · '+L('снимок времени ','time snapshot ')+Math.round(ticks)+' t';}
  function updateRef(){refKey=adapter.referenceKey(db)||null;ticks=adapter.ticks();originLabel();search();}
  function search(){clearTimeout(timer);page=0;const f=filters();for(const k of ['distance',...Object.keys(ranges)]){const a=number(k+'_min'),b=number(k+'_max');if((a!=null&&!Number.isFinite(a))||(b!=null&&!Number.isFinite(b))||(a!=null&&b!=null&&a>b)){status.textContent=L('Минимум больше максимума: ','Minimum exceeds maximum: ')+k;results.replaceChildren();return;}}
   const ref=db.byKey.get(refKey),point=ref?EUObjectIndex.position(ref,source,adapter,ticks):null;
   matched=EUObjectIndex.query(db.entries,f,point,source,adapter,ticks);
   const groups=new Map();for(const hit of matched){const key=hit.entry.system?'system:'+hit.entry.si:hit.entry.key;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(hit);}
   grouped=[...groups.values()];render();
  }
  const fmt=(n,d=2)=>Number.isFinite(n)?n.toLocaleString(EUI18N.locale(),{maximumFractionDigits:d}):'—';
  function resultRow(hit){
   const e=hit.entry,row=el('article','ob-result');row.dataset.key=e.key;
   row.classList.toggle('ob-child',e.kind==='planet'||e.kind==='moon');row.classList.toggle('ob-moon',e.kind==='moon');
   const heading=el('div','ob-result-name');heading.append(el('strong','',adapter.name(e.name)),el('small','',L(...kinds[e.kind])));
   const dist=el('span','ob-distance');dist.textContent=hit.distance==null?'—':(hit.distance>0&&hit.distance<.001?hit.distance.toExponential(4):fmt(hit.distance,5))+' '+L('св. лет','ly');
   const values=[];if(e.temperatureC!=null)values.push(fmt(e.temperatureC)+' °C');if(e.temperatureK!=null)values.push(fmt(e.temperatureK,0)+' K');if(e.esi!=null)values.push('ESI '+fmt(e.esi,3));if(e.gravity!=null)values.push(fmt(e.gravity)+' g');if(e.mass!=null)values.push(fmt(e.mass)+' M☉');if(e.field!=null)values.push(fmt(e.field)+' '+L('Гс','G'));
   row.append(heading,dist,el('small','ob-result-data',values.join(' · ')));
   if(e.biomes.length){const tags=el('div','ob-result-biomes');for(const biome of e.biomes.slice(0,6)){const tag=el('span','',adapter.biome(biome));tag.title=biome;tags.append(tag);}if(e.biomes.length>6)tags.append(el('span','',`+${e.biomes.length-6}`));row.append(tags);}
   const buttons=el('div','ob-result-actions'),focus=el('button','',L('Перейти к объекту','Focus object')),anchor=el('button','',L('Отсчёт отсюда','Use as origin'));focus.type=anchor.type='button';focus.onclick=()=>{dialog.close();adapter.focus(e);};anchor.onclick=()=>{refKey=e.key;ticks=adapter.ticks();originLabel();search();};buttons.append(focus,anchor);row.append(buttons);return row;
  }
  function render(){
   const start=page*12,part=grouped.slice(start,start+12);results.replaceChildren();
   status.textContent=matched.length+' '+L('совпадений · группы по звёздам, ближайшие первыми','matches · grouped by host, nearest matches first');
   if(!part.length)results.append(el('p','ob-empty',L('Совпадений нет. Ослабьте фильтры.','No matches. Relax the filters.')));
   for(const group of part){const first=group[0].entry,section=el('section','ob-group');
    if(first.system){const star=db.byKey.get('star:'+first.si),hasHabitable=db.entries.some(e=>e.si===first.si&&['planet','moon'].includes(e.kind)&&e.life);
     const head=el('header','ob-group-head');head.classList.toggle('ob-habitable',hasHabitable);
     const name=el('strong','', '★ '+adapter.name(first.system.name));head.append(name,el('small','',group.length+' '+L('подходящих объектов','matching objects')+(hasHabitable?' · '+L('есть обитаемые миры','habitable worlds present'):'')));
     const starButton=el('button','',L('Звезда','Star')),systemButton=el('button','',L('Вся система','Whole system'));starButton.type=systemButton.type='button';
     starButton.onclick=()=>{dialog.close();adapter.focus(star);};systemButton.onclick=()=>{dialog.close();adapter.focus(db.byKey.get('system:'+first.si));};head.append(starButton,systemButton);section.append(head);
    }
    // Stable planet/moon hierarchy, ordered by nearest matching member of each family.
    const families=new Map();for(const hit of group){const e=hit.entry,key=e.planet?'p:'+e.pi:e.key;if(!families.has(key))families.set(key,[]);families.get(key).push(hit);}
    for(const family of families.values()){
     const first=family[0].entry;if(first.planet&&!family.some(h=>h.entry.kind==='planet')){
      const context=el('button','ob-parent-context',L('Родитель: ','Parent: ')+adapter.name(first.planet.name));context.type='button';context.onclick=()=>{dialog.close();adapter.focus(db.byKey.get(`planet:${first.si}:${first.pi}`));};section.append(context);
     }
     family.sort((a,b)=>(a.entry.kind==='planet'?-1:0)-(b.entry.kind==='planet'?-1:0)||(a.distance??Infinity)-(b.distance??Infinity));
     for(const hit of family)section.append(resultRow(hit));
    }results.append(section);
   }
   const nav=el('div','ob-pages');for(const [step,label]of [[-1,L('Назад','Previous')],[1,L('Далее','Next')]]){const b=el('button','',label);b.type='button';b.disabled=step<0?page===0:start+12>=grouped.length;b.onclick=()=>{page+=step;render();results.scrollTop=0;};nav.append(b);}nav.append(el('span','',`${page+1} / ${Math.max(1,Math.ceil(grouped.length/12))}`));results.append(nav);
  }
  function build(){dialog.replaceChildren();inputs={};biomes=[];
   const header=el('header','ob-header'),title=el('h2','',L('Браузер звёзд','Star browser'));title.id='ob-title';dialog.setAttribute('aria-labelledby',title.id);const close=el('button','ob-close','×');close.type='button';close.setAttribute('aria-label',L('Закрыть','Close'));close.onclick=()=>dialog.close();header.append(title,close);dialog.append(header);
   const tools=el('div','ob-tools');query=el('input');query.type='search';query.id='ob-query';query.placeholder=L('Имя, обозначение, ID, биом…','Name, designation, ID, biome…');query.setAttribute('aria-label',query.placeholder);const refresh=el('button','',L('От закреплённого объекта','Use focused object')),reset=el('button','',L('Сбросить фильтры','Reset filters'));refresh.type=reset.type='button';refresh.onclick=updateRef;reset.onclick=()=>{query.value='';for(const [k,i]of Object.entries(inputs))i.value=k==='kind'?'planet':k==='sort'?'distance':k==='biomeMode'?'any':'';biomes.forEach(b=>b.input.checked=false);search();};tools.append(query,refresh,reset);dialog.append(tools);
   origin=el('p','ob-origin');dialog.append(origin);const layout=el('div','ob-layout');controls=el('div','ob-filters');results=el('div','ob-results');layout.append(controls,results);dialog.append(layout);
   const all=L('Любой','Any');select('kind',L('Объекты','Object type'),[['',all],...Object.entries(kinds).map(([k,v])=>[k,L(...v)])]);inputs.kind.value='planet';
   const list=(field,translate)=>[['',all],...[...new Set(db.entries.map(e=>e[field]).filter(Boolean))].sort().map(k=>[k,translate?translate(k):k])];
   select('star',L('Класс родительской звезды','Host star class'),list('star',adapter.starName));select('category',L('Категория','Category'),list('category',k=>L(...(EUSurfaceFacts.categories[k]||[k,k]))));select('archetype',L('Архетип','Archetype'),list('archetype'));select('atmosphere',L('Атмосфера','Atmosphere'),list('atmosphere',k=>EUI18N.t('atm.'+k)));
   for(const [key,label]of [['rings',L('Кольца','Rings')],['land',L('Посадка','Landable')],['life',L('Жизнь','Life')],['habitable',L('Пригодный для дыхания воздух','Breathable atmosphere')],['sm',L('Смешария','Smesharia')]])select(key,label,[['',all],['true',L('Да','Yes')],['false',L('Нет','No')]]);
   const gases=el('label','ob-control');gases.append(el('span','',L('Газы (все перечисленные)','Gases (all listed)')));inputs.gases=el('input');inputs.gases.placeholder='O2 N2';gases.append(inputs.gases);controls.append(gases);
   select('sort',L('Сортировка','Sort'),[['distance',L('Расстояние от точки отсчёта','Distance from origin')],['esi',L('ESI по убыванию','Highest ESI')],['name',L('Имя','Name')]]);range('distance',L('Расстояние, св. лет','Distance, ly'));
   const biomeDetails=el('details','ob-biomes');biomeDetails.append(el('summary','',L('Биомы: выбрать конкретные','Biomes: choose specific ones')));biomeQuery=el('input');biomeQuery.placeholder=L('Найти биом по имени или ID','Find biome by name or ID');biomeDetails.append(biomeQuery);const mode=el('select');mode.dataset.filter='biomeMode';for(const [v,label]of [['any',L('Хотя бы один выбранный','Any selected')],['all',L('Все выбранные','All selected')]]){const opt=el('option','',label);opt.value=v;mode.append(opt);}inputs.biomeMode=mode;biomeDetails.append(mode);biomeBox=el('div','ob-biome-list');
   for(const id of [...new Set(db.entries.flatMap(e=>e.biomes))].sort()){const label=el('label');const input=el('input');input.type='checkbox';input.value=id;label.append(input,el('span','',adapter.biome(id)),el('small','',id));biomeBox.append(label);biomes.push({id,input,label});}biomeDetails.append(biomeBox);controls.append(biomeDetails);biomeQuery.oninput=()=>{const q=biomeQuery.value.toLowerCase();biomes.forEach(b=>b.label.hidden=!b.label.textContent.toLowerCase().includes(q));};
   for(const [k,labels]of Object.entries(ranges))range(k,L(...labels));
   status=el('p','ob-status');status.setAttribute('aria-live','polite');dialog.append(status);
   controls.addEventListener('change',search);controls.addEventListener('input',e=>{if(e.target===biomeQuery)return;clearTimeout(timer);timer=setTimeout(search,120);});query.oninput=()=>{clearTimeout(timer);timer=setTimeout(search,120);};originLabel();
  }
  function open(){opener=document.activeElement;const catalog=adapter.catalog();if(!catalog)return;const lang=EUI18N.current();if(source!==catalog||language!==lang){source=catalog;language=lang;db=EUObjectIndex.index(catalog,adapter);build();}updateRef();adapter.beforeOpen?.();dialog.showModal();query.focus();}
  dialog.addEventListener('close',()=>{clearTimeout(timer);if(opener?.isConnected)opener.focus({preventScroll:true});});
  // Do not let map hotkeys or its pointer handlers act through a modal.
  dialog.addEventListener('keydown',e=>{if(!dialog.open)return;e.stopPropagation();if(e.key==='Escape'){e.preventDefault();dialog.close();}});
  return{open,close:()=>dialog.close(),isOpen:()=>dialog.open,refresh:updateRef,getIndex:()=>db};
 }
 window.EUStarBrowser={mount};
})();
