import { naturalNotesBetween } from '../music/notes.js';
import { renderNotation } from '../music/notation.js';
import { TEXT } from './strings.js';
import { STATS } from './statistics-strings.js';
import { noteName } from './note-names.js';
import { presetOptions } from './configuration.js';
import { configurationDescription, sessionDescription } from './config-description.js';
import { formatAccuracy, formatDuration, formatResponse } from './format.js';
import { escapeHtml as h } from './html.js';

export function homeMarkup(session, quickConfig, persistent = null) {
  const current = session.statistics;
  const today = persistent?.today ?? current;
  const recent = persistent?.recent ?? { accuracy: current.accuracy, medianCorrectResponseMs: session.summary.medianCorrectResponseMs };
  const recentConfig = persistent?.recentConfig;
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
        <p class="eyebrow">${TEXT.exerciseLabel}</p><h2 id="exercise-title">${TEXT.exerciseTitle}</h2>
        <label class="form-field quick-preset" for="quick-preset">${TEXT.preset}
          <select id="quick-preset">${presetOptions(quickConfig.presetId, false)}</select></label>
        <p class="range-description">${configurationDescription(quickConfig)}</p>
        <ul class="tags"><li>${TEXT.naturalNotes}</li><li>${sessionDescription(quickConfig)}</li><li>${TEXT.namingShort[quickConfig.naming]}</li></ul>
        <div class="exercise-actions">
          <button class="button primary" data-action="quick-start">${TEXT.quickStart}<span aria-hidden="true"> →</span></button>
          <button class="button subtle" data-action="customize">${TEXT.customize}</button>
        </div>
      </section>
      <figure class="card preview-card"><p class="eyebrow">${TEXT.example}</p>
        ${renderNotation(example, TEXT.exampleLabel(exampleName, TEXT.clefs[clef]), clef)}
        <figcaption>${TEXT.exampleCaption(exampleName, TEXT.clefs[clef])}</figcaption>
      </figure>
    </div>
    <section class="session-section" aria-labelledby="session-title">
      <div class="section-heading"><div><h2 id="session-title">${STATS.today}</h2>
        <p class="muted">${today.answered ? TEXT.sessionDescription : TEXT.sessionEmpty}</p></div>
        ${session.phase === 'idle' ? '' : `<button class="button subtle" data-action="${session.phase === 'complete' ? 'summary' : 'practice'}">${session.phase === 'complete' ? TEXT.viewSummary : TEXT.continue}</button>`}
      </div>
      <dl class="metrics home-metrics">
        <div><dt>${STATS.todayTime}</dt><dd id="home-today-time">${formatDuration(today.durationMs)}</dd></div>
        <div><dt>${STATS.todayAnswers}</dt><dd id="home-today-answered">${today.answered}</dd></div>
        <div><dt>${STATS.recentAccuracyLabel}</dt><dd>${formatAccuracy(recent.accuracy)}</dd></div>
        <div><dt>${STATS.recentResponse}</dt><dd>${formatResponse(recent.medianCorrectResponseMs)}</dd></div>
      </dl>
      <p class="session-note">${STATS.savedHint}</p>
    </section>
    ${recentConfig ? `<section class="card recent-practice" aria-labelledby="recent-title">
      <div><p class="eyebrow" id="recent-title">${STATS.recentlyUsed}</p>
        <p>${h(configurationDescription({ ...recentConfig, naming: quickConfig.naming }))}</p>
        <p class="muted">${h(sessionDescription(recentConfig))}</p></div>
      ${recentConfig.exerciseType === 'single-note' && recentConfig.inputMethod === 'letter'
        ? `<button class="button subtle" data-action="repeat-recent">${STATS.repeatRecent}</button>` : ''}
    </section>` : ''}
  </section>`;
}
