const range = (minMidi, maxMidi) => Object.freeze({ minMidi, maxMidi });
const TREBLE_BASIC = range(60, 72);
const BASS_STAFF = range(43, 57);
const preset = (clef, treble = TREBLE_BASIC, bass = BASS_STAFF) =>
  Object.freeze({ clef, ranges: Object.freeze({ treble, bass }) });

// Pitch limits and all preset definitions are independent of interface copy.
export const NOTE_LIMITS = Object.freeze({ minMidi: 36, maxMidi: 84 }); // C2–C6
export const PRESETS = Object.freeze({
  'treble-beginner': preset('treble', range(60, 67)),
  'treble-basic': preset('treble'),
  'treble-staff': preset('treble', range(64, 77)),
  'treble-extended': preset('treble', range(57, 84)),
  'bass-beginner': preset('bass', TREBLE_BASIC, range(43, 50)),
  'bass-staff': preset('bass'),
  'bass-extended': preset('bass', TREBLE_BASIC, range(36, 64)),
  mixed: preset('mixed'),
});
export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'system', naming: 'czech',
  defaultPreset: 'treble-basic', defaultSessionType: 'unlimited',
});
export const EXERCISE_CONFIG = Object.freeze({
  ...PRESETS['treble-basic'], presetId: 'treble-basic',
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
