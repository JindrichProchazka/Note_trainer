import test from 'node:test';
import assert from 'node:assert/strict';
import { ADAPTIVE_RULES, contextProfile, adaptiveNote, weightedPick, compatibleAttempts, analyzePractice } from '../js/learning/adaptive.js';
import { createSequenceGenerator } from '../js/exercises/sequence.js';
import { configurationForPreset, validateConfiguration } from '../js/exercises/configuration.js';
import { PracticeSession } from '../js/session/session.js';
import { configurationKey } from '../js/learning/context.js';
import { recommendationMarkup } from '../js/ui/recommendation.js';
import { attemptSeries, recordFixture, BASE_TIME } from './helpers/learning-fixtures.js';
import { naturalNotesBetween } from '../js/music/notes.js';

const config=patch=>configurationForPreset('treble-basic',patch);
const context={writtenNote:'C4',clef:'treble',exerciseType:'single-note',inputMethod:'letter'};
const good=attemptSeries(20,{responseTimeMs:300,time:BASE_TIME-60000});
test('weight responds to recent accuracy, speed, evidence and recency with mastery integration',()=>{
 const mastered=contextProfile(context,good,BASE_TIME);
 assert.equal(mastered.state,'mastered');assert.ok(mastered.weight>=1 && mastered.weight<1.001);
 const wrong=attemptSeries(20,{correct:false,time:BASE_TIME-60000});
 assert.ok(contextProfile(context,wrong,BASE_TIME).weight>mastered.weight);
 const slow=attemptSeries(20,{responseTimeMs:3000,time:BASE_TIME-60000});
 assert.ok(contextProfile(context,slow,BASE_TIME).weight>mastered.weight);
 assert.ok(contextProfile(context,good,BASE_TIME+30*86400000).weight>mastered.weight);
 assert.ok(contextProfile(context,good.slice(0,2),BASE_TIME).reasons.includes('evidence'));
 assert.deepEqual(contextProfile(context,[],BASE_TIME).reasons,['unseen']);
});
test('recent windows recover and a profile never mutates historical evidence',()=>{
 const old=attemptSeries(20,{correct:false,time:BASE_TIME-86400000});
 const current=attemptSeries(20,{sessionId:'new',time:BASE_TIME-60000,responseTimeMs:300});
 const evidence=[...old,...current],before=JSON.stringify(evidence);
 assert.equal(contextProfile(context,evidence,BASE_TIME).accuracy,1);
 assert.equal(JSON.stringify(evidence),before);
 assert.equal(contextProfile(context,[...current,...current],BASE_TIME).attempts,20);
});
test('sequence speed uses a distinct target and never borrows isolated evidence',()=>{
 const c={...context,exerciseType:'sequence'};
 const times=attemptSeries(20,{exerciseType:'sequence',responseTimeMs:700,time:BASE_TIME-60000});
 assert.ok(contextProfile(c,times,BASE_TIME).reasons.includes('speed'));
 assert.equal(contextProfile(c,good,BASE_TIME).attempts,0);
 assert.ok(!contextProfile(context,attemptSeries(20,{responseTimeMs:700}),BASE_TIME).reasons.includes('speed'));
});
test('weighted selection keeps all eligible notes possible and reduces immediate repeats',()=>{
 const notes=naturalNotesBetween(60,62),c=config({selectionMode:'adaptive'});
 assert.equal(adaptiveNote(notes,'treble',c,[],60,()=>0,BASE_TIME).midi,60);
 assert.equal(adaptiveNote(notes,'treble',c,[],60,()=>.999,BASE_TIME).midi,62);
 assert.equal(adaptiveNote(notes,'treble',c,[],60,()=>.1,BASE_TIME).midi,62);
 assert.equal(weightedPick([1],[1],()=>0),1);
 for(const weights of [[0],[-1],[Infinity]])assert.throws(()=>weightedPick([1],weights));
 assert.throws(()=>weightedPick([1],[1],()=>1));
});
test('weak and mistake modes prioritize relevant contexts without excluding exploration',()=>{
 const notes=naturalNotesBetween(60,62),mistakes=attemptSeries(20,{sessionId:'mistakes',writtenNote:'D4',correct:false,time:BASE_TIME-60000});
 const evidence=[...good,...mistakes];
 for(const mode of ['weak','mistakes']) {
  const c=config({selectionMode:mode});
  assert.equal(adaptiveNote(notes,'treble',c,evidence,null,()=>.3,BASE_TIME).midi,62);
  assert.equal(adaptiveNote(notes,'treble',c,evidence,null,()=>0,BASE_TIME).midi,60);
 }
});
test('history scope isolates input, exercise and structured sequence configurations',()=>{
 const letters=recordFixture(),piano=recordFixture({id:'p',config:config({inputMethod:'piano'})});
 const data={sessions:[letters,piano]};
 assert.equal(compatibleAttempts(data,config()).length,1);
 assert.equal(compatibleAttempts(data,config({inputMethod:'piano'})).length,1);
 const seq=config({exerciseType:'sequence',sequenceLength:5,feedbackMode:'delayed'});
 const r=recordFixture({id:'seq',config:seq});
 assert.equal(compatibleAttempts({sessions:[r]}, {...seq,sequenceLength:8}).length,0);
 assert.equal(compatibleAttempts({sessions:[r]}, {...seq,feedbackMode:'immediate'}).length,0);
 assert.equal(compatibleAttempts({sessions:[r]}, {...seq,selectionMode:'weak'}).length,1);
});
test('session generation consumes prior evidence and incorporates new attempts',()=>{
 const c=validateConfiguration({...config({selectionMode:'adaptive'}),presetId:'custom',ranges:{treble:{minMidi:60,maxMidi:62}}});
 const evidence=[...good,...attemptSeries(20,{sessionId:'mistakes',writtenNote:'D4',correct:false,time:BASE_TIME-60000})];
 const s=new PracticeSession({config:c,random:()=>.49,getAttempts:()=>evidence,wallClock:()=>BASE_TIME});
 s.start();assert.equal(s.question.note.midi,62);
 s.markReady();s.submit('D');
 assert.equal(s.getAttempts().length,41);
});
test('adaptive random and structured sequences respect selected bounds and one clef per sequence',()=>{
 for(const strategy of ['random','stepwise','melodic','repeated','intervals']){
  const c=config({exerciseType:'sequence',sequenceLength:16,sequenceStrategy:strategy,selectionMode:'adaptive'});
  const result=createSequenceGenerator(c,()=>.5,{getAttempts:()=>[],now:()=>BASE_TIME})();
  assert.equal(result.notes.length,16);
  assert.ok(result.notes.every(n=>n.midi>=60&&n.midi<=72));
  if(strategy==='repeated')assert.equal(result.notes[0].midi,result.notes[1].midi);
  if(strategy==='stepwise')for(let i=1;i<16;i++)assert.ok(Math.abs(result.notes[i].midi-result.notes[i-1].midi)<=4);
 }
});
test('adaptive one-pitch ranges remain answerable for all modes',()=>{
 for(const mode of ['adaptive','weak','mistakes']){
  const c=validateConfiguration({...config({selectionMode:mode}),presetId:'custom',ranges:{treble:{minMidi:60,maxMidi:60}}});
  const s=new PracticeSession({config:c});s.start();s.markReady();s.submit('C');s.advance();
  assert.equal(s.question.note.midi,60);
 }
});
test('weak-area analysis respects selected ranges and produces actionable, scoped recommendations',()=>{
 const c=config({clef:'treble'}),profiles=analyzePractice(c,[],BASE_TIME);
 assert.equal(profiles.length,8);assert.ok(profiles.every(p=>p.clef==='treble'&&p.reasons.includes('unseen')));
 const html=recommendationMarkup(profiles,'czech');
 assert.match(html,/learn-weak/);assert.match(html,/learn-mistakes/);assert.match(html,/learn-adaptive/);
 assert.doesNotMatch(html,/NaN|Infinity|undefined/);
});
test('configuration comparison keys distinguish input hints and selection without changing legacy keys',()=>{
 const c=config();assert.ok(!('selectionMode' in c));
 assert.notEqual(configurationKey(c),configurationKey({...c,selectionMode:'adaptive'}));
 const p=config({inputMethod:'piano'});
 assert.notEqual(configurationKey(p),configurationKey({...p,noteLabels:true}));
 assert.throws(()=>config({selectionMode:'unknown'}));
 assert.ok(ADAPTIVE_RULES.base>0);
});
