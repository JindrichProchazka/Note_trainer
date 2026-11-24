import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createStaticServer } from '../scripts/serve.mjs';
const source=await readFile(new URL('../sw.js',import.meta.url),'utf8');
function harness({fail=false,votes=true}={}) {
 const handlers={},scope='https://example.test/Note_trainer/',prefix='notetrainer-app:'+encodeURIComponent(scope)+':';
 const stores=new Map([[prefix+'old',new Map()],['another-app',new Map()]]);
 let activated=false,claimed=false;
 const clients=[{id:'tab',url:scope,postMessage(message){
   messages.push(message);
   if(message.type==='CAN_ACTIVATE'&&votes!==null)queueMicrotask(()=>handlers.message({data:{type:'ACTIVATION_VOTE',nonce:message.nonce,safe:votes},source:{id:'tab'}}));
 }}],messages=[];
 const self={registration:{scope},addEventListener:(name,handler)=>{handlers[name]=handler;},
  clients:{matchAll:async()=>clients,claim:async()=>{claimed=true;}},skipWaiting:async()=>{activated=true;}};
 const key=request=>String(request.url??request);
 const caches={keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),open:async name=>{
   if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);
   return {addAll:async requests=>{if(fail)throw Error('network failed');for(const request of requests)data.set(key(request),'cached');},
    match:async request=>data.get(key(request))};
 }};
 vm.runInNewContext(source,{self,caches,URL,Request,crypto:{randomUUID:()=> 'nonce'},
  importScripts:()=>{self.BUILD_ID='new';self.PRECACHE=['./index.html','./js/app.js'];},
  fetch:async()=>{throw Error('offline');},setTimeout:fn=>setTimeout(fn,0),clearTimeout,Map,Set,Promise});
 const fire=async(name,data={})=>{let promise;handlers[name]({...data,waitUntil:p=>{promise=p;}});await promise;};
 return {fire,handlers,stores,prefix,messages,get activated(){return activated;},get claimed(){return claimed;}};
}
test('manifest, relative deployment scope and all required local icon dimensions are valid',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
 assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');assert.equal(manifest.display,'standalone');
 assert.ok(manifest.icons.some(icon=>icon.purpose==='maskable'));
 for(const [name,size]of [['icon-192.png',192],['icon-512.png',512],['maskable-512.png',512],['apple-touch-icon.png',180]]){
  const bytes=await readFile(new URL('../assets/icons/'+name,import.meta.url));
  assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);
 }
});
test('offline install caches the scope and does not activate updates without approval',async()=>{
 const h=harness();await h.fire('install');
 assert.equal(h.activated,false);
 assert.ok(h.stores.get(h.prefix+'new').has('https://example.test/Note_trainer/js/app.js'));
 let result;h.handlers.fetch({request:{method:'GET',url:'https://example.test/Note_trainer/',mode:'navigate'},respondWith:p=>{result=p;}});
 assert.equal(await result,'cached');
});
test('failed install keeps the prior application cache untouched',async()=>{
 const h=harness({fail:true});await assert.rejects(h.fire('install'));
 assert.ok(h.stores.has(h.prefix+'old'));assert.ok(!h.stores.has(h.prefix+'new'));
 assert.equal(h.activated,false);
});
test('activation retains a previous app cache and never deletes another application cache',async()=>{
 const h=harness();h.stores.set(h.prefix+'older',new Map());await h.fire('install');await h.fire('activate');
 assert.ok(h.stores.has('another-app'));assert.ok(h.stores.has(h.prefix+'new'));
 assert.equal([...h.stores.keys()].filter(key=>key.startsWith(h.prefix)).length,2);
 assert.equal(h.claimed,true);
 assert.doesNotMatch(source,/localStorage|indexedDB/);
});
test('explicit activation requires every current trainer tab to vote safe',async()=>{
 const safe=harness();await safe.fire('message',{data:{type:'REQUEST_ACTIVATION'},source:{id:'tab'}});
 assert.equal(safe.activated,true);
 for(const votes of [false,null]){
  const h=harness({votes});await h.fire('message',{data:{type:'REQUEST_ACTIVATION'},source:{id:'tab'}});
  assert.equal(h.activated,false);assert.ok(h.messages.some(m=>m.type==='UPDATE_DEFERRED'));
 }
});
test('worker ignores requests outside its scope and non-GET requests',()=>{
 const h=harness();for(const request of [
  {method:'POST',url:'https://example.test/Note_trainer/'},
  {method:'GET',url:'https://example.test/other/'},
  {method:'GET',url:'https://else.test/Note_trainer/'}
 ])h.handlers.fetch({request,respondWith:()=>assert.fail('Unexpected intercept')});
});
test('manifest, worker and icons are served correctly under the project subdirectory',async t=>{
 const server=createStaticServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const origin='http://127.0.0.1:'+server.address().port+'/Note_trainer/';
 for(const [path,mime]of [['manifest.webmanifest','application/manifest+json'],['sw.js','text/javascript'],['sw-assets.js','text/javascript'],['assets/icons/icon-192.png','image/png']]){
  const response=await fetch(origin+path);assert.equal(response.status,200,path);assert.ok(response.headers.get('content-type').startsWith(mime));
 }
});

