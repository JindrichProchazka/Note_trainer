import { LEARNING_KEY, LEARNING_VERSION, SESSION_PREFIX, DataError,
  activityKey, questionKey, validateSessionRecord, validId } from './schema.js';
import { migrateManifest, migrateSessionRecord } from './migrations.js';

export const sessionStorageKey = id => SESSION_PREFIX + id;
const clone = value => JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function readManifest(raw, now) {
  if (raw === null) return migrateManifest(null, now);
  const value = JSON.parse(raw);
  if (value === null) throw new DataError('invalid');
  return migrateManifest(value, now);
}
const problem = error => error instanceof DataError ? error.code
  : error?.name === 'QuotaExceededError' || [22, 1014].includes(error?.code) ? 'full' : 'unavailable';

/** Append-only evidence with cumulative active-time buckets; terminal records cannot reopen. */
export function mergeSessionRecords(previous, incoming) {
  if (!previous) return validateSessionRecord(clone(incoming));
  const old = validateSessionRecord(previous), next = validateSessionRecord(incoming);
  if (old.session.id !== next.session.id || old.session.ownerId !== next.session.ownerId ||
      old.session.startedAt !== next.session.startedAt || !same(old.session.config, next.session.config)) {
    throw new DataError('conflict');
  }
  if (old.session.status !== 'in-progress') {
    if (next.attempts.some(attempt => !old.attempts.some(item => same(item, attempt))) ||
        next.activity.some(part => !old.activity.some(item => same(item, part))) ||
        (next.sequences ?? []).some(sequence => !(old.sequences ?? []).some(item => same(item, sequence))) ||
        next.session.status !== old.session.status) throw new DataError('conflict');
    return clone(old);
  }
  const attempts = new Map(old.attempts.map(attempt => [attempt.id, attempt]));
  const questions = new Map(old.attempts.map(attempt => [questionKey(attempt), attempt.id]));
  for (const attempt of next.attempts) {
    if ((attempts.has(attempt.id) && !same(attempts.get(attempt.id), attempt)) ||
        (questions.has(questionKey(attempt)) && questions.get(questionKey(attempt)) !== attempt.id)) {
      throw new DataError('conflict');
    }
    attempts.set(attempt.id, attempt);
    questions.set(questionKey(attempt), attempt.id);
  }
  const activity = new Map(old.activity.map(part => [activityKey(part), part]));
  for (const part of next.activity) {
    const key = activityKey(part), prior = activity.get(key);
    if (!prior || part.durationMs > prior.durationMs) activity.set(key, part);
  }

  const sequences = new Map((old.sequences ?? []).map(sequence => [sequence.id, sequence]));
  for (const sequence of next.sequences ?? []) {
    if (sequences.has(sequence.id) && !same(sequences.get(sequence.id), sequence)) throw new DataError('conflict');
    sequences.set(sequence.id, sequence);
  }

  return validateSessionRecord({
    ...old, ...next, session: { ...old.session, ...next.session },
    attempts: [...attempts.values()].sort((a, b) => a.ordinal - b.ordinal),
    activity: [...activity.values()],
    ...(sequences.size ? { sequences: [...sequences.values()] } : {}),
  });
}

/**
 * Each session is one atomic LocalStorage document, so independent tabs never
 * rewrite a shared attempts array. There is no derived counter or fragile index.
 */
