import { LETTERS } from '../music/notes.js';

/** Letter answers identify a note name, so C is valid for both C4 and C5. */
export function isCorrectAnswer(note, answer) {
  return LETTERS.includes(answer) && note.letter === answer;
}
