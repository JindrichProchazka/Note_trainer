import { SEQ } from './sequence-strings.js';
import { LETTERS } from '../music/notes.js';
import { renderNotation } from '../music/notation.js';
import { TEXT } from './strings.js';
import { letterName, noteName } from './note-names.js';
import { rangeDescription } from './config-description.js';
import { formatAccuracy, formatDuration, formatResponse, formatRemaining } from './format.js';

export function practiceMarkup(config) {
  return `<section class="practice-view${config.exerciseType === 'sequence' ? ' sequence-practice' : ''}" aria-labelledby="practice-title">
    <div class="practice-heading"><div>
      <p class="eyebrow">${config.exerciseType === 'sequence' ? SEQ.eyebrow : TEXT.practiceEyebrow}</p>
      <h1 id="practice-title" tabindex="-1">${config.exerciseType === 'sequence' ? SEQ.title : TEXT.practiceTitle}</h1>
    </div></div>
    <div class="practice-toolbar">
      <p class="session-progress" id="session-progress" aria-live="off"></p>
      <div class="practice-actions">
        <button class="button subtle" data-action="pause" id="pause-button">${TEXT.pause}</button>
        <button class="button subtle" data-action="finish" id="finish-button">${TEXT.finish}</button>
      </div>
    </div>
    <div class="card practice-card">
      <div class="staff-stage">
        <p class="staff-caption" id="staff-caption"></p>
        <div id="question-notation"></div>
        ${config.exerciseType === 'sequence' ? '<p class="sequence-progress" id="sequence-progress"></p><p class="sequence-convention">' + SEQ.convention + '</p>' : ''}
        <div class="pause-cover" id="pause-cover" hidden>
          <h2>${TEXT.paused}</h2><p>${TEXT.pauseDescription}</p>
          <button class="button primary" data-action="resume">${TEXT.resume}</button>
        </div>
      </div>
      <div class="sequence-controls">
      <div class="feedback-area">
        <div class="feedback" id="feedback" role="status" aria-live="polite" aria-atomic="true">
          <p id="feedback-message">${TEXT.instruction}</p>
          <p id="feedback-detail" class="muted">${TEXT.keyboardHint(config.naming)}</p>
        </div>
        <button class="button subtle next-button" data-action="next" id="next-button" hidden>${TEXT.next} →</button>
      </div>
      <div class="answer-buttons" role="group" aria-label="${TEXT.answerGroup}">
        ${LETTERS.map(letter => `<button class="answer-button" data-answer="${letter}"
          aria-label="${TEXT.answerLabel(letterName(letter, config.naming))}" aria-disabled="true">${letterName(letter, config.naming)}</button>`).join('')}
      </div>
      </div>
    </div>
    <dl class="metrics practice-metrics">
      <div><dt>${TEXT.answered}</dt><dd id="stat-answered">0</dd></div>
      <div><dt>${TEXT.accuracy}</dt><dd id="stat-accuracy">${TEXT.empty}</dd></div>
      <div><dt>${TEXT.response}</dt><dd id="stat-response">${TEXT.empty}</dd></div>
      <div><dt>${TEXT.practiceTime}</dt><dd id="stat-duration">0:00</dd></div>
    </dl>
    <p class="attempt-counts"><span>${TEXT.correct} <strong id="stat-correct">0</strong></span>
      <span>${TEXT.incorrect} <strong id="stat-incorrect">0</strong></span></p>
  </section>`;
}

/** Updates existing controls rather than replacing focused answer buttons. */
export class PracticeView {
  constructor(root) { this.root = root; this.questionId = null; this.phase = null; }

