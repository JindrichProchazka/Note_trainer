import { GRAND } from './usability-strings.js';
import { SEQ } from './sequence-strings.js';
import { TEXT } from './strings.js';
import { STATS } from './statistics-strings.js';
import { escapeHtml as h, optionList } from './html.js';
import { buildStatistics, chartWindow, DEFAULT_FILTERS } from '../learning/statistics.js';
import { configurationKey } from '../learning/context.js';
import { configurationDescription, sessionDescription, exerciseDescription } from './config-description.js';
import { formatAccuracy, formatDuration, formatResponse } from './format.js';
import { chartsMarkup, formatRate } from './charts.js';
import { notePerformanceMarkup, exerciseLabel, inputLabel } from './note-performance.js';
import { sessionHistoryMarkup } from './session-history.js';

export function createStatisticsView() {
  return { tab: 'overview', filters: { ...DEFAULT_FILTERS }, chartPage: 0, notePage: 0, historyPage: 0,
    clef: 'treble', octave: 4, sort: 'pitch', selectedContext: null };
}
function filterMarkup(data, filters, naming) {
  const exercises = [...new Set(['single-note', 'sequence', 'grand-staff', ...data.sessions.map(record => record.session.config.exerciseType)])];
  const inputs = [...new Set(['letter', 'piano', ...data.sessions.map(record => record.session.config.inputMethod)])];
  const configs = new Map(data.sessions.map(record => [configurationKey(record.session.config), record.session.config]));
  const configOptions = [...configs].map(([key, config]) => [encodeURIComponent(key),
    (TEXT.presets[config.presetId] ?? TEXT.custom) + ' · ' + configurationDescription({ ...config, naming }) + ' · ' + sessionDescription(config) + (config.exerciseType === 'sequence' ? ' · ' + exerciseDescription(config) : '')]);
  const field = (id, title, options, selected) => `<label class="form-field" for="${id}">${title}
    <select id="${id}" data-stat-filter>${optionList(options, selected)}</select></label>`;
  return `<form id="statistics-filters" class="card statistics-filters">
    <div class="form-grid">
      ${field('stats-period', STATS.period, ['today', '7', '30', 'all'].map(key => [key, STATS.periods[key]]), filters.period)}
      ${field('stats-clef', STATS.clef, [['all', STATS.allClefs], ['treble', TEXT.clefs.treble], ['bass', TEXT.clefs.bass]], filters.clef)}
    </div>
    <details class="extra-filters"${filters.exerciseType !== 'all' || filters.inputMethod !== 'all' || filters.configuration !== 'all' ? ' open' : ''}>
      <summary>${STATS.moreFilters}</summary>
      <div class="form-grid">
        ${field('stats-exercise', STATS.exercise, [['all', STATS.allExercises], ...exercises.map(value => [value, exerciseLabel(value)])], filters.exerciseType)}
        ${field('stats-input', STATS.input, [['all', STATS.allInputs], ...inputs.map(value => [value, inputLabel(value)])], filters.inputMethod)}
      </div>
      ${field('stats-configuration', STATS.configuration, [['all', STATS.allConfigurations], ...configOptions],
        filters.configuration === 'all' ? 'all' : encodeURIComponent(filters.configuration))}
    </details>
  </form>`;
}
function overviewMarkup(stats, view) {
  const metric = (label, value, id) => `<div><dt>${label}</dt><dd id="${id}">${h(value)}</dd></div>`;
  const values = stats.overview;
  const metrics = [
    [STATS.totalTime, formatDuration(values.durationMs), 'overview-time'],
    [STATS.answered, values.answered, 'overview-answered'], [STATS.correct, values.correct, 'overview-correct'],
    [STATS.incorrect, values.incorrect, 'overview-incorrect'], [STATS.accuracy, formatAccuracy(values.accuracy), 'overview-accuracy'],
    [STATS.median, formatResponse(values.medianCorrectResponseMs), 'overview-median'],
    [STATS.rate, formatRate(values.correctNotesPerMinute), 'overview-rate'],
    [STATS.completed, values.completedSessions, 'overview-completed'],
    [STATS.practiced, values.practicedContexts, 'overview-practiced'],
    [STATS.mastered, values.masteredContexts, 'overview-mastered'],
  ];
  if (stats.sequences.length || stats.filters.exerciseType === 'sequence') metrics.push(
    [SEQ.completed, values.completedSequences, 'overview-sequences'],
    [SEQ.partial, values.partialSequences, 'overview-partial-sequences']);
  if(stats.pairs.length||stats.filters.exerciseType==='grand-staff')metrics.push([GRAND.completed,values.completedPairs,'overview-pairs'],[GRAND.partial,values.partialPairs,'overview-partial-pairs']);
  return `<section class="statistics-overview" aria-label="${STATS.tabs.overview}">
    <dl class="metrics stats-metrics">${metrics.map(values => metric(...values)).join('')}</dl>
    ${!values.answered && values.durationMs === 0 ? `<p class="empty-state">${STATS.overviewEmpty}</p>` : ''}
    <p class="stats-hint">${STATS.filteredStates}</p>
    ${chartsMarkup(chartWindow(stats.daily, stats.bounds, view.chartPage))}
    <details class="metric-definitions"><summary>${STATS.definitions}</summary><p>${STATS.definitionText}</p></details>
  </section>`;
}
export function statisticsMarkup(data, view, naming, activeSessionId = null, now = Date.now()) {
  const stats = buildStatistics(data, view.filters, now);
  return `<section class="statistics-view" aria-labelledby="statistics-title">
    <p class="eyebrow">${STATS.eyebrow}</p>
    <h1 id="statistics-title" tabindex="-1">${STATS.title}</h1>
    <p class="lead">${STATS.description}</p>
    ${data.withheld ? `<p class="sequence-pending-notice" role="status">${data.withheldType==='grand-staff'?GRAND.withheld:SEQ.withheld}</p>` : ''}
    ${filterMarkup(data, stats.filters, naming)}
    ${stats.attempts.some(a=>a.exerciseType==='grand-staff')||stats.filters.exerciseType==='grand-staff'?'<p class="stats-hint">'+GRAND.timingHint+'</p>':''}
    ${stats.sequences.length || stats.filters.exerciseType === 'sequence' ? `<p class="stats-hint">${SEQ.timingHint}</p>` : ''}
    <p class="stats-hint stats-scope">${STATS.scope}</p>
    ${stats.configurations.length > 1 ? `<details class="configuration-breakdown"><summary>${STATS.configurationCount(stats.configurations.length)}</summary>
      <ul>${stats.configurations.map(config => `<li>${h(configurationDescription({ ...config, naming }))} · ${h(sessionDescription(config))} · ${h(exerciseDescription(config))}</li>`).join('')}</ul></details>` : ''}
    <div class="stats-tabs" role="group" aria-label="${STATS.navigation}">
      ${Object.entries(STATS.tabLabels).map(([tab, label]) => `<button class="button" data-action="statistics-tab" data-stat-tab="${tab}"
        aria-pressed="${view.tab === tab}">${label}</button>`).join('')}
    </div>
    <div id="statistics-panel">${view.tab === 'notes' ? notePerformanceMarkup(stats, view, naming)
      : view.tab === 'history' ? sessionHistoryMarkup(stats, view, naming, activeSessionId) : overviewMarkup(stats, view)}</div>
  </section>`;
}
export function readStatisticsFilters(form) {
  const value = id => form.querySelector('#' + id).value;
  const config = value('stats-configuration');
  return { period: value('stats-period'), clef: value('stats-clef'),
    exerciseType: value('stats-exercise'), inputMethod: value('stats-input'),
    configuration: config === 'all' ? 'all' : decodeURIComponent(config) };
}
