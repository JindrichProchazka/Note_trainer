import { naturalNotesBetween } from '../music/notes.js';
import { renderNotation } from '../music/notation.js';
import { TEXT } from './strings.js';
import { noteName } from './note-names.js';
import { presetOptions } from './configuration.js';
import { configurationDescription, sessionDescription } from './config-description.js';
import { formatAccuracy, formatDuration, formatResponse } from './format.js';

export function homeMarkup(session, quickConfig) {
  const stats = session.statistics;
  const clef = quickConfig.clef === 'mixed' ? 'treble' : quickConfig.clef;
  const range = quickConfig.ranges[clef];
  const notes = naturalNotesBetween(range.minMidi, range.maxMidi);
  const example = notes[Math.floor(notes.length / 2)];
  const exampleName = noteName(example, quickConfig.naming);
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
        <label class="form-field quick-preset" for="quick-preset">${TEXT.preset}
          <select id="quick-preset">${presetOptions(quickConfig.presetId, false)}</select></label>
        <p class="range-description">${configurationDescription(quickConfig)}</p>
        <ul class="tags">
          <li>${TEXT.naturalNotes}</li><li>${sessionDescription(quickConfig)}</li>
          <li>${TEXT.namingShort[quickConfig.naming]}</li>
        </ul>
        <div class="exercise-actions">
          <button class="button primary" data-action="quick-start">${TEXT.quickStart}<span aria-hidden="true"> →</span></button>
          <button class="button subtle" data-action="customize">${TEXT.customize}</button>
        </div>
      </section>
      <figure class="card preview-card">
        <p class="eyebrow">${TEXT.example}</p>
        ${renderNotation(example, TEXT.exampleLabel(exampleName, TEXT.clefs[clef]), clef)}
        <figcaption>${TEXT.exampleCaption(exampleName, TEXT.clefs[clef])}</figcaption>
      </figure>
    </div>
    <section class="session-section" aria-labelledby="session-title">
      <div class="section-heading">
        <div><h2 id="session-title">${TEXT.sessionTitle}</h2>
          <p class="muted">${stats.answered ? TEXT.sessionDescription : TEXT.sessionEmpty}</p></div>
        ${session.phase === 'idle' ? '' : `<button class="button subtle" data-action="${session.phase === 'complete' ? 'summary' : 'practice'}">${session.phase === 'complete' ? TEXT.viewSummary : TEXT.continue}</button>`}
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
