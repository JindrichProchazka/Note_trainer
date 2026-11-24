/* Only application responses are cached. Learning data is never accessed here. */
importScripts('./sw-assets.js');
const PREFIX='notetrainer-app:'+encodeURIComponent(self.registration.scope)+':';
const CACHE=PREFIX+self.BUILD_ID;
const ROOT=new URL('./',self.registration.scope);
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const existed=(await caches.keys()).includes(CACHE);
    try {
      const cache=await caches.open(CACHE);
      await cache.addAll(self.PRECACHE.map(path=>new Request(new URL(path,ROOT),{cache:'reload'})));
    } catch(error) {
      if(!existed)await caches.delete(CACHE);
      throw error; // A failed install never replaces the previous active worker.
    }
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const previous=(await caches.keys()).filter(key=>key.startsWith(PREFIX)&&key!==CACHE);
    await Promise.all(previous.slice(0,-1).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(request.mode==='navigate'?new URL('./index.html',ROOT):request);
    return cached || fetch(request);
  })());
});
const approvals=new Map();
self.addEventListener('message',event=>{
  const data=event.data;
  if(data?.type==='ACTIVATION_VOTE'){
    const pending=approvals.get(data.nonce);
    if(pending?.clients.has(event.source?.id)){
      pending.votes.set(event.source.id,data.safe===true);
      pending.check();
    }
  }
  if(data?.type!=='REQUEST_ACTIVATION'||!event.source?.id)return;
  event.waitUntil((async()=>{
    const clients=(await self.clients.matchAll({type:'window',includeUncontrolled:true}))
      .filter(client=>client.url.startsWith(ROOT.href));
    if(!clients.some(client=>client.id===event.source.id))return;
    const nonce=crypto.randomUUID();
    const safe=await new Promise(resolve=>{
      const finish=value=>{clearTimeout(timer);approvals.delete(nonce);resolve(value);};
      const pending={clients:new Set(clients.map(client=>client.id)),votes:new Map(),check(){
        if([...this.votes.values()].some(vote=>!vote))finish(false);
        else if(this.votes.size===this.clients.size)finish(true);
      }};
      const timer=setTimeout(()=>finish(false),3000);
      approvals.set(nonce,pending);
      clients.forEach(client=>client.postMessage({type:'CAN_ACTIVATE',nonce}));
    });
    if(safe)await self.skipWaiting();
    else clients.forEach(client=>client.postMessage({type:'UPDATE_DEFERRED'}));
  })());
});
