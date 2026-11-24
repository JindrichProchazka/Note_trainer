/** Keep the current delayed sequence from leaking results through Home, Statistics or saved routes. */
export function visibleLearningData(data, session) {
  const hidden = session.config.exerciseType === 'sequence' && session.config.feedbackMode === 'delayed' &&
    session.currentAnswers.length > 0 && !session.sequenceReviewed &&
    !['complete', 'interrupted'].includes(session.phase);
  return hidden ? { ...data, withheld: true, sessions: data.sessions.filter(record => record.session.id !== session.id) } : data;
}
