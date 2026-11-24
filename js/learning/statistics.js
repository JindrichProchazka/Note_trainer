import { sequenceResults } from '../session/sequence-statistics.js';
import { parseWrittenNote } from '../music/notes.js';
import { median, learningState, MASTERY_RULES } from './mastery.js';
import { compareAttempts, configurationKey, contextId } from './context.js';
import { localDay, periodBounds, withinDays, addDays } from './dates.js';

export const DEFAULT_FILTERS = Object.freeze({
  period: 'all', clef: 'all', exerciseType: 'all', inputMethod: 'all', configuration: 'all',
});
const matches = (value, selected) => selected === 'all' || selected === value;
const sessionDate = record => record.session.finishedAt ?? record.session.interruptedAt ?? record.session.updatedAt;
const sum = values => values.reduce((total, value) => total + value, 0);

export function contextStatistics(attempts, context) {
  const ordered = [...attempts].sort(compareAttempts);
  const correct = ordered.filter(attempt => attempt.correct);
  const recent = ordered.slice(-MASTERY_RULES.familiarWindow);
  const note = parseWrittenNote(context.writtenNote);
  return {
    ...context, contextId: contextId(context), midi: note.midi, octave: note.octave,
    attempts: ordered.length, correct: correct.length, incorrect: ordered.length - correct.length,
    accuracy: ordered.length ? correct.length / ordered.length : null,
    medianCorrectResponseMs: median(correct.map(attempt => attempt.responseTimeMs)),
    recentAccuracy: recent.length ? recent.filter(attempt => attempt.correct).length / recent.length : null,
    lastPractice: ordered.at(-1)?.timestamp ?? null,
    state: learningState(ordered),
  };
}
export function groupNoteStatistics(attempts) {
  const groups = new Map();
  for (const attempt of attempts) {
    const id = contextId(attempt), group = groups.get(id) ?? [];
    group.push(attempt); groups.set(id, group);
  }
  return [...groups.values()].map(group => contextStatistics(group, group[0]));
}
export function sortNoteStatistics(notes, sort = 'pitch') {
  const pitch = (a, b) => a.midi - b.midi || a.writtenNote.localeCompare(b.writtenNote) ||
    a.clef.localeCompare(b.clef) || a.exerciseType.localeCompare(b.exerciseType) || a.inputMethod.localeCompare(b.inputMethod);
  const nullable = (a, b, direction = 1) => a === null ? b === null ? 0 : 1 : b === null ? -1 : (a - b) * direction;
  const sorts = {
    pitch, accuracy: (a, b) => nullable(a.accuracy, b.accuracy) || pitch(a, b),
    slowest: (a, b) => nullable(a.medianCorrectResponseMs, b.medianCorrectResponseMs, -1) || pitch(a, b),
    fewest: (a, b) => a.attempts - b.attempts || pitch(a, b),
    most: (a, b) => b.attempts - a.attempts || pitch(a, b),
  };
  return [...notes].sort(sorts[sort] ?? pitch);
}
function metricSummary(attempts, durationMs) {
  const correct = attempts.filter(attempt => attempt.correct);
  return {
    answered: attempts.length, correct: correct.length, incorrect: attempts.length - correct.length,
    durationMs, accuracy: attempts.length ? correct.length / attempts.length : null,
    medianCorrectResponseMs: median(correct.map(attempt => attempt.responseTimeMs)),
    correctNotesPerMinute: durationMs > 0 ? correct.length * 60000 / durationMs : null,
  };
}
function hasClef(record, clef) {
  if (clef === 'all') return true;
  const evidence = [...record.attempts, ...record.activity];
  return evidence.length ? evidence.some(item => item.clef === clef)
    : record.session.config.clef === clef || record.session.config.clef === 'mixed';
}

