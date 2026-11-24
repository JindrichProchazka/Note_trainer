import { SequenceSession } from '../../js/session/sequence-session.js';
import { EXERCISE_CONFIG } from '../../js/config.js';
import { recordFromSession } from '../../js/data/recording.js';
import { BASE_TIME } from './learning-fixtures.js';

export const sequenceConfig = (patch = {}) => ({ ...EXERCISE_CONFIG, exerciseType: 'sequence', ...patch });
export function sequenceHarness(patch = {}, options = {}) {
  let time = 0;
  const session = new SequenceSession({
    id: 'seq-session', config: sequenceConfig(patch), clock: () => time, wallClock: () => BASE_TIME + time,
    random: () => 0, ...options,
  });
  return {
    session, setTime: value => { time = value; }, elapse: value => { time += value; },
    answer(answer = session.question.notes[session.itemIndex]?.letter, duration = 500) {
      session.markReady(); time += duration; return session.submit(answer);
    },
    record: () => recordFromSession(session, { ownerId: 'owner-1', tabId: 'tab-1' }),
  };
}
export function seededRandom(seed = 1) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
