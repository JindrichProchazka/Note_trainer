import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS,LEGACY_PRESETS,EXERCISE_CONFIG } from '../js/config.js';
import { configurationForPreset,validateConfiguration } from '../js/exercises/configuration.js';
import { createQuestionGenerator } from '../js/exercises/generator.js';
import { distributionWeight } from '../js/exercises/distribution.js';
import { naturalNotesBetween,parseWrittenNote } from '../js/music/notes.js';
import { createSettingsStore } from '../js/data/settings.js';
import { validateSessionRecord } from '../js/data/schema.js';
import { GrandSession } from '../js/session/grand-session.js';
import { recordFromSession,archivedSession } from '../js/data/recording.js';
import { createLearningStore,mergeSessionRecords } from '../js/data/storage.js';
import { createManagedStorage } from '../js/data/managed-storage.js';
import { createBackup,prepareImport,commitImport,readData } from '../js/data/backup.js';
import { buildStatistics } from '../js/learning/statistics.js';
import { contextId,configurationKey } from '../js/learning/context.js';
import { compatibleAttempts,contextProfile } from '../js/learning/adaptive.js';
import { learningState } from '../js/learning/mastery.js';
import { keyboardPages,keyboardGeometry } from '../js/music/piano-layout.js';
import { renderGrandStaff,notationLayout } from '../js/music/notation.js';
import { grandPracticeMarkup } from '../js/ui/grand-practice.js';
import { configurationMarkup,presetOptions } from '../js/ui/configuration.js';
import { visibleLearningData } from '../js/ui/learning-disclosure.js';
import { SequenceSession } from '../js/session/sequence-session.js';
import { sequenceNotationMarkup } from '../js/ui/sequence-practice.js';
import { memoryStorage,recordFixture,attemptSeries,BASE_TIME } from './helpers/learning-fixtures.js';
const identity={ownerId:'owner',tabId:'tab'};
function setup(patch={}){
 let now=0;
 const session=new GrandSession({config:configurationForPreset('grand-basic',patch),clock:()=>now,wallClock:()=>BASE_TIME+now,random:()=>0,id:'grand'});
 return {session,set:ms=>{now=ms;},record:()=>recordFromSession(session,identity)};
}
test('v1.1 offers exactly the simplified presets and preserves Custom configuration',()=>{
 assert.deepEqual(Object.keys(PRESETS),['treble-basic','treble-extended','treble-random','bass-basic','bass-extended','bass-random','mixed','grand-basic','grand-extended']);
 assert.deepEqual(configurationForPreset('treble-basic').ranges.treble,{minMidi:60,maxMidi:77});
 assert.deepEqual(configurationForPreset('bass-basic').ranges.bass,{minMidi:43,maxMidi:60});
 const options=presetOptions('custom');assert.match(options,/value="custom"/);assert.doesNotMatch(options,/value="(?:treble-beginner|treble-staff|bass-staff|bass-beginner)"/);
 const custom=validateConfiguration({...EXERCISE_CONFIG,presetId:'custom',ranges:{...EXERCISE_CONFIG.ranges,treble:{minMidi:60,maxMidi:60}}});
 assert.equal(createQuestionGenerator(custom,()=>0)().note.midi,60);
});
test('Extended weights specifically emphasize less common notes with every note reachable',()=>{
 const config=configurationForPreset('treble-extended'),notes=naturalNotesBetween(57,84);
 assert.equal(distributionWeight(parseWrittenNote('A3'),'treble',config),6);
 assert.equal(distributionWeight(parseWrittenNote('C4'),'treble',config),3);
 assert.equal(distributionWeight(parseWrittenNote('G4'),'treble',config),1);
 let seed=1;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32),generate=createQuestionGenerator(config,random);
 let outside=0,prior=null;const seen=new Set();
 for(let i=0;i<3000;i++){const target=generate(prior);if(target.note.midi<60||target.note.midi>77)outside++;seen.add(target.note.midi);prior=target;}
 assert.ok(outside/3000>.55);assert.equal(seen.size,notes.length);
});
test('Random presets uniformly expose their entire C2–C6 pool and bypass adaptive/sequence constraints',()=>{
 for(const id of ['treble-random','bass-random']){
  const config=configurationForPreset(id,{selectionMode:'adaptive'}),notes=naturalNotesBetween(36,84);
  assert.equal(config.selectionMode,undefined);
  for(let i=0;i<notes.length;i++){
   const generate=createQuestionGenerator(config,()=>(i+.5)/notes.length,{getAttempts:()=>{throw Error('Must not read evidence');}});
   const q=generate();assert.equal(q.note.midi,notes[i].midi);assert.equal(generate(q).note.midi,q.note.midi);
  }
  const sequence=configurationForPreset(id,{exerciseType:'sequence',sequenceStrategy:'melodic',selectionMode:'weak'});
  assert.equal(sequence.sequenceStrategy,'random');assert.equal(sequence.selectionMode,undefined);
 }
});
test('old preset preferences migrate on read without rewriting raw preferences or unknown fields',()=>{
 for(const [old,next]of [['treble-beginner','treble-basic'],['treble-staff','treble-basic'],['bass-beginner','bass-basic'],['bass-staff','bass-basic']]){
  const value={schemaVersion:1,future:'keep',settings:{defaultPreset:old,theme:'dark',future:9}},raw=JSON.stringify(value),storage=memoryStorage({'notetrainer.settings':raw});
  const store=createSettingsStore(()=>storage),loaded=store.load();assert.equal(loaded.settings.defaultPreset,next);
  assert.equal(storage.getItem('notetrainer.settings'),raw);store.save(loaded.settings);
  const saved=JSON.parse(storage.getItem('notetrainer.settings'));assert.equal(saved.future,'keep');assert.equal(saved.settings.future,9);
 }
});
test('historical v1.0 session configurations, IDs and evidence remain exact and readable',()=>{
 for(const [id,definition]of Object.entries(LEGACY_PRESETS)){
  const config={...EXERCISE_CONFIG,...definition,presetId:id};delete config.presetVersion;delete config.noteDistribution;
  const clef=config.clef==='mixed'?'treble':config.clef,note=naturalNotesBetween(config.ranges[clef].minMidi,config.ranges[clef].maxMidi)[0];
  const record=recordFixture({config,attempts:[],activity:[]}),before=JSON.stringify(record);
  assert.equal(JSON.stringify(validateSessionRecord(record)),before);
  assert.deepEqual(archivedSession(record).config,config);
  assert.equal(note.accidental,0);
 }
});
test('Grand Staff accepts either hand first and cannot accept duplicates or advance early',()=>{
 for(const first of ['treble','bass']){
  const {session:s,record}=setup();s.start();assert.equal(s.submit('C',first),null);s.markReady();
  const second=first==='treble'?'bass':'treble',a=s.submit(s.question.notes[first].letter,first);
  assert.equal(a.clef,first);assert.equal(s.phase,'awaiting');assert.equal(s.advance(),false);assert.equal(s.submit('D',first),null);
  assert.equal(record().attempts.length,1);validateSessionRecord(record());
  s.submit(s.question.notes[second].letter,second);assert.equal(s.phase,'feedback');assert.equal(s.pairReviewed,true);
  assert.equal(s.attempts.length,2);assert.equal(s.advance(),true);assert.equal(s.phase,'presenting');
 }
});
test('Grand Staff clocks share pair readiness, exclude pauses and stop during review',()=>{
 const {session:s,set}=setup();s.start();set(5000);s.markReady();set(5300);assert.equal(s.submit('C','bass').responseTimeMs,300);
 set(5500);s.pause();set(10000);s.resume();set(10200);assert.equal(s.submit('C','treble').responseTimeMs,700);
 const duration=s.statistics.durationMs;set(20000);assert.equal(s.statistics.durationMs,duration);
 assert.equal(s.activity.reduce((n,p)=>n+p.durationMs,0),duration);
 assert.equal(s.activity[0].durationMs,s.activity[1].durationMs);
});
test('Grand Staff count limits count complete pairs while statistics count individual notes',()=>{
 const {session:s,record}=setup({sessionType:'count',questionCount:2});s.start();s.markReady();
 for(let i=0;i<2;i++){s.submit('C','treble');s.submit('G','bass');if(i===0){s.advance();s.markReady();}}
 assert.equal(s.phase,'complete');assert.equal(s.holdFinalReview,true);assert.equal(s.attempts.length,4);
 assert.equal(s.summary.completedPairs,2);assert.equal(s.summary.answered,4);validateSessionRecord(record());
 assert.equal(s.submit('C','treble'),null);
});
test('timed expiry preserves a partial pair, and unanswered notes never become mistakes',()=>{
 const {session:s,set,record}=setup({sessionType:'timed',durationMs:5000});s.start();s.markReady();set(100);s.submit('C','bass');
 set(6000);assert.equal(s.tick(),true);assert.equal(s.attempts.length,1);assert.equal(s.summary.partialPairs,1);
 assert.equal(s.statistics.durationMs,5000);assert.equal(s.submit('C','treble'),null);validateSessionRecord(record());
});
test('interrupted partial pairs persist and recover without duplicated attempts',()=>{
 const {session:s,record}=setup();const storage=memoryStorage(),store=createLearningStore({getStorage:()=>storage,now:()=>BASE_TIME});store.load();
 s.onChange=()=>store.saveRecord(record());s.start();s.markReady();s.submit('C','bass');s.interrupt();
 const next=createLearningStore({getStorage:()=>storage,now:()=>BASE_TIME});next.load();
 assert.equal(next.snapshot().sessions[0].attempts.length,1);assert.equal(next.snapshot().sessions[0].session.status,'interrupted');
 assert.equal(archivedSession(next.snapshot().sessions[0]).summary.partialPairs,1);
});
test('Grand Staff evidence, mastery, configuration keys and adaptive timing stay separate',()=>{
 const {session:s,record}=setup({selectionMode:'adaptive'});s.start();s.markReady();s.submit('C','treble');s.submit('G','bass');s.finish();
 const data={sessions:[record()]},stats=buildStatistics(data,{exerciseType:'grand-staff'},BASE_TIME);
 assert.equal(stats.overview.answered,2);assert.equal(stats.overview.completedPairs,1);
 assert.notEqual(s.attempts[0].contextId,contextId({...s.attempts[0],exerciseType:'single-note'}));
 assert.deepEqual(compatibleAttempts(data,configurationForPreset('treble-basic')),[]);
 assert.notEqual(configurationKey(s.config),configurationKey({...s.config,feedbackMode:'delayed'}));
 const series=attemptSeries(20,{exerciseType:'grand-staff',responseTimeMs:1500});
 assert.equal(learningState(series),'mastered');assert.equal(contextProfile(series[0],series,BASE_TIME).reasons.includes('speed'),false);
});
test('Grand Staff schema rejects wrong parents, pitches, pair IDs and duplicate hand evidence',()=>{
 const {session:s,record}=setup();s.start();s.markReady();s.submit('C','bass');const good=record();
 for(const mutate of [r=>r.pairs[0].notes.bass='C6',r=>r.attempts[0].pairId='other',r=>r.attempts[0].itemIndex=0,r=>r.pairEvidenceVersion=99]){
  const bad=structuredClone(good);mutate(bad);assert.throws(()=>validateSessionRecord(bad));
 }
});
test('Grand Staff backup export/merge deduplicates pairs and retains partial evidence',()=>{
 const {session:s,record}=setup();s.start();s.markReady();s.submit('C','bass');s.interrupt();
 const raw=memoryStorage(),storage=createManagedStorage(()=>raw),store=createLearningStore({getStorage:()=>storage});store.load();store.saveRecord(record());
 const value=createBackup(storage,store.snapshot(),{theme:'dark',naming:'czech',defaultPreset:'grand-basic',defaultSessionType:'unlimited'},BASE_TIME);
 commitImport(storage,prepareImport(storage,value),'merge');
 const restored=readData(createManagedStorage(()=>raw));assert.equal(restored.sessions[0].pairs.length,1);assert.equal(restored.sessions[0].attempts.length,1);
});
test('delayed Grand Staff results stay withheld until the second answer or session end',()=>{
 const {session:s,record}=setup({feedbackMode:'delayed'});s.start();s.markReady();s.submit('D','treble');
 assert.equal(visibleLearningData({sessions:[record()]},s).sessions.length,0);
 s.submit('G','bass');assert.equal(visibleLearningData({sessions:[record()]},s).sessions.length,1);
});
test('Grand Staff notation aligns targets and includes a connecting brace and two labelled answer rows',()=>{
 const {session:s}=setup();s.start();
 const html=renderGrandStaff(s.question.notes,'Pair');
 assert.match(html,/class="grand-brace"/);assert.equal((html.match(/class="grand-staff"/g)||[]).length,2);
 assert.equal((html.match(/cx="282"/g)||[]).length,2);
 for(const clef of ['treble','bass'])assert.ok(Number.isFinite(notationLayout(s.question.notes[clef],clef).y));
 const markup=grandPracticeMarkup(s.config);assert.equal((markup.match(/data-answer=/g)||[]).length,14);
 assert.match(markup,/Treble \/ Right hand/);assert.match(markup,/Bass \/ Left hand/);
 assert.match(configurationMarkup(s.config),/id="practice-input" disabled/);
 assert.throws(()=>validateConfiguration({...s.config,inputMethod:'piano'}));
});
test('Basic keyboards fit portrait widths with stable geometry and at least 24 px white keys',()=>{
 for(const id of ['treble-basic','bass-basic'])for(const width of [280,350,400,490]){
  const c=configurationForPreset(id,{inputMethod:'piano'}),pages=keyboardPages(c.keyboardMin,c.keyboardMax,width);
  assert.equal(pages.length,1);
  const geometry=keyboardGeometry(pages[0].min,pages[0].max,width);
  assert.ok(geometry.width<=width+.001);assert.ok(geometry.whiteWidth>=24);
 }
});
test('wide keyboard pages make every configured exact pitch reachable without target-dependent panning',()=>{
 for(const width of [280,350,490,760]){
  const pages=keyboardPages(36,84,width),seen=new Set();
  for(const p of pages){const g=keyboardGeometry(p.min,p.max,width);assert.ok(g.width<=width+.001);g.keys.forEach(k=>seen.add(k.midi));}
  assert.equal(seen.size,49);
 }
});
test('piano sequences can show deliberate readable pages without changing the exercise or clock',()=>{
 const s=new SequenceSession({config:configurationForPreset('treble-basic',{inputMethod:'piano',exerciseType:'sequence',sequenceLength:16}),random:()=>0,clock:()=>0});
 s.start();s.markReady();const question=s.question;
 const html=sequenceNotationMarkup(s,3,2);assert.equal((html.match(/<svg /g)||[]).length,1);
 assert.match(html,/data-item-index="6"/);assert.equal(s.question,question);assert.equal(s.attempts.length,0);
});
