import { APP_VERSION } from '../version.js';
import { LEARNING_KEY, LEARNING_VERSION, SESSION_PREFIX, DataError, isObject, validTimestamp } from './schema.js';
import { SETTINGS_KEY, SETTINGS_VERSION, validateSettings } from './settings.js';
import { migrateManifest, migrateSessionRecord } from './migrations.js';
import { mergeSessionRecords } from './storage.js';
export const BACKUP_VERSION=1, MAX_BACKUP_BYTES=20*1024*1024;
const copy=value=>JSON.parse(JSON.stringify(value));
const invalid=message=>{throw new DataError('invalid',message);};
export function canonical(value) {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(isObject(value))return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
  return JSON.stringify(value);
}
function preferences(value) {
  if(value===null)return {schemaVersion:SETTINGS_VERSION,settings:{...validateSettings({})}};
  if(!isObject(value)||value.schemaVersion!==SETTINGS_VERSION||!isObject(value.settings))invalid('Unsupported or invalid preferences');
  return {...copy(value),settings:{...value.settings,...validateSettings(value.settings)}};
}
export function normalizeData(data,now=Date.now()){
  if(!isObject(data)||!Array.isArray(data.sessions))invalid('Missing learning data');
  const sessions=data.sessions.map(record=>migrateSessionRecord(copy(record)));
  const ids=new Set(),attemptIds=new Set();
  for(const record of sessions){
    if(ids.has(record.session.id))invalid('Duplicate session ID');
    ids.add(record.session.id);
    for(const attempt of record.attempts){
      if(attemptIds.has(attempt.id))invalid('Duplicate attempt ID');
      attemptIds.add(attempt.id);
    }
  }
  return {preferences:preferences(data.preferences),learning:migrateManifest(data.learning,now),sessions};
}
export function readData(storage){
  const documents=storage.documents(),sessions=[];
  for(const [key,raw] of Object.entries(documents))if(key.startsWith(SESSION_PREFIX)){
    const value=JSON.parse(raw);
    if(key!==SESSION_PREFIX+value?.session?.id)invalid('Session key mismatch');
    sessions.push(value);
  }
  return normalizeData({preferences:documents[SETTINGS_KEY]?JSON.parse(documents[SETTINGS_KEY]):null,
    learning:documents[LEARNING_KEY]?JSON.parse(documents[LEARNING_KEY]):null,sessions});
}
export function validateBackup(input){
  if(typeof input==='string'){
    if(new TextEncoder().encode(input).length>MAX_BACKUP_BYTES)invalid('Backup exceeds 20 MB');
    try{input=JSON.parse(input);}catch{invalid('The file is not valid JSON');}
  }
  if(!isObject(input)||input.format!=='notetrainer-backup'||input.schemaVersion!==BACKUP_VERSION||
      !validTimestamp(input.exportedAt)||typeof input.appVersion!=='string'||
      !/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(input.appVersion)||
      ![1,LEARNING_VERSION].includes(input.learningSchemaVersion))invalid('Unsupported or invalid backup format');
  return {...copy(input),data:normalizeData(input.data,Date.parse(input.exportedAt))};
}
function includeSnapshot(data,snapshot){
  if(!snapshot)return data;
  if(snapshot.unreadableCount)invalid('Some saved sessions are unreadable. Existing data was left untouched.');
  const records=new Map(data.sessions.map(record=>[record.session.id,record]));
  for(const record of snapshot.sessions)records.set(record.session.id,records.has(record.session.id)?mergeRecord(records.get(record.session.id),record):record);
  return {...data,sessions:[...records.values()]};
}
export function createBackup(storage,snapshot,settings,now=Date.now()){
  const data=includeSnapshot(readData(storage),snapshot);
  data.preferences.settings={...data.preferences.settings,...settings};
  return validateBackup({format:'notetrainer-backup',schemaVersion:BACKUP_VERSION,exportedAt:new Date(now).toISOString(),
    appVersion:APP_VERSION,learningSchemaVersion:LEARNING_VERSION,data});
}
export const backupFilename=backup=>'notetrainer-backup-'+backup.exportedAt.replaceAll(':','-').replace('.000','')+'.json';
function documents(data){
  return {[SETTINGS_KEY]:JSON.stringify(data.preferences),[LEARNING_KEY]:JSON.stringify(data.learning),
    ...Object.fromEntries(data.sessions.map(record=>[SESSION_PREFIX+record.session.id,JSON.stringify(record)]))};
}
const interrupted=record=>record.session.status!=='in-progress'?record:{...record,session:{...record.session,
  status:'interrupted',interruptedAt:record.session.updatedAt}};
