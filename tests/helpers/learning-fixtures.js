import { EXERCISE_CONFIG } from '../../js/config.js';
import { parseWrittenNote } from '../../js/music/notes.js';
import { contextId } from '../../js/learning/context.js';
import { localDay } from '../../js/learning/dates.js';

export const BASE_TIME = new Date(2026, 10, 24, 12).getTime();
export function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key), values,
  };
}
export function attemptFixture(patch = {}) {
  const note = parseWrittenNote(patch.writtenNote ?? 'C4');
  const correct = patch.correct ?? true, timestamp = patch.timestamp ?? new Date(BASE_TIME).toISOString();
  const value = {
    id: 's1:1:answer', sessionId: 's1', questionId: 's1:1', ordinal: 1, itemIndex: 0,
    writtenNote: 'C4', midi: note.midi, octave: note.octave, clef: 'treble',
    exerciseType: 'single-note', inputMethod: 'letter', correct,
    responseTimeMs: 500, timestamp, day: localDay(timestamp),
    answer: correct ? note.letter : note.letter === 'D' ? 'E' : 'D', ...patch,
  };
  value.contextId = patch.contextId ?? contextId(value);
  return value;
}
export function recordFixture({ id = 's1', status = 'completed', attempts = null, activity = null,
  config = EXERCISE_CONFIG, ownerId = 'owner-1', tabId = 'tab-1', time = BASE_TIME, ...patch } = {}) {
  const stamp = new Date(time).toISOString();
  const answers = attempts ?? [attemptFixture({ id: id + ':1:answer', sessionId: id, questionId: id + ':1', timestamp: stamp })];
  return {
    schemaVersion: 2,
    session: { id, ownerId, tabId, config: { ...config }, status,
      startedAt: stamp, updatedAt: stamp,
      finishedAt: status === 'completed' ? stamp : null,
      interruptedAt: status === 'interrupted' ? stamp : null,
      completionReason: status === 'completed' ? 'manual' : null, ...patch },
    attempts: answers,
    activity: activity ?? [{ day: localDay(time), clef: 'treble', exerciseType: config.exerciseType,
      inputMethod: config.inputMethod, durationMs: 60000 }],
  };
}
export function attemptSeries(count, { sessionId = 's1', time = BASE_TIME, ...patch } = {}) {
  return Array.from({ length: count }, (_, index) => attemptFixture({
    ...patch, sessionId, ordinal: index + 1, id: sessionId + ':' + (index + 1) + ':answer',
    questionId: sessionId + ':' + (index + 1), timestamp: new Date(time + index * 2000).toISOString(),
  }));
}
