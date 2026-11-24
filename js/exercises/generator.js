import { PRACTICE_NOTES } from '../music/notes.js';

/** Uniform selection, excluding the immediately preceding exact pitch. */
export function nextNote(previousMidi = null, random = Math.random) {
  const pool = PRACTICE_NOTES.filter(note => note.midi !== previousMidi);
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('Random source must produce a value in [0, 1)');
  }
  return pool[Math.floor(value * pool.length)];
}
