import { archivedSession } from '../data/recording.js';
import { TEXT } from './strings.js';
import { STATS } from './statistics-strings.js';
import { configurationDescription, sessionDescription, exerciseDescription } from './config-description.js';
import { formatAccuracy, formatDuration, formatResponse } from './format.js';
import { formatTimestamp, exerciseLabel, inputLabel } from './note-performance.js';
import { escapeHtml as h } from './html.js';

export const canRepeat = config => ['single-note', 'sequence'].includes(config.exerciseType) && config.inputMethod === 'letter';
export function sessionHistoryMarkup(stats, view, naming, activeSessionId) {
  const pages = Math.max(1, Math.ceil(stats.history.length / 10)), page = Math.min(view.historyPage, pages - 1);
  const records = stats.history.slice(page * 10, (page + 1) * 10);
  return `<section class="session-history" aria-labelledby="history-title">
    <h2 id="history-title">${STATS.tabs.history}</h2>
    <p class="stats-hint">${STATS.historyHint}</p><p class="stats-hint">${STATS.unfinishedHint}</p>
    ${records.length ? `<div class="history-list">${records.map(record => {
      const saved = record.session, summary = archivedSession(record).summary;
      const date = saved.finishedAt ?? saved.interruptedAt ?? saved.updatedAt;
      const label = saved.status === 'in-progress' && saved.id === activeSessionId ? STATS.current : STATS.statuses[saved.status];
      return `<article class="card history-card">
        <div class="history-heading"><h3>${formatTimestamp(date)}</h3><span class="session-status" data-status="${saved.status}">${label}</span></div>
        <p class="history-preset">${h(TEXT.presets[saved.config.presetId] ?? TEXT.custom)} · ${h(sessionDescription(saved.config))}</p>
        <p class="muted">${h(configurationDescription({ ...saved.config, naming }))}</p>
        <p class="context-caption">${h(saved.config.exerciseType === 'sequence' ? exerciseDescription(saved.config) : exerciseLabel(saved.config.exerciseType))} · ${h(inputLabel(saved.config.inputMethod))}</p>
        <dl class="compact-metrics">${[[TEXT.practiceTime, formatDuration(summary.durationMs)], [TEXT.answered, summary.answered],
          [TEXT.accuracy, formatAccuracy(summary.accuracy)], [TEXT.medianCorrect, formatResponse(summary.medianCorrectResponseMs)]]
          .map(([label, value]) => `<div><dt>${label}</dt><dd>${h(value)}</dd></div>`).join('')}</dl>
        <div class="history-actions">
          <button class="button subtle" data-action="open-session" data-session-id="${h(saved.id)}">${STATS.openSession}</button>
          ${saved.status === 'completed' && canRepeat(saved.config) ? `<button class="button subtle" data-action="repeat-history" data-session-id="${h(saved.id)}">${STATS.repeatSession}</button>` : ''}
        </div>
      </article>`;
    }).join('')}</div>` : `<p class="empty-state">${STATS.noHistory}</p>`}
    ${pages > 1 ? `<div class="list-pager"><button class="button subtle" data-action="history-previous"${page === 0 ? ' disabled' : ''}>${STATS.previous}</button>
      <span>${STATS.page(page + 1, pages)}</span><button class="button subtle" data-action="history-next"${page >= pages - 1 ? ' disabled' : ''}>${STATS.next}</button></div>` : ''}
  </section>`;
}
