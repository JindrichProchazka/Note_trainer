import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStatistics, contextStatistics, groupNoteStatistics, sortNoteStatistics, chartWindow, recentHomeStatistics } from '../js/learning/statistics.js';
import { contextId, configurationKey } from '../js/learning/context.js';
import { localDay, addDays, splitActiveDuration, periodBounds } from '../js/learning/dates.js';
import { PracticeSession } from '../js/session/session.js';
import { archivedSession, recordFromSession } from '../js/data/recording.js';
import { configurationForPreset } from '../js/exercises/configuration.js';
import { attemptFixture, attemptSeries, recordFixture, BASE_TIME } from './helpers/learning-fixtures.js';

test('overview and daily metrics use actual attempts and correct responses, not averages of session ratios', () => {
  const a = attemptSeries(3).map((attempt, index) => ({ ...attempt, responseTimeMs: 100 + index * 100 }));
  const b = attemptSeries(4, { sessionId: 's2' }).map((attempt, index) => ({
    ...attempt, correct: index === 0, answer: index === 0 ? 'C' : 'D', responseTimeMs: index ? 50000 : 9000,
  }));
  const first = recordFixture({ attempts: a, activity: [{ day: localDay(BASE_TIME), clef: 'treble',
    exerciseType: 'single-note', inputMethod: 'letter', durationMs: 180000 }] });
  const second = recordFixture({ id: 's2', attempts: b, activity: [{ ...first.activity[0], durationMs: 240000 }] });
  const stats = buildStatistics({ sessions: [first, second] }, {}, BASE_TIME);
  assert.equal(stats.overview.answered, 7);
  assert.equal(stats.overview.accuracy, 4 / 7);
  assert.equal(stats.overview.medianCorrectResponseMs, 250);
  assert.equal(stats.overview.durationMs, 420000);
  assert.equal(stats.overview.correctNotesPerMinute, 4 / 7);
  assert.equal(stats.overview.completedSessions, 2);
  assert.equal(stats.daily[0].medianCorrectResponseMs, 250);
  assert.equal(stats.daily[0].accuracy, 4 / 7);
});

test('empty and all-wrong datasets avoid fabricated response times, percentages and rates', () => {
  const empty = buildStatistics({ sessions: [] }, {}, BASE_TIME).overview;
  assert.equal(empty.accuracy, null); assert.equal(empty.medianCorrectResponseMs, null);
  assert.equal(empty.correctNotesPerMinute, null); assert.equal(empty.masteredContexts, 0);
  const wrong = recordFixture({ attempts: [attemptFixture({ correct: false })] });
  const stats = buildStatistics({ sessions: [wrong] }, {}, BASE_TIME).overview;
  assert.equal(stats.accuracy, 0); assert.equal(stats.medianCorrectResponseMs, null);
  assert.equal(stats.correctNotesPerMinute, 0);
});

test('octave, clef, enharmonic spelling, exercise and input contexts remain separate', () => {
  const contexts = [
    {}, { writtenNote: 'C5', midi: 72, octave: 5 }, { clef: 'bass' },
    { writtenNote: 'C♯4', midi: 61 }, { writtenNote: 'D♭4', midi: 61, answer: 'D' },
    { inputMethod: 'piano', answer: 60 }, { exerciseType: 'sequence' },
  ].map((patch, index) => attemptFixture({ ...patch, id: 'unique-' + index, ordinal: index + 1 }));
  assert.equal(new Set(contexts.map(contextId)).size, 7);
  assert.equal(groupNoteStatistics(contexts).length, 7);
});

test('Today, 7-day and 30-day filters use inclusive local calendar days', () => {
  const today = localDay(BASE_TIME);
  const offsets = [0, -6, -7, -29, -30];
  const sessions = offsets.map((offset, index) => {
    const timestamp = new Date(addDays(today, offset) + 'T12:00:00').toISOString();
    const attempt = attemptFixture({ id: 's' + index + ':a', sessionId: 's' + index,
      questionId: 's' + index + ':q', timestamp });
    return recordFixture({ id: 's' + index, attempts: [attempt], time: Date.parse(timestamp),
      activity: [{ day: addDays(today, offset), clef: 'treble', exerciseType: 'single-note', inputMethod: 'letter', durationMs: 1000 }] });
  });
  assert.equal(buildStatistics({ sessions }, { period: 'today' }, BASE_TIME).overview.answered, 1);
  assert.equal(buildStatistics({ sessions }, { period: '7' }, BASE_TIME).overview.answered, 2);
  assert.equal(buildStatistics({ sessions }, { period: '30' }, BASE_TIME).overview.answered, 4);
  assert.equal(buildStatistics({ sessions }, { period: 'all' }, BASE_TIME).overview.answered, 5);
});

