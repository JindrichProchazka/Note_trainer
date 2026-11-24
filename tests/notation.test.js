import test from 'node:test';
import assert from 'node:assert/strict';
import { createNote, PRACTICE_NOTES, writtenName } from '../js/music/notes.js';
import { STAFF, treblePosition, ledgerPositions, notationLayout, renderNotation } from '../js/music/notation.js';

// Independently specified musical expectations: bottom E4 is 0; each space/line is one step.
const expected = [
  ['C4', -2, 168, [168], 'up'],
  ['D4', -1, 158, [], 'up'],
  ['E4', 0, 148, [], 'up'],
  ['F4', 1, 138, [], 'up'],
  ['G4', 2, 128, [], 'up'],
  ['A4', 3, 118, [], 'up'],
  ['B4', 4, 108, [], 'down'],
  ['C5', 5, 98, [], 'down'],
];
for (const [index, [name, position, y, ledgerYs, stemDirection]] of expected.entries()) {
  test(`${name} has the correct treble position, stem and ledger lines`, () => {
    const note = PRACTICE_NOTES[index];
    assert.equal(writtenName(note), name);
    assert.deepEqual(notationLayout(note), { position, y, ledgerYs, stemDirection });
    const svg = renderNotation(note, 'Identify the note');
    assert.match(svg, new RegExp(`cy="${y}"`));
    assert.match(svg, new RegExp(`data-position="${position}"`));
  });
}

test('treble reference staff lines are E4, G4, B4, D5, F5', () => {
  const notes = [createNote('E', 4), createNote('G', 4), createNote('B', 4), createNote('D', 5), createNote('F', 5)];
  assert.deepEqual(notes.map(treblePosition), [0, 2, 4, 6, 8]);
});

test('ledger lines appear at even positions only, never in adjacent spaces', () => {
  assert.deepEqual(ledgerPositions(-1), []);
  assert.deepEqual(ledgerPositions(-2), [-2]);
  assert.deepEqual(ledgerPositions(-3), [-2]);
  assert.deepEqual(ledgerPositions(-4), [-2, -4]);
  assert.deepEqual(ledgerPositions(9), []);
  assert.deepEqual(ledgerPositions(10), [10]);
  assert.deepEqual(ledgerPositions(11), [10]);
  assert.deepEqual(ledgerPositions(12), [10, 12]);
  assert.throws(() => ledgerPositions(0.5), RangeError);
});

test('accidentals affect MIDI but not the written staff position', () => {
  assert.equal(treblePosition(createNote('C', 4)), treblePosition(createNote('C', 4, 1)));
  assert.throws(() => renderNotation(createNote('C', 4, 1), 'note'), RangeError);
});

test('SVG uses five staff lines, an original vector clef and no system music glyphs', () => {
  const svg = renderNotation(createNote('C', 4), 'Identify <this> & "that"');
  const staff = svg.split('<g class="clef"')[0];
  assert.equal((staff.match(/<line /g) ?? []).length, 5);
  assert.match(svg, /aria-label="Identify &lt;this&gt; &amp; &quot;that&quot;"/);
  assert.doesNotMatch(svg, /<text|<image|<use|font-family/);
  assert.match(svg, new RegExp(`x1="${STAFF.noteX - 23}"`));
});
