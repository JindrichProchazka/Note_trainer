import { createNote, naturalNotesBetween, writtenName } from '../music/notes.js';
import { renderPerformanceStaff } from '../music/notation.js';
import { contextId } from '../learning/context.js';
import { contextStatistics, sortNoteStatistics } from '../learning/statistics.js';
import { TEXT } from './strings.js';
import { STATS } from './statistics-strings.js';
import { noteName, writtenNoteName } from './note-names.js';
import { escapeHtml as h, optionList } from './html.js';
import { formatAccuracy, formatResponse } from './format.js';

export const formatTimestamp = value => value === null ? STATS.noPractice
  : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
export const exerciseLabel = value => STATS.exerciseNames[value] ?? value.replaceAll('-', ' ');
export const inputLabel = value => STATS.inputNames[value] ?? value.replaceAll('-', ' ');
export const statePill = state => `<span class="learning-pill" data-state="${state}"><b aria-hidden="true">${STATS.markers[state]}</b> ${STATS.states[state]}</span>`;

function noteDetails(note, naming) {
  return `<section class="card note-detail" tabindex="-1" aria-labelledby="selected-note-title">
    <p class="eyebrow" id="selected-note-title">${STATS.selectedNote}</p>
    <div class="note-detail-heading"><h3>${writtenNoteName(note.writtenNote, naming)} · ${TEXT.clefs[note.clef]}</h3>${statePill(note.state)}</div>
    <p class="muted">${h(exerciseLabel(note.exerciseType))} · ${h(inputLabel(note.inputMethod))}</p>
    <dl class="compact-metrics">
      ${[[STATS.attempts, note.attempts], [STATS.correct, note.correct], [STATS.incorrect, note.incorrect],
        [STATS.accuracy, formatAccuracy(note.accuracy)], [STATS.correctMedian, formatResponse(note.medianCorrectResponseMs)],
        [STATS.recentAccuracy, formatAccuracy(note.recentAccuracy)], [STATS.lastPractice, formatTimestamp(note.lastPractice)]]
        .map(([label, value]) => `<div><dt>${label}</dt><dd>${h(value)}</dd></div>`).join('')}
    </dl>
  </section>`;
}

