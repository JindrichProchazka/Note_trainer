import test from 'node:test';
import assert from 'node:assert/strict';
import { createLearningStore, sessionStorageKey, mergeSessionRecords, tabIdentity } from '../js/data/storage.js';
import { LEARNING_KEY, validateSessionRecord, validateAttempt } from '../js/data/schema.js';
import { migrateManifest, migrateSessionRecord } from '../js/data/migrations.js';
import { createSettingsStore, SETTINGS_KEY } from '../js/data/settings.js';
import { PracticeSession } from '../js/session/session.js';
import { recordFromSession } from '../js/data/recording.js';
import { memoryStorage, recordFixture, attemptFixture, attemptSeries, BASE_TIME } from './helpers/learning-fixtures.js';

test('an independent answer is on disk before submit returns, and reload retains it', () => {
  const storage = memoryStorage(), store = createLearningStore({ getStorage: () => storage });
  store.load();
  let time = 0;
  const session = new PracticeSession({ id: 'instant', clock: () => time, wallClock: () => BASE_TIME + time,
    random: () => 0, onChange: current => store.saveRecord(recordFromSession(current, { ownerId: 'owner-1', tabId: 'tab-1' })) });
  session.start(); session.markReady(); time = 750;
  const answer = session.submit('C');
  const disk = JSON.parse(storage.getItem(sessionStorageKey('instant')));
  assert.equal(disk.attempts[0].id, answer.id);
  assert.equal(disk.attempts[0].octave, 4);
  assert.equal(disk.session.status, 'in-progress');
  assert.equal(disk.activity[0].durationMs, 750);
  const reloaded = createLearningStore({ getStorage: () => storage }).load();
  assert.equal(reloaded.sessions[0].attempts.length, 1);
});

test('saving the same answer/completion repeatedly never duplicates evidence', () => {
  const storage = memoryStorage(), store = createLearningStore({ getStorage: () => storage });
  store.load();
  const record = recordFixture();
  for (let i = 0; i < 4; i++) assert.equal(store.saveRecord(record).saved, true);
  assert.equal(store.snapshot().sessions.length, 1);
  assert.equal(JSON.parse(storage.getItem(sessionStorageKey('s1'))).attempts.length, 1);
});

test('a corrected retry with a different ID but the same question is rejected', () => {
  const original = recordFixture({ status: 'in-progress' });
  const retry = structuredClone(original);
  retry.attempts.push({ ...retry.attempts[0], id: 'retry', ordinal: 2 });
  assert.throws(() => validateSessionRecord(retry));
  const changed = structuredClone(original);
  changed.attempts[0] = { ...changed.attempts[0], correct: false, answer: 'D' };
  assert.throws(() => mergeSessionRecords(original, changed));
});

test('session documents from independent tabs cannot overwrite each other', () => {
  const storage = memoryStorage();
  const first = createLearningStore({ getStorage: () => storage });
  const second = createLearningStore({ getStorage: () => storage });
  first.load(); second.load();
  first.saveRecord(recordFixture({ id: 'first' }));
  second.saveRecord(recordFixture({ id: 'second', ownerId: 'owner-2', tabId: 'tab-2' }));
  assert.equal(createLearningStore({ getStorage: () => storage }).load().sessions.length, 2);
});

test('interrupted sessions keep attempts and never become completed during recovery', () => {
  const storage = memoryStorage(), store = createLearningStore({ getStorage: () => storage });
  store.load(); store.saveRecord(recordFixture({ status: 'in-progress' }));
  const reloaded = createLearningStore({ getStorage: () => storage, now: () => BASE_TIME + 60000 });
  reloaded.load(); reloaded.recoverInterrupted('tab-1', 'owner-2');
  const record = reloaded.snapshot().sessions[0];
  assert.equal(record.session.status, 'interrupted');
  assert.equal(record.session.finishedAt, null);
  assert.equal(record.attempts.length, 1);
  assert.equal(record.session.completionReason, null);
});

test('recovery does not interrupt a different tab or an already completed session', () => {
  const storage = memoryStorage(), store = createLearningStore({ getStorage: () => storage });
  store.load();
  store.saveRecord(recordFixture({ id: 'other', status: 'in-progress', tabId: 'other-tab' }));
  store.saveRecord(recordFixture({ id: 'completed' }));
  store.recoverInterrupted('tab-1', 'owner-2');
  assert.equal(store.snapshot().sessions.find(r => r.session.id === 'other').session.status, 'in-progress');
  assert.equal(store.snapshot().sessions.find(r => r.session.id === 'completed').session.status, 'completed');
});

test('terminal historical results cannot be reopened, edited or expanded', () => {
  const record = recordFixture(), changed = structuredClone(record);
  changed.session.status = 'in-progress'; changed.session.finishedAt = null; changed.session.completionReason = null;
  assert.throws(() => mergeSessionRecords(record, changed));
  const extra = structuredClone(record);
  extra.attempts = attemptSeries(2);
  assert.throws(() => mergeSessionRecords(record, extra));
});

