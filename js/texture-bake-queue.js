/* Visible before the first computation chunk; heavy jobs yield between chunks. */
(function(){'use strict';
 const jobs=new Map();let active=false,spinner=null,started=0;
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 function ensureSpinner(){if(spinner)return;spinner=document.createElement('div');spinner.className='texture-bake-spinner';spinner.setAttribute('role','status');spinner.setAttribute('aria-label','Texture loading');spinner.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="2.6"/><path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';document.body.append(spinner);}
 async function pump(){if(active)return;active=true;ensureSpinner();spinner.hidden=false;await frame();await frame();
  try{while(jobs.size){const [key,job]=jobs.entries().next().value;started++;try{const iterator=job.factory();let done=false;while(!done){const limit=performance.now()+7;let step;do{step=iterator.next();done=step.done;}while(!done&&performance.now()<limit);if(done)job.complete(step.value);else await frame();}}catch(error){job.failed?.(error);console.error('Texture bake failed',key,error);}finally{jobs.delete(key);}await frame();}}
  finally{active=false;spinner.hidden=true;}
 }
 function enqueue(key,factory,complete,failed){if(jobs.has(key))return;jobs.set(key,{factory,complete,failed});pump();}
 const api={enqueue,get pending(){return jobs.size},get started(){return started}};window.EUTextureBakes=api;
})();
