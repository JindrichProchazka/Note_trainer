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

export function createQuestionGenerator(input, random = Math.random, learning = {}) {
  const config = validateConfiguration(input);
  const clefs = activeClefs(config);
  const pools = Object.fromEntries(clefs.map(clef => [clef,
    naturalNotesBetween(config.ranges[clef].minMidi, config.ranges[clef].maxMidi)]));
  return previous => {
    // Choose clefs equally, independently of the number of notes in their ranges.
    const clef = clefs.length === 1 ? clefs[0] : clefs[randomIndex(clefs.length, random)];
    const previousMidi = previous?.clef === clef ? previous.note.midi : null;
    return Object.freeze({ clef, note: config.selectionMode && config.selectionMode!=='uniform' ? adaptiveNote(pools[clef],clef,config,learning.getAttempts?.() ?? [],previousMidi,random,learning.now?.() ?? Date.now()) : nextNote(previousMidi, random, pools[clef]) });
  };
}
