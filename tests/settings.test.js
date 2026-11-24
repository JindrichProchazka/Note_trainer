import test from 'node:test';
import assert from 'node:assert/strict';
import { createSettingsStore,SETTINGS_KEY,validateSettings } from '../js/data/settings.js';
import { DEFAULT_SETTINGS } from '../js/config.js';
function memory(raw=null){
  const values=new Map(raw===null?[]:[[SETTINGS_KEY,raw]]);
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),values};
}
test('new users get Czech naming and defaults; saved preferences survive a new store instance',()=>{
  const storage=memory();
  const store=createSettingsStore(()=>storage);
  assert.deepEqual(store.load(),{settings:DEFAULT_SETTINGS,status:'ok'});
  const preferences={theme:'dark',naming:'international',defaultPreset:'bass-extended',defaultSessionType:'timed'};
  assert.equal(store.save(preferences).saved,true);
  assert.deepEqual(createSettingsStore(()=>storage).load().settings,preferences);
  assert.equal(JSON.parse(storage.getItem(SETTINGS_KEY)).schemaVersion,1);
});
test('partial compatible settings use defaults and preserve unknown fields when saved',()=>{
  const storage=memory(JSON.stringify({schemaVersion:1,extra:'preserve',settings:{theme:'light',future:42}}));
  const store=createSettingsStore(()=>storage);
  assert.equal(store.load().settings.naming,'czech');
  store.save({...DEFAULT_SETTINGS,theme:'dark'});
  const value=JSON.parse(storage.getItem(SETTINGS_KEY));
  assert.equal(value.extra,'preserve');assert.equal(value.settings.future,42);
});
test('unreadable and invalid settings are left untouched and cannot be overwritten',()=>{
  for(const raw of ['bad JSON','null','[]',JSON.stringify({schemaVersion:1,settings:{theme:'bad'}}),
    JSON.stringify({schemaVersion:1,settings:[]})]){
    const storage=memory(raw),store=createSettingsStore(()=>storage);
    assert.equal(store.load().status,'invalid');
    assert.equal(store.save(DEFAULT_SETTINGS).saved,false);
    assert.equal(storage.getItem(SETTINGS_KEY),raw);
  }
});
test('future and older unsupported schemas are preserved without guessing migrations',()=>{
  for(const schemaVersion of [0,2]){
    const raw=JSON.stringify({schemaVersion,settings:{theme:'dark'}});
    const storage=memory(raw),store=createSettingsStore(()=>storage);
    assert.equal(store.load().status,'unsupported');
    assert.equal(store.save(DEFAULT_SETTINGS).saved,false);
    assert.equal(storage.getItem(SETTINGS_KEY),raw);
  }
});
test('denied storage and quota failures safely fall back to in-memory preferences',()=>{
  const denied=createSettingsStore(()=>{throw new Error('denied');});
  assert.equal(denied.load().status,'unavailable');
  assert.equal(denied.save(DEFAULT_SETTINGS).saved,false);
  const storage=memory();storage.setItem=()=>{throw new Error('quota');};
  const quota=createSettingsStore(()=>storage);
  quota.load();assert.equal(quota.save(DEFAULT_SETTINGS).saved,false);
  assert.equal(storage.getItem(SETTINGS_KEY),null);
});
test('settings validation rejects malformed values and never touches other app data',()=>{
  const storage=memory();storage.values.set('notetrainer.progress','existing learning data');
  const store=createSettingsStore(()=>storage);
  store.load();store.save(DEFAULT_SETTINGS);
  assert.equal(storage.values.get('notetrainer.progress'),'existing learning data');
  for(const patch of [{naming:'H'},{defaultPreset:'custom'},{defaultSessionType:'infinite'},{theme:null}]){
    assert.throws(()=>validateSettings({...DEFAULT_SETTINGS,...patch}),TypeError);
  }
});

test('data made unreadable or upgraded by another tab after loading is not overwritten',()=>{
  for(const raw of ['malformed',JSON.stringify({schemaVersion:2,settings:{theme:'dark'}})]){
    const storage=memory(),store=createSettingsStore(()=>storage);
    store.load();
    storage.setItem(SETTINGS_KEY,raw);
    assert.equal(store.save(DEFAULT_SETTINGS).saved,false);
    assert.equal(storage.getItem(SETTINGS_KEY),raw);
  }
});
