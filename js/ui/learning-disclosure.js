/** Keep the current delayed sequence from leaking results through Home, Statistics or saved routes. */
export function visibleLearningData(data, session) {
  const hidden = ['sequence','grand-staff'].includes(session.config.exerciseType) && session.config.feedbackMode === 'delayed' &&
    session.currentAnswers.length > 0 && !(session.sequenceReviewed||session.pairReviewed) &&
    !['complete', 'interrupted'].includes(session.phase);
  return hidden ? { ...data, withheld: true, withheldType:session.config.exerciseType, sessions: data.sessions.filter(record => record.session.id !== session.id) } : data;
}
