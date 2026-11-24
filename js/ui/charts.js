import { STATS } from './statistics-strings.js';
import { escapeHtml as h } from './html.js';
import { dayDate } from '../learning/dates.js';
import { formatAccuracy, formatResponse, formatDuration } from './format.js';

export const shortDay = day => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(dayDate(day));
export const longDay = day => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(dayDate(day));
export const formatRate = value => value === null ? '—' : value.toFixed(1);
const axisNumber = value => value === 0 ? '0' : value >= 100 ? Math.round(value).toString() : Number(value.toFixed(2)).toString();

export function dailyChart(days, key) {
  const title = STATS.chartTitles[key], unit = STATS.units[key];
  const convert = value => key === 'durationMs' ? value / 60000 : key === 'medianCorrectResponseMs' ? value / 1000
    : key === 'accuracy' ? value * 100 : value;
  const values = days.map(day => day[key] === null ? null : convert(day[key]));
  const relevant = key === 'durationMs' || key === 'answered'
    ? days.some(day => day.durationMs > 0 || day.answered > 0) : values.some(value => value !== null);
  if (!relevant) return `<section class="card chart-card"><h3>${title}</h3>
    <p class="chart-unit">${unit}</p><p class="chart-empty">${key === 'medianCorrectResponseMs' ? STATS.noCorrect : STATS.chartEmpty}</p></section>`;
  const maximum = key === 'accuracy' ? 100 : Math.max(...values.filter(value => value !== null), 0);
  const scale = key === 'accuracy' ? 100 : maximum > 0 ? maximum * 1.1 : 1;
  const width = 480, height = 156, top = 8, bottom = 148;
  const x = index => days.length === 1 ? width / 2 : 10 + index * (width - 20) / (days.length - 1);
  const y = value => bottom - value / scale * (bottom - top);
  const bars = key === 'durationMs' || key === 'answered';
  let marks = '';
  if (bars) {
    const barWidth = Math.min(18, width / Math.max(1, days.length) * .65);
    marks = values.map((value, index) => value === null || value === 0 ? '' :
      `<rect x="${x(index) - barWidth / 2}" y="${y(value)}" width="${barWidth}" height="${bottom - y(value)}" rx="2">
        <title>${h(longDay(days[index].day))}: ${h(axisNumber(value))} ${unit}</title></rect>`).join('');
  } else {
    let run = [];
    const runs = [];
    values.forEach((value, index) => {
      if (value === null) { if (run.length) runs.push(run); run = []; }
      else run.push([x(index), y(value)]);
    });
    if (run.length) runs.push(run);
    marks = runs.filter(points => points.length > 1).map(points =>
      `<polyline points="${points.map(point => point.join(',')).join(' ')}" fill="none" stroke="currentColor" stroke-width="2.5"/>`).join('');
    marks += values.map((value, index) => value === null ? '' : `<circle cx="${x(index)}" cy="${y(value)}" r="4">
      <title>${h(longDay(days[index].day))}: ${h(axisNumber(value))} ${unit}</title></circle>`).join('');
  }
  const label = STATS.chartAlternative(title, longDay(days[0].day), longDay(days.at(-1).day));
  return `<section class="card chart-card"><h3>${title}</h3><p class="chart-unit">${unit}</p>
    <div class="chart-plot">
      <div class="chart-y-axis" aria-hidden="true"><span>${axisNumber(scale)}</span><span>${axisNumber(scale / 2)}</span><span>0</span></div>
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="${h(label)}" xmlns="http://www.w3.org/2000/svg">
        <g class="chart-grid" stroke="currentColor" stroke-width="1">${[top, (top + bottom) / 2, bottom].map(level =>
          `<line x1="0" x2="${width}" y1="${level}" y2="${level}"/>`).join('')}</g>
        <g class="chart-marks" fill="currentColor">${marks}</g>
      </svg>
    </div>
    <div class="chart-x-axis" aria-hidden="true"><span>${shortDay(days[0].day)}</span>
      ${days.length > 2 ? `<span>${shortDay(days[Math.floor(days.length / 2)].day)}</span>` : ''}
      <span>${days.length > 1 ? shortDay(days.at(-1).day) : ''}</span></div>
  </section>`;
}

export function chartsMarkup(window) {
  const columns = [
    ['durationMs', STATS.totalTime, value => formatDuration(value)],
    ['answered', STATS.answered, value => value],
    ['accuracy', STATS.accuracy, formatAccuracy],
    ['medianCorrectResponseMs', STATS.median, formatResponse],
    ['correctNotesPerMinute', STATS.rate, formatRate],
  ];
  return `<section class="charts-section" aria-labelledby="charts-title">
    <div class="section-heading"><div><h2 id="charts-title">${STATS.charts}</h2>
      <p class="muted">${h(STATS.chartWindow(longDay(window.start), longDay(window.end)))}</p></div>
      ${window.pages > 1 ? `<div class="chart-pager">
        <button class="button subtle" data-action="chart-older"${window.page >= window.pages - 1 ? ' disabled' : ''}>${STATS.older}</button>
        <button class="button subtle" data-action="chart-newer"${window.page === 0 ? ' disabled' : ''}>${STATS.newer}</button>
      </div>` : ''}
    </div>
    <p class="stats-hint">${STATS.chartDescription}</p>
    <div class="charts-grid">${columns.map(([key]) => dailyChart(window.values, key)).join('')}</div>
    <details class="card daily-data"><summary>${STATS.dailyData}</summary>
      <table class="responsive-data"><thead><tr><th>${STATS.date}</th>${columns.map(([, title]) => `<th>${title}</th>`).join('')}</tr></thead>
        <tbody>${window.values.map(day => `<tr><th scope="row">${longDay(day.day)}</th>${columns.map(([key, title, format]) =>
          `<td data-label="${h(title)}">${format(day[key])}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </details>
  </section>`;
}
