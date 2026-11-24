import { createNote } from '../music/notes.js';
import { renderNotation } from '../music/notation.js';
import { TEXT } from './strings.js';
import { formatAccuracy, formatDuration, formatResponse } from './format.js';

export function homeMarkup(session) {
  const stats = session.statistics;
  return `<section class="home-view" aria-labelledby="home-title">
    <div class="home-intro">
      <p class="eyebrow">${TEXT.eyebrow}</p>
      <h1 id="home-title" tabindex="-1">${TEXT.homeTitle.replace('\n', '<br>')}</h1>
      <p class="lead">${TEXT.homeDescription}</p>
    </div>
    <div class="home-grid">
      <section class="card exercise-card" aria-labelledby="exercise-title">
        <p class="eyebrow">${TEXT.exerciseLabel}</p>
        <h2 id="exercise-title">${TEXT.exerciseTitle}</h2>
        <p class="muted">${TEXT.exerciseDescription}</p>
        <ul class="tags" aria-label="${TEXT.readyDetail}">
          <li>${TEXT.clef}</li><li>${TEXT.range}</li><li>${TEXT.naturalNotes}</li>
        </ul>
        <div class="exercise-actions">
          <button class="button primary" data-action="practice">
            ${session.phase === 'idle' ? TEXT.start : TEXT.continue}<span aria-hidden="true"> →</span>
          </button>
          <span class="quiet-label">${TEXT.unlimited}</span>
        </div>
      </section>
      <figure class="card preview-card">
        <p class="eyebrow">${TEXT.example}</p>
        ${renderNotation(createNote('G', 4), TEXT.exampleLabel)}
        <figcaption>${TEXT.exampleCaption}</figcaption>
      </figure>
    </div>
    <section class="session-section" aria-labelledby="session-title">
      <div class="section-heading">
        <div><h2 id="session-title">${TEXT.sessionTitle}</h2>
          <p class="muted">${stats.answered ? TEXT.sessionDescription : TEXT.sessionEmpty}</p></div>
        ${session.phase === 'idle' ? '' : `<button class="button subtle" data-action="new-session">${TEXT.newSession}</button>`}
      </div>
      <dl class="metrics home-metrics">
        <div><dt>${TEXT.answered}</dt><dd>${stats.answered}</dd></div>
        <div><dt>${TEXT.accuracy}</dt><dd>${formatAccuracy(stats.accuracy)}</dd></div>
        <div><dt>${TEXT.response}</dt><dd>${formatResponse(stats.averageResponseMs)}</dd></div>
        <div><dt>${TEXT.practiceTime}</dt><dd>${formatDuration(stats.durationMs)}</dd></div>
      </dl>
      <p class="session-note">${TEXT.sessionOnly}</p>
    </section>
  </section>`;
}
