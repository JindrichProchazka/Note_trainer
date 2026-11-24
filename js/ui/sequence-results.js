import { SEQ } from './sequence-strings.js';
import { TEXT } from './strings.js';
import { letterName, writtenNoteName } from './note-names.js';
import { formatAccuracy, formatResponse } from './format.js';
import { escapeHtml as h } from './html.js';

export function sequenceResultsMarkup(summary, naming) {
  return `<section class="card sequence-results" aria-labelledby="sequence-results-title">
    <h2 id="sequence-results-title">${SEQ.results}</h2>
    <dl class="compact-metrics"><div><dt>${SEQ.completed}</dt><dd>${summary.completedSequences}</dd></div>
      <div><dt>${SEQ.partial}</dt><dd>${summary.partialSequences}</dd></div></dl>
    <p class="stats-hint">${SEQ.timingHint}</p>
    ${summary.sequenceResults.map(result => `<details class="saved-sequence">
      <summary>${SEQ.sequence} ${result.ordinal} · ${result.answered} / ${result.notes.length} ·
        ${result.complete ? SEQ.completedState : result.partial ? SEQ.partialState : SEQ.unansweredState}</summary>
      <p class="muted">${TEXT.clefs[result.clef]} · ${formatAccuracy(result.accuracy)} · ${formatResponse(result.answerDurationMs)} ${SEQ.answerTime.toLowerCase()}</p>
      <ol>${result.answers.map(answer => `<li>${answer.itemIndex + 1}. ${letterName(answer.answer, naming)} ·
        ${h(answer.correct ? SEQ.correct : SEQ.incorrect(writtenNoteName(answer.writtenNote, naming)))}
        · ${formatResponse(answer.responseTimeMs)}</li>`).join('')}</ol>
    </details>`).join('')}
  </section>`;
}
