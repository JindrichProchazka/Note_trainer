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

function median(times) {
  if (!times.length) return null;
  const sorted = [...times].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Summary is local to this session. Clef + written pitch remain separate recognition contexts. */
export function sessionSummary(attempts, durationMs = 0) {
  const basic = summarize(attempts, durationMs);
  const mistakes = new Map();
  for (const attempt of attempts.filter(attempt => !attempt.correct)) {
    const key = `${attempt.clef}:${attempt.writtenNote}`;
    const entry = mistakes.get(key) ?? {
      clef: attempt.clef, writtenNote: attempt.writtenNote, midi: attempt.midi, incorrect: 0,
    };
    entry.incorrect += 1;
    mistakes.set(key, entry);
  }
  return {
    ...basic,
    medianCorrectResponseMs: median(attempts.filter(attempt => attempt.correct).map(attempt => attempt.responseTimeMs)),
    correctNotesPerMinute: basic.durationMs > 0 ? basic.correct * 60000 / basic.durationMs : 0,
    mostMissed: [...mistakes.values()].sort((a, b) =>
      b.incorrect - a.incorrect || a.clef.localeCompare(b.clef) || a.midi - b.midi),
  };
}
