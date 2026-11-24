import { LETTERS } from '../music/notes.js';
export const validAnswer = (answer, config) => config.inputMethod === 'piano'
  ? Number.isInteger(answer) && answer >= config.keyboardMin && answer <= config.keyboardMax
  : LETTERS.includes(answer);
export const correctAnswer = (note, answer, config) => config.inputMethod === 'piano' ? note.midi === answer : note.letter === answer;