export function notePerformanceMarkup(stats, view, naming) {
  const clef = stats.filters.clef === 'all' ? view.clef : stats.filters.clef;
  const exerciseType = stats.filters.exerciseType === 'all' ? 'single-note' : stats.filters.exerciseType;
  const inputMethod = stats.filters.inputMethod === 'all' ? 'letter' : stats.filters.inputMethod;
  const octave = Number(view.octave);
  const notes = naturalNotesBetween(createNote('C', octave).midi, octave === 6 ? 84 : createNote('B', octave).midi);
  const visual = notes.map(note => {
    const context = { writtenNote: writtenName(note), clef, exerciseType, inputMethod };
    const id = contextId(context);
    const performance = contextStatistics(stats.attempts.filter(attempt => attempt.contextId === id), context);
    const name = noteName(note, naming), state = performance.state;
    return { note, ...performance, label: STATS.noteLabel(name, TEXT.clefs[clef], STATS.states[state]), marker: STATS.markers[state] };
  });
  const groups = [visual.slice(0, 4), visual.slice(4)].filter(group => group.length);
  const sorted = sortNoteStatistics(stats.notes, view.sort);
  const pageSize = 10, pages = Math.max(1, Math.ceil(sorted.length / pageSize)), page = Math.min(view.notePage, pages - 1);
  const pageNotes = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const selected = stats.notes.find(note => note.contextId === view.selectedContext) ??
    visual.find(note => note.contextId === view.selectedContext);
  return `<section class="note-performance" aria-labelledby="staff-title">
    <h2 id="staff-title">${STATS.staffTitle}</h2>
    <div class="form-grid staff-controls">
      <label class="form-field" for="staff-clef">${STATS.clef}
        <select id="staff-clef"${stats.filters.clef === 'all' ? '' : ' disabled'}>${optionList(Object.entries({ treble: TEXT.clefs.treble, bass: TEXT.clefs.bass }), clef)}</select></label>
      <label class="form-field" for="staff-octave">${STATS.octave}
        <select id="staff-octave">${optionList([2, 3, 4, 5, 6].map(octave => [octave,
          noteName(createNote('C', octave), naming) + (octave === 6 ? '' : '–' + noteName(createNote('B', octave), naming))]), octave)}</select></label>
    </div>
    <p class="stats-hint">${h(STATS.staffScope(exerciseLabel(exerciseType), inputLabel(inputMethod)))}</p>
    <p class="stats-hint">${STATS.filteredStates}</p>
    <ul class="state-legend" aria-label="${STATS.stateLegend}">${Object.keys(STATS.states).map(state => `<li>${statePill(state)}</li>`).join('')}</ul>
    <div class="staff-groups">${groups.map(group => `<div class="card performance-staff">
      ${renderPerformanceStaff(group, STATS.staffLabel(TEXT.clefs[clef], group.map(note => note.label).join(' ')), clef)}
      <div class="staff-note-controls">${group.map(note => `<button class="staff-note-button" data-action="inspect-note"
        data-context-id="${h(note.contextId)}" data-state="${note.state}" aria-label="${h(note.label)}"
        aria-pressed="${note.contextId === view.selectedContext}">
        <strong>${noteName(note.note, naming)}</strong><span>${STATS.markers[note.state]} · ${STATS.states[note.state]}</span>
      </button>`).join('')}</div>
    </div>`).join('')}</div>
    ${selected ? noteDetails(selected, naming) : `<p class="stats-hint select-note-hint">${STATS.chooseNote}</p>`}
    <div class="section-heading note-list-heading"><div><h2>${STATS.practicedTitle}</h2></div>
      <label class="form-field" for="note-sort">${STATS.sort}<select id="note-sort">${optionList(Object.entries(STATS.sorts), view.sort)}</select></label>
    </div>
    <p class="stats-hint">${STATS.practicedHint}</p>
    ${pageNotes.length ? `<table class="responsive-data note-table">
      <thead><tr>${[STATS.note, STATS.attempts, STATS.correctWrong, STATS.accuracy, STATS.correctMedian,
        STATS.recentAccuracy, STATS.lastPractice, STATS.state].map(title => `<th scope="col">${title}</th>`).join('')}</tr></thead>
      <tbody>${pageNotes.map(note => `<tr>
        <th scope="row"><button class="note-name-button" data-action="inspect-note" data-context-id="${h(note.contextId)}">${writtenNoteName(note.writtenNote, naming)} · ${TEXT.clefs[note.clef]}</button>
          <span class="context-caption">${h(exerciseLabel(note.exerciseType))} · ${h(inputLabel(note.inputMethod))}</span></th>
        ${[[STATS.attempts, note.attempts], [STATS.correctWrong, note.correct + ' / ' + note.incorrect],
          [STATS.accuracy, formatAccuracy(note.accuracy)], [STATS.correctMedian, formatResponse(note.medianCorrectResponseMs)],
          [STATS.recentAccuracy, formatAccuracy(note.recentAccuracy)], [STATS.lastPractice, formatTimestamp(note.lastPractice)]]
          .map(([label, value]) => `<td data-label="${h(label)}">${h(value)}</td>`).join('')}
        <td data-label="${STATS.state}">${statePill(note.state)}</td>
      </tr>`).join('')}</tbody></table>` : `<p class="empty-state">${STATS.noNotes}</p>`}
    ${pages > 1 ? `<div class="list-pager"><button class="button subtle" data-action="notes-previous"${page === 0 ? ' disabled' : ''}>${STATS.previous}</button>
      <span>${STATS.page(page + 1, pages)}</span><button class="button subtle" data-action="notes-next"${page >= pages - 1 ? ' disabled' : ''}>${STATS.next}</button></div>` : ''}
  </section>`;
}