/** All totals are derived from individual attempts and active-time evidence. */
export function buildStatistics(data, selected = {}, now = Date.now()) {
  const filters = { ...DEFAULT_FILTERS, ...selected };
  const all = data.sessions;
  const dates = [localDay(now), ...all.flatMap(record =>
    [...record.attempts.map(attempt => attempt.day), ...record.activity.map(part => part.day), localDay(sessionDate(record))])].sort();
  const bounds = periodBounds(filters.period, now, dates[0]);
  if (filters.period === 'all') bounds.end = dates.at(-1);
  const eligible = all.filter(record =>
    matches(record.session.config.exerciseType, filters.exerciseType) &&
    matches(record.session.config.inputMethod, filters.inputMethod) &&
    matches(configurationKey(record.session.config), filters.configuration));
  const attempts = eligible.flatMap(record => record.attempts).filter(attempt =>
    withinDays(attempt.day, bounds) && matches(attempt.clef, filters.clef));
  const activity = eligible.flatMap(record => record.activity).filter(part =>
    withinDays(part.day, bounds) && matches(part.clef, filters.clef));
  const notes = groupNoteStatistics(attempts);
  const history = eligible.filter(record => hasClef(record, filters.clef) &&
    withinDays(localDay(sessionDate(record)), bounds))
    .sort((a, b) => Date.parse(sessionDate(b)) - Date.parse(sessionDate(a)) || b.session.id.localeCompare(a.session.id));
  const dailyGroups = new Map();
  const getDay = day => {
    if (!dailyGroups.has(day)) dailyGroups.set(day, { attempts: [], durationMs: 0 });
    return dailyGroups.get(day);
  };
  for (const attempt of attempts) getDay(attempt.day).attempts.push(attempt);
  for (const part of activity) getDay(part.day).durationMs += part.durationMs;
  const daily = [...dailyGroups.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([day, group]) => ({ day, ...metricSummary(group.attempts, group.durationMs) }));
  const includedIds = new Set(attempts.map(attempt => attempt.sessionId));
  for (const record of eligible) if (record.activity.some(part =>
    withinDays(part.day, bounds) && matches(part.clef, filters.clef))) includedIds.add(record.session.id);
  const includedConfigurations = new Map();
  for (const record of eligible.filter(item => includedIds.has(item.session.id))) {
    includedConfigurations.set(configurationKey(record.session.config), record.session.config);
  }
  const sequences = eligible.flatMap(record => sequenceResults(record.sequences, record.attempts)).filter(sequence =>
    matches(sequence.clef, filters.clef) && sequence.lastAttempt && withinDays(sequence.lastAttempt.day, bounds));
  return {
    sequences,
    filters, bounds, attempts, activity, daily, notes, history,
    configurations: [...includedConfigurations.values()],
    overview: {
      ...metricSummary(attempts, sum(activity.map(part => part.durationMs))),
      completedSequences: sequences.filter(sequence => sequence.complete).length,
      partialSequences: sequences.filter(sequence => sequence.partial).length,
      completedSessions: history.filter(record => record.session.status === 'completed').length,
      practicedContexts: notes.length,
      masteredContexts: notes.filter(note => note.state === 'mastered').length,
    },
  };
}

/** Dense, at-most-30-day chart pages: gaps have no artificial performance values. */
export function chartWindow(daily, bounds, page = 0, pageSize = 30) {
  const ordinal = day => Date.parse(day + 'T00:00:00.000Z') / 86400000;
  const totalDays = Math.round(ordinal(bounds.end) - ordinal(bounds.start)) + 1;
  const pages = Math.max(1, Math.ceil(totalDays / pageSize));
  const current = Math.max(0, Math.min(Math.floor(page), pages - 1));
  const end = addDays(bounds.end, -current * pageSize);
  const possibleStart = addDays(end, 1 - pageSize);
  const start = possibleStart < bounds.start ? bounds.start : possibleStart;
  const entries = new Map(daily.map(day => [day.day, day]));
  const values = [];
  for (let day = start; day <= end; day = addDays(day, 1)) {
    values.push(entries.get(day) ?? {
      day, answered: 0, correct: 0, incorrect: 0, durationMs: 0,
      accuracy: null, medianCorrectResponseMs: null, correctNotesPerMinute: null,
    });
  }
  return { values, start, end, page: current, pages };
}
export function recentHomeStatistics(data, now = Date.now()) {
  const today = buildStatistics(data, { period: 'today' }, now).overview;
  const recent = buildStatistics(data, { period: '7' }, now).overview;
  const latest = [...data.sessions].sort((a, b) =>
    Date.parse(b.session.startedAt) - Date.parse(a.session.startedAt))[0];
  return { today, recent, recentConfig: latest?.session.config ?? null };
}