function mergeRecord(a,b){
  if(canonical(a)===canonical(b))return a;
  const terminal=record=>record.session.status!=='in-progress';
  if(terminal(a)&&terminal(b))throw new DataError('conflict','Different historical results');
  if(!terminal(a)&&!terminal(b)&&Date.parse(a.session.updatedAt)>Date.parse(b.session.updatedAt))[a,b]=[b,a];
  const old=terminal(a)?b:a,next=terminal(a)?a:b;
  const merged=mergeSessionRecords(old,next);
  if(terminal(next)){
    if(canonical(merged.attempts)!==canonical(next.attempts)||
       canonical(merged.activity)!==canonical(next.activity)||
       canonical(merged.sequences??[])!==canonical(next.sequences??[])||canonical(merged.pairs??[])!==canonical(next.pairs??[]))throw new DataError('conflict','Evidence conflicts with a completed session');
    return next;
  }
  return merged;
}
export function prepareImport(storage,input,snapshot){
  const backup=validateBackup(input),fingerprint=storage.fingerprint();
  const incoming=backup.data;
  const conflicts=[],combined=new Map();
  let addedAttempts=0,newSessions=0,duplicateSessions=0,merge=null;
  try{
    const current=includeSnapshot(readData(storage),snapshot);
    current.sessions.forEach(record=>combined.set(record.session.id,record));
    for(const record of incoming.sessions){
      const prior=combined.get(record.session.id);
      if(!prior){combined.set(record.session.id,record);newSessions++;addedAttempts+=record.attempts.length;continue;}
      duplicateSessions++;
      try{
        const merged=mergeRecord(prior,record);combined.set(record.session.id,merged);
        addedAttempts+=merged.attempts.length-prior.attempts.length;
      }catch(error){conflicts.push(record.session.id+': '+(error.message||'conflicting evidence'));}
    }
    if(!conflicts.length)merge=normalizeData({...current,sessions:[...combined.values()].map(interrupted)});
  }catch(error){conflicts.push(error.message||'Existing history cannot be merged');}
  return {fingerprint,backup,replace:{...incoming,sessions:incoming.sessions.map(interrupted)},merge,conflicts,
    preview:{sessions:incoming.sessions.length,attempts:incoming.sessions.reduce((n,r)=>n+r.attempts.length,0),
      completed:incoming.sessions.filter(r=>r.session.status==='completed').length,newSessions,duplicateSessions,addedAttempts}};
}
export function commitImport(storage,plan,mode){
  if(!['merge','replace'].includes(mode))invalid('Choose merge or replace');
  const data=mode==='merge'?plan.merge:plan.replace;
  if(!data||mode==='merge'&&plan.conflicts.length)throw new DataError('conflict','Resolve conflicts or explicitly choose Replace');
  const normalized=normalizeData(data);
  return storage.commit(documents(normalized),plan.fingerprint);
}
export function prepareReset(storage){
  const fingerprint=storage.fingerprint(),raw=storage.documents();
  if(storage.fingerprint()!==fingerprint)throw new DataError('conflict','Data changed. Try again.');
  return {fingerprint,preferences:raw[SETTINGS_KEY]??null};
}
export function commitReset(storage,plan){
  const next={[LEARNING_KEY]:JSON.stringify(migrateManifest(null))};
  if(plan.preferences!==null)next[SETTINGS_KEY]=plan.preferences;
  return storage.commit(next,plan.fingerprint);
}