test('every production asset is precached and the cache version matches its content',async()=>{
 const root=new URL('../',import.meta.url);
 const {fileURLToPath}=await import('node:url');
 const expected=['index.html','manifest.webmanifest'];
 for(const directory of ['js','css','assets']){
  const base=fileURLToPath(new URL(directory+'/',root));
  for(const entry of await readdir(base,{recursive:true,withFileTypes:true}))
   if(entry.isFile())expected.push(directory+'/'+path.relative(base,path.join(entry.parentPath,entry.name)).replaceAll('\\','/'));
 }
 expected.sort();
 const globals={self:{}};
 vm.runInNewContext(await readFile(new URL('sw-assets.js',root),'utf8'),globals);
 assert.deepEqual(Array.from(globals.self.PRECACHE),expected.map(file=>'./'+file));
 const hash=createHash('sha256');
 for(const file of [...expected,'sw.js'])hash.update(file).update(await readFile(new URL(file,root)));
 assert.equal(globals.self.BUILD_ID,hash.digest('hex').slice(0,16),'Run npm run prepare:offline after changing production resources');
 const pkg=JSON.parse(await readFile(new URL('package.json',root),'utf8'));
 const {APP_VERSION}=await import('../js/version.js');
 assert.equal(pkg.version,APP_VERSION);
});

test('a tab opened before first installation reloads on its later approved update',async()=>{
 const status={},button={addEventListener:(_name,handler)=>{button.click=handler;}};
 const banner={setAttribute(){},querySelector:selector=>selector==='p'?status:button};
 const document={createElement:()=>banner,querySelector:()=>({after(){}})};
 const events={},registrationEvents={},workerEvents={};
 let reloads=0,locked=false;
 const next={scriptURL:'https://example.test/Note_trainer/sw.js',state:'installing',
  addEventListener:(name,handler)=>{workerEvents[name]=handler;},postMessage(){}};
 const reg={active:null,waiting:null,installing:null,addEventListener:(name,handler)=>{registrationEvents[name]=handler;}};
 const serviceWorker={controller:null,addEventListener:(name,handler)=>{events[name]=handler;},
  register:async()=>reg,ready:Promise.resolve(reg)};
 const context={document,navigator:{serviceWorker},isSecureContext:true,URL,
  APP_VERSION:'1.0.0',location:{reload(){reloads++;}},setInterval(){}};
 const clientSource=(await readFile(new URL('../js/pwa.js',import.meta.url),'utf8'))
  .replace("import { APP_VERSION } from './version.js';",'')
  .replaceAll('export ','')
  .replaceAll('import.meta.url',JSON.stringify('https://example.test/Note_trainer/js/pwa.js'));
 vm.runInNewContext(clientSource,context);
 context.startPwa({canActivate:()=>true,lock:value=>{locked=value;}});
 await Promise.resolve();await Promise.resolve();
 serviceWorker.controller={};
 events.controllerchange(); // The first installation claims this already-open tab.
 assert.equal(reloads,0);
 reg.installing=next;reg.waiting=next;registrationEvents.updatefound();
 next.state='installed';workerEvents.statechange();
 events.message({source:next,data:{type:'CAN_ACTIVATE',nonce:'approved'}});
 assert.equal(locked,true);
 serviceWorker.controller=next;events.controllerchange();
 assert.equal(reloads,1,'An approved update must reload even when this tab predated installation');
});
