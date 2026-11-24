import test from 'node:test';
import assert from 'node:assert/strict';
import { createManagedStorage,DATA_HEAD } from '../js/data/managed-storage.js';
import { createBackup,validateBackup,prepareImport,commitImport,prepareReset,commitReset,readData,backupFilename } from '../js/data/backup.js';
import { createLearningStore,sessionStorageKey } from '../js/data/storage.js';
import { memoryStorage,recordFixture,attemptSeries,BASE_TIME } from './helpers/learning-fixtures.js';
import { SETTINGS_KEY } from '../js/data/settings.js';
const prefs={schemaVersion:1,extra:'keep',settings:{theme:'dark',naming:'international',defaultPreset:'bass-staff',defaultSessionType:'count',future:7}};
function fixture(){
 const raw=memoryStorage({[SETTINGS_KEY]:JSON.stringify(prefs)});
 let id=0;const storage=createManagedStorage(()=>raw,()=> 'g'+(++id));
 const learning=createLearningStore({getStorage:()=>storage});learning.load();learning.saveRecord(recordFixture());
 return {raw,storage,learning,fresh:()=>createManagedStorage(()=>raw)};
}
const backup=f=>createBackup(f.storage,f.learning.snapshot(),prefs.settings,BASE_TIME);
test('export includes complete evidence, unknown preferences, versions and a dated filename',()=>{
 const f=fixture(),before=new Map(f.raw.values),value=backup(f);
 assert.equal(value.schemaVersion,1);assert.equal(value.learningSchemaVersion,2);assert.equal(value.appVersion,'1.0.0');
 assert.equal(value.data.sessions[0].attempts.length,1);assert.equal(value.data.preferences.settings.future,7);
 assert.match(backupFilename(value),/^notetrainer-backup-2026-11-24.*\.json$/);
 assert.deepEqual(f.raw.values,before);assert.deepEqual(validateBackup(JSON.stringify(value)),value);
});
test('export includes pending valid evidence when quota prevented saving',()=>{
 const f=fixture(),write=f.raw.setItem;
 f.raw.setItem=()=>{throw Object.assign(Error('full'),{name:'QuotaExceededError'});};
 f.learning.saveRecord(recordFixture({id:'pending'}));
 assert.equal(backup(f).data.sessions.length,2);f.raw.setItem=write;
});
test('invalid JSON, future versions and duplicate backup evidence are rejected without writes',()=>{
 const f=fixture(),original=backup(f),before=new Map(f.raw.values);
 for(const input of ['broken',{...original,schemaVersion:99},{...original,exportedAt:'bad'}]){
  assert.throws(()=>prepareImport(f.storage,input));assert.deepEqual(f.raw.values,before);
 }
 const dup=structuredClone(original);dup.data.sessions.push(dup.data.sessions[0]);
 assert.throws(()=>prepareImport(f.storage,dup));assert.deepEqual(f.raw.values,before);
});
test('known learning migrations preserve source evidence and recognition IDs',()=>{
 const f=fixture(),old=backup(f),record=old.data.sessions[0];
 old.learningSchemaVersion=1;old.data.learning.schemaVersion=1;record.schemaVersion=1;
 delete record.attempts[0].contextId;delete record.attempts[0].octave;
 delete record.attempts[0].day;delete record.attempts[0].ordinal;delete record.attempts[0].itemIndex;
 const normalized=validateBackup(old);
 assert.equal(normalized.data.sessions[0].schemaVersion,2);
 assert.equal(normalized.data.sessions[0].attempts[0].id,record.attempts[0].id);
 assert.equal(record.schemaVersion,1);
});
test('preview performs no writes and merge is duplicate safe',()=>{
 const f=fixture(),value=backup(f),before=new Map(f.raw.values);
 const plan=prepareImport(f.storage,value);
 assert.deepEqual(f.raw.values,before);assert.equal(plan.preview.addedAttempts,0);assert.equal(plan.preview.duplicateSessions,1);
 commitImport(f.storage,plan,'merge');
 const restored=readData(f.fresh());
 assert.equal(restored.sessions.length,1);assert.equal(restored.sessions[0].attempts.length,1);
 const again=prepareImport(f.fresh(),value);assert.equal(again.preview.addedAttempts,0);
});
test('merge adds distinct sessions and keeps current preferences; replace uses imported preferences',()=>{
 const f=fixture(),value=backup(f);
 value.data.sessions=[recordFixture({id:'other'})];value.data.preferences.settings.theme='light';
 const plan=prepareImport(f.storage,value);assert.equal(plan.preview.newSessions,1);
 commitImport(f.storage,plan,'merge');
 let restored=readData(f.fresh());assert.equal(restored.sessions.length,2);assert.equal(restored.preferences.settings.theme,'dark');
 const newer=f.fresh(),replace=prepareImport(newer,value);commitImport(newer,replace,'replace');
 restored=readData(f.fresh());assert.equal(restored.sessions.length,1);assert.equal(restored.preferences.settings.theme,'light');
});
test('conflicting results block merge and clearly identify the session',()=>{
 const f=fixture(),value=backup(f);
 value.data.sessions[0].attempts[0].responseTimeMs=900;
 const plan=prepareImport(f.storage,value),before=new Map(f.raw.values);
 assert.match(plan.conflicts.join(' '),/s1/);
 assert.throws(()=>commitImport(f.storage,plan,'merge'));assert.deepEqual(f.raw.values,before);
});
test('in-progress ancestor merges with completed evidence without reviving old state',()=>{
 const f=fixture(),value=backup(f);
 const record=value.data.sessions[0];record.session.status='in-progress';record.session.finishedAt=null;record.session.completionReason=null;
 const plan=prepareImport(f.storage,value);
 assert.deepEqual(plan.conflicts,[]);
 commitImport(f.storage,plan,'merge');assert.equal(readData(f.fresh()).sessions[0].session.status,'completed');
});
test('new unfinished imports become interrupted while keeping partial answers',()=>{
 const f=fixture(),value=backup(f);value.data.sessions=[recordFixture({id:'unfinished',status:'in-progress'})];
 commitImport(f.storage,prepareImport(f.storage,value),'replace');
 const record=readData(f.fresh()).sessions[0];
 assert.equal(record.session.status,'interrupted');assert.equal(record.attempts.length,1);assert.equal(record.session.finishedAt,null);
});
test('quota failures during staging or pointer commit preserve original active data',()=>{
 for(const failHead of [false,true]){
  const f=fixture(),plan=prepareImport(f.storage,backup(f)),before=new Map(f.raw.values),write=f.raw.setItem;
  let calls=0;f.raw.setItem=(key,value)=>{
   if(failHead?key===DATA_HEAD:++calls===2)throw Object.assign(Error('full'),{name:'QuotaExceededError'});
   write(key,value);
  };
  assert.throws(()=>commitImport(f.storage,plan,'replace'));
  assert.deepEqual(f.raw.values,before);
 }
});
test('stale previews are rejected and another tab cannot overwrite a newly restored generation',()=>{
 const f=fixture(),plan=prepareImport(f.storage,backup(f)),write=f.raw.setItem;
 f.raw.setItem(SETTINGS_KEY,JSON.stringify({...prefs,extra:'changed'}));
 assert.throws(()=>commitImport(f.storage,plan,'merge'));
 f.raw.setItem=write;
 const current=prepareImport(f.storage,backup(f));commitImport(f.storage,current,'merge');
 assert.throws(()=>f.storage.setItem(sessionStorageKey('late'),JSON.stringify(recordFixture({id:'late'}))));
 assert.equal(readData(f.fresh()).sessions.length,1);
});
test('a data change during staging aborts commit and retains the concurrent evidence',()=>{
 const f=fixture(),plan=prepareImport(f.storage,backup(f)),write=f.raw.setItem;
 let once=false;
 f.raw.setItem=(key,value)=>{
  write(key,value);
  if(!once){once=true;write(sessionStorageKey('concurrent'),JSON.stringify(recordFixture({id:'concurrent'})));}
 };
 assert.throws(()=>commitImport(f.storage,plan,'replace'));
 assert.equal(f.raw.getItem(DATA_HEAD),null);
 assert.ok(f.raw.getItem(sessionStorageKey('concurrent')));
});
test('reset removes active statistics while preserving preferences byte for byte and unrelated keys',()=>{
 const f=fixture(),before=f.raw.getItem(SETTINGS_KEY);f.raw.setItem('other-app','keep');
 const plan=prepareReset(f.storage);assert.equal(f.raw.getItem(DATA_HEAD),null);
 commitReset(f.storage,plan);
 const restored=readData(f.fresh());assert.equal(restored.sessions.length,0);
 assert.equal(f.fresh().getItem(SETTINGS_KEY),before);assert.equal(f.raw.getItem('other-app'),'keep');
});
test('failed reset leaves all original statistics and preferences intact',()=>{
 const f=fixture(),plan=prepareReset(f.storage),before=new Map(f.raw.values);
 f.raw.setItem=()=>{throw Error('storage denied');};
 assert.throws(()=>commitReset(f.storage,plan));assert.deepEqual(f.raw.values,before);
});
test('unreadable existing history is not silently merged or overwritten during preview',()=>{
 const f=fixture(),value=backup(f);f.raw.setItem(sessionStorageKey('broken'),'unreadable');
 const before=new Map(f.raw.values),plan=prepareImport(f.storage,value);
 assert.ok(plan.conflicts.length);assert.deepEqual(f.raw.values,before);
 assert.throws(()=>commitImport(f.storage,plan,'merge'));
});

test('merge preserves pending in-memory evidence after a failed session save',()=>{
 const f=fixture(),value=backup(f),write=f.raw.setItem;
 f.raw.setItem=()=>{throw Object.assign(Error('full'),{name:'QuotaExceededError'});};
 f.learning.saveRecord(recordFixture({id:'pending'}));
 assert.equal(f.learning.snapshot().pendingCount,1);
 f.raw.setItem=write;
 const plan=prepareImport(f.storage,value,f.learning.snapshot());
 assert.equal(plan.merge.sessions.length,2);
 commitImport(f.storage,plan,'merge');
 const restored=readData(f.fresh());
 assert.equal(restored.sessions.length,2);
 assert.ok(restored.sessions.some(record=>record.session.id==='pending'&&record.attempts.length===1));
});
