import test from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE_NOTES } from '../js/music/notes.js';
import { nextNote } from '../js/exercises/generator.js';
import { isCorrectAnswer } from '../js/exercises/single-note.js';

test('each eligible natural note is reachable by uniform generation', () => {
  const generated = Array.from({ length: 8 }, (_, index) => nextNote(null, () => (index + 0.5) / 8));
  assert.deepEqual(generated, PRACTICE_NOTES);
});

test('every question has a letter answer and stays within C4–C5', () => {
  for (let index = 0; index < 1000; index++) {
    const note = nextNote(null, () => index / 1000);
    assert.ok(note.midi >= 60 && note.midi <= 72);
    assert.equal(note.accidental, 0);
    assert.equal(isCorrectAnswer(note, note.letter), true);
  }
});

test('every previous pitch is excluded without a retry loop', () => {
  for (const previous of PRACTICE_NOTES) {
    const results = Array.from({ length: 7 }, (_, index) => nextNote(previous.midi, () => (index + 0.5) / 7));
    assert.equal(new Set(results.map(note => note.midi)).size, 7);
    assert.ok(results.every(note => note.midi !== previous.midi));
  }
});

test('random boundary values are deterministic and invalid sources are rejected', () => {
  assert.equal(nextNote(null, () => 0).midi, 60);
  assert.equal(nextNote(null, () => 0.999999).midi, 72);
  for (const value of [-1, 1, NaN, Infinity]) {
    assert.throws(() => nextNote(null, () => value), RangeError);
  }
});
