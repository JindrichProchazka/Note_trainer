import { compareAttempts } from './context.js';

export const MASTERY_RULES = Object.freeze({
  familiarAttempts: 5, familiarWindow: 10, familiarAccuracy: .8,
  masteredAttempts: 20, masteredWindow: 20, masteredAccuracy: .95, masteredMedianMs: 1000, grandMedianMs: 2000,
});
export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
const accuracy = attempts => attempts.filter(attempt => attempt.correct).length / attempts.length;

/** Input must represent one context. No state is permanently awarded or persisted. */
export function learningState(attempts, rules = MASTERY_RULES) {
  if (!attempts.length) return 'unseen';
  const sorted = [...attempts].sort(compareAttempts);
  const mastered = sorted.slice(-rules.masteredWindow);
  const correctTimes = mastered.filter(attempt => attempt.correct).map(attempt => attempt.responseTimeMs);
  if (sorted.length >= rules.masteredAttempts && accuracy(mastered) >= rules.masteredAccuracy &&
      median(correctTimes) !== null && median(correctTimes) < (sorted[0].exerciseType==='grand-staff'?(rules.grandMedianMs ?? rules.masteredMedianMs):rules.masteredMedianMs)) return 'mastered';
  const familiar = sorted.slice(-rules.familiarWindow);
  return sorted.length >= rules.familiarAttempts && accuracy(familiar) >= rules.familiarAccuracy ? 'familiar' : 'learning';
}
