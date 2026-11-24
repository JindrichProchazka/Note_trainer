import { LEARNING_VERSION } from './schema.js';
import { sessionSummary } from '../session/statistics.js';

export function recordFromSession(session, { ownerId, tabId }) {
  if (!session.startedAt) return null;
  return {
    schemaVersion: LEARNING_VERSION,
    session: {
      id: session.id, ownerId, tabId, config: session.config,
      startedAt: session.startedAt, updatedAt: session.isoNow(),
      finishedAt: session.finishedAt, interruptedAt: session.interruptedAt,
      completionReason: session.completionReason,
      status: session.phase === 'complete' ? 'completed' : session.phase === 'interrupted' ? 'interrupted' : 'in-progress',
    },
    attempts: session.attempts.map(attempt => ({ ...attempt })),
    activity: session.activity.map(part => ({ ...part })),
  };
}
export const recordedDuration = record => record.activity.reduce((total, part) => total + part.durationMs, 0);

/** Historical summaries are read-only facades; repeating always creates a new session ID. */
export function archivedSession(record) {
  return {
    id: record.session.id, config: record.session.config, attempts: record.attempts,
    phase: record.session.status === 'completed' ? 'complete' : 'interrupted',
    completionReason: record.session.status === 'completed' ? record.session.completionReason : 'interrupted',
    summary: sessionSummary(record.attempts, recordedDuration(record)),
    historical: true, status: record.session.status, startedAt: record.session.startedAt,
  };
}