test('mixed-clef filtering allocates both attempts and active time to the selected clef', () => {
  const config = configurationForPreset('mixed');
  const record = recordFixture({ config, attempts: [
    attemptFixture(), attemptFixture({ id: 's1:2:a', questionId: 's1:2', ordinal: 2,
      writtenNote: 'G2', midi: 43, octave: 2, clef: 'bass', correct: false }),
  ], activity: [
    { day: localDay(BASE_TIME), clef: 'treble', exerciseType: 'single-note', inputMethod: 'letter', durationMs: 20000 },
    { day: localDay(BASE_TIME), clef: 'bass', exerciseType: 'single-note', inputMethod: 'letter', durationMs: 40000 },
  ] });
  const treble = buildStatistics({ sessions: [record] }, { clef: 'treble' }, BASE_TIME).overview;
  const bass = buildStatistics({ sessions: [record] }, { clef: 'bass' }, BASE_TIME).overview;
  assert.equal(treble.answered, 1); assert.equal(treble.durationMs, 20000); assert.equal(treble.correctNotesPerMinute, 3);
  assert.equal(bass.correct, 0); assert.equal(bass.durationMs, 40000); assert.equal(bass.completedSessions, 1);
});

test('exercise, input and configuration filters use equivalent denominators', () => {
  const a = recordFixture();
  const config = { ...a.session.config, exerciseType: 'sequence', inputMethod: 'midi' };
  const b = recordFixture({ id: 's2', config, attempts: [attemptFixture({
    id: 's2:a', sessionId: 's2', questionId: 's2:q', exerciseType: 'sequence', inputMethod: 'midi', answer: 60,
  })], activity: [{ ...a.activity[0], exerciseType: 'sequence', inputMethod: 'midi', durationMs: 30000 }] });
  for (const filter of [{ exerciseType: 'sequence' }, { inputMethod: 'midi' }, { configuration: configurationKey(config) }]) {
    const stats = buildStatistics({ sessions: [a, b] }, filter, BASE_TIME).overview;
    assert.equal(stats.answered, 1); assert.equal(stats.durationMs, 30000);
    assert.equal(stats.correctNotesPerMinute, 2);
  }
  assert.equal(configurationKey({ ...a.session.config, naming: 'international', presetId: 'custom' }), configurationKey(a.session.config));
});

test('interrupted and unfinished evidence contributes to practice but not completed counts', () => {
  const a = recordFixture({ id: 'interrupted', status: 'interrupted' });
  const b = recordFixture({ id: 'unfinished', status: 'in-progress' });
  const stats = buildStatistics({ sessions: [a, b] }, {}, BASE_TIME);
  assert.equal(stats.overview.answered, 2);
  assert.equal(stats.overview.completedSessions, 0);
  assert.equal(stats.history.length, 2);
});

test('active time is split at local midnight; response time excludes pauses and remains intact', () => {
  const start = new Date(2026, 10, 23, 23, 59, 59, 500).getTime();
  let elapsed = 0, wall = start;
  const session = new PracticeSession({ clock: () => elapsed, wallClock: () => wall, random: () => 0, id: 'midnight' });
  session.start(); session.markReady(); elapsed = 1000; wall += 1000;
  session.submit('C'); session.finish();
  const record = recordFromSession(session, { ownerId: 'owner', tabId: 'tab' });
  assert.deepEqual(record.activity.map(part => part.durationMs), [500, 500]);
  const today = buildStatistics({ sessions: [record] }, { period: 'today' }, wall).overview;
  assert.equal(today.durationMs, 500); assert.equal(today.answered, 1);
  assert.equal(record.attempts[0].responseTimeMs, 1000);
});

test('feedback is allocated to the old clef before the next question changes context', () => {
  let elapsed = 0, index = 0;
  const random = [0, 0, .9, 0];
  const session = new PracticeSession({ config: configurationForPreset('mixed'), clock: () => elapsed,
    wallClock: () => BASE_TIME + elapsed, random: () => random[index++] ?? 0 });
  session.start(); session.markReady(); elapsed = 1000; session.submit('C');
  elapsed = 1500; session.advance(); session.markReady(); elapsed = 1900; session.finish();
  assert.equal(session.activity.find(part => part.clef === 'treble').durationMs, 1500);
  assert.equal(session.activity.find(part => part.clef === 'bass').durationMs, 400);
});

