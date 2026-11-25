import test from 'node:test';
import assert from 'node:assert/strict';
import { createNote, naturalNotesBetween } from '../js/music/notes.js';
import { bassPosition, treblePosition, notationLayout, renderNotation, notationViewport, notationStem } from '../js/music/notation.js';
import { PRESETS } from '../js/config.js';
import { CLEFS } from '../js/music/clefs.js';

test('bass staff lines are G2 B2 D3 F3 A3; middle C is the first ledger line above', () => {
  assert.deepEqual([['G',2],['B',2],['D',3],['F',3],['A',3]].map(args => bassPosition(createNote(...args))), [0,2,4,6,8]);
  assert.deepEqual(notationLayout(createNote('C',4),'bass'), {
    position:10, y:48, ledgerYs:[48], stemDirection:'down',
  });
  assert.equal(treblePosition(createNote('C',4)), -2);
});

for (const [clef, letter, octave, position, ledgers] of [
  ['treble','A',3,-4,[168,188]], ['treble','B',3,-3,[168]],
  ['treble','G',5,9,[]], ['treble','A',5,10,[48]], ['treble','B',5,11,[48]],
  ['treble','C',6,12,[48,28]],
  ['bass','C',2,-4,[168,188]], ['bass','D',2,-3,[168]],
  ['bass','E',2,-2,[168]], ['bass','F',2,-1,[]],
  ['bass','B',3,9,[]], ['bass','C',4,10,[48]], ['bass','D',4,11,[48]],
  ['bass','E',4,12,[48,28]],
]) {
  test(`${clef} ${letter}${octave} has accurate position, stem and ledger boundaries`, () => {
    const layout = notationLayout(createNote(letter,octave),clef);
    assert.equal(layout.position,position);
    assert.deepEqual(layout.ledgerYs,ledgers);
    assert.equal(layout.stemDirection,position>=4?'down':'up');
  });
}

test('all preset notes fit their SVG viewport with no notehead or stem clipping', () => {
  for (const preset of Object.values(PRESETS)) {
    for (const clef of ['mixed','grand'].includes(preset.clef) ? ['treble','bass'] : [preset.clef]) {
      const { minMidi,maxMidi } = preset.ranges[clef];
      for (const note of naturalNotesBetween(minMidi,maxMidi)) {
        const layout = notationLayout(note,clef);
        const viewport = notationViewport(layout);
        const stemEnd = notationStem(layout).endY;
        assert.ok(layout.y-13 > viewport.minY);
        assert.ok(layout.y+13 < viewport.minY+viewport.height);
        assert.ok(stemEnd >= viewport.minY && stemEnd <= viewport.minY+viewport.height);
        assert.match(renderNotation(note,'note',clef), new RegExp(`data-clef="${clef}"`));
      }
    }
  }
});

test('every custom C2–C6 pitch remains visible in either clef, including extreme ledger lines', () => {
  for (const clef of ['treble','bass']) {
    for (const note of naturalNotesBetween(36,84)) {
      const layout = notationLayout(note,clef);
      const viewport = notationViewport(layout);
      assert.ok(layout.y-13 > viewport.minY);
      assert.ok(layout.y+13 < viewport.minY+viewport.height);
    }
  }
});

test('bass vector dots straddle the F3 line and neither clef depends on fonts', () => {
  const f3 = notationLayout(createNote('F',3),'bass').y;
  assert.equal(f3,88);
  assert.match(CLEFS.bass.svg, /cy="78"/);
  assert.match(CLEFS.bass.svg, /cy="98"/);
  assert.doesNotMatch(CLEFS.bass.svg+CLEFS.treble.svg, /<text|font|https?:/);
  assert.throws(()=>notationLayout(createNote('C',4),'alto'),RangeError);
});

test('stems of distant ledger notes reach the middle staff line in both clefs', () => {
  for (const [clef, letter, octave] of [
    ['treble','A',3],['treble','C',6],['bass','C',2],['bass','E',4],
    ['treble','C',2],['bass','C',6],
  ]) {
    const note = createNote(letter, octave);
    assert.equal(notationStem(notationLayout(note, clef)).endY, 108);
    assert.match(renderNotation(note, 'note', clef), /y2="108" stroke-width="2.5"/);
  }
});
