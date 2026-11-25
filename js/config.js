const range = (minMidi, maxMidi) => Object.freeze({ minMidi, maxMidi });
const OLD_TREBLE = range(60, 72), OLD_BASS = range(43, 57);
export const BASIC_RANGES = Object.freeze({ treble: range(60, 77), bass: range(43, 60) });
const preset = (clef, treble = BASIC_RANGES.treble, bass = BASIC_RANGES.bass, noteDistribution = 'uniform') =>
  Object.freeze({ clef, ranges: Object.freeze({ treble, bass }), noteDistribution });
export const NOTE_LIMITS = Object.freeze({ minMidi: 36, maxMidi: 84 }); // Readable C2–C6.
export const PRESETS = Object.freeze({
  'treble-basic': preset('treble'),
  'treble-extended': preset('treble', range(57, 84), BASIC_RANGES.bass, 'extended'),
  'treble-random': preset('treble', range(36, 84)),
  'bass-basic': preset('bass'),
  'bass-extended': preset('bass', BASIC_RANGES.treble, range(36, 64), 'extended'),
  'bass-random': preset('bass', BASIC_RANGES.treble, range(36, 84)),
  mixed: preset('mixed'),
  'grand-basic': preset('grand'),
  'grand-extended': preset('grand', range(57, 84), range(36, 64), 'extended'),
});
// Historical snapshots stay valid against the exact definitions used to create them.
export const LEGACY_PRESETS = Object.freeze({
  'treble-beginner': { clef:'treble', ranges:{treble:range(60,67),bass:OLD_BASS} },
  'treble-basic': { clef:'treble', ranges:{treble:OLD_TREBLE,bass:OLD_BASS} },
  'treble-staff': { clef:'treble', ranges:{treble:range(64,77),bass:OLD_BASS} },
  'treble-extended': { clef:'treble', ranges:{treble:range(57,84),bass:OLD_BASS} },
  'bass-beginner': { clef:'bass', ranges:{treble:OLD_TREBLE,bass:range(43,50)} },
  'bass-staff': { clef:'bass', ranges:{treble:OLD_TREBLE,bass:OLD_BASS} },
  'bass-extended': { clef:'bass', ranges:{treble:OLD_TREBLE,bass:range(36,64)} },
  mixed: { clef:'mixed', ranges:{treble:OLD_TREBLE,bass:OLD_BASS} },
});
export const migratePresetPreference = id => ({
  'treble-beginner':'treble-basic', 'treble-staff':'treble-basic',
  'bass-beginner':'bass-basic', 'bass-staff':'bass-basic',
})[id] ?? id;
export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'system', naming: 'czech',
  defaultPreset: 'treble-basic', defaultSessionType: 'unlimited',
});
export const EXERCISE_CONFIG = Object.freeze({
  ...PRESETS['treble-basic'], presetId: 'treble-basic', presetVersion: 2,
  naming: DEFAULT_SETTINGS.naming, sessionType: 'unlimited',
  durationMs: 60000, questionCount: 10,
  exerciseType: 'single-note', inputMethod: 'letter',
});
export const SESSION_LIMITS = Object.freeze({
  minDurationMs: 5000, maxDurationMs: 3600000, minCount: 1, maxCount: 1000,
});
export const TIMED_PRESETS = Object.freeze([30, 60, 120, 300]);
export const COUNT_PRESETS = Object.freeze([10, 25, 50, 100]);
export const FEEDBACK_MS = Object.freeze({ correct: 900, incorrect: 2000 });

export const SEQUENCE_LENGTHS = Object.freeze([3, 5, 8, 12, 16]);
export const SEQUENCE_DEFAULTS = Object.freeze({
  sequenceLength: 5, sequenceStrategy: 'random', feedbackMode: 'immediate', intervalMix: 'balanced',
});
export const SEQUENCE_STRATEGIES = Object.freeze({
  random: Object.freeze({}),
  stepwise: Object.freeze({ adjacentWeight: .85 }),
  melodic: Object.freeze({ contour: Object.freeze([1, 1, 0, -1, -1, 2, -1, 0]) }),
  repeated: Object.freeze({ repeatWeight: .7 }),
  intervals: Object.freeze({}),
});
export const INTERVAL_MIXES = Object.freeze({
  small: Object.freeze([1, 1, 1, 2, 2, 3]),
  balanced: Object.freeze([1, 2, 3, 4, 5, 7]),
  wide: Object.freeze([1, 3, 4, 5, 7, 8]),
});