test('no-practice days are missing performance points rather than zero accuracy or zero-second responses', () => {
  const record = recordFixture();
  const stats = buildStatistics({ sessions: [record] }, { period: '7' }, BASE_TIME);
  const window = chartWindow(stats.daily, stats.bounds);
  assert.equal(window.values.length, 7);
  assert.equal(window.values[0].answered, 0);
  assert.equal(window.values[0].accuracy, null);
  assert.equal(window.values[0].medianCorrectResponseMs, null);
  assert.equal(window.values[0].correctNotesPerMinute, null);
  assert.equal(window.values.at(-1).answered, 1);
});

test('all-time chart pages retain old dates without shrinking an unbounded timeline', () => {
  const bounds = { start: '2026-01-01', end: '2026-03-31' };
  const newest = chartWindow([], bounds);
  const oldest = chartWindow([], bounds, 2);
  assert.equal(newest.pages, 3); assert.equal(newest.values.length, 30);
  assert.equal(oldest.start, '2026-01-01'); assert.equal(oldest.end, '2026-01-30');
});

test('note statistics expose correct, recent and last-practice evidence; unpracticed is not low accuracy', () => {
  const attempts = attemptSeries(12).map((attempt, index) => ({
    ...attempt, correct: index >= 2, answer: index >= 2 ? 'C' : 'D',
  }));
  const practiced = contextStatistics(attempts, attempts[0]);
  assert.equal(practiced.attempts, 12); assert.equal(practiced.correct, 10); assert.equal(practiced.incorrect, 2);
  assert.equal(practiced.recentAccuracy, 1); assert.equal(practiced.lastPractice, attempts.at(-1).timestamp);
  const unseen = contextStatistics([], attempts[0]);
  assert.equal(unseen.accuracy, null); assert.equal(unseen.state, 'unseen');
});

test('note sorting respects pitch, accuracy, response time and attempt counts', () => {
  const a = contextStatistics(attemptSeries(5), attemptFixture());
  const bAttempts = attemptSeries(2, { writtenNote: 'D4', responseTimeMs: 1500, correct: false });
  const b = contextStatistics(bAttempts, bAttempts[0]);
  const cAttempts = attemptSeries(6, { writtenNote: 'E4', responseTimeMs: 1200 });
  const c = contextStatistics(cAttempts, cAttempts[0]);
  const notes = [c, b, a];
  assert.deepEqual(sortNoteStatistics(notes, 'pitch').map(n => n.writtenNote), ['C4', 'D4', 'E4']);
  assert.equal(sortNoteStatistics(notes, 'accuracy')[0].writtenNote, 'D4');
  assert.equal(sortNoteStatistics(notes, 'slowest')[0].writtenNote, 'E4');
  assert.equal(sortNoteStatistics(notes, 'fewest')[0].attempts, 2);
  assert.equal(sortNoteStatistics(notes, 'most')[0].attempts, 6);
});

test('mastered-context counts use exactly the selected period and context', () => {
  const attempts = attemptSeries(20);
  const record = recordFixture({ attempts });
  assert.equal(buildStatistics({ sessions: [record] }, {}, BASE_TIME).overview.masteredContexts, 1);
  assert.equal(buildStatistics({ sessions: [record] }, { clef: 'bass' }, BASE_TIME).overview.masteredContexts, 0);
});

test('historical summaries are derived without mutating their source when repeated', () => {
  const record = recordFixture(), before = JSON.stringify(record);
  const history = archivedSession(record);
  const repeated = new PracticeSession({ config: history.config, id: 'new-session' });
  repeated.start(); repeated.markReady(); repeated.submit(repeated.question.note.letter); repeated.finish();
  assert.equal(JSON.stringify(record), before);
  assert.equal(history.summary.answered, 1);
});

test('Home statistics use persisted Today and seven-day evidence and expose the latest configuration', () => {
  const record = recordFixture();
  const home = recentHomeStatistics({ sessions: [record] }, BASE_TIME);
  assert.equal(home.today.answered, 1);
  assert.equal(home.recent.medianCorrectResponseMs, 500);
  assert.equal(home.recentConfig.presetId, 'treble-basic');
});

test('local calendar helpers validate days and split durations at day boundaries', () => {
  assert.equal(addDays('2026-03-31', 1), '2026-04-01');
  assert.deepEqual(periodBounds('7', BASE_TIME), { start: '2026-11-18', end: '2026-11-24' });
  const start = new Date(2026, 10, 24, 23, 59, 59).getTime();
  assert.deepEqual(splitActiveDuration(start, 2000).map(part => part.durationMs), [1000, 1000]);
  assert.throws(() => addDays('2026-02-30', 1), RangeError);
});
