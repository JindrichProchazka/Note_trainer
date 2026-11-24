import test from 'node:test';
import assert from 'node:assert/strict';
import { createNote } from '../js/music/notes.js';
import { keyboardAnswer,letterName,noteName,writtenNoteName } from '../js/ui/note-names.js';
test('Czech names use H for B natural while the canonical note remains B',()=>{
  const note=createNote('B',4);
  assert.equal(letterName('B','czech'),'H');
  assert.equal(noteName(note,'czech'),'H4');
  assert.equal(noteName(note,'international'),'B4');
  assert.equal(writtenNoteName('B5','czech'),'H5');
  assert.equal(note.letter,'B');
});
test('B-flat and Czech B are distinct from B natural and Czech H',()=>{
  assert.equal(noteName(createNote('B',3,-1),'international'),'B♭3');
  assert.equal(noteName(createNote('B',3,-1),'czech'),'B3');
  assert.equal(writtenNoteName('B♭3','czech'),'B3');
});
test('keyboard naming is strict, case-insensitive and does not require an octave',()=>{
  for(const letter of ['C','D','E','F','G','A']){
    assert.equal(keyboardAnswer(letter.toLowerCase(),'czech'),letter);
    assert.equal(keyboardAnswer(letter,'international'),letter);
  }
  assert.equal(keyboardAnswer('h','czech'),'B');
  assert.equal(keyboardAnswer('b','czech'),null);
  assert.equal(keyboardAnswer('b','international'),'B');
  assert.equal(keyboardAnswer('H','international'),null);
  for(const invalid of ['B4','C4','Enter','',null,60])assert.equal(keyboardAnswer(invalid,'czech'),null);
});
