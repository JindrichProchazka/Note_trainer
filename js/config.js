// Milestone 1 deliberately has one fixed exercise configuration.
export const EXERCISE_CONFIG = Object.freeze({
  clef: 'treble',
  minMidi: 60,
  maxMidi: 72,
  exerciseType: 'single-note',
  inputMethod: 'letter',
  sessionType: 'unlimited',
});

export const FEEDBACK_MS = Object.freeze({ correct: 900, incorrect: 2000 });
