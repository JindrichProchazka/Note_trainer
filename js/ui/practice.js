import { LETTERS, writtenName } from '../music/notes.js';
import { renderNotation } from '../music/notation.js';
import { TEXT } from './strings.js';
import { formatAccuracy, formatDuration, formatResponse } from './format.js';

export function practiceMarkup() {
  return `<section class="practice-view" aria-labelledby="practice-title">
    <div class="practice-heading">
      <div><p class="eyebrow">${TEXT.practiceEyebrow}</p>
        <h1 id="practice-title" tabindex="-1">${TEXT.practiceTitle}</h1></div>
      <button class="button subtle" data-action="pause" id="pause-button">${TEXT.pause}</button>
    </div>
    <p class="muted practice-description">${TEXT.practiceDescription}</p>
    <div class="card practice-card">
      <div class="staff-stage">
        <p class="staff-caption">${TEXT.readyDetail}</p>
        <div id="question-notation"></div>
        <div class="pause-cover" id="pause-cover" hidden>
          <h2>${TEXT.paused}</h2><p>${TEXT.pauseDescription}</p>
          <button class="button primary" data-action="resume">${TEXT.resume}</button>
        </div>
      </div>
      <div class="feedback-area">
        <div class="feedback" id="feedback" role="status" aria-live="polite" aria-atomic="true">
          <p id="feedback-message">${TEXT.instruction}</p>
          <p id="feedback-detail" class="muted">${TEXT.keyboardHint}</p>
        </div>
        <button class="button subtle next-button" data-action="next" id="next-button" hidden>${TEXT.next} →</button>
      </div>
      <div class="answer-buttons" role="group" aria-label="${TEXT.answerGroup}">
        ${LETTERS.map(letter => `<button class="answer-button" data-answer="${letter}"
          aria-label="${TEXT.answerLabel(letter)}" aria-disabled="true">${letter}</button>`).join('')}
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
  constructor(root) {
    this.root = root;
    this.questionId = null;
    this.phase = null;
  }

  update(session) {
    const paused = session.phase === 'paused';
    const feedback = session.phase === 'feedback';
    const changed = this.questionId !== session.question?.id;
    if (changed) {
      this.root.querySelector('#question-notation').innerHTML =
        renderNotation(session.question.note, TEXT.questionLabel);
      this.questionId = session.question.id;
    }
    const cover = this.root.querySelector('#pause-cover');
    cover.hidden = !paused;
    this.root.querySelector('.staff-stage').classList.toggle('is-paused', paused);
    const pauseButton = this.root.querySelector('#pause-button');
    pauseButton.textContent = paused ? TEXT.resumeShort : TEXT.pause;
    pauseButton.dataset.action = paused ? 'resume' : 'pause';
    this.root.querySelector('#next-button').hidden = !feedback;
    const buttons = this.root.querySelectorAll('[data-answer]');
    const attempt = session.attempts.at(-1);
    buttons.forEach(button => {
      // aria-disabled keeps the focus target stable; session.submit enforces the lock.
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
      notation.setAttribute('aria-label', TEXT.questionLabel);
      if (feedback) {
        const name = writtenName(session.question.note);
        area.dataset.result = attempt.correct ? 'correct' : 'incorrect';
        notation.dataset.result = area.dataset.result;
        notation.setAttribute('aria-label', attempt.correct
          ? TEXT.feedbackCorrectLabel(name) : TEXT.feedbackIncorrectLabel(name));
        message.textContent = attempt.correct
          ? TEXT.correctFeedback(name) : TEXT.incorrectFeedback(attempt.answer, name);
        detail.textContent = attempt.correct
          ? TEXT.responseDetail(formatResponse(attempt.responseTimeMs)) : TEXT.incorrectDetail;
      } else {
        message.textContent = paused ? TEXT.paused
          : session.phase === 'presenting' ? TEXT.preparing : TEXT.instruction;
        detail.textContent = paused ? TEXT.pauseDescription : TEXT.keyboardHint;
      }
    }
    this.phase = session.phase;
    this.updateStatistics(session);
  }

  updateStatistics(session) {
    const stats = session.statistics;
    const values = {
      answered: stats.answered,
      accuracy: formatAccuracy(stats.accuracy),
      response: formatResponse(stats.averageResponseMs),
      duration: formatDuration(stats.durationMs),
      correct: stats.correct,
      incorrect: stats.incorrect,
    };
    for (const [key, value] of Object.entries(values)) {
      this.root.querySelector(`#stat-${key}`).textContent = value;
    }
  }
}
