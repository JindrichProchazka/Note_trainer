import { EXERCISE_CONFIG } from '../config.js';
import { LETTERS, writtenName } from '../music/notes.js';
import { nextNote } from '../exercises/generator.js';
import { isCorrectAnswer } from '../exercises/single-note.js';
import { summarize } from './statistics.js';

let fallbackId = 0;
const newId = () => globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}-${++fallbackId}`;

/** DOM-free state machine. A rendered question must be marked ready before input. */
export class PracticeSession {
  constructor({ clock = () => performance.now(), random = Math.random, id = newId() } = {}) {
    this.clock = clock;
    this.random = random;
    this.id = id;
    this.config = EXERCISE_CONFIG;
    this.startedAt = null;
    this.phase = 'idle';
    this.question = null;
    this.attempts = [];
    this.questionCount = 0;
    this.activeMs = 0;
    this.activeSince = null;
    this.responseMs = 0;
    this.readyAt = null;
    this.resumePhase = null;
  }

  start() {
    if (this.phase !== 'idle') return false;
    this.startedAt = new Date().toISOString();
    this.makeQuestion();
    return true;
  }

  makeQuestion() {
    const note = nextNote(this.question?.note.midi, this.random);
    this.question = Object.freeze({ id: `${this.id}:${++this.questionCount}`, note });
    this.responseMs = 0;
    this.readyAt = null;
    this.phase = 'presenting';
  }

  markReady() {
    if (this.phase !== 'presenting') return false;
    const now = this.clock();
    this.phase = 'awaiting';
    this.readyAt = now;
    if (this.activeSince === null) this.activeSince = now;
    return true;
  }

  submit(answer) {
    if (this.phase !== 'awaiting' || !LETTERS.includes(answer)) return null;
    const now = this.clock();
    const attempt = Object.freeze({
      id: `${this.question.id}:answer`,
      sessionId: this.id,
      questionId: this.question.id,
      midi: this.question.note.midi,
      writtenNote: writtenName(this.question.note),
      clef: this.config.clef,
      exerciseType: this.config.exerciseType,
      inputMethod: this.config.inputMethod,
      answer,
      correct: isCorrectAnswer(this.question.note, answer),
      responseTimeMs: Math.max(0, this.responseMs + now - this.readyAt),
      timestamp: new Date().toISOString(),
    });
    // Lock before returning control to the UI. Only one attempt per question.
    this.phase = 'feedback';
    this.attempts.push(attempt);
    return attempt;
  }

  advance() {
    if (this.phase !== 'feedback') return false;
    this.makeQuestion();
    return true;
  }

  pause() {
    if (!['presenting', 'awaiting', 'feedback'].includes(this.phase)) return false;
    const now = this.clock();
    this.resumePhase = this.phase;
    if (this.phase === 'awaiting') this.responseMs += now - this.readyAt;
    if (this.activeSince !== null) this.activeMs += now - this.activeSince;
    this.activeSince = null;
    this.readyAt = null;
    this.phase = 'paused';
    return true;
  }

  resume() {
    if (this.phase !== 'paused') return false;
    const now = this.clock();
    this.phase = this.resumePhase;
    this.resumePhase = null;
    if (this.phase === 'awaiting') this.readyAt = now;
    if (this.phase !== 'presenting') this.activeSince = now;
    return true;
  }

  get statistics() {
    const duration = this.activeMs + (this.activeSince === null ? 0 : this.clock() - this.activeSince);
    return summarize(this.attempts, duration);
  }
}
