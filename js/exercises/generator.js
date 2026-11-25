import { distributionWeight } from './distribution.js';
import { weightedPick } from '../learning/adaptive.js';
import { adaptiveNote } from '../learning/adaptive.js';
import { PRACTICE_NOTES, naturalNotesBetween } from '../music/notes.js';
import { activeClefs, validateConfiguration } from './configuration.js';

function randomIndex(length, random) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('Random source must produce a value in [0, 1)');
  }
  return Math.floor(value * length);
}

/** Uniform selection excluding the preceding pitch, unless only one pitch is eligible. */
export function nextNote(previousMidi = null, random = Math.random, notes = PRACTICE_NOTES) {
  if (!Array.isArray(notes) || !notes.length) throw new RangeError('A note range cannot be empty');
  const alternatives = notes.filter(note => note.midi !== previousMidi);
  const pool = alternatives.length ? alternatives : notes;
  return pool[randomIndex(pool.length, random)];
}

export function selectQuestionNote(notes,clef,config,previousMidi,random,learning){
  if(config.presetVersion===2 && config.presetId.endsWith('-random'))return notes[randomIndex(notes.length,random)];
  if(config.selectionMode && config.selectionMode!=='uniform')return adaptiveNote(notes,clef,config,learning.getAttempts?.() ?? [],previousMidi,random,learning.now?.() ?? Date.now());
  if(config.noteDistribution==='extended'){
    const alternatives=notes.filter(note=>note.midi!==previousMidi),pool=alternatives.length?alternatives:notes;
    return weightedPick(pool,pool.map(note=>distributionWeight(note,clef,config)),random);
  }
  return nextNote(previousMidi,random,notes);
}
export function createQuestionGenerator(input, random = Math.random, learning = {}) {
  const config = validateConfiguration(input), clefs = activeClefs(config);
  const pools=Object.fromEntries(clefs.map(clef=>[clef,naturalNotesBetween(config.ranges[clef].minMidi,config.ranges[clef].maxMidi)]));
  return previous=>{
    if(config.exerciseType==='grand-staff')return Object.freeze({clef:'grand',notes:Object.freeze(Object.fromEntries(clefs.map(clef=>[clef,
      selectQuestionNote(pools[clef],clef,config,previous?.notes?.[clef]?.midi,random,learning)])))});
    const clef=clefs.length===1?clefs[0]:clefs[randomIndex(clefs.length,random)];
    return Object.freeze({clef,note:selectQuestionNote(pools[clef],clef,config,previous?.clef===clef?previous.note.midi:null,random,learning)});
  };
}
