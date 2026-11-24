import { midiNote } from '../music/piano.js';
// Presentation and answer input only. Music and recorded answers always use international letters.
import { LETTERS } from '../music/notes.js';

export function letterName(letter, naming = 'international') {
  return naming === 'czech' && letter === 'B' ? 'H' : letter;
}

export function noteName(note, naming = 'international') {
  const flatB = naming === 'czech' && note.letter === 'B' && note.accidental === -1;
  const letter = flatB ? 'B' : letterName(note.letter, naming);
  const accidental = flatB ? '' : note.accidental === -1 ? '♭' : note.accidental === 1 ? '♯' : '';
  return `${letter}${accidental}${note.octave}`;
}

export function writtenNoteName(name, naming = 'international') {
  const match = /^([A-G])([♭♯]?)(-?\d+)$/.exec(name);
  if (!match) throw new RangeError('Invalid written note name');
  return noteName({
    letter: match[1], accidental: match[2] === '♭' ? -1 : match[2] === '♯' ? 1 : 0,
    octave: Number(match[3]),
  }, naming);
}

export function keyboardAnswer(key, naming = 'international') {
  if (typeof key !== 'string') return null;
  const letter = key.toUpperCase();
  if (naming === 'czech') {
    if (letter === 'H') return 'B';
    if (letter === 'B') return null; // Czech B means B-flat, which is not a natural-note answer.
  }
  return LETTERS.includes(letter) ? letter : null;
}

export const answerName = (answer,naming) => typeof answer === 'number' ? noteName(midiNote(answer),naming) : letterName(answer,naming);
