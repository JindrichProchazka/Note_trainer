import { V11,GRAND } from './usability-strings.js';
import { LEARN } from './learning-strings.js';
import { PIANO } from './piano-strings.js';
import { SEQ } from './sequence-strings.js';
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
  return (config.presetVersion===2?(config.presetId.endsWith('-random')?V11.random:config.noteDistribution==='extended'?V11.extended:config.presetId==='custom'?V11.uniform:V11.basic)+' · ':'') + (config.selectionMode ? LEARN.modes[config.selectionMode] + ' · ' : '') + (config.inputMethod === 'piano' ? PIANO.inputs.piano + ' · ' : '') + activeClefs(config).map(clef => `${TEXT.clefs[clef]} · ${rangeDescription(config, clef)}`).join(' / ');
}
export function sessionDescription(config) {
  if (config.sessionType === 'timed') return `${TEXT.sessionTypes.timed} · ${formatDuration(config.durationMs)}`;
  if (config.sessionType === 'count') return `${TEXT.sessionTypes.count} · ${(config.exerciseType==='grand-staff'?GRAND.pairs(config.questionCount):TEXT.questions(config.questionCount))}`;
  return TEXT.sessionTypes.unlimited;
}

export function exerciseDescription(config) {
  if(config.exerciseType==='grand-staff')return GRAND.name+' · '+SEQ.feedbackModes[config.feedbackMode]+' · '+GRAND.timingHint;
  if (config.exerciseType !== 'sequence') return SEQ.modes['single-note'];
  return SEQ.modes.sequence + ' · ' + SEQ.sequenceConfig(config.sequenceLength,
    SEQ.strategies[config.sequenceStrategy], SEQ.feedbackModes[config.feedbackMode]) +
    (config.sequenceStrategy === 'intervals' ? ' · ' + SEQ.intervalMixes[config.intervalMix] : '');
}
