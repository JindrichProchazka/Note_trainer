import { createNote } from './notes.js';
const SPELLINGS = Object.freeze([['C',0],['C',1],['D',0],['D',1],['E',0],['F',0],['F',1],['G',0],['G',1],['A',0],['A',1],['B',0]]);
export function midiNote(midi) {
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) throw new RangeError('Invalid MIDI pitch');
  const [letter, accidental] = SPELLINGS[midi % 12];
  return createNote(letter, Math.floor(midi / 12) - 1, accidental);
}
export function pianoKeys(min, max) {
  midiNote(min); midiNote(max);
  if (min > max) throw new RangeError('Invalid keyboard range');
  const keys = []; let whites = 0;
  for (let midi = min; midi <= max; midi++) {
    const note = midiNote(midi), black = note.accidental !== 0;
    keys.push({ midi, note, black, left: black ? whites * 48 - 16 : whites * 48 });
    if (!black) whites++;
  }
  // Include a leading partial black key without clipping it.
  const shift = keys[0].black ? 16 : 0;
  return { keys: keys.map(key => ({ ...key, left: key.left + shift })), width: whites * 48 + shift + (keys.at(-1).black ? 16 : 0) };
}
