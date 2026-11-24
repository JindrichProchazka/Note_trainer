import test from 'node:test';
import assert from 'node:assert/strict';
import { sequenceHarness } from './helpers/sequence-fixtures.js';

test('sequence is visible as a complete target before readiness and input is sequential', () => {
  const { session, answer } = sequenceHarness();
  session.start();
  assert.equal(session.question.notes.length, 5);
  assert.equal(session.submit('C'), null);
  const first = answer('C', 500);
  assert.equal(first.itemIndex, 0); assert.equal(first.sequenceId, session.question.id);
  assert.equal(session.phase, 'presenting');
  assert.equal(session.submit('C'), null);
  session.markReady();
  const oldToken = first.sequenceId + ':0';
  assert.equal(session.submit('D', oldToken), null);
  const second = session.submit('C');
  assert.equal(second.itemIndex, 1);
  assert.equal(session.attempts.length, 2);
});

test('repeated pitches accept distinct identical answers while duplicate retries stay blocked', () => {
  const { session, answer } = sequenceHarness({ sequenceStrategy: 'repeated', sequenceLength: 3 });
  session.start();
  for (let index = 0; index < 3; index++) {
    const result = answer('C', 200);
    assert.equal(result.itemIndex, index);
    assert.equal(session.submit('D'), null);
  }
  assert.equal(session.phase, 'feedback');
  assert.equal(session.summary.completedSequences, 1);
  assert.equal(session.summary.correct, 3);
});

test('fixed count limits answered notes and generates a shortened final sequence', () => {
  const { session, answer } = sequenceHarness({ sessionType: 'count', questionCount: 7 });
  session.start();
  for (let index = 0; index < 5; index++) answer(index === 0 ? 'D' : 'C');
  assert.equal(session.attempts.length, 5); assert.equal(session.phase, 'feedback');
  session.advance();
  assert.equal(session.question.notes.length, 2);
  answer(); answer();
  assert.equal(session.phase, 'complete'); assert.equal(session.holdFinalReview, true);
  assert.equal(session.attempts.length, 7); assert.equal(session.summary.completedSequences, 2);
  assert.equal(session.submit('C'), null); assert.equal(session.advance(), false);
});

test('a count shorter than the selected length can finish with one note', () => {
  const { session, answer } = sequenceHarness({ sessionType: 'count', questionCount: 1, sequenceLength: 16 });
  session.start(); assert.equal(session.question.notes.length, 1); answer();
  assert.equal(session.phase, 'complete'); assert.equal(session.summary.completedSequences, 1);
});

test('individual response timing starts on each readiness and review cannot inflate it', () => {
  const { session, setTime, answer } = sequenceHarness({ sequenceLength: 3 });
  session.start(); setTime(100); session.markReady(); setTime(450);
  assert.equal(session.submit('C').responseTimeMs, 350);
  setTime(500); session.markReady(); setTime(800);
  assert.equal(session.submit('C').responseTimeMs, 300);
  setTime(900); session.markReady(); setTime(1000);
  session.pause(); setTime(9000); session.resume(); setTime(9200);
  assert.equal(session.submit('C').responseTimeMs, 300);
  assert.equal(session.summary.sequenceResults[0].answerDurationMs, 950);
  const elapsed = session.elapsedMs;
  setTime(50000); session.checkpoint();
  assert.equal(session.elapsedMs, elapsed);
  session.advance(); setTime(51000);
  const next = answer('C', 250);
  assert.equal(next.responseTimeMs, 250);
});

test('review and review pause/resume consume no timed allowance', () => {
  const { session, answer, setTime } = sequenceHarness({ sequenceLength: 3, sessionType: 'timed', durationMs: 5000 });
  session.start(); answer(); answer(); answer();
  const remaining = session.remainingMs;
  setTime(10000); assert.equal(session.tick(), false);
  session.pause(); setTime(20000); session.resume(); setTime(30000);
  assert.equal(session.remainingMs, remaining);
  session.advance(); session.markReady(); setTime(30000 + remaining);
  assert.equal(session.tick(), true); assert.equal(session.completionReason, 'time');
});

test('timed expiration retains a partial sequence and never invents unanswered errors', () => {
  const { session, answer, setTime } = sequenceHarness({ sessionType: 'timed', durationMs: 5000, feedbackMode: 'delayed' });
  session.start(); answer('C'); answer('D');
  session.markReady(); setTime(5000);
  assert.equal(session.submit('C'), null);
  assert.equal(session.phase, 'complete');
  assert.equal(session.attempts.length, 2); assert.equal(session.summary.incorrect, 1);
  assert.equal(session.summary.completedSequences, 0); assert.equal(session.summary.partialSequences, 1);
  assert.equal(session.summary.durationMs, 5000);
});

test('manual finish and interruption keep partial evidence and pause excludes hidden time', () => {
  for (const operation of ['finish', 'interrupt']) {
    const { session, answer, setTime } = sequenceHarness();
    session.start(); answer(); session.markReady(); setTime(750); session.pause();
    setTime(10000); session.resume(); setTime(10250);
    const second = session.submit('D');
    assert.equal(second.responseTimeMs, 500);
    session[operation]();
    assert.equal(session.attempts.length, 2);
    assert.equal(session.summary.partialSequences, 1);
    assert.equal(session.summary.incorrect, 1);
    assert.equal(session.submit('C'), null);
  }
});

test('pause during an inter-note paint cannot reopen the preceding item', () => {
  const { session, answer } = sequenceHarness();
  session.start(); answer();
  session.pause(); session.resume();
  assert.equal(session.phase, 'presenting'); assert.equal(session.submit('C'), null);
  session.markReady(); session.submit('C');
  assert.deepEqual(session.attempts.map(attempt => attempt.itemIndex), [0, 1]);
});

test('empty sequence session is neither completed nor partial sequence evidence', () => {
  const { session } = sequenceHarness();
  session.start(); session.finish();
  assert.equal(session.summary.completedSequences, 0);
  assert.equal(session.summary.partialSequences, 0);
  assert.equal(session.summary.answered, 0);
});
