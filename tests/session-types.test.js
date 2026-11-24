import test from 'node:test';
import assert from 'node:assert/strict';
import { PracticeSession } from '../js/session/session.js';
import { sessionSummary } from '../js/session/statistics.js';
import { EXERCISE_CONFIG } from '../js/config.js';
function setup(patch={}){
  let now=0;
  const session=new PracticeSession({config:{...EXERCISE_CONFIG,...patch},clock:()=>now,random:()=>0,id:'types'});
  return {session,tick:ms=>{now+=ms;}};
}
test('timed practice starts on readiness and finishes at the exact active deadline',()=>{
  const {session,tick}=setup({sessionType:'timed',durationMs:5000});
  session.start();tick(50000);
  assert.equal(session.tick(),false);
  session.markReady();tick(4999);
  assert.equal(session.remainingMs,1);
  assert.equal(session.tick(),false);
  tick(1);
  assert.equal(session.submit('C'),null);
  assert.equal(session.phase,'complete');
  assert.equal(session.completionReason,'time');
  assert.equal(session.statistics.durationMs,5000);
  assert.equal(session.remainingMs,0);
  assert.equal(session.attempts.length,0);
});
test('a delayed tick clamps duration and cannot admit late answers or new questions',()=>{
  const {session,tick}=setup({sessionType:'timed',durationMs:5000});
  session.start();session.markReady();tick(60000);
  assert.equal(session.advance(),false);
  assert.equal(session.submit('C'),null);
  assert.equal(session.statistics.durationMs,5000);
  assert.equal(session.resume(),false);
  assert.equal(session.markReady(),false);
});
test('timed feedback counts toward active duration but paused time does not',()=>{
  const {session,tick}=setup({sessionType:'timed',durationMs:5000});
  session.start();session.markReady();tick(1000);session.submit('C');tick(500);
  session.pause();const remaining=session.remainingMs;tick(60000);
  assert.equal(session.remainingMs,remaining);
  assert.equal(session.tick(),false);
  session.resume();tick(3500);
  assert.equal(session.tick(),true);
  assert.equal(session.attempts.length,1);
  assert.equal(session.attempts[0].responseTimeMs,1000);
  assert.equal(session.statistics.durationMs,5000);
});
test('pausing at the deadline finishes the session instead of freezing an expired question',()=>{
  const {session,tick}=setup({sessionType:'timed',durationMs:5000});
  session.start();session.markReady();tick(5000);
  assert.equal(session.pause(),false);
  assert.equal(session.phase,'complete');
});
test('fixed count includes wrong answers, locks duplicates, and freezes at the final answer',()=>{
  const {session,tick}=setup({sessionType:'count',questionCount:2});
  session.start();session.markReady();tick(300);
  assert.equal(session.submit('D').correct,false);
  assert.equal(session.submit('C'),null);
  session.advance();session.markReady();tick(700);
  assert.equal(session.submit('D').correct,true);
  assert.equal(session.phase,'complete');
  assert.equal(session.completionReason,'count');
  assert.equal(session.statistics.answered,2);
  assert.equal(session.statistics.incorrect,1);
  tick(60000);
  assert.equal(session.statistics.durationMs,1000);
  assert.equal(session.submit('D'),null);
  assert.equal(session.advance(),false);
  assert.equal(session.finish(),false);
});
test('free practice can finish manually with no answers or after pausing',()=>{
  const {session}=setup();
  session.start();
  assert.equal(session.finish(),true);
  assert.equal(session.summary.answered,0);
  assert.equal(session.summary.medianCorrectResponseMs,null);
  assert.equal(session.summary.correctNotesPerMinute,0);
  assert.equal(session.submit('C'),null);
  const second=setup();
  second.session.start();second.session.markReady();second.tick(500);
  second.session.pause();second.tick(60000);second.session.finish();
  assert.equal(second.session.statistics.durationMs,500);
});
test('summaries use only correct responses for the median and group mistakes by pitch AND clef',()=>{
  const attempts=[
    {correct:true,responseTimeMs:400,clef:'treble',writtenNote:'C4',midi:60},
    {correct:true,responseTimeMs:800,clef:'treble',writtenNote:'D4',midi:62},
    {correct:false,responseTimeMs:9000,clef:'treble',writtenNote:'B4',midi:71},
    {correct:false,responseTimeMs:5000,clef:'treble',writtenNote:'B4',midi:71},
    {correct:false,responseTimeMs:3000,clef:'bass',writtenNote:'B4',midi:71},
  ];
  const summary=sessionSummary(attempts,30000);
  assert.equal(summary.medianCorrectResponseMs,600);
  assert.equal(summary.correctNotesPerMinute,4);
  assert.equal(summary.accuracy,.4);
  assert.deepEqual(summary.mostMissed.map(n=>[n.clef,n.writtenNote,n.incorrect]),
    [['treble','B4',2],['bass','B4',1]]);
  assert.equal(sessionSummary(attempts.filter(a=>!a.correct),1000).medianCorrectResponseMs,null);
});
test('mixed session attempts record the actual question clef',()=>{
  let flip=false;
  const session=new PracticeSession({config:{...EXERCISE_CONFIG,presetId:'mixed',clef:'mixed'},
    random:()=>{flip=!flip;return flip?.9:0;}});
  session.start();session.markReady();
  const attempt=session.submit(session.question.note.letter);
  assert.equal(attempt.clef,'bass');
  assert.ok(attempt.midi>=43 && attempt.midi<=57);
});
