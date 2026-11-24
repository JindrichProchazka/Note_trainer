import { TEXT } from './strings.js';
import { STATS } from './statistics-strings.js';
import { formatAccuracy, formatDuration, formatResponse } from './format.js';
import { configurationDescription, sessionDescription } from './config-description.js';
import { writtenNoteName } from './note-names.js';
import { canRepeat } from './session-history.js';
import { escapeHtml as h } from './html.js';

export function summaryMarkup(session, { historical = false, naming = session.config.naming } = {}) {
  const stats = session.summary;
  const metric = (label, value) => `<div><dt>${label}</dt><dd>${h(value)}</dd></div>`;
  const configuration = { ...session.config, naming };
  const incomplete = session.completionReason === 'interrupted';
  return `<section class="summary-view" aria-labelledby="summary-title">
    <p class="eyebrow">${historical ? STATS.historical : TEXT.summaryEyebrow}</p>
    <h1 id="summary-title" tabindex="-1">${historical ? STATS.historicalTitle : TEXT.summaryTitle}</h1>
    <p class="lead">${incomplete ? STATS.interruption : TEXT.completion[session.completionReason]}</p>
    <section class="card summary-configuration" aria-labelledby="summary-config-title">
      <p class="eyebrow" id="summary-config-title">${TEXT.configuration}</p>
      <h2>${TEXT.presets[session.config.presetId] ?? TEXT.custom}</h2>
      <p>${configurationDescription(configuration)}</p>
      <p class="muted">${sessionDescription(session.config)} · ${TEXT.namingShort[session.config.naming]}</p>
    </section>
    <dl class="metrics summary-metrics">
      ${metric(TEXT.practiceTime, formatDuration(stats.durationMs))}${metric(TEXT.answered, stats.answered)}
      ${metric(TEXT.correct, stats.correct)}${metric(TEXT.incorrect, stats.incorrect)}
      ${metric(TEXT.accuracy, formatAccuracy(stats.accuracy))}
      ${metric(TEXT.medianCorrect, formatResponse(stats.medianCorrectResponseMs))}
      ${metric(TEXT.correctPerMinute, stats.correctNotesPerMinute.toFixed(1))}
    </dl>
    ${stats.answered && !stats.correct ? `<p class="session-note">${TEXT.noCorrectResponses}</p>` : ''}
    <section class="card missed-card" aria-labelledby="missed-title">
      <h2 id="missed-title">${TEXT.missed}</h2>
      ${stats.mostMissed.length ? `<ul class="missed-list">${stats.mostMissed.map(item =>
        `<li><span><strong>${writtenNoteName(item.writtenNote, naming)}</strong>
          <span class="muted">· ${TEXT.clefs[item.clef]}</span></span><span>${TEXT.misses(item.incorrect)}</span></li>`).join('')}</ul>`
        : `<p class="muted">${stats.answered ? TEXT.noMistakes : TEXT.noAnswers}</p>`}
    </section>
    <div class="summary-actions">
      ${canRepeat(session.config) ? `<button class="button primary" data-action="${historical ? 'repeat-history' : 'repeat'}"${historical ? ` data-session-id="${h(session.id)}"` : ''}>${TEXT.repeat}</button>` : ''}
      <button class="button subtle" data-action="${historical ? 'different-history' : 'different'}"${historical ? ` data-session-id="${h(session.id)}"` : ''}>${TEXT.different}</button>
      ${historical ? `<button class="button subtle" data-action="back-to-statistics">${STATS.backToStatistics}</button>` : ''}
      <button class="button subtle" data-action="home">${TEXT.returnHome}</button>
    </div>
    <p class="session-note">${STATS.savedHint}</p>
  </section>`;
}
