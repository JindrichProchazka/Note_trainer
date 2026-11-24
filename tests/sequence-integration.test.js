import test from 'node:test';
import assert from 'node:assert/strict';
import { sequenceHarness, sequenceConfig } from './helpers/sequence-fixtures.js';
import { memoryStorage, recordFixture, BASE_TIME } from './helpers/learning-fixtures.js';
import { createLearningStore, sessionStorageKey, mergeSessionRecords } from '../js/data/storage.js';
import { validateSessionRecord } from '../js/data/schema.js';
import { migrateSessionRecord } from '../js/data/migrations.js';
import { archivedSession } from '../js/data/recording.js';
import { buildStatistics } from '../js/learning/statistics.js';
import { configurationKey } from '../js/learning/context.js';
import { sequenceNotationMarkup } from '../js/ui/sequence-practice.js';
import { createAnswerInput } from '../js/ui/answer-input.js';
import { visibleLearningData } from '../js/ui/learning-disclosure.js';
import { renderSequenceSystem, notationLayout } from '../js/music/notation.js';
import { naturalNotesBetween } from '../js/music/notes.js';
import { statisticsMarkup, createStatisticsView } from '../js/ui/statistics.js';

test('sequence answers are saved before return and survive reload/interruption without duplication', () => {
  const storage=memoryStorage(), store=createLearningStore({getStorage:()=>storage});
  store.load();
  const h=sequenceHarness({feedbackMode:'delayed'}, {onChange:s=>store.saveRecord({
    ...h.record(), session:{...h.record().session}
  })});
  h.session.start(); h.answer('D');
  assert.equal(JSON.parse(storage.getItem(sessionStorageKey(h.session.id))).attempts[0].correct,false);
  h.session.interrupt();
  store.saveRecord(h.record());
  const saved=createLearningStore({getStorage:()=>storage}).load().sessions[0];
  assert.equal(saved.attempts.length,1);
  assert.equal(saved.session.status,'interrupted');
  assert.equal(saved.sequences.length,1);
  assert.equal(archivedSession(saved).summary.partialSequences,1);
});

test('legacy records migrate without changing IDs, contexts, preferences or source data', () => {
  const old=recordFixture(), before=JSON.stringify(old);
  assert.deepEqual(migrateSessionRecord(old),old);
  assert.equal(JSON.stringify(old),before);
  const storage=memoryStorage({'notetrainer.settings':'legacy-preferences'});
  const store=createLearningStore({getStorage:()=>storage}); store.load();store.saveRecord(old);
  const h=sequenceHarness();h.session.start();h.answer();store.saveRecord(h.record());
  assert.equal(storage.getItem('notetrainer.settings'),'legacy-preferences');
  assert.equal(store.snapshot().sessions.length,2);
});

test('sequence validation rejects mismatched parents, positions, pitches and definitions', () => {
  const h=sequenceHarness();h.session.start();h.answer();
  const mutations=[
    r=>{r.attempts[0].sequenceId='missing';},
    r=>{r.attempts[0].itemIndex=2;},
    r=>{r.sequences[0].clef='bass';},
    r=>{r.sequences[0].notes[0]='D4';},
    r=>{r.sequences.push(structuredClone(r.sequences[0]));},
    r=>{delete r.sequenceEvidenceVersion;},
  ];
  for(const mutate of mutations){const r=h.record();mutate(r);assert.throws(()=>validateSessionRecord(r));}
  const original=h.record(), altered=h.record();altered.sequences[0].createdAt=new Date(BASE_TIME+1).toISOString();
  assert.throws(()=>mergeSessionRecords(original,altered));
});

test('completed sequence persistence cannot gain evidence or mutate definitions', () => {
  const h=sequenceHarness({sessionType:'count',questionCount:3,sequenceLength:3});
  h.session.start();h.answer();h.answer();h.answer();
  const record=h.record();assert.deepEqual(mergeSessionRecords(record,record),record);
  const changed=structuredClone(record);changed.sequences[0].createdAt=new Date(BASE_TIME+1).toISOString();
  assert.throws(()=>mergeSessionRecords(record,changed));
});

