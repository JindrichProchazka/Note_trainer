import { activeClefs, validateConfiguration } from '../exercises/configuration.js';
import { parseWrittenNote, LETTERS } from '../music/notes.js';
import { contextId, isIdentifier } from '../learning/context.js';
import { dayDate } from '../learning/dates.js';

export const LEARNING_VERSION = 2;
export const LEARNING_KEY = 'notetrainer.learning';
export const SESSION_PREFIX = 'notetrainer.session.';
export class DataError extends Error {
  constructor(code, message = code) { super(message); this.code = code; }
}
export const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new DataError('invalid', message); };
export function validId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9:_-]{1,200}$/.test(value);
}
export function validTimestamp(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
const duration = value => Number.isFinite(value) && value >= 0;
function day(value) { try { dayDate(value); return true; } catch { return false; } }

export function validateManifest(value) {
  if (!isObject(value)) fail('Invalid learning manifest');
  if (value.schemaVersion !== LEARNING_VERSION) throw new DataError('unsupported');
  if (value.recordsPrefix !== SESSION_PREFIX || value.settingsKey !== 'notetrainer.settings' ||
      !validTimestamp(value.createdAt)) fail('Invalid manifest metadata');
  return value;
}

export function validateStoredConfiguration(input) {
  if (!isObject(input) || !isIdentifier(input.exerciseType) || !isIdentifier(input.inputMethod)) fail('Invalid exercise context');
  // Reuse current range/session validation, retaining future exercise/input identifiers.
  let config;
  try { config = validateConfiguration(input); } catch { fail('Invalid session configuration'); }
  return { ...input, ...config, exerciseType: input.exerciseType, inputMethod: input.inputMethod };
}

export function validateAttempt(attempt) {
  if (!isObject(attempt) || !validId(attempt.id) || !validId(attempt.sessionId) || !validId(attempt.questionId) ||
      !Number.isInteger(attempt.ordinal) || attempt.ordinal < 1 ||
      !Number.isInteger(attempt.itemIndex) || attempt.itemIndex < 0 ||
      typeof attempt.correct !== 'boolean' || !duration(attempt.responseTimeMs) ||
      !validTimestamp(attempt.timestamp) || !day(attempt.day)) fail('Invalid attempt evidence');
  let note, id;
  try { note = parseWrittenNote(attempt.writtenNote); id = contextId(attempt); } catch { fail('Invalid written context'); }
  if (note.midi !== attempt.midi || note.octave !== attempt.octave || attempt.contextId !== id) fail('Pitch/context mismatch');
  if (attempt.inputMethod === 'letter') {
    if (!LETTERS.includes(attempt.answer) || attempt.correct !== (attempt.answer === note.letter)) fail('Invalid letter answer');
  } else if (attempt.answer !== null && !(typeof attempt.answer === 'string' || Number.isFinite(attempt.answer))) {
    fail('Invalid submitted answer');
  }
  return attempt;
}

export function validateActivity(activity) {
  if (!isObject(activity) || !day(activity.day) || !['treble', 'bass'].includes(activity.clef) ||
      !isIdentifier(activity.exerciseType) || !isIdentifier(activity.inputMethod) ||
      !duration(activity.durationMs)) fail('Invalid active-time evidence');
  return activity;
}
export const activityKey = part => [part.day, part.clef, part.exerciseType, part.inputMethod].join(':');
export const questionKey = attempt => [attempt.sessionId, attempt.questionId, attempt.itemIndex].join(':');

export function validateSessionRecord(record) {
  if (!isObject(record)) fail('Invalid session record');
  if (record.schemaVersion !== LEARNING_VERSION) throw new DataError('unsupported');
  const session = record.session;
  if (!isObject(session) || !validId(session.id) || !validId(session.ownerId) ||
      !(session.tabId === null || validId(session.tabId)) ||
      !['in-progress', 'completed', 'interrupted'].includes(session.status) ||
      !validTimestamp(session.startedAt) || !validTimestamp(session.updatedAt) ||
      !Array.isArray(record.attempts) || !Array.isArray(record.activity)) fail('Invalid session metadata');
  const config = validateStoredConfiguration(session.config);
  if (session.status === 'completed' &&
      (!validTimestamp(session.finishedAt) || !['manual', 'time', 'count'].includes(session.completionReason))) fail('Invalid completion');
  if (session.status !== 'completed' && (session.finishedAt !== null || session.completionReason !== null)) fail('Unfinished completion metadata');
  if (session.status === 'interrupted' && !validTimestamp(session.interruptedAt)) fail('Invalid interruption');
  const ids = new Set(), questions = new Set(), ordinals = new Set(), buckets = new Set();
  for (const attempt of record.attempts) {
    validateAttempt(attempt);
    if (attempt.sessionId !== session.id || ids.has(attempt.id) || questions.has(questionKey(attempt)) ||
        ordinals.has(attempt.ordinal) || attempt.exerciseType !== config.exerciseType ||
        attempt.inputMethod !== config.inputMethod || !activeClefs(config).includes(attempt.clef) ||
        attempt.midi < config.ranges[attempt.clef].minMidi ||
        attempt.midi > config.ranges[attempt.clef].maxMidi) fail('Duplicate or mismatched attempt');
    ids.add(attempt.id); questions.add(questionKey(attempt)); ordinals.add(attempt.ordinal);
  }
  for (const part of record.activity) {
    validateActivity(part);
    if (buckets.has(activityKey(part)) || part.exerciseType !== config.exerciseType ||
        part.inputMethod !== config.inputMethod || !activeClefs(config).includes(part.clef)) fail('Duplicate or mismatched activity');
    buckets.add(activityKey(part));
  }
  const totalTime = record.activity.reduce((total, part) => total + part.durationMs, 0);
  if (!Number.isFinite(totalTime) || (config.sessionType === 'timed' && totalTime > config.durationMs + .01) ||
      (config.sessionType === 'count' && record.attempts.length > config.questionCount) ||
      (session.completionReason === 'count' &&
        (config.sessionType !== 'count' || record.attempts.length !== config.questionCount))) fail('Inconsistent session limit');
  return { ...record, session: { ...session, config } };
}
