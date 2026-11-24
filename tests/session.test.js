import test from 'node:test';
import assert from 'node:assert/strict';
import { PracticeSession } from '../js/session/session.js';
import { summarize } from '../js/session/statistics.js';

function setup() {
  let now = 0;
  const session = new PracticeSession({ clock: () => now, random: () => 0, id: 'test-session' });
  return { session, tick: milliseconds => { now += milliseconds; } };
}

test('a question cannot accept input until it has been displayed and marked ready', () => {
  const { session, tick } = setup();
  assert.equal(session.submit('C'), null);
  assert.equal(session.start(), true);
  assert.equal(session.start(), false);
  tick(5000);
  assert.equal(session.submit('C'), null);
  assert.equal(session.statistics.durationMs, 0);
  session.markReady();
  tick(750);
  assert.equal(session.submit('C').responseTimeMs, 750);
});

test('one question records one independent attempt even after a wrong answer', () => {
  const { session, tick } = setup();
  session.start();
  session.markReady();
  tick(500);
  const wrong = session.submit('D');
  assert.equal(wrong.correct, false);
  assert.equal(session.submit('C'), null);
  assert.equal(session.submit('D'), null);
  assert.equal(session.markReady(), false);
  assert.equal(session.attempts.length, 1);
  assert.equal(session.statistics.incorrect, 1);
});

test('feedback delays are excluded from the next response time', () => {
  const { session, tick } = setup();
  session.start();
  session.markReady();
  tick(800);
  const first = session.submit('C');
  tick(2000);
  assert.equal(session.advance(), true);
  assert.equal(session.advance(), false);
  tick(16);
  session.markReady();
  tick(400);
  const second = session.submit('D');
  assert.equal(first.responseTimeMs, 800);
  assert.equal(second.responseTimeMs, 400);
  assert.notEqual(first.questionId, second.questionId);
  assert.equal(session.statistics.averageResponseMs, 600);
});

test('a visibility/navigation pause excludes hidden time from response and practice duration', () => {
  const { session, tick } = setup();
  session.start();
  session.markReady();
  tick(400);
  assert.equal(session.pause(), true);
  assert.equal(session.pause(), false);
  tick(60000);
  assert.equal(session.statistics.durationMs, 400);
  assert.equal(session.submit('C'), null);
  assert.equal(session.advance(), false);
  assert.equal(session.resume(), true);
  assert.equal(session.resume(), false);
  tick(300);
  assert.equal(session.submit('C').responseTimeMs, 700);
  assert.equal(session.statistics.durationMs, 700);
});

test('pausing during preparation resumes preparation rather than accepting early input', () => {
  const { session, tick } = setup();
  session.start();
  session.pause();
  tick(1000);
  session.resume();
  assert.equal(session.phase, 'presenting');
  assert.equal(session.submit('C'), null);
  assert.equal(session.statistics.durationMs, 0);
  session.markReady();
  tick(200);
  assert.equal(session.submit('C').responseTimeMs, 200);
});

test('pausing feedback cannot reopen an answered question', () => {
  const { session, tick } = setup();
  session.start();
  session.markReady();
  tick(100);
  session.submit('C');
  session.pause();
  tick(60000);
  session.resume();
  assert.equal(session.phase, 'feedback');
  assert.equal(session.submit('C'), null);
  assert.equal(session.attempts.length, 1);
  session.advance();
  session.markReady();
  tick(100);
  assert.equal(session.submit('D').correct, true);
});

test('attempts carry stable musical and recognition context identifiers', () => {
  const { session, tick } = setup();
  session.start();
  session.markReady();
  tick(1000);
  const attempt = session.submit('C');
  assert.equal(attempt.sessionId, 'test-session');
  assert.equal(attempt.questionId, 'test-session:1');
  assert.equal(attempt.id, 'test-session:1:answer');
  assert.equal(attempt.midi, 60);
  assert.equal(attempt.writtenNote, 'C4');
  assert.equal(attempt.clef, 'treble');
  assert.equal(attempt.exerciseType, 'single-note');
  assert.equal(attempt.inputMethod, 'letter');
  assert.ok(Number.isFinite(Date.parse(attempt.timestamp)));
});

test('invalid answers do not change the question, timing or counters', () => {
  const { session, tick } = setup();
  session.start();
  session.markReady();
  tick(500);
  for (const answer of ['H', '', 'c', 'C4', 60]) assert.equal(session.submit(answer), null);
  assert.equal(session.phase, 'awaiting');
  assert.equal(session.statistics.answered, 0);
  assert.equal(session.submit('C').responseTimeMs, 500);
});

test('unlimited practice can continue without automatic termination or repeated pitches', () => {
  const { session, tick } = setup();
  session.start();
  let previous = null;
  for (let index = 0; index < 100; index++) {
    assert.notEqual(session.question.note.midi, previous);
    previous = session.question.note.midi;
    session.markReady();
    tick(250);
    assert.equal(session.submit(session.question.note.letter).correct, true);
    session.advance();
  }
  assert.equal(session.statistics.answered, 100);
  assert.equal(session.statistics.correct, 100);
  assert.equal(session.statistics.accuracy, 1);
});

test('statistics correctly handle empty, correct, wrong, average and median responses', () => {
  assert.deepEqual(summarize([]), {
    answered: 0, correct: 0, incorrect: 0, accuracy: null,
    averageResponseMs: null, medianResponseMs: null, durationMs: 0,
  });
  const attempts = [
    { correct: true, responseTimeMs: 500 },
    { correct: false, responseTimeMs: 1500 },
    { correct: true, responseTimeMs: 1000 },
  ];
  assert.deepEqual(summarize(attempts, 5000), {
    answered: 3, correct: 2, incorrect: 1, accuracy: 2 / 3,
    averageResponseMs: 1000, medianResponseMs: 1000, durationMs: 5000,
  });
  assert.equal(summarize(attempts.slice(0, 2)).medianResponseMs, 1000);
});