export function createLearningStore({ getStorage = () => globalThis.localStorage, now = () => Date.now() } = {}) {
  const records = new Map(), pending = new Map(), unreadable = new Map();
  let status = 'ok', manifest = null, loaded = false;
  function ensureManifest() {
    const storage = getStorage();
    const raw = storage.getItem(LEARNING_KEY);
    manifest = readManifest(raw, now());
    if (raw === null || JSON.parse(raw).schemaVersion !== LEARNING_VERSION) {
      storage.setItem(LEARNING_KEY, JSON.stringify(manifest));
    }
    return storage;
  }
  function load() {
    loaded = true;
    unreadable.clear();
    let storage;
    try {
      storage = getStorage();
      const raw = storage.getItem(LEARNING_KEY);
      manifest = readManifest(raw, now());
      status = 'ok';
    } catch (error) {
      status = error instanceof SyntaxError ? 'invalid' : problem(error);
      return snapshot();
    }
    const keys = [];
    try {
      for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index);
        if (key?.startsWith(SESSION_PREFIX)) keys.push(key);
      }
    } catch { status = 'unavailable'; return snapshot(); }
    const seenAttemptIds = new Set();
    for (const key of keys) {
      try {
        const raw = storage.getItem(key);
        if (raw === null) continue;
        const record = migrateSessionRecord(JSON.parse(raw));
        if (key !== sessionStorageKey(record.session.id)) throw new DataError('invalid');
        if (record.attempts.some(attempt => seenAttemptIds.has(attempt.id))) throw new DataError('invalid');
        record.attempts.forEach(attempt => seenAttemptIds.add(attempt.id));
        const local = pending.get(record.session.id);
        records.set(record.session.id, local ? mergeSessionRecords(record, local) : record);
      } catch (error) {
        unreadable.set(key, error?.code ?? 'invalid');
      }
    }
    for (const [id, record] of pending) records.set(id, record);
    return snapshot();
  }
  function snapshot() {
    return {
      schemaVersion: LEARNING_VERSION,
      sessions: [...records.values()].map(clone),
      status, unreadableCount: unreadable.size, pendingCount: pending.size,
    };
  }
  function saveRecord(input) {
    let record;
    try {
      record = validateSessionRecord(clone(input));
      const ids = new Set(record.attempts.map(attempt => attempt.id));
      if ([...records.values()].some(other => other.session.id !== record.session.id &&
          other.attempts.some(attempt => ids.has(attempt.id)))) throw new DataError('conflict');
      record = mergeSessionRecords(records.get(record.session.id), record);
      records.set(record.session.id, record);
      pending.set(record.session.id, record);
    } catch (error) { status = problem(error); return { saved: false, status }; }
    return persist(record);
  }
  function persist(record) {
    if (!loaded) load();
    if (['invalid', 'unsupported', 'conflict'].includes(status)) return { saved: false, status };
    try {
      const storage = ensureManifest();
      const key = sessionStorageKey(record.session.id);
      const raw = storage.getItem(key);
      const previous = raw === null ? null : migrateSessionRecord(JSON.parse(raw));
      const merged = mergeSessionRecords(previous, record);
      storage.setItem(key, JSON.stringify(merged));
      records.set(merged.session.id, merged);
      pending.delete(merged.session.id);
      unreadable.delete(key);
      status = 'ok';
      return { saved: true, status };
    } catch (error) {
      status = error instanceof SyntaxError ? 'invalid' : problem(error);
      return { saved: false, status };
    }
  }
  function retry() {
    // Re-read before retrying; malformed/future-version data is still never replaced.
    load();
    const waiting = [...pending.values()];
    for (const record of waiting) if (!persist(record).saved) break;
    return snapshot();
  }
  function recoverInterrupted(tabId, ownerId) {
    if (!validId(tabId) || !validId(ownerId)) return snapshot();
    for (const record of [...records.values()]) {
      if (record.session.status === 'in-progress' && record.session.tabId === tabId &&
          record.session.ownerId !== ownerId) {
        saveRecord({ ...record, session: { ...record.session, status: 'interrupted',
          interruptedAt: new Date(now()).toISOString(), updatedAt: new Date(now()).toISOString() } });
      }
    }
    return snapshot();
  }
  const health = () => ({ status, unreadableCount: unreadable.size, pendingCount: pending.size });
  return { load, snapshot, health, saveRecord, retry, recoverInterrupted };
}

/** SessionStorage identifies reloads of this tab; failure falls back to a new tab identity. */
export function tabIdentity(makeId, getSessionStorage = () => globalThis.sessionStorage) {
  try {
    const storage = getSessionStorage(), key = 'notetrainer.tab';
    const existing = storage.getItem(key);
    if (validId(existing)) return existing;
    const id = makeId();
    storage.setItem(key, id);
    return id;
  } catch { return makeId(); }
}
