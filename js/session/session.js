import { EXERCISE_CONFIG } from '../config.js';
import { LETTERS, writtenName } from '../music/notes.js';
import { createQuestionGenerator } from '../exercises/generator.js';
import { validateConfiguration } from '../exercises/configuration.js';
import { isCorrectAnswer } from '../exercises/single-note.js';
import { summarize, sessionSummary } from './statistics.js';

let fallbackId = 0;
const newId = () => globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}-${++fallbackId}`;

/** DOM-free state machine. Timing and terminal guards are enforced here, not by the UI. */
export class PracticeSession {
  constructor({ config = EXERCISE_CONFIG, clock = () => performance.now(), random = Math.random, id = newId() } = {}) {
    this.clock = clock;
    this.id = id;
    this.config = validateConfiguration(config);
    this.generateQuestion = createQuestionGenerator(this.config, random);
    this.startedAt = null;
    this.finishedAt = null;
    this.completionReason = null;
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
    const target = this.generateQuestion(this.question);
    this.question = Object.freeze({ id: `${this.id}:${++this.questionCount}`, ...target });
    this.responseMs = 0;
    this.readyAt = null;
    this.phase = 'presenting';
  }

  markReady() {
    if (this.tick() || this.phase !== 'presenting') return false;
    const now = this.clock();
    this.phase = 'awaiting';
    this.readyAt = now;
    if (this.activeSince === null) this.activeSince = now;
    return true;
  }

  submit(answer) {
    if (this.tick() || this.phase !== 'awaiting' || !LETTERS.includes(answer)) return null;
    const now = this.clock();
    const attempt = Object.freeze({
      id: `${this.question.id}:answer`, sessionId: this.id, questionId: this.question.id,
      midi: this.question.note.midi, writtenNote: writtenName(this.question.note),
      clef: this.question.clef, exerciseType: this.config.exerciseType,
      inputMethod: this.config.inputMethod, answer,
      correct: isCorrectAnswer(this.question.note, answer),
      responseTimeMs: Math.max(0, this.responseMs + now - this.readyAt),
      timestamp: new Date().toISOString(),
    });
    this.phase = 'feedback';
    this.attempts.push(attempt);
    if (this.config.sessionType === 'count' && this.attempts.length >= this.config.questionCount) {
      this.finish('count');
    }
    return attempt;
  }

  advance() {
    if (this.tick() || this.phase !== 'feedback') return false;
    this.makeQuestion();
    return true;
  }

  pause() {
    if (this.tick() || !['presenting', 'awaiting', 'feedback'].includes(this.phase)) return false;
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

  get elapsedMs() {
    return Math.max(0, this.activeMs + (this.activeSince === null ? 0 : this.clock() - this.activeSince));
  }

  get remainingMs() {
    return this.config.sessionType === 'timed' ? Math.max(0, this.config.durationMs - this.elapsedMs) : null;
  }

  /** Safe even if the browser's deadline timer was delayed or throttled. */
  tick() {
    if (this.phase === 'complete') return true;
    if (this.config.sessionType === 'timed' && this.elapsedMs >= this.config.durationMs) {
      this.finish('time');
      return true;
    }
    return false;
  }

  finish(reason = 'manual') {
    if (this.phase === 'idle' || this.phase === 'complete') return false;
    const duration = this.elapsedMs;
    const expired = this.config.sessionType === 'timed' && duration >= this.config.durationMs;
    this.activeMs = expired ? this.config.durationMs : duration;
    this.activeSince = null;
    this.readyAt = null;
    this.resumePhase = null;
    this.phase = 'complete';
    this.completionReason = expired ? 'time' : reason;
    this.finishedAt = new Date().toISOString();
    return true;
  }

  get statistics() {
    const duration = this.config.sessionType === 'timed'
      ? Math.min(this.elapsedMs, this.config.durationMs) : this.elapsedMs;
    return summarize(this.attempts, duration);
  }

  get summary() {
    return sessionSummary(this.attempts, this.statistics.durationMs);
  }
}
