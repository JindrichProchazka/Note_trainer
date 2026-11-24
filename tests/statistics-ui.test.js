import test from 'node:test';
import assert from 'node:assert/strict';
import { statisticsMarkup, createStatisticsView } from '../js/ui/statistics.js';
import { dailyChart } from '../js/ui/charts.js';
import { renderNotation, renderPerformanceStaff } from '../js/music/notation.js';
import { naturalNotesBetween } from '../js/music/notes.js';
import { contextId } from '../js/learning/context.js';
import { BASE_TIME, recordFixture, attemptSeries } from './helpers/learning-fixtures.js';

const render = (sessions, view = createStatisticsView(), naming = 'international') =>
  statisticsMarkup({ sessions }, view, naming, null, BASE_TIME + 60000);

test('empty Statistics has honest unavailable measures and all required filters', () => {
  const html = render([]);
  assert.match(html, /No recorded practice matches/);
  for (const id of ['accuracy', 'median', 'rate']) assert.match(html, new RegExp('id="overview-' + id + '">—'));
  assert.equal((html.match(/class="card chart-card"/g) ?? []).length, 5);
  for (const label of ['Today', 'Last 7 days', 'Last 30 days', 'All time', 'Exercise type', 'Input method']) assert.ok(html.includes(label));
  assert.doesNotMatch(html, /NaN|Infinity|undefined/);
});

test('performance renderer preserves every natural note and ledger geometry in both clefs', () => {
  for (const clef of ['treble', 'bass']) for (const note of naturalNotesBetween(36, 84)) {
    const original = renderNotation(note, 'Practice', clef);
    const visual = renderPerformanceStaff([{ note, state: 'mastered', marker: 'M', label: '<inspect>' }], 'Performance', clef);
    const extract = (html, pattern) => html.match(pattern)[1];
    for (const pattern of [/data-position="([^"]+)"/, /class="notehead"[^>]+cy="([^"]+)"/, /class="stem"[^>]+y2="([^"]+)"/]) {
      assert.equal(extract(visual, pattern), extract(original, pattern));
    }
    assert.equal(extract(visual, /class="ledger-lines"[^>]*>([\s\S]*?)<\/g>/).replaceAll(/x[12]="[^"]+"/g, ''),
      extract(original, /class="ledger-lines"[^>]*>([\s\S]*?)<\/g>/).replaceAll(/x[12]="[^"]+"/g, ''));
    assert.match(visual, /&lt;inspect&gt;/);
    assert.match(visual, />M<\/text>/);
  }
  assert.throws(() => renderPerformanceStaff([], 'Empty'));
});

test('note view distinguishes Unseen and Familiar, exposes detail, and uses Czech naming consistently', () => {
  const attempts = attemptSeries(5, { writtenNote: 'B4' });
  const record = recordFixture({ attempts });
  const view = { ...createStatisticsView(), tab: 'notes', selectedContext: contextId(attempts[0]) };
  const html = render([record], view, 'czech');
  assert.match(html, /H4, Treble clef, Familiar\. Inspect note\./);
  assert.match(html, /C4, Treble clef, Unseen\. Inspect note\./);
  assert.match(html, /class="card note-detail"/);
  assert.match(html, /H4 · Treble clef/);
  assert.equal((html.match(/class="notation performance-notation"/g) ?? []).length, 2);
  assert.match(html, /Learning state legend/);
  for (const label of ['Lowest accuracy', 'Slowest correct response', 'Fewest attempts', 'Most attempts']) assert.ok(html.includes(label));
  assert.doesNotMatch(html, /NaN|Infinity|undefined/);
});

test('history distinguishes completed and interrupted records and only offers completed repeat', () => {
  const html = render([recordFixture(), recordFixture({ id: 's2', status: 'interrupted' })],
    { ...createStatisticsView(), tab: 'history' });
  assert.match(html, /data-status="completed">Completed/);
  assert.match(html, /data-status="interrupted">Interrupted/);
  assert.equal((html.match(/data-action="repeat-history"/g) ?? []).length, 1);
  assert.equal((html.match(/data-action="open-session"/g) ?? []).length, 2);
});

test('charts break lines at missing days and provide axis units and exact-data alternative', () => {
  const days = [
    { day: '2026-11-22', accuracy: 1 }, { day: '2026-11-23', accuracy: null },
    { day: '2026-11-24', accuracy: .5 },
  ];
  const html = dailyChart(days, 'accuracy');
  assert.equal((html.match(/<circle /g) ?? []).length, 2);
  assert.doesNotMatch(html, /<polyline/);
  assert.match(html, /View daily data/);
  assert.match(html, /chart-unit">%/);
  assert.match(html, /<span>100<\/span>/);
  assert.doesNotMatch(html, /NaN|Infinity|undefined/);
});

test('history and note lists paginate rather than silently dropping contexts', () => {
  const records = Array.from({ length: 11 }, (_, i) => recordFixture({ id: 's' + i }));
  const html = render(records, { ...createStatisticsView(), tab: 'history', historyPage: 1 });
  assert.match(html, /Page 2 of 2/);
  assert.equal((html.match(/class="card history-card"/g) ?? []).length, 1);
});
