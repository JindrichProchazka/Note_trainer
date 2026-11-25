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
  const clefs = ['mixed','grand'].includes(config.clef) ? ['treble', 'bass'] : [config.clef];
  return JSON.stringify({
    clef: config.clef, ranges: Object.fromEntries(clefs.map(clef => [clef, config.ranges[clef]])),
    sessionType: config.sessionType,
    limit: config.sessionType === 'timed' ? config.durationMs : config.sessionType === 'count' ? config.questionCount : null,
    ...(config.selectionMode && config.selectionMode!=='uniform'?{selectionMode:config.selectionMode}:{}),
    ...(config.inputMethod==='piano'?{keyboard:[config.keyboardMin,config.keyboardMax],noteLabels:config.noteLabels}:{}),
    ...(config.presetVersion===2?{presetVersion:2,noteDistribution:config.noteDistribution}:{}),
    ...(config.octaveMarkers?{octaveMarkers:true}:{}),
    ...(config.exerciseType==='grand-staff'?{feedback:config.feedbackMode}:{}),
    exerciseType: config.exerciseType, inputMethod: config.inputMethod,
    ...(config.exerciseType === 'sequence' ? { sequenceLength: config.sequenceLength, strategy: config.sequenceStrategy, feedback: config.feedbackMode,
      ...(config.sequenceStrategy === 'intervals' ? { intervalMix: config.intervalMix } : {}) } : {}),
  });
}
