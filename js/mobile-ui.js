/* Компактные панели только мобильной карты. Узлы со старыми id переносим, а не клонируем: обработчики сохраняются. */
(function () {
  'use strict';
  const svg = {
    search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>',
    galaxy:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)"/></svg>',
    object:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 10v7m0-10v1"/></svg>'
  };
  const t = key => window.EUI18N.t(key);
  function node(tag, cls, text) { const e=document.createElement(tag); if(cls)e.className=cls; if(text)e.textContent=text; return e; }
  function translated(tag, cls, key) { const e=node(tag,cls,t(key)); e.dataset.i18n=key; return e; }
  function button(id, key) { const e=translated('button','',key); e.id=id; e.type='button'; return e; }
  function iconButton(e, icon, key) {
    e.removeAttribute('data-i18n'); e.replaceChildren();
    const graphic=node('span'); graphic.innerHTML=svg[icon];
    e.append(graphic,translated('span','',key)); return e;
  }
  function mount(options) {
    const info=options.info, bar=document.querySelector('.bar'), menuButton=document.getElementById('barToggle');
    const dock=document.querySelector('.dock'), timeBar=document.getElementById('timeBar');
    const original=[...bar.children], brand=bar.querySelector('.brand');
    const controls=node('section','mobileControls hidden'); controls.id='mobileControls'; controls.tabIndex=-1;
    controls.setAttribute('role','dialog'); controls.setAttribute('aria-modal','true'); controls.setAttribute('aria-labelledby','mobileControlsTitle');
    const title=translated('h2','', 'mobile.menu'); title.id='mobileControlsTitle'; controls.append(title);
    const section=key=>{ const e=node('section','mobileSection'); e.append(translated('label','mobileLabel',key)); controls.append(e); return e; };
    const seedSection=section('mobile.seed'); seedSection.firstChild.htmlFor='seed';
    seedSection.append(document.getElementById('seed'));
    const seedActions=node('div','mobileActions'); seedActions.append(document.getElementById('apply'),document.getElementById('random')); seedSection.append(seedActions);
    const share=button('mobileShare','mobile.share'), importActions=node('div','mobileActions');
    importActions.append(document.getElementById('importBtn'),share); seedSection.append(importActions,document.getElementById('importFile'));
    const shareField=node('input','hidden'); shareField.type='text'; shareField.readOnly=true; shareField.id='mobileShareLink'; seedSection.append(shareField);
    const searchSection=section('mobile.search'); searchSection.firstChild.htmlFor='search'; searchSection.append(document.getElementById('searchWrap'));
    const settings=section('mobile.settings'), settingsGrid=node('div','mobileSettings');
    settingsGrid.append(document.getElementById('zones'),document.getElementById('rings3d'),document.getElementById('langBtn'),document.getElementById('smeshariaWrap'));
    settings.append(settingsGrid);
    const textControls=node('div','mobileActions'); textControls.append(document.getElementById('uiOut'),document.getElementById('uiIn')); settings.append(textControls);
    const timeSection=section('mobile.time'); timeSection.append(timeBar);
    const more=node('details','mobileMore'); more.append(translated('summary','', 'mobile.more'));
    const links=node('div','mobileLinkGrid');
    for(const e of [...dock.children]) if(!e.classList.contains('zoomctl'))links.append(e);
    const full=document.getElementById('full'); full.dataset.i18n='mobile.desktop'; full.textContent=t('mobile.desktop'); links.append(full);
    more.append(links); controls.append(more);
    // Старые дублёры +/- остаются в DOM скрытыми, но на карте есть только одна пара.
    const leftovers=node('div','hidden'); original.forEach(e=>{if(e!==brand&&e.parentNode===bar)leftovers.append(e);}); controls.append(leftovers);
    const headerActions=node('div','mobileHeaderActions'), searchButton=node('button','mobileSearchButton');
    searchButton.type='button'; searchButton.id='mobileSearch'; searchButton.innerHTML=svg.search;
    headerActions.append(searchButton,menuButton); bar.append(headerActions);
    const brandSub=brand.querySelector('small'); brandSub.dataset.i18n='mobile.subtitle'; brandSub.textContent=t('mobile.subtitle');
    menuButton.setAttribute('aria-controls',controls.id);
    const scrim=node('button','mobileScrim hidden'); scrim.type='button'; scrim.tabIndex=-1;
    document.body.append(scrim,controls);
    const nav=node('nav','mobileNav'); nav.setAttribute('aria-label',t('mobile.navigation'));
    const galaxy=document.getElementById('galaxy'); iconButton(galaxy,'galaxy','galaxy');
    const pause=button('mobilePause','mobile.pause'), object=button('mobileObject','mobile.object'); iconButton(object,'object','mobile.object');
    nav.append(galaxy,pause,object); document.body.append(nav);
    const hint=translated('div','mobileGestureHint','mobile.gesture'); document.body.append(hint);
    try { if(sessionStorage.getItem('eu_mobile_gesture_seen'))hint.classList.add('hidden'); else sessionStorage.setItem('eu_mobile_gesture_seen','1'); } catch (_) {}
    setTimeout(()=>hint.classList.add('hidden'),6500);
    let open=false, returnFocus=menuButton, scheduled=0, cardText=null, lastSwipe=0, hadKeyboard=false;
    const css=(key,value)=>{if(document.documentElement.style.getPropertyValue(key)!==value)document.documentElement.style.setProperty(key,value);};
    const schedule=()=>{if(scheduled)return; scheduled=requestAnimationFrame(()=>{scheduled=0;sync();});};
    function syncLabels() {
      menuButton.textContent=open?'×':'☰'; menuButton.setAttribute('aria-expanded',String(open));
      menuButton.setAttribute('aria-label',t(open?'mobile.controlsClose':'mobile.menu'));
      menuButton.dataset.i18nTitle=open?'mobile.controlsClose':'mobile.menu'; menuButton.title=menuButton.getAttribute('aria-label');
      searchButton.title=t('mobile.search'); searchButton.setAttribute('aria-label',t('mobile.search'));
      scrim.setAttribute('aria-label',t('mobile.controlsClose')); nav.setAttribute('aria-label',t('mobile.navigation'));
      document.getElementById('uiIn').textContent='A+'; document.getElementById('uiOut').textContent='A−';
      document.getElementById('uiIn').setAttribute('aria-label',t('mobile.textLarger'));
      document.getElementById('uiOut').setAttribute('aria-label',t('mobile.textSmaller'));
      object.title=t('mobile.reopen'); object.setAttribute('aria-label',t('mobile.reopen'));
      shareField.setAttribute('aria-label',t('mobile.copyFallback'));
      const expanded=info.classList.contains('expanded');
      const action=info.querySelector('.sheetAction'); if(action)action.textContent=t(expanded?'mobile.collapse':'mobile.details');
      const toggle=info.querySelector('.sheetExpand'); if(toggle){toggle.setAttribute('aria-expanded',String(expanded));toggle.setAttribute('aria-label',(expanded?t('mobile.collapse'):t('mobile.details'))+' · '+(cardText?.title||''));}
      const close=info.querySelector('.sheetClose'); if(close){close.title=t('mobile.close');close.setAttribute('aria-label',t('mobile.close'));}
      const speed=Number(options.getSpeed());
      pause.textContent=(speed===0?'▶ ':'Ⅱ ')+t(speed===0?'mobile.resume':'mobile.pause')+(speed===0?'':' · ×'+speed);
      pause.setAttribute('aria-label',t(speed===0?'mobile.resume':'mobile.pause'));pause.setAttribute('aria-pressed',String(speed===0));
    }
    function setMenuOpen(value, focusSearch=false) {
      const wasOpen=open;
      open=!!value;
      if(open)options.cancelGestures?.();
      controls.classList.toggle('hidden',!open); scrim.classList.toggle('hidden',!open); bar.classList.toggle('collapsed',!open);
      document.body.dataset.menuOpen=String(open);
      if(!open){const input=document.activeElement;if(controls.contains(input)&&input?.blur)input.blur();}
      syncLabels(); schedule();
      if(open){requestAnimationFrame(()=>{const target=focusSearch?document.getElementById('search'):controls;target.focus({preventScroll:true});if(focusSearch)target.scrollIntoView({block:'nearest'});});}
      else if(wasOpen) {try{returnFocus.focus({preventScroll:true});}catch(_) {}}
    }
    menuButton.addEventListener('click',()=>{returnFocus=menuButton;setMenuOpen(!open);});
    searchButton.addEventListener('click',()=>{returnFocus=searchButton;setMenuOpen(true,true);});
    scrim.addEventListener('click',()=>setMenuOpen(false));
    controls.addEventListener('click',e=>{
      if(e.target.closest('#results div'))setMenuOpen(false);
      else if(e.target.closest('#random') || (e.target.closest('#apply')&&options.isSeedValid()))setMenuOpen(false);
    });
    controls.querySelector('#importFile').addEventListener('change',e=>{if(e.target.files?.length)setMenuOpen(false);});
    pause.addEventListener('click',()=>{options.togglePause();syncLabels();});
    function closeCard(){info.style.display='none';info.classList.remove('expanded');sync();}
    object.addEventListener('click',()=>{if(!cardText||!options.hasSelection())return;info.style.display='flex';info.classList.remove('expanded');sync();});
    function expand(value){info.classList.toggle('expanded',!!value);info.style.transform='';sync();}
    function hydrateInfo() {
      const heading=info.querySelector('h2');
      if(!heading){schedule();return;}
      const parts=options.prepareInfo();
      const description=heading.nextElementSibling?.classList.contains('sub')?heading.nextElementSibling:null;
      cardText={title:heading.textContent,subtitle:description?.textContent||''};
      const header=node('div','sheetHeader'), toggle=node('button','sheetExpand');toggle.type='button';
      const text=node('span','sheetText'), name=node('strong','sheetTitle',cardText.title), sub=node('small','sheetSubtitle',cardText.subtitle);
      name.id='mobileSheetTitle';text.append(name,sub);toggle.append(text,node('span','sheetAction'));
      const close=node('button','sheetClose','×');close.type='button';close.addEventListener('click',closeCard);
      header.append(toggle,close);heading.remove();description?.remove();
      const facts=node('div','sheetFacts'), rows=[...info.querySelectorAll('table tr')];
      const wanted=['info.orbit','info.diameter','info.planets','info.gravity'];const picked=[];
      for(const key of wanted){const row=rows.find(r=>r.firstElementChild?.textContent.trim()===t(key));if(row&&!picked.includes(row))picked.push(row);if(picked.length===3)break;}
      if(!picked.length)picked.push(...rows.slice(0,2));
      for(const row of picked){const label=row.firstElementChild?.textContent.trim()||'',value=row.lastElementChild?.textContent.trim()||'';const chip=node('span','',value);chip.title=label+' · '+value;facts.append(chip);}
      info.insertBefore(facts,parts.scroller);info.insertBefore(header,facts);info.setAttribute('role','region');info.setAttribute('aria-labelledby','mobileSheetTitle');
      toggle.addEventListener('click',e=>{if(performance.now()-lastSwipe<350){e.preventDefault();return;}expand(!info.classList.contains('expanded'));});
      let start=null;
      toggle.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;start={id:e.pointerId,y:e.clientY,expanded:info.classList.contains('expanded')};toggle.setPointerCapture(e.pointerId);});
      toggle.addEventListener('pointermove',e=>{if(!start||start.id!==e.pointerId)return;const dy=e.clientY-start.y;if(Math.abs(dy)<10)return;e.preventDefault();info.style.transform='translateY('+Math.max(-28,Math.min(75,dy))+'px)';});
      toggle.addEventListener('pointerup',e=>{if(!start||start.id!==e.pointerId)return;const dy=e.clientY-start.y;const wasExpanded=start.expanded;start=null;info.style.transform='';if(Math.abs(dy)>36){lastSwipe=performance.now();if(dy<0)expand(true);else if(wasExpanded)expand(false);else closeCard();}});
      const cancelSwipe=()=>{start=null;info.style.transform='';};toggle.addEventListener('pointercancel',cancelSwipe);toggle.addEventListener('lostpointercapture',cancelSwipe);
      syncLabels();schedule();
    }
    new MutationObserver(hydrateInfo).observe(info,{childList:true});
    function sync() {
      const vv=window.visualViewport, top=vv?.offsetTop||0, height=vv?.height||innerHeight;
      const editing=document.activeElement?.matches('input[type=text]');
      const keyboard=!!editing&&(vv?.scale||1)<1.05&&height<innerHeight*.78;
      css('--mobile-vh',Math.round(height)+'px');css('--mobile-vtop',Math.round(top)+'px');
      css('--mobile-keyboard-bottom',Math.max(0,Math.round(innerHeight-height-top))+'px');
      document.body.dataset.keyboard=String(keyboard);
      if(keyboard&&!hadKeyboard&&controls.contains(document.activeElement)) {
        requestAnimationFrame(()=>document.activeElement?.scrollIntoView?.({block:'nearest'}));
      }
      hadKeyboard=keyboard;
      const header=bar.getBoundingClientRect(), navHeight=nav.getBoundingClientRect().height;
      css('--mobile-header-bottom',Math.round(header.bottom)+'px');css('--mobile-nav-height',Math.round(navHeight)+'px');
      css('--mobile-sheet-max',Math.max(120,Math.round(Math.min(height*.72,height-header.height-navHeight-26)))+'px');
      const visible=info.style.display!=='none'&&!info.classList.contains('hidden')&&!!cardText;
      document.body.dataset.sheetState=visible?(info.classList.contains('expanded')?'expanded':'peek'):'closed';
      object.disabled=!cardText||!options.hasSelection();
      const landscape=innerWidth>innerHeight, reserve=visible&&!landscape?info.getBoundingClientRect().height+12:0;
      css('--mobile-tools-bottom',Math.round(navHeight+reserve+16)+'px');
      syncLabels();
    }
    function targetPin() {
      const header=bar.getBoundingClientRect(), navBox=nav.getBoundingClientRect();
      const bounds={left:12,right:innerWidth-12,top:header.bottom+12,bottom:navBox.top-12};
      if(info.style.display!=='none'&&!info.classList.contains('hidden')&&cardText){
        const r=info.getBoundingClientRect();
        if(r.width<innerWidth*.65){bounds.left=r.right+12;bounds.right=innerWidth-66;}
        else bounds.bottom=Math.min(bounds.bottom,r.top-14);
      }
      return {x:(bounds.left+Math.max(bounds.left,bounds.right))/2-innerWidth/2,y:(bounds.top+Math.max(bounds.top,bounds.bottom))/2-innerHeight/2};
    }
    share.addEventListener('click',async()=>{
      const url=new URL(location.href);if(options.getSeed())url.searchParams.set('seed',options.getSeed());
      url.searchParams.delete('v');
      const text=url.toString();
      try {
        if(navigator.share){await navigator.share({title:'Enchanted Universe',url:text});return;}
        if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);options.toast(t('mobile.copied'),false);return;}
        throw new Error('Clipboard unavailable');
      } catch(e){if(e.name==='AbortError')return;shareField.classList.remove('hidden');shareField.value=text;shareField.focus();shareField.select();options.toast(t('mobile.copyFallback'),false);}
    });
    document.addEventListener('keydown',e=>{
      if(!document.getElementById('langModal').classList.contains('hidden'))return;
      if(e.key==='Escape'&&open){e.preventDefault();e.stopImmediatePropagation();setMenuOpen(false);return;}
      if(e.key==='Escape'&&info.classList.contains('expanded')){e.preventDefault();e.stopImmediatePropagation();expand(false);return;}
      if(e.key==='Tab'&&open){
        const list=[menuButton,...controls.querySelectorAll('button,a[href],input,summary')].filter(n=>!n.disabled&&n.getClientRects().length);
        const i=list.indexOf(document.activeElement),next=e.shiftKey?(i<=0?list.length-1:i-1):(i===list.length-1?0:i+1);
        e.preventDefault();list[next]?.focus();
      }
    },true);
    window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
    controls.addEventListener('focusin',schedule);controls.addEventListener('focusout',schedule);
    if(typeof ResizeObserver==='function'){new ResizeObserver(schedule).observe(bar);new ResizeObserver(schedule).observe(nav);}
    window.addEventListener('eu-lang',()=>{syncLabels();schedule();});
    setMenuOpen(false);hydrateInfo();sync();
    return {sync,setMenuOpen,targetPin,closeCard,isMenuOpen:()=>open,expand};
  }
  window.EUMobileUI={mount};
})();
