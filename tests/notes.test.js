import test from 'node:test';
import assert from 'node:assert/strict';
import { createNote, diatonicIndex, PRACTICE_NOTES, writtenName } from '../js/music/notes.js';
import { isCorrectAnswer } from '../js/exercises/single-note.js';

test('C4 is middle C, MIDI 60, and the range contains all eight natural pitches', () => {
  assert.deepEqual(createNote('C', 4), { midi: 60, letter: 'C', accidental: 0, octave: 4 });
  assert.deepEqual(PRACTICE_NOTES.map(note => note.midi), [60, 62, 64, 65, 67, 69, 71, 72]);
  assert.deepEqual(PRACTICE_NOTES.map(writtenName), ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']);
});

test('written spelling stays separate from MIDI pitch', () => {
  const cSharp = createNote('C', 4, 1);
  const dFlat = createNote('D', 4, -1);
  assert.equal(cSharp.midi, dFlat.midi);
  assert.notEqual(writtenName(cSharp), writtenName(dFlat));
  assert.notEqual(diatonicIndex(cSharp), diatonicIndex(dFlat));
});

test('B to C crosses one diatonic step and the correct octave', () => {
  assert.equal(diatonicIndex(createNote('C', 5)) - diatonicIndex(createNote('B', 4)), 1);
  assert.equal(createNote('C', 5).midi - createNote('B', 4).midi, 1);
});

test('note objects and the exercise pool cannot be accidentally mutated', () => {
  assert.ok(Object.isFrozen(PRACTICE_NOTES));
  assert.ok(PRACTICE_NOTES.every(Object.isFrozen));
});

test('invalid note spelling, octave, accidental and MIDI range are rejected', () => {
  for (const args of [['H', 4], ['c', 4], ['C', 4.5], ['C', 4, 2], ['C', -2], ['G', 10]]) {
    assert.throws(() => createNote(...args), RangeError);
  }
});

for (const note of PRACTICE_NOTES) {
  test(`letter validation for ${writtenName(note)} accepts precisely its letter`, () => {
    for (const answer of ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'H', 'c', '', 60]) {
      assert.equal(isCorrectAnswer(note, answer), answer === note.letter);
    }
  });
}
