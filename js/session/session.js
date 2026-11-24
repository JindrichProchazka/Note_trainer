import { validAnswer, correctAnswer } from '../exercises/answers.js';
import { EXERCISE_CONFIG } from '../config.js';
import { LETTERS, writtenName } from '../music/notes.js';
import { createQuestionGenerator } from '../exercises/generator.js';
import { validateConfiguration } from '../exercises/configuration.js';
import { isCorrectAnswer } from '../exercises/single-note.js';
import { summarize, sessionSummary } from './statistics.js';
import { contextId } from '../learning/context.js';
import { localDay, splitActiveDuration } from '../learning/dates.js';

let fallbackId = 0;
const newId = () => globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}-${++fallbackId}`;

/** DOM-free timing/state machine; an observer can persist complete evidence snapshots. */
export class PracticeSession {
  constructor({ config = EXERCISE_CONFIG, clock = () => performance.now(), wallClock = () => Date.now(),
    random = Math.random, getAttempts = () => [], id = newId(), onChange = () => {} } = {}) {
    this.clock = clock;
    this.wallClock = wallClock;
    this.onChange = onChange;
    this.id = id;
    this.config = validateConfiguration(config);
    this.getAttempts = () => [...new Map([...getAttempts(), ...(this.attempts ?? [])].map(attempt=>[attempt.id,attempt])).values()];
    this.generateQuestion = createQuestionGenerator(this.config, random, {getAttempts:this.getAttempts,now:wallClock});
    this.startedAt = null;
    this.finishedAt = null;
    this.interruptedAt = null;
    this.completionReason = null;
    this.phase = 'idle';
    this.question = null;
    this.attempts = [];
    this.activity = [];
    this.recordedDurationMs = 0;
    this.activityWallAt = null;
    this.questionCount = 0;
    this.activeMs = 0;
    this.activeSince = null;
    this.responseMs = 0;
    this.readyAt = null;
    this.resumePhase = null;
  }
  isoNow() { return new Date(this.wallClock()).toISOString(); }
  emitChange() { this.onChange(this); }

  start() {
    if (this.phase !== 'idle') return false;
    this.startedAt = this.isoNow();
    this.makeQuestion();
    this.emitChange();
    return true;
  }
  makeQuestion() {
    this.captureActivity();
    const target = this.generateQuestion(this.question);
    this.question = Object.freeze({ id: `${this.id}:${++this.questionCount}`, ...target });
    this.responseMs = 0;
    this.readyAt = null;
    this.phase = 'presenting';
    if (this.activeSince !== null) this.activityWallAt = this.wallClock();
  }
  markReady() {
    if (this.tick() || this.phase !== 'presenting') return false;
    const now = this.clock();
    this.phase = 'awaiting';
    this.readyAt = now;
    if (this.activeSince === null) {
      this.activeSince = now;
      this.activityWallAt = this.wallClock();
    }
    this.emitChange();
    return true;
  }
  submit(answer) {
    if (this.tick() || this.phase !== 'awaiting' || !validAnswer(answer, this.config)) return null;
    const now = this.clock();
    this.captureActivity(now);
    const context = {
      writtenNote: writtenName(this.question.note), clef: this.question.clef,
      exerciseType: this.config.exerciseType, inputMethod: this.config.inputMethod,
    };
    const timestamp = this.isoNow();
    const attempt = Object.freeze({
      id: `${this.question.id}:answer`, sessionId: this.id, questionId: this.question.id,
      ordinal: this.attempts.length + 1, itemIndex: 0,
      midi: this.question.note.midi, octave: this.question.note.octave,
      ...context, contextId: contextId(context), answer,
      correct: correctAnswer(this.question.note, answer, this.config),
      responseTimeMs: Math.max(0, this.responseMs + now - this.readyAt),
      timestamp, day: localDay(timestamp),
    });
    this.phase = 'feedback';
    this.attempts.push(attempt);
    if (this.config.sessionType === 'count' && this.attempts.length >= this.config.questionCount) this.finish('count');
    else this.emitChange(); // Synchronous persistence happens before returning the answer to the UI.
    return attempt;
  }
  advance() {
    if (this.tick() || this.phase !== 'feedback') return false;
    this.makeQuestion();
    this.emitChange();
    return true;
  }
  pause() {
    if (this.tick() || !['presenting', 'awaiting', 'feedback'].includes(this.phase)) return false;
    const now = this.clock();
    this.captureActivity(now);
    this.resumePhase = this.phase;
    if (this.phase === 'awaiting') this.responseMs += now - this.readyAt;
    if (this.activeSince !== null) this.activeMs += now - this.activeSince;
    this.activeSince = null;
    this.activityWallAt = null;
    this.readyAt = null;
    this.phase = 'paused';
    this.emitChange();
    return true;
  }
  resume() {
    if (this.phase !== 'paused') return false;
    const now = this.clock();
    this.phase = this.resumePhase;
    this.resumePhase = null;
    if (this.phase === 'awaiting') this.readyAt = now;
    if (this.phase !== 'presenting') {
      this.activeSince = now;
      this.activityWallAt = this.wallClock();
    }
    this.emitChange();
    return true;
  }
  get elapsedMs() {
    return Math.max(0, this.activeMs + (this.activeSince === null ? 0 : this.clock() - this.activeSince));
  }
  get remainingMs() {
    return this.config.sessionType === 'timed' ? Math.max(0, this.config.durationMs - this.elapsedMs) : null;
  }
  tick() {
    if (['complete', 'interrupted'].includes(this.phase)) return true;
    if (this.config.sessionType === 'timed' && this.elapsedMs >= this.config.durationMs) {
      this.finish('time');
      return true;
    }
    return false;
  }
  finish(reason = 'manual') {
    if (['idle', 'complete', 'interrupted'].includes(this.phase)) return false;
    const now = this.clock();
    const duration = Math.max(0, this.activeMs + (this.activeSince === null ? 0 : now - this.activeSince));
    this.captureActivity(now);
    const expired = this.config.sessionType === 'timed' && duration >= this.config.durationMs;
    this.activeMs = expired ? this.config.durationMs : duration;
    this.activeSince = null;
    this.activityWallAt = null;
    this.readyAt = null;
    this.resumePhase = null;
    this.phase = 'complete';
    this.completionReason = expired ? 'time' : reason;
    this.finishedAt = this.isoNow();
    this.emitChange();
    return true;
  }
  interrupt() {
    if (['idle', 'complete', 'interrupted'].includes(this.phase)) return false;
    if (this.phase !== 'paused') this.pause();
    if (this.phase === 'complete') return false;
    this.phase = 'interrupted';
    this.interruptedAt = this.isoNow();
    this.emitChange();
    return true;
  }
  captureActivity(now = this.clock()) {
    if (this.activeSince === null || this.activityWallAt === null || !this.question) return false;
    const elapsed = Math.max(0, this.activeMs + now - this.activeSince);
    const duration = this.config.sessionType === 'timed' ? Math.min(elapsed, this.config.durationMs) : elapsed;
    const delta = Math.max(0, duration - this.recordedDurationMs);
    if (!delta) return false;
    for (const part of splitActiveDuration(this.activityWallAt, delta)) {
      let bucket = this.activity.find(item => item.day === part.day && item.clef === this.question.clef);
      if (!bucket) {
        bucket = { day: part.day, clef: this.question.clef, exerciseType: this.config.exerciseType,
          inputMethod: this.config.inputMethod, durationMs: 0 };
        this.activity.push(bucket);
      }
      bucket.durationMs += part.durationMs;
    }
    this.recordedDurationMs += delta;
    this.activityWallAt = this.wallClock();
    return true;
  }
  checkpoint() {
    if (this.tick()) return false;
    if (!this.captureActivity()) return false;
    this.emitChange();
    return true;
  }
  get statistics() {
    const duration = this.config.sessionType === 'timed'
      ? Math.min(this.elapsedMs, this.config.durationMs) : this.elapsedMs;
    return summarize(this.attempts, duration);
  }
  get summary() { return sessionSummary(this.attempts, this.statistics.durationMs); }
}
