import { DataError } from './schema.js';
export const DATA_HEAD='notetrainer.data-head';
export const GENERATION_PREFIX='notetrainer.generation.';
export const managedKey=key=>key==='notetrainer.settings'||key==='notetrainer.learning'||key.startsWith('notetrainer.session.');
const fingerprint=documents=>JSON.stringify(Object.entries(documents).sort(([a],[b])=>a.localeCompare(b)));
let counter=0;
/** Legacy keys stay readable. Imports switch generations with one atomic pointer write. */
export function createManagedStorage(getStorage=()=>globalThis.localStorage,makeId=()=>globalThis.crypto?.randomUUID?.()??Date.now()+'-'+(++counter)) {
  let revision;
  function current(){
    const raw=getStorage(),head=raw.getItem(DATA_HEAD);
    if(head!==null&&!/^[A-Za-z0-9_-]{1,100}$/.test(head))throw new DataError('invalid','Invalid data generation');
    if(revision===undefined)revision=head;
    if(head!==revision)throw new DataError('conflict','Data changed in another tab. Reload before saving.');
    return {raw,prefix:head===null?'':GENERATION_PREFIX+head+'.'};
  }
  function keys(){
    const {raw,prefix}=current(),result=[];
    for(let i=0;i<raw.length;i++){
      const key=raw.key(i);
      if(prefix?key?.startsWith(prefix):managedKey(key??'')){
        const logical=prefix?key.slice(prefix.length):key;
        if(managedKey(logical))result.push(logical);
      }
    }
    return result.sort();
  }
  const adapter={
    get length(){return keys().length;},
    key:index=>keys()[index]??null,
    getItem(key){const {raw,prefix}=current();return managedKey(key)?raw.getItem(prefix+key):null;},
    setItem(key,value){if(!managedKey(key))throw new DataError('invalid');const {raw,prefix}=current();raw.setItem(prefix+key,String(value));},
    removeItem(key){if(!managedKey(key))throw new DataError('invalid');const {raw,prefix}=current();raw.removeItem(prefix+key);},
    documents(){return Object.fromEntries(keys().map(key=>[key,adapter.getItem(key)]));},
    fingerprint(){return fingerprint(adapter.documents());},
    acceptsEvent(key){
      if(key===null||key===DATA_HEAD)return true;
      if(revision===undefined)current();
      const prefix=revision===null?'':GENERATION_PREFIX+revision+'.';
      return prefix?key?.startsWith(prefix)&&managedKey(key.slice(prefix.length)):managedKey(key??'');
    },
    commit(documents,expected){
      const {raw}=current();
      if(adapter.fingerprint()!==expected)throw new DataError('conflict','Saved data changed since the preview. Preview again.');
      if(Object.entries(documents).some(([key,value])=>!managedKey(key)||typeof value!=='string'))throw new DataError('invalid');
      const id=makeId();
      if(!/^[A-Za-z0-9_-]{1,100}$/.test(id))throw new DataError('invalid');
      const prefix=GENERATION_PREFIX+id+'.',written=[];
      for(let i=0;i<raw.length;i++)if(raw.key(i)?.startsWith(prefix))throw new DataError('conflict','Generation already exists');
      try {
        for(const [key,value] of Object.entries(documents)){
          const target=prefix+key;raw.setItem(target,value);written.push(target);
          if(raw.getItem(target)!==value)throw new Error('Staged data verification failed');
        }
        if(adapter.fingerprint()!==expected)throw new DataError('conflict','Saved data changed during import. Preview again.');
        raw.setItem(DATA_HEAD,id); // Commit point: no fallible writes or cleanup after this line.
        return {committed:true};
      } catch(error) {
        for(const key of written)try{raw.removeItem(key);}catch{/* Inactive staging is harmless. */}
        throw error;
      }
    },
  };
  return adapter;
}
export const isDataStorageEvent=key=>key===null||key===DATA_HEAD||key?.startsWith(GENERATION_PREFIX)||managedKey(key??'');
