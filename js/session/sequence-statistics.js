/** Sequence definitions are immutable; all results derive from their independent answers. */
export function sequenceResults(sequences = [], attempts = []) {
  return sequences.map(sequence => {
    const answers = attempts.filter(attempt => attempt.sequenceId === sequence.id).sort((a, b) => a.itemIndex - b.itemIndex);
    const correct = answers.filter(attempt => attempt.correct).length;
    return {
      ...sequence, answers, answered: answers.length, correct, incorrect: answers.length - correct,
      accuracy: answers.length ? correct / answers.length : null,
      complete: answers.length === sequence.notes.length,
      partial: answers.length > 0 && answers.length < sequence.notes.length,
      answerDurationMs: answers.reduce((total, attempt) => total + attempt.responseTimeMs, 0),
      lastAttempt: answers.at(-1) ?? null,
    };
  });
}
export function sequenceSummary(sequences, attempts) {
  const results = sequenceResults(sequences, attempts);
  return {
    completedSequences: results.filter(result => result.complete).length,
    partialSequences: results.filter(result => result.partial).length,
    sequenceResults: results,
  };
}
