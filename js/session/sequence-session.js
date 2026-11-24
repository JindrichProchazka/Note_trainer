import { PracticeSession } from './session.js';
import { createSequenceGenerator } from '../exercises/sequence.js';
import { LETTERS, writtenName } from '../music/notes.js';
import { isCorrectAnswer } from '../exercises/single-note.js';
import { contextId } from '../learning/context.js';
import { localDay } from '../learning/dates.js';
import { sequenceSummary } from './sequence-statistics.js';

/** Reuses the single-note session's clocks, activity, pause, expiry and observer. */
export class SequenceSession extends PracticeSession {
  constructor(options) {
    super(options);
    if (this.config.exerciseType !== 'sequence') throw new RangeError('Sequence configuration required');
    this.generateSequence = createSequenceGenerator(this.config, options?.random ?? Math.random);
    this.sequences = [];
    this.itemIndex = 0;
  }
  makeQuestion() {
    this.captureActivity();
    const remaining = this.config.sessionType === 'count'
      ? this.config.questionCount - this.attempts.length : this.config.sequenceLength;
    const target = this.generateSequence(Math.min(this.config.sequenceLength, remaining));
    const id = this.id + ':sequence:' + (++this.questionCount);
    this.question = Object.freeze({ id, ...target });
    this.sequences.push(Object.freeze({
      id, ordinal: this.questionCount, clef: target.clef,
      notes: Object.freeze(target.notes.map(writtenName)), createdAt: this.isoNow(),
    }));
    this.itemIndex = 0;
    this.responseMs = 0;
    this.readyAt = null;
    this.phase = 'presenting';
  }
  get answerToken() { return this.question ? this.question.id + ':' + this.itemIndex : null; }
  get currentAnswers() { return this.attempts.filter(attempt => attempt.sequenceId === this.question?.id); }
  get sequenceReviewed() { return !!this.question && this.currentAnswers.length === this.question.notes.length; }
  get holdFinalReview() { return this.phase === 'complete' && this.completionReason === 'count' && this.sequenceReviewed; }
  submit(answer, expectedToken = this.answerToken) {
    if (this.tick() || this.phase !== 'awaiting' || !LETTERS.includes(answer) || expectedToken !== this.answerToken) return null;
    const now = this.clock(), note = this.question.notes[this.itemIndex];
    this.captureActivity(now);
    const context = { writtenNote: writtenName(note), clef: this.question.clef,
      exerciseType: 'sequence', inputMethod: this.config.inputMethod };
    const timestamp = this.isoNow();
    const attempt = Object.freeze({
      id: this.question.id + ':' + this.itemIndex + ':answer', sessionId: this.id,
      questionId: this.question.id, sequenceId: this.question.id, itemIndex: this.itemIndex,
      ordinal: this.attempts.length + 1, midi: note.midi, octave: note.octave,
      ...context, contextId: contextId(context), answer, correct: isCorrectAnswer(note, answer),
      responseTimeMs: Math.max(0, this.responseMs + now - this.readyAt), timestamp, day: localDay(timestamp),
    });
    this.attempts.push(attempt);
    this.itemIndex++;
    this.responseMs = 0;
    this.readyAt = null;
    if (this.itemIndex === this.question.notes.length) {
      // Review consumes neither active session time nor the next note's response time.
      this.activeMs += this.activeSince === null ? 0 : now - this.activeSince;
      this.activeSince = null;
      this.activityWallAt = null;
      this.phase = 'feedback';
      if (this.config.sessionType === 'count' && this.attempts.length >= this.config.questionCount) this.finish('count');
      else this.emitChange();
    } else {
      // Wait for the updated active-note indicator to be painted before accepting input.
      this.phase = 'presenting';
      this.emitChange();
    }
    return attempt;
  }
  resume() {
    if (this.phase === 'paused' && this.resumePhase === 'feedback') {
      this.phase = 'feedback'; this.resumePhase = null; this.emitChange(); return true;
    }
    return super.resume();
  }
  get summary() { return { ...super.summary, ...sequenceSummary(this.sequences, this.attempts) }; }
}
