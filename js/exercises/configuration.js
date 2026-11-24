import { EXERCISE_CONFIG, NOTE_LIMITS, PRESETS, SESSION_LIMITS, SEQUENCE_DEFAULTS, SEQUENCE_LENGTHS, SEQUENCE_STRATEGIES, INTERVAL_MIXES } from '../config.js';
import { naturalNotesBetween } from '../music/notes.js';

export class ConfigurationError extends RangeError {
  constructor(code, clef = null) { super(code); this.code = code; this.clef = clef; }
}

export function activeClefs(config) {
  return config.clef === 'mixed' ? ['treble', 'bass'] : [config.clef];
}

/** Return a detached, deeply immutable session snapshot; never repair invalid input silently. */
export function validateConfiguration(input) {
  if (!input || !['treble', 'bass', 'mixed'].includes(input.clef)) throw new ConfigurationError('clef');
  if (!['czech', 'international'].includes(input.naming)) throw new ConfigurationError('naming');
  if (!['unlimited', 'timed', 'count'].includes(input.sessionType)) throw new ConfigurationError('session');
  if (!Object.hasOwn(PRESETS, input.presetId) && input.presetId !== 'custom') throw new ConfigurationError('preset');
  const exerciseType = input.exerciseType ?? 'single-note';
  if (!['single-note', 'sequence'].includes(exerciseType) || (input.inputMethod ?? 'letter') !== 'letter') throw new ConfigurationError('exercise');
  let sequence = {};
  if (exerciseType === 'sequence') {
    sequence = Object.fromEntries(Object.entries(SEQUENCE_DEFAULTS).map(([key, value]) => [key, input[key] ?? value]));
    if (!SEQUENCE_LENGTHS.includes(sequence.sequenceLength) || !Object.hasOwn(SEQUENCE_STRATEGIES, sequence.sequenceStrategy) ||
        !['immediate', 'delayed'].includes(sequence.feedbackMode) || !Object.hasOwn(INTERVAL_MIXES, sequence.intervalMix)) throw new ConfigurationError('sequence');
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
    const definition = PRESETS[input.presetId];
    if (input.clef !== definition.clef || activeClefs(input).some(clef =>
      ranges[clef].minMidi !== definition.ranges[clef].minMidi ||
      ranges[clef].maxMidi !== definition.ranges[clef].maxMidi)) throw new ConfigurationError('preset');
  }
  return Object.freeze({
    presetId: input.presetId, clef: input.clef, ranges: Object.freeze(ranges),
    naming: input.naming, sessionType: input.sessionType, durationMs, questionCount,
    exerciseType, inputMethod: 'letter', ...sequence,
  });
}

export function configurationForPreset(presetId, options = {}) {
  const definition = PRESETS[presetId];
  if (!definition) throw new ConfigurationError('preset');
  return validateConfiguration({ ...EXERCISE_CONFIG, ...options, ...definition, presetId });
}

export function configurationFromSettings(settings, presetId = settings.defaultPreset) {
  return configurationForPreset(presetId, { naming: settings.naming, sessionType: settings.defaultSessionType });
}
