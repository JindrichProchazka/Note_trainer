import { PracticeView } from './practice.js';
import { renderSequenceSystem } from '../music/notation.js';
import { sequenceResults } from '../session/sequence-statistics.js';
import { SEQ } from './sequence-strings.js';
import { TEXT } from './strings.js';
import { letterName, noteName } from './note-names.js';
import { formatAccuracy, formatResponse } from './format.js';
import { rangeDescription } from './config-description.js';
import { escapeHtml as h } from './html.js';

export function sequenceDisplay(session) {
  const reviewed = session.sequenceReviewed || ['complete', 'interrupted'].includes(session.phase);
  const revealed = session.config.feedbackMode === 'immediate' || reviewed;
  const answers = session.currentAnswers;
  return session.question.notes.map((note, index) => {
    const attempt = answers.find(answer => answer.itemIndex === index);
    const name = noteName(note, session.config.naming);
    const answer = attempt ? letterName(attempt.answer, session.config.naming) : null;
    const result = attempt ? revealed ? attempt.correct ? 'correct' : 'incorrect' : 'answered' : 'unanswered';
    const active = !reviewed && index === session.itemIndex;
    return {
      note, index, active, result,
      answer: answer ? (revealed ? attempt.correct ? '✓ ' : '× ' : '') + answer : null,
      correction: attempt && revealed && !attempt.correct ? '→ ' + name : '',
      accessible: SEQ.answerState(index + 1, answer, attempt
        ? revealed ? attempt.correct ? SEQ.correct : SEQ.incorrect(name) : SEQ.hiddenResult
        : active ? SEQ.current : SEQ.upcoming),
    };
  });
}

export function sequenceNotationMarkup(session, perSystem = 3) {
  const entries = sequenceDisplay(session), systems = [];
  for (let index = 0; index < entries.length; index += perSystem) {
    const group = entries.slice(index, index + perSystem);
    systems.push(renderSequenceSystem(group, SEQ.system(TEXT.clefs[session.question.clef], index + 1, index + group.length), session.question.clef));
  }
  return systems.join('') + '<ol class="sequence-text-alternative">' +
    entries.map(entry => '<li>' + h(entry.accessible) + '</li>').join('') + '</ol>';
}

/** Only the notation/status changes; shared answer controls retain keyboard focus. */
export class SequencePracticeView extends PracticeView {
  constructor(root) {
    super(root);
    this.host = root.querySelector('#question-notation');
    this.perSystem = this.host.clientWidth >= 600 ? 6 : 3;
    this.lastSystem = null;
    this.observer = globalThis.ResizeObserver ? new ResizeObserver(() => {
      const count = this.host.clientWidth >= 600 ? 6 : 3;
      if (count !== this.perSystem && this.session) {
        this.perSystem = count;
        this.renderQuestion(this.session);
      }
    }) : null;
    this.observer?.observe(this.host);
  }
  dispose() { this.observer?.disconnect(); }
  renderQuestion(session) { this.host.innerHTML = sequenceNotationMarkup(session, this.perSystem); }
  update(session) {
    this.session = session;
    const paused = session.phase === 'paused', complete = session.phase === 'complete';
    const review = session.sequenceReviewed;
    this.renderQuestion(session);
    this.root.querySelector('#staff-caption').textContent = TEXT.clefs[session.question.clef] + ' · ' + rangeDescription(session.config, session.question.clef);
    this.root.querySelector('#sequence-progress').textContent = SEQ.progress(session.questionCount, session.currentAnswers.length, session.question.notes.length);
    this.root.querySelector('#pause-cover').hidden = !paused;
    this.root.querySelector('.staff-stage').classList.toggle('is-paused', paused);
    const pause = this.root.querySelector('#pause-button');
    pause.textContent = paused ? TEXT.resumeShort : TEXT.pause;
    pause.dataset.action = paused ? 'resume' : 'pause';
    pause.disabled = complete;
    this.root.querySelector('#finish-button').disabled = complete;
    const next = this.root.querySelector('#next-button');
    next.hidden = !review || paused;
    next.textContent = (complete ? TEXT.viewSummary : SEQ.next) + ' →';
    this.root.querySelectorAll('[data-answer]').forEach(button => {
      button.setAttribute('aria-disabled', String(session.phase !== 'awaiting'));
      delete button.dataset.result;
    });
    const message = this.root.querySelector('#feedback-message'), detail = this.root.querySelector('#feedback-detail');
    const area = this.root.querySelector('#feedback');
    area.dataset.result = '';
    const last = session.currentAnswers.at(-1);
    if (paused) { message.textContent = TEXT.paused; detail.textContent = TEXT.pauseDescription; }
    else if (review) {
      const result = sequenceResults(session.sequences, session.attempts).at(-1);
      message.textContent = SEQ.review;
      detail.textContent = SEQ.reviewDetail(formatAccuracy(result.accuracy), formatResponse(result.answerDurationMs)) + ' ' + SEQ.reviewClock;
    } else {
      const active = SEQ.active(session.itemIndex + 1, session.question.notes.length);
      if (last && session.config.feedbackMode === 'immediate') {
        const name = noteName(session.question.notes[last.itemIndex], session.config.naming);
        area.dataset.result = last.correct ? 'correct' : 'incorrect';
        message.textContent = last.correct ? TEXT.correctFeedback(name) : TEXT.incorrectFeedback(letterName(last.answer, session.config.naming), name);
        detail.textContent = active;
      } else {
        message.textContent = active;
        detail.textContent = session.config.feedbackMode === 'delayed' ? SEQ.delayedHint : SEQ.instruction;
      }
    }
    this.updateStatistics(session);
    const system = Math.floor(session.itemIndex / this.perSystem);
    if (!paused && !review && session.itemIndex > 0 && this.lastSystem !== system) {
      this.host.querySelector('.sequence-note[data-active]')?.closest('svg')?.scrollIntoView({ block: 'nearest' });
    }
    this.lastSystem = system;
  }
  updateStatistics(session) {
    super.updateStatistics(session, session.config.feedbackMode === 'delayed' && !session.sequenceReviewed &&
      !['complete', 'interrupted'].includes(session.phase));
  }
}
