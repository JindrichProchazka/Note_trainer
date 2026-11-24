import { TEXT } from './strings.js';
import { formatAccuracy, formatDuration, formatResponse } from './format.js';
import { configurationDescription, sessionDescription } from './config-description.js';
import { writtenNoteName } from './note-names.js';

export function summaryMarkup(session) {
  const stats = session.summary;
  const metric = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  return `<section class="summary-view" aria-labelledby="summary-title">
    <p class="eyebrow">${TEXT.summaryEyebrow}</p>
    <h1 id="summary-title" tabindex="-1">${TEXT.summaryTitle}</h1>
    <p class="lead">${TEXT.completion[session.completionReason]}</p>
    <section class="card summary-configuration" aria-labelledby="summary-config-title">
      <p class="eyebrow" id="summary-config-title">${TEXT.configuration}</p>
      <h2>${TEXT.presets[session.config.presetId]}</h2>
      <p>${configurationDescription(session.config)}</p>
      <p class="muted">${sessionDescription(session.config)} · ${TEXT.namingShort[session.config.naming]}</p>
    </section>
    <dl class="metrics summary-metrics">
      ${metric(TEXT.practiceTime, formatDuration(stats.durationMs))}
      ${metric(TEXT.answered, stats.answered)}
      ${metric(TEXT.correct, stats.correct)}
      ${metric(TEXT.incorrect, stats.incorrect)}
      ${metric(TEXT.accuracy, formatAccuracy(stats.accuracy))}
      ${metric(TEXT.medianCorrect, formatResponse(stats.medianCorrectResponseMs))}
      ${metric(TEXT.correctPerMinute, stats.correctNotesPerMinute.toFixed(1))}
    </dl>
    ${stats.answered && !stats.correct ? `<p class="session-note">${TEXT.noCorrectResponses}</p>` : ''}
    <section class="card missed-card" aria-labelledby="missed-title">
      <h2 id="missed-title">${TEXT.missed}</h2>
      ${stats.mostMissed.length ? `<ul class="missed-list">${stats.mostMissed.map(item =>
        `<li><span><strong>${writtenNoteName(item.writtenNote, session.config.naming)}</strong>
          <span class="muted">· ${TEXT.clefs[item.clef]}</span></span><span>${TEXT.misses(item.incorrect)}</span></li>`).join('')}</ul>`
        : `<p class="muted">${stats.answered ? TEXT.noMistakes : TEXT.noAnswers}</p>`}
    </section>
    <div class="summary-actions">
      <button class="button primary" data-action="repeat">${TEXT.repeat}</button>
      <button class="button subtle" data-action="different">${TEXT.different}</button>
      <button class="button subtle" data-action="home">${TEXT.returnHome}</button>
    </div>
    <p class="session-note">${TEXT.sessionOnly}</p>
  </section>`;
}