test('M2 preferences and unknown compatible fields remain byte-for-byte untouched by learning storage', () => {
  const legacy = JSON.stringify({ schemaVersion: 1, extra: 'keep', settings: {
    theme: 'dark', naming: 'international', defaultPreset: 'bass-staff', defaultSessionType: 'count', future: 42 } });
  const storage = memoryStorage({ [SETTINGS_KEY]: legacy });
  const preferences = createSettingsStore(() => storage).load().settings;
  const store = createLearningStore({ getStorage: () => storage });
  store.load(); store.saveRecord(recordFixture());
  assert.equal(storage.getItem(SETTINGS_KEY), legacy);
  assert.equal(preferences.theme, 'dark'); assert.equal(preferences.defaultPreset, 'bass-staff');
});

test('known manifest and record migrations enrich evidence without mutating source documents', () => {
  const manifest = { schemaVersion: 1, settingsKey: SETTINGS_KEY, createdAt: new Date(BASE_TIME).toISOString(), extra: 7 };
  assert.equal(migrateManifest(manifest).schemaVersion, 2);
  assert.equal(migrateManifest(manifest).extra, 7);
  assert.equal(manifest.schemaVersion, 1);
  const old = recordFixture(); old.schemaVersion = 1;
  delete old.attempts[0].contextId; delete old.attempts[0].octave;
  delete old.attempts[0].day; delete old.attempts[0].ordinal; delete old.attempts[0].itemIndex;
  const upgraded = migrateSessionRecord(old);
  assert.equal(upgraded.attempts[0].octave, 4);
  assert.equal(upgraded.attempts[0].ordinal, 1);
  assert.match(upgraded.attempts[0].contextId, /^v1:treble:C4:/);
  assert.equal(old.attempts[0].contextId, undefined);
});

test('malformed and unsupported manifests are preserved and block writes safely', () => {
  for (const raw of ['broken', 'null', JSON.stringify({ schemaVersion: 99 })]) {
    const storage = memoryStorage({ [LEARNING_KEY]: raw });
    const store = createLearningStore({ getStorage: () => storage });
    assert.notEqual(store.load().status, 'ok');
    assert.equal(store.saveRecord(recordFixture()).saved, false);
    assert.equal(storage.getItem(LEARNING_KEY), raw);
  }
});

test('an unreadable individual record is retained while other readable records remain available', () => {
  const storage = memoryStorage({ [sessionStorageKey('broken')]: 'unreadable' });
  const store = createLearningStore({ getStorage: () => storage });
  assert.equal(store.load().unreadableCount, 1);
  assert.equal(store.saveRecord(recordFixture({ id: 'good' })).saved, true);
  assert.equal(store.snapshot().sessions.length, 1);
  assert.equal(storage.getItem(sessionStorageKey('broken')), 'unreadable');
});

test('quota failure keeps pending evidence and retry saves it without deleting history', () => {
  const storage = memoryStorage(), store = createLearningStore({ getStorage: () => storage });
  store.load(); store.saveRecord(recordFixture({ id: 'old' }));
  const write = storage.setItem;
  storage.setItem = () => { const error = new Error('full'); error.name = 'QuotaExceededError'; error.code = 22; throw error; };
  const result = store.saveRecord(recordFixture({ id: 'new' }));
  assert.deepEqual(result, { saved: false, status: 'full' });
  assert.equal(store.snapshot().pendingCount, 1);
  assert.equal(storage.getItem(sessionStorageKey('new')), null);
  assert.ok(storage.getItem(sessionStorageKey('old')));
  storage.setItem = write;
  assert.equal(store.retry().pendingCount, 0);
  assert.equal(createLearningStore({ getStorage: () => storage }).load().sessions.length, 2);
});

test('denied storage falls back to in-memory evidence with an explicit failure status', () => {
  const store = createLearningStore({ getStorage: () => { throw new Error('denied'); } });
  assert.equal(store.load().status, 'unavailable');
  assert.equal(store.saveRecord(recordFixture()).saved, false);
  assert.equal(store.snapshot().sessions[0].attempts.length, 1);
});

test('evidence validation rejects corrupted pitch, context, answer, timestamp and duration fields', () => {
  for (const patch of [{ midi: 61 }, { octave: 5 }, { contextId: 'wrong' }, { responseTimeMs: NaN },
    { answer: 'H' }, { timestamp: 'bad' }, { day: '2026-02-30' }]) {
    assert.throws(() => validateAttempt({ ...attemptFixture(), ...patch }));
  }
});

test('tab identity is stable across reload and handles denied SessionStorage', () => {
  const storage = memoryStorage();
  assert.equal(tabIdentity(() => 'tab-a', () => storage), 'tab-a');
  assert.equal(tabIdentity(() => 'tab-b', () => storage), 'tab-a');
  assert.equal(tabIdentity(() => 'tab-c', () => { throw new Error(); }), 'tab-c');
});
