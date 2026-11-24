import { parseWrittenNote, writtenName } from '../music/notes.js';

export const isIdentifier = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);

/** Naming preferences are deliberately absent from a recognition context. */
export function contextId({ writtenNote, clef, exerciseType, inputMethod }) {
  const note = parseWrittenNote(writtenNote);
  if (!['treble', 'bass'].includes(clef) || !isIdentifier(exerciseType) || !isIdentifier(inputMethod)) {
    throw new RangeError('Invalid recognition context');
  }
  return ['v1', clef, encodeURIComponent(writtenName(note)), exerciseType, inputMethod].join(':');
}

export function compareAttempts(a, b) {
  return Date.parse(a.timestamp) - Date.parse(b.timestamp) ||
    a.sessionId.localeCompare(b.sessionId) || a.ordinal - b.ordinal || a.id.localeCompare(b.id);
}

export function configurationKey(config) {
  const clefs = config.clef === 'mixed' ? ['treble', 'bass'] : [config.clef];
  return JSON.stringify({
    clef: config.clef, ranges: Object.fromEntries(clefs.map(clef => [clef, config.ranges[clef]])),
    sessionType: config.sessionType,
    limit: config.sessionType === 'timed' ? config.durationMs : config.sessionType === 'count' ? config.questionCount : null,
    exerciseType: config.exerciseType, inputMethod: config.inputMethod,
  });
}
