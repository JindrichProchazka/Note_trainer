import { EXERCISE_CONFIG, NOTE_LIMITS, PRESETS, LEGACY_PRESETS, SESSION_LIMITS, SEQUENCE_DEFAULTS, SEQUENCE_LENGTHS, SEQUENCE_STRATEGIES, INTERVAL_MIXES } from '../config.js';
import { naturalNotesBetween } from '../music/notes.js';

export class ConfigurationError extends RangeError {
  constructor(code, clef = null) { super(code); this.code = code; this.clef = clef; }
}

export function activeClefs(config) {
  return ['mixed', 'grand'].includes(config.clef) ? ['treble', 'bass'] : [config.clef];
}

/** Return a detached, deeply immutable session snapshot; never repair invalid input silently. */
export function validateConfiguration(input) {
  if (!input || !['treble', 'bass', 'mixed', 'grand'].includes(input.clef)) throw new ConfigurationError('clef');
  if (!['czech', 'international'].includes(input.naming)) throw new ConfigurationError('naming');
  if (!['unlimited', 'timed', 'count'].includes(input.sessionType)) throw new ConfigurationError('session');
  const definitions = input.presetVersion === 2 ? PRESETS : { ...PRESETS, ...LEGACY_PRESETS };
  if (input.presetVersion !== undefined && input.presetVersion !== 2) throw new ConfigurationError('preset');
  if (!Object.hasOwn(definitions, input.presetId) && input.presetId !== 'custom') throw new ConfigurationError('preset');
  const exerciseType = input.exerciseType ?? 'single-note';
  if (!['single-note', 'sequence', 'grand-staff'].includes(exerciseType) || !['letter', 'piano'].includes(input.inputMethod ?? 'letter')) throw new ConfigurationError('exercise');
  if ((exerciseType === 'grand-staff') !== (input.clef === 'grand') || (exerciseType === 'grand-staff' && (input.inputMethod ?? 'letter') !== 'letter')) throw new ConfigurationError('exercise');
  const randomPreset=input.presetVersion===2 && input.presetId.endsWith('-random');
  const selectionMode=randomPreset?'uniform':input.selectionMode ?? 'uniform';
  if(!['uniform','adaptive','weak','mistakes'].includes(selectionMode))throw new ConfigurationError('selection');
  let sequence = {};
  if (exerciseType === 'sequence') {
    sequence = Object.fromEntries(Object.entries(SEQUENCE_DEFAULTS).map(([key, value]) => [key, input[key] ?? value]));
    if (!SEQUENCE_LENGTHS.includes(sequence.sequenceLength) || !Object.hasOwn(SEQUENCE_STRATEGIES, sequence.sequenceStrategy) ||
        !['immediate', 'delayed'].includes(sequence.feedbackMode) || !Object.hasOwn(INTERVAL_MIXES, sequence.intervalMix)) throw new ConfigurationError('sequence');
  }
  if(randomPreset && exerciseType==='sequence')sequence.sequenceStrategy='random';
  if(exerciseType==='grand-staff'){
    if(!['immediate','delayed'].includes(input.feedbackMode ?? 'immediate'))throw new ConfigurationError('sequence');
    sequence={feedbackMode:input.feedbackMode ?? 'immediate'};
  }
  const ranges = {};
  for (const clef of ['treble', 'bass']) {
    const selected = activeClefs(input).includes(clef) ? input.ranges?.[clef] : EXERCISE_CONFIG.ranges[clef];
    if (!selected || !Number.isInteger(selected.minMidi) || !Number.isInteger(selected.maxMidi) ||
        selected.minMidi < NOTE_LIMITS.minMidi || selected.maxMidi > NOTE_LIMITS.maxMidi ||
        selected.minMidi > selected.maxMidi) throw new ConfigurationError('range', clef);
    const notes = naturalNotesBetween(selected.minMidi, selected.maxMidi);
    if (notes[0]?.midi !== selected.minMidi || notes.at(-1)?.midi !== selected.maxMidi) {
      throw new ConfigurationError('range', clef);
    }
    ranges[clef] = Object.freeze({ minMidi: selected.minMidi, maxMidi: selected.maxMidi });
  }
  // Ignore hidden controls from another session type; normalize unused limits.
  const durationMs = input.sessionType === 'timed' ? input.durationMs : EXERCISE_CONFIG.durationMs;
  const questionCount = input.sessionType === 'count' ? input.questionCount : EXERCISE_CONFIG.questionCount;
  if (!Number.isInteger(durationMs) || durationMs % 1000 !== 0 || durationMs < SESSION_LIMITS.minDurationMs ||
      durationMs > SESSION_LIMITS.maxDurationMs) throw new ConfigurationError('duration');
  if (!Number.isInteger(questionCount) || questionCount < SESSION_LIMITS.minCount ||
      questionCount > SESSION_LIMITS.maxCount) throw new ConfigurationError('count');
  if (input.presetId !== 'custom') {
    const definition = definitions[input.presetId];
    if (input.clef !== definition.clef || activeClefs(input).some(clef =>
      ranges[clef].minMidi !== definition.ranges[clef].minMidi ||
      ranges[clef].maxMidi !== definition.ranges[clef].maxMidi)) throw new ConfigurationError('preset');
  }
  const inputMethod = input.inputMethod ?? 'letter';
  let piano = {};
  if (inputMethod === 'piano') {
    const keyboardMin=input.keyboardMin ?? Math.min(...activeClefs(input).map(c=>ranges[c].minMidi)), keyboardMax=input.keyboardMax ?? Math.max(...activeClefs(input).map(c=>ranges[c].maxMidi));
    if(!Number.isInteger(keyboardMin)||!Number.isInteger(keyboardMax)||keyboardMin<36||keyboardMax>84||keyboardMin>keyboardMax||
      activeClefs(input).some(clef=>ranges[clef].minMidi<keyboardMin||ranges[clef].maxMidi>keyboardMax)||
      (input.noteLabels!==undefined && typeof input.noteLabels!=='boolean') || (input.octaveMarkers!==undefined && typeof input.octaveMarkers!=='boolean')) throw new ConfigurationError('keyboard');
    piano={keyboardMin,keyboardMax,noteLabels:input.noteLabels ?? false,...(input.octaveMarkers?{octaveMarkers:true}:{})};
  }
  return Object.freeze({
    presetId: input.presetId, ...(input.presetVersion===2?{presetVersion:2,noteDistribution:randomPreset?'uniform':input.presetId==='custom'?(input.noteDistribution==='extended'?'extended':'uniform'):PRESETS[input.presetId].noteDistribution}:{}), clef: input.clef, ranges: Object.freeze(ranges),
    naming: input.naming, sessionType: input.sessionType, durationMs, questionCount,
    exerciseType, inputMethod, ...sequence, ...piano, ...(selectionMode==='uniform'?{}:{selectionMode}),
  });
}

export function configurationForPreset(presetId, options = {}) {
  const current=Object.hasOwn(PRESETS,presetId);
  const definition = PRESETS[presetId] ?? LEGACY_PRESETS[presetId];
  if (!definition) throw new ConfigurationError('preset');
  return validateConfiguration({ ...EXERCISE_CONFIG, ...options, ...definition, presetId,
    presetVersion:current?2:undefined, exerciseType:definition.clef==='grand'?'grand-staff':options.exerciseType==='grand-staff'?'single-note':options.exerciseType ?? 'single-note',
    inputMethod:definition.clef==='grand'?'letter':options.inputMethod ?? 'letter' });
}

export function configurationFromSettings(settings, presetId = settings.defaultPreset) {
  return configurationForPreset(presetId, { naming: settings.naming, sessionType: settings.defaultSessionType });
}
