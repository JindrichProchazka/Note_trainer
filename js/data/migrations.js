import { contextId } from '../learning/context.js';
import { localDay } from '../learning/dates.js';
import { parseWrittenNote } from '../music/notes.js';
import { LEARNING_VERSION, SESSION_PREFIX, DataError, isObject, validateManifest, validateSessionRecord } from './schema.js';

/** Manifest migration changes only learning metadata. The Milestone 2 preference key is retained. */
export function migrateManifest(value, now = Date.now()) {
  if (value === null) return {
    schemaVersion: LEARNING_VERSION, recordsPrefix: SESSION_PREFIX,
    settingsKey: 'notetrainer.settings', createdAt: new Date(now).toISOString(),
  };
  if (!isObject(value)) throw new DataError('invalid');
  if (value.schemaVersion === 1) {
    if (value.settingsKey !== 'notetrainer.settings') throw new DataError('invalid');
    return validateManifest({ ...value, schemaVersion: LEARNING_VERSION, recordsPrefix: SESSION_PREFIX });
  }
  return validateManifest(value);
}

/** Known v1 records lack explicit octave, context, local day and item/attempt ordinals. */
export function migrateSessionRecord(value) {
  if (!isObject(value)) throw new DataError('invalid');
  if (value.schemaVersion === 1) {
    if (!Array.isArray(value.attempts)) throw new DataError('invalid');
    const attempts = value.attempts.map((attempt, index) => {
      const note = parseWrittenNote(attempt.writtenNote);
      return {
        ...attempt, octave: note.octave, contextId: contextId(attempt),
        day: attempt.day ?? localDay(attempt.timestamp), itemIndex: attempt.itemIndex ?? 0,
        ordinal: attempt.ordinal ?? index + 1,
      };
    });
    return validateSessionRecord({ ...value, schemaVersion: LEARNING_VERSION, attempts });
  }
  return validateSessionRecord(value);
}
