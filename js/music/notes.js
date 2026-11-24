export const LETTERS = Object.freeze(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
const PITCH_CLASSES = Object.freeze({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 });

/** Written spelling is retained independently of the sounding MIDI pitch. */
export function createNote(letter, octave, accidental = 0) {
  if (!LETTERS.includes(letter) || !Number.isInteger(octave) ||
      ![-1, 0, 1].includes(accidental)) {
    throw new RangeError('Invalid written note');
  }
  const midi = 12 * (octave + 1) + PITCH_CLASSES[letter] + accidental;
  if (midi < 0 || midi > 127) throw new RangeError('Pitch is outside the MIDI range');
  return Object.freeze({ midi, letter, accidental, octave });
}

export function diatonicIndex(note) {
  if (!LETTERS.includes(note.letter) || !Number.isInteger(note.octave)) {
    throw new RangeError('Invalid diatonic note');
  }
  return note.octave * 7 + LETTERS.indexOf(note.letter);
}

export function writtenName(note) {
  const accidental = note.accidental === -1 ? '♭' : note.accidental === 1 ? '♯' : '';
  return `${note.letter}${accidental}${note.octave}`;
}

export const PRACTICE_NOTES = Object.freeze([
  ...LETTERS.map(letter => createNote(letter, 4)),
  createNote('C', 5),
]);

/** Natural pitches selected by sounding MIDI bounds; endpoints may fall between naturals. */
export function naturalNotesBetween(minMidi, maxMidi) {
  if (!Number.isInteger(minMidi) || !Number.isInteger(maxMidi) ||
      minMidi < 0 || maxMidi > 127 || minMidi > maxMidi) throw new RangeError('Invalid MIDI range');
  const notes = [];
  for (let octave = -1; octave <= 9; octave++) {
    for (const letter of LETTERS) {
      const midi = 12 * (octave + 1) + PITCH_CLASSES[letter];
      if (midi >= minMidi && midi <= maxMidi) notes.push(createNote(letter, octave));
    }
  }
  return Object.freeze(notes);
}

/** Parse canonical written spelling without using the presentation convention. */
export function parseWrittenNote(value) {
  if (typeof value !== 'string') throw new RangeError('Invalid written note');
  const match = /^([A-G])([♭♯]?)(-?\d+)$/.exec(value);
  if (!match) throw new RangeError('Invalid written note');
  const note = createNote(match[1], Number(match[3]), match[2] === '♭' ? -1 : match[2] === '♯' ? 1 : 0);
  if (writtenName(note) !== value) throw new RangeError('Noncanonical written note');
  return note;
}