test('delayed notation has neutral submitted answers and no correctness before review', () => {
  const h=sequenceHarness({feedbackMode:'delayed',sequenceLength:3});
  h.session.start();h.answer('D');
  const hidden=sequenceNotationMarkup(h.session);
  assert.match(hidden,/data-result="answered"/);
  assert.doesNotMatch(hidden,/data-result="incorrect"|→ C4|✓|Correct note/);
  h.answer();h.answer();
  const revealed=sequenceNotationMarkup(h.session);
  assert.match(revealed,/data-result="incorrect"/);
  assert.match(revealed,/→ C4/);
});

test('immediate notation reveals wrong answers and preserves all subsequent notes', () => {
  const h=sequenceHarness({sequenceLength:5});h.session.start();h.answer('D');
  const html=sequenceNotationMarkup(h.session);
  assert.equal((html.match(/class="sequence-note"/g)||[]).length,5);
  assert.match(html,/→ C4/);assert.match(html,/data-active="true"/);
});

test('long sequences wrap in order rather than shrinking into a single staff', () => {
  const h=sequenceHarness({sequenceLength:16});h.session.start();
  const html=sequenceNotationMarkup(h.session,3);
  assert.equal((html.match(/class="notation sequence-notation"/g)||[]).length,6);
  assert.equal((html.match(/class="sequence-note"/g)||[]).length,16);
  assert.match(html,/notes 16–16/);
  assert.doesNotMatch(html,/NaN|Infinity|undefined/);
});

test('sequence rendering uses existing vertical and ledger geometry in both clefs', () => {
  for(const clef of ['treble','bass'])for(const note of naturalNotesBetween(36,84)){
    const layout=notationLayout(note,clef);
    const svg=renderSequenceSystem([{note,index:0,result:'unanswered'}],'Read',clef);
    assert.match(svg,new RegExp('cy="'+layout.y+'"'));
    for(const y of layout.ledgerYs)assert.ok(svg.includes('y1="'+y+'" y2="'+y+'"'));
  }
});

test('held keys and double-clicks are rejected; separate identical presses and touch taps work', () => {
  const input=createAnswerInput(), event={key:'h',repeat:false};
  assert.equal(input.keydown(event,'czech'),'B');
  assert.equal(input.keydown(event,'czech'),null);
  input.keyup(event);assert.equal(input.keydown(event,'czech'),'B');
  assert.equal(input.keydown({...event,repeat:true},'czech'),null);
  assert.equal(input.pointerAllowed({detail:2,pointerType:'mouse'}),false);
  assert.equal(input.pointerAllowed({detail:2,pointerType:'touch'}),true);
});

test('pending delayed results cannot leak through navigation and become visible at session end', () => {
  const h=sequenceHarness({feedbackMode:'delayed'});h.session.start();h.answer('D');
  const data={sessions:[recordFixture(),h.record()]};
  assert.equal(visibleLearningData(data,h.session).sessions.length,1);
  assert.equal(data.sessions.length,2);
  h.session.finish();
  assert.equal(visibleLearningData(data,h.session).sessions.length,2);
});

test('sequence statistics separate contexts, complete/partial counts and configurations', () => {
  const h=sequenceHarness({sequenceLength:3});h.session.start();h.answer();h.answer('D');h.answer();
  h.session.advance();h.answer();h.session.finish();
  const data={sessions:[recordFixture(),h.record()]};
  const stats=buildStatistics(data,{exerciseType:'sequence'},BASE_TIME+60000);
  assert.equal(stats.overview.answered,4);
  assert.equal(stats.overview.correct,3);
  assert.equal(stats.overview.completedSequences,1);
  assert.equal(stats.overview.partialSequences,1);
  assert.equal(stats.notes.length,1);
  assert.equal(buildStatistics(data,{},BASE_TIME+60000).notes.length,2);
  assert.notEqual(configurationKey(h.session.config),configurationKey({...h.session.config,feedbackMode:'delayed'}));
});

test('sequence filter is available even before any sequence has been practiced', () => {
  const html=statisticsMarkup({sessions:[]},createStatisticsView(),'czech',null,BASE_TIME);
  assert.match(html,/<option value="sequence"/);
});
