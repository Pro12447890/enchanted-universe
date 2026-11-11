/* Dedicated tool destinations; the map/catalog stays a single application. */
(function(){'use strict';
 const svg='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.7"/><rect x="14" y="3" width="7" height="7" rx="1.7"/><rect x="3" y="14" width="7" height="7" rx="1.7"/><path d="M17.5 14v7M14 17.5h7" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
 function mount(){const dialog=document.createElement('dialog');dialog.id='toolsDialog';dialog.className='tools-dialog';document.body.append(dialog);
  function build(){const ru=EUI18N.current()==='ru';dialog.innerHTML='<header><h2>'+(ru?'Инструменты Вселенной':'Universe tools')+'</h2><button type="button" data-close aria-label="Close">×</button></header><p>'+(ru?'Генераторы, справочники и статистика':'Generators, references and statistics')+'</p><div class="tool-grid"></div>';
   const links=[['planets','◉','Генератор планет','Planet generator'],['charts','▥','Диаграммы','Charts'],['crafts','◇','Крафты','Crafts'],['starBrowserOpen','✦','Браузер звёзд','Star browser']];
   for(const[id,icon,r,e]of links){const source=document.getElementById(id),a=document.createElement(source?.tagName==='A'?'a':'button');a.className='tool-tile';a.innerHTML='<span class="tool-symbol">'+icon+'</span><strong>'+(ru?r:e)+'</strong>';if(a.tagName==='A'){a.href=source?.getAttribute('href')||'#';a.target=source?.target||'';a.rel='noopener noreferrer';}else{a.type='button';a.onclick=()=>{dialog.close();source?.click();};}dialog.querySelector('.tool-grid').append(a);}dialog.querySelector('[data-close]').onclick=()=>dialog.close();}
  function open(){build();dialog.showModal();}const dock=document.querySelector('.dockrow'),button=document.createElement('button');button.type='button';button.id='desktopTools';button.className='tgk tools-button';button.innerHTML=svg;button.title='Инструменты';button.setAttribute('aria-label','Инструменты');button.onclick=open;dock.prepend(button);
  window.addEventListener('eu-lang',()=>{button.title=EUI18N.current()==='ru'?'Инструменты':'Tools';button.setAttribute('aria-label',button.title);});return{open,svg};
 }
 window.EUTools={mount,icon:svg};
})();
