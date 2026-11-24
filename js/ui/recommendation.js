import { LEARN } from './learning-strings.js';
import { writtenNoteName } from './note-names.js';
import { TEXT } from './strings.js';
import { escapeHtml as h } from './html.js';
export function recommendationMarkup(profiles,naming) {
  const weak=profiles.filter(p=>p.reasons.length).sort((a,b)=>b.weight-a.weight);
  return `<section class="card learning-recommendation" aria-labelledby="learning-title">
    <h2 id="learning-title">${LEARN.title}</h2><p class="stats-hint">${LEARN.scope}</p>
    ${weak.length?`<ul>${weak.slice(0,5).map(p=>`<li><strong>${writtenNoteName(p.writtenNote,naming)} · ${TEXT.clefs[p.clef]}</strong> — ${p.reasons.map(r=>h(LEARN.reasons[r])).join(', ')}</li>`).join('')}</ul>`:`<p>${LEARN.ready}</p>`}
    ${profiles.some(p=>p.mistakes)?'':`<p class="stats-hint">${LEARN.noMistakes}</p>`}
    <div class="exercise-actions">${['adaptive','weak','mistakes'].map(mode=>`<button class="button ${mode==='adaptive'?'primary':'subtle'}" data-action="learn-${mode}">${LEARN.modes[mode]}</button>`).join('')}</div>
    <details><summary>${LEARN.selection}</summary><p class="stats-hint">${LEARN.explanation}</p></details>
  </section>`;
}
