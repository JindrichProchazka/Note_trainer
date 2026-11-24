export function summarize(attempts, durationMs = 0) {
  const answered = attempts.length;
  const correct = attempts.filter(attempt => attempt.correct).length;
  const times = attempts.map(attempt => attempt.responseTimeMs).sort((a, b) => a - b);
  const middle = Math.floor(times.length / 2);
  return {
    answered,
    correct,
    incorrect: answered - correct,
    accuracy: answered ? correct / answered : null,
    averageResponseMs: answered ? times.reduce((sum, time) => sum + time, 0) / answered : null,
    medianResponseMs: answered
      ? (times.length % 2 ? times[middle] : (times[middle - 1] + times[middle]) / 2)
      : null,
    durationMs: Math.max(0, durationMs),
  };
}
