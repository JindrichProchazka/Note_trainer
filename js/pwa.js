import { APP_VERSION } from './version.js';
export const PWA_TEXT=Object.freeze({
  title:'Application status',
  ready:'Available offline on this device.', preparing:'Preparing offline practice…',
  failed:'Offline setup or update failed. Saved data is unchanged. Retry online.',
  update:'A new version is ready.', activate:'Update now', later:'Finish practice and save pending data in all trainer tabs before updating.',
  deferred:'Update deferred. Finish practice or close other trainer tabs, then try again.',
  checking:'Checking for updates…', check:'Check for updates', unsupported:'Offline installation needs HTTPS or localhost.',
});
export function startPwa({canActivate,lock}) {
  const banner=document.createElement('aside');
  banner.className='release-banner';banner.setAttribute('aria-label',PWA_TEXT.title);
  banner.innerHTML='<p id="release-status" role="status"></p><button class="button subtle" id="activate-update" hidden>'+PWA_TEXT.activate+'</button>';
  document.querySelector('.app-header').after(banner);
  const status=banner.querySelector('p'),button=banner.querySelector('button');
  let registration=null,waiting=null,locked=false,deferred=false,reloadNeeded=false;
  let hadController=!!navigator.serviceWorker?.controller;
  const workerURL=new URL('../sw.js',import.meta.url);
  const say=text=>{status.textContent='v'+APP_VERSION+' · '+text;};
  function refresh(){
    button.hidden=!waiting&&!reloadNeeded;
    button.disabled=(!canActivate()||locked);
    if((waiting||reloadNeeded)&&!locked&&!deferred)say(PWA_TEXT.update+(canActivate()?'':' '+PWA_TEXT.later));
  }
  if(!('serviceWorker' in navigator)||!isSecureContext){say(PWA_TEXT.unsupported);return {refresh,check:()=>{}};}
  say(PWA_TEXT.preparing);
  navigator.serviceWorker.addEventListener('message',event=>{
    if(event.source?.scriptURL!==workerURL.href)return;
    if(event.data?.type==='CAN_ACTIVATE'){
      const safe=canActivate();
      if(safe){locked=true;lock(true);}
      event.source.postMessage({type:'ACTIVATION_VOTE',nonce:event.data.nonce,safe});
    }
    if(event.data?.type==='UPDATE_DEFERRED'){locked=false;deferred=true;lock(false);say(PWA_TEXT.deferred);button.disabled=false;}
  });
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(hadController&&locked)location.reload();
    else if(hadController){reloadNeeded=true;refresh();}
    else {hadController=true;say(PWA_TEXT.ready);}
  });
  button.addEventListener('click',()=>{
    if(!canActivate())return;
    if(reloadNeeded&&!waiting){location.reload();return;}
    if(!waiting)return;
    deferred=false;
    button.disabled=true;waiting.postMessage({type:'REQUEST_ACTIVATION'});
  });
  navigator.serviceWorker.register(workerURL,{scope:new URL('../',import.meta.url).href,updateViaCache:'none'}).then(reg=>{
    registration=reg;
    const observe=worker=>{
      worker?.addEventListener('statechange',()=>{
        if(worker.state==='installed'){
          if(navigator.serviceWorker.controller){waiting=reg.waiting??worker;refresh();}
          else navigator.serviceWorker.ready.then(()=>say(PWA_TEXT.ready));
        }
        if(worker.state==='redundant')say(PWA_TEXT.failed);
      });
    };
    if(reg.waiting){waiting=reg.waiting;refresh();}
    else if(reg.active)say(PWA_TEXT.ready);
    observe(reg.installing);
    reg.addEventListener('updatefound',()=>observe(reg.installing));
    navigator.serviceWorker.ready.then(()=>{if(!waiting)say(PWA_TEXT.ready);});
  }).catch(()=>say(PWA_TEXT.failed));
  setInterval(refresh,1000);
  return {refresh,async check(){
    if(!registration){say(PWA_TEXT.failed);return;}
    say(PWA_TEXT.checking);
    try{await registration.update();if(!registration.installing&&!registration.waiting)say(PWA_TEXT.ready);}
    catch{say(PWA_TEXT.failed);}
  }};
}
