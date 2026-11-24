import test from 'node:test';
import assert from 'node:assert/strict';
import { learningState } from '../js/learning/mastery.js';
import { attemptSeries } from './helpers/learning-fixtures.js';

test('Unseen and Learning distinguish absent evidence from low performance', () => {
  assert.equal(learningState([]), 'unseen');
  assert.equal(learningState(attemptSeries(4)), 'learning');
  assert.equal(learningState(attemptSeries(10, { correct: false })), 'learning');
});
test('Familiar requires five attempts and at least eighty percent in the recent window', () => {
  const five = attemptSeries(5); five[0] = { ...five[0], correct: false };
  assert.equal(learningState(five), 'familiar');
  five[1] = { ...five[1], correct: false };
  assert.equal(learningState(five), 'learning');
});
test('Mastered takes precedence with nineteen of twenty correct and a subsecond correct median', () => {
  const attempts = attemptSeries(20, { responseTimeMs: 800 });
  attempts[0] = { ...attempts[0], correct: false, responseTimeMs: 9000 };
  assert.equal(learningState(attempts), 'mastered');
});
test('one thousand milliseconds is not below the mastery target', () => {
  assert.equal(learningState(attemptSeries(20, { responseTimeMs: 1000 })), 'familiar');
  assert.equal(learningState(attemptSeries(19, { responseTimeMs: 400 })), 'familiar');
});
test('mastery degrades based on recent evidence and does not retain a historical award', () => {
  const good = attemptSeries(20);
  const bad = attemptSeries(10, { sessionId: 's2', time: Date.parse(good.at(-1).timestamp) + 2000, correct: false });
  assert.equal(learningState(good), 'mastered');
  assert.equal(learningState([...good, ...bad]), 'learning');
});
test('classification sorts evidence and can use centrally supplied thresholds', () => {
  const attempts = attemptSeries(20);
  assert.equal(learningState([...attempts].reverse()), 'mastered');
  assert.equal(learningState(attempts, { familiarAttempts: 5, familiarWindow: 10, familiarAccuracy: .8,
    masteredAttempts: 30, masteredWindow: 20, masteredAccuracy: .95, masteredMedianMs: 1000 }), 'familiar');
});
