import test from 'node:test';
import assert from 'node:assert/strict';
import { pianoKeys } from '../js/music/piano.js';
import { PracticeSession } from '../js/session/session.js';
import { SequenceSession } from '../js/session/sequence-session.js';
import { configurationForPreset, validateConfiguration } from '../js/exercises/configuration.js';
import { pianoMarkup } from '../js/ui/piano-keyboard.js';
import { recordFromSession } from '../js/data/recording.js';
import { validateSessionRecord } from '../js/data/schema.js';
import { contextId } from '../js/learning/context.js';
import { sequenceNotationMarkup } from '../js/ui/sequence-practice.js';

const config = patch => configurationForPreset('treble-basic',{inputMethod:'piano',...patch});
test('piano arrangement has the correct white keys and groups of two and three black keys',()=>{
 const {keys}=pianoKeys(60,72);
 assert.deepEqual(keys.filter(k=>k.black).map(k=>k.midi),[61,63,66,68,70]);
 assert.equal(keys.filter(k=>!k.black).length,8);
 assert.equal(keys.find(k=>k.midi===61).left,32);
 assert.equal(keys.find(k=>k.midi===64).left,96);
 assert.equal(pianoKeys(61,63).keys[0].left,0);
});
test('piano configuration defaults to unlabelled keys and rejects a range excluding targets',()=>{
 const c=config(); assert.equal(c.noteLabels,false);
 assert.throws(()=>config({keyboardMin:61}));
 assert.throws(()=>config({keyboardMax:71}));
 assert.throws(()=>config({noteLabels:'false'}));
 assert.doesNotMatch(pianoMarkup(c),/<span>[A-H][♯♭]?\d/);
 assert.match(pianoMarkup(config({noteLabels:true})),/<span>C4/);
});
test('piano validates exact MIDI and octave, not merely letter',()=>{
 const s=new PracticeSession({config:config(),random:()=>0,clock:()=>0});
 s.start();s.markReady();
 assert.equal(s.submit('C'),null);
 const wrong=s.submit(72); assert.equal(wrong.correct,false);
 s.advance();s.markReady(); const pitch=s.question.note.midi;
 assert.equal(s.submit(pitch).correct,true);
});
test('piano attempts persist exact numeric submitted answers with separate contexts',()=>{
 const s=new PracticeSession({config:config(),random:()=>0,clock:()=>0});
 s.start();s.markReady();s.submit(61);
 const record=recordFromSession(s,{ownerId:'owner',tabId:'tab'});
 validateSessionRecord(record);
 assert.equal(record.attempts[0].answer,61);
 const a=record.attempts[0]; assert.notEqual(a.contextId,contextId({...a,inputMethod:'letter'}));
 const bad=structuredClone(record);bad.attempts[0].correct=true;
 assert.throws(()=>validateSessionRecord(bad));
});
test('piano sequences preserve delayed feedback and count individual pitches',()=>{
 const s=new SequenceSession({config:config({exerciseType:'sequence',feedbackMode:'delayed',sessionType:'count',questionCount:2}),random:()=>0,clock:()=>0});
 s.start();s.markReady();s.submit(72);
 assert.doesNotMatch(sequenceNotationMarkup(s),/data-result="incorrect"/);
 s.markReady();s.submit(60);
 assert.equal(s.phase,'complete');assert.equal(s.summary.correct,1);assert.equal(s.attempts.length,2);
 assert.match(sequenceNotationMarkup(s),/× C5/);
 validateSessionRecord(recordFromSession(s,{ownerId:'owner',tabId:'tab'}));
});