  update(session) {
    const paused = session.phase === 'paused';
    const complete = session.phase === 'complete';
    const feedback = session.phase === 'feedback' || (complete && session.completionReason === 'count');
    const changed = this.questionId !== session.question?.id;
    const clefName = TEXT.clefs[session.question.clef];
    if (changed) {
      this.root.querySelector('#question-notation').innerHTML =
        renderNotation(session.question.note, TEXT.questionLabel(clefName), session.question.clef);
      this.root.querySelector('#staff-caption').textContent =
        `${clefName} · ${rangeDescription(session.config, session.question.clef)}`;
      this.questionId = session.question.id;
    }
    this.root.querySelector('#pause-cover').hidden = !paused;
    this.root.querySelector('.staff-stage').classList.toggle('is-paused', paused);
    const pauseButton = this.root.querySelector('#pause-button');
    pauseButton.textContent = paused ? TEXT.resumeShort : TEXT.pause;
    pauseButton.dataset.action = paused ? 'resume' : 'pause';
    pauseButton.disabled = complete;
    this.root.querySelector('#finish-button').disabled = complete;
    const next = this.root.querySelector('#next-button');
    next.hidden = !feedback;
    next.textContent = (complete ? TEXT.viewSummary : TEXT.next) + ' →';
    const attempt = session.attempts.at(-1);
    this.root.querySelectorAll('[data-answer]').forEach(button => {
      // Preserve focus; the session model enforces readiness, expiry and duplicate guards.
      button.setAttribute('aria-disabled', String(session.phase !== 'awaiting'));
      delete button.dataset.result;
      if (feedback && attempt) {
        if (button.dataset.answer === session.question.note.letter) button.dataset.result = 'correct';
        else if (button.dataset.answer === attempt.answer) button.dataset.result = 'incorrect';
      }
    });

    if (changed || this.phase !== session.phase) {
      const message = this.root.querySelector('#feedback-message');
      const detail = this.root.querySelector('#feedback-detail');
      const area = this.root.querySelector('#feedback');
      area.dataset.result = '';
      const notation = this.root.querySelector('#question-notation .notation');
      notation.removeAttribute('data-result');
      notation.setAttribute('aria-label', TEXT.questionLabel(clefName));
      if (feedback) {
        const name = noteName(session.question.note, session.config.naming);
        area.dataset.result = attempt.correct ? 'correct' : 'incorrect';
        notation.dataset.result = area.dataset.result;
        notation.setAttribute('aria-label', TEXT.feedbackLabel(clefName, name));
        message.textContent = attempt.correct ? TEXT.correctFeedback(name)
          : TEXT.incorrectFeedback(letterName(attempt.answer, session.config.naming), name);
        detail.textContent = attempt.correct
          ? (complete ? TEXT.finalCorrectDetail : TEXT.responseDetail)(formatResponse(attempt.responseTimeMs))
          : complete ? TEXT.finalIncorrectDetail : TEXT.incorrectDetail;
      } else {
        message.textContent = paused ? TEXT.paused : session.phase === 'presenting' ? TEXT.preparing : TEXT.instruction;
        detail.textContent = paused ? TEXT.pauseDescription : TEXT.keyboardHint(session.config.naming);
      }
    }
    this.phase = session.phase;
    this.updateStatistics(session);
  }

  updateStatistics(session, concealed = false) {
    const stats = session.statistics;
    const values = {
      answered: stats.answered, accuracy: concealed ? TEXT.empty : formatAccuracy(stats.accuracy),
      response: formatResponse(stats.averageResponseMs), duration: formatDuration(stats.durationMs),
      correct: concealed ? TEXT.empty : stats.correct, incorrect: concealed ? TEXT.empty : stats.incorrect,
    };
    for (const [key, value] of Object.entries(values)) {
      this.root.querySelector(`#stat-${key}`).textContent = value;
    }
    this.root.querySelector('#session-progress').textContent = session.config.sessionType === 'timed'
      ? TEXT.remaining(formatRemaining(session.remainingMs))
      : session.config.sessionType === 'count' ? TEXT.countProgress(stats.answered, session.config.questionCount)
      : TEXT.sessionTypes.unlimited;
  }
}
