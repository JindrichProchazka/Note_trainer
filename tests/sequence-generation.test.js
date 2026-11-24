import test from 'node:test';
import assert from 'node:assert/strict';
import { SEQUENCE_LENGTHS, SEQUENCE_STRATEGIES, INTERVAL_MIXES } from '../js/config.js';
import { validateConfiguration } from '../js/exercises/configuration.js';
import { createSequenceGenerator } from '../js/exercises/sequence.js';
import { diatonicIndex } from '../js/music/notes.js';
import { sequenceConfig, seededRandom } from './helpers/sequence-fixtures.js';

for (const length of SEQUENCE_LENGTHS) for (const strategy of Object.keys(SEQUENCE_STRATEGIES)) {
  test(strategy + ' produces ' + length + ' valid, bounded notes in either selected clef', () => {
    const generate = createSequenceGenerator(sequenceConfig({
      presetId: 'custom', clef: 'mixed', sequenceLength: length, sequenceStrategy: strategy,
      ranges: { treble: { minMidi: 60, maxMidi: 84 }, bass: { minMidi: 36, maxMidi: 64 } },
    }), seededRandom());
    const clefs = new Set();
    for (let run = 0; run < 30; run++) {
      const result = generate();
      clefs.add(result.clef);
      assert.equal(result.notes.length, length);
      assert.ok(Object.isFrozen(result.notes));
      const bounds = result.clef === 'treble' ? [60, 84] : [36, 64];
      for (const note of result.notes) {
        assert.ok(note.midi >= bounds[0] && note.midi <= bounds[1]);
        assert.equal(note.accidental, 0);
        assert.match(note.letter, /^[A-G]$/);
      }
    }
    assert.deepEqual([...clefs].sort(), ['bass', 'treble']);
  });
}

test('new sequence configuration defaults to five notes with valid options', () => {
  const config = validateConfiguration(sequenceConfig());
  assert.equal(config.sequenceLength, 5);
  assert.equal(config.sequenceStrategy, 'random');
  assert.equal(config.feedbackMode, 'immediate');
  assert.equal(config.intervalMix, 'balanced');
  assert.ok(Object.isFrozen(config));
  for (const patch of [{ sequenceLength: 4 }, { sequenceLength: '5' }, { sequenceStrategy: 'adaptive' },
    { feedbackMode: 'other' }, { intervalMix: 'other' }, { exerciseType: 'piano' }]) {
    assert.throws(() => validateConfiguration(sequenceConfig(patch)));
  }
});

test('all strategies terminate for one- and two-pitch ranges at random boundaries', () => {
  for (const strategy of Object.keys(SEQUENCE_STRATEGIES)) for (const maxMidi of [60, 62]) for (const value of [0, .999999]) {
    const generate = createSequenceGenerator(sequenceConfig({
      presetId: 'custom', sequenceLength: 16, sequenceStrategy: strategy,
      ranges: { treble: { minMidi: 60, maxMidi }, bass: { minMidi: 43, maxMidi: 57 } },
    }), () => value);
    const result = generate();
    assert.equal(result.notes.length, 16);
    assert.ok(result.notes.every(note => note.midi >= 60 && note.midi <= maxMidi));
  }
});

test('deterministic sources reproduce sequences and invalid sources fail clearly', () => {
  const first = createSequenceGenerator(sequenceConfig({ sequenceStrategy: 'melodic', sequenceLength: 16 }), seededRandom(17));
  const second = createSequenceGenerator(sequenceConfig({ sequenceStrategy: 'melodic', sequenceLength: 16 }), seededRandom(17));
  assert.deepEqual(first(), second());
  assert.deepEqual(first(), second());
  for (const value of [-1, 1, NaN, Infinity]) assert.throws(() => createSequenceGenerator(sequenceConfig(), () => value)());
  assert.throws(() => first(0)); assert.throws(() => first(17));
});

test('random notes are independent and intentionally may repeat', () => {
  const result = createSequenceGenerator(sequenceConfig(), () => 0)();
  assert.ok(result.notes.every(note => note.midi === 60));
});

test('stepwise generation predominantly uses adjacent diatonic movements', () => {
  const generate = createSequenceGenerator(sequenceConfig({ sequenceStrategy: 'stepwise', sequenceLength: 16 }), seededRandom());
  const steps = Array.from({ length: 60 }, () => {
    const notes = generate().notes.map(diatonicIndex);
    return notes.slice(1).map((note, index) => Math.abs(note - notes[index]));
  }).flat();
  assert.ok(steps.filter(step => step === 1).length / steps.length > .75);
  assert.ok(steps.every(step => step <= 2));
});

test('melodic contours include rises, falls and repeated notes without external compositions', () => {
  const result = createSequenceGenerator(sequenceConfig({ sequenceStrategy: 'melodic', sequenceLength: 16 }), seededRandom(13))();
  const steps = result.notes.slice(1).map((note, index) => diatonicIndex(note) - diatonicIndex(result.notes[index]));
  assert.ok(steps.some(step => step > 0)); assert.ok(steps.some(step => step < 0)); assert.ok(steps.includes(0));
  assert.ok(steps.every(step => Math.abs(step) <= 2));
});

test('repetition strategy always includes an intentional first repetition', () => {
  const result = createSequenceGenerator(sequenceConfig({ sequenceStrategy: 'repeated' }), seededRandom(7))();
  assert.equal(result.notes[0].midi, result.notes[1].midi);
});

test('mixed interval varieties constrain small movements and make larger movements available', () => {
  for (const mix of Object.keys(INTERVAL_MIXES)) {
    const generate = createSequenceGenerator(sequenceConfig({ presetId: 'custom', sequenceLength: 16,
      sequenceStrategy: 'intervals', intervalMix: mix, ranges: { treble: { minMidi: 36, maxMidi: 84 } } }), seededRandom(3));
    const steps = Array.from({ length: 20 }, () => {
      const notes = generate().notes.map(diatonicIndex);
      return notes.slice(1).map((note, index) => Math.abs(note - notes[index]));
    }).flat();
    assert.ok(steps.every(step => step <= (mix === 'small' ? 3 : mix === 'wide' ? 8 : 7)));
    if (mix !== 'small') assert.ok(steps.some(step => step >= 4));
  }
});
