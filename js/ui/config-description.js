import { naturalNotesBetween } from '../music/notes.js';
import { activeClefs } from '../exercises/configuration.js';
import { TEXT } from './strings.js';
import { noteName } from './note-names.js';
import { formatDuration } from './format.js';

export function rangeDescription(config, clef) {
  const range = config.ranges[clef];
  const notes = naturalNotesBetween(range.minMidi, range.maxMidi);
  if (!notes.length) throw new RangeError('Empty range');
  return `${noteName(notes[0], config.naming)}–${noteName(notes.at(-1), config.naming)}`;
}
export function configurationDescription(config) {
  return activeClefs(config).map(clef => `${TEXT.clefs[clef]} · ${rangeDescription(config, clef)}`).join(' / ');
}
export function sessionDescription(config) {
  if (config.sessionType === 'timed') return `${TEXT.sessionTypes.timed} · ${formatDuration(config.durationMs)}`;
  if (config.sessionType === 'count') return `${TEXT.sessionTypes.count} · ${TEXT.questions(config.questionCount)}`;
  return TEXT.sessionTypes.unlimited;
}
