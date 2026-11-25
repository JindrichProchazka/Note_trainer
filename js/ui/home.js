import { PIANO } from './piano-strings.js';
import { SEQ } from './sequence-strings.js';
import { parseWrittenNote } from '../music/notes.js';
import { renderReferenceStaff } from '../music/notation.js';
import { TEXT } from './strings.js';
import { STATS } from './statistics-strings.js';
import { presetOptions } from './configuration.js';
import { configurationDescription, sessionDescription, exerciseDescription } from './config-description.js';
import { formatAccuracy, formatDuration, formatResponse } from './format.js';
import { escapeHtml as h } from './html.js';

const REFERENCE_PITCHES = {
  treble: { lines: ['E4', 'G4', 'B4', 'D5', 'F5'], spaces: ['F4', 'A4', 'C5', 'E5'] },
  bass: { lines: ['G2', 'B2', 'D3', 'F3', 'A3'], spaces: ['A2', 'C3', 'E3', 'G3'] },
};
function referenceCard(naming) {
  return `<aside class="card reference-card" aria-labelledby="reference-title">
    <h2 id="reference-title">${TEXT.referenceTitle}</h2>
    <p class="reference-hint muted">${TEXT.referenceHint}${naming === 'czech' ? ' ' + TEXT.referenceCzechHint : ''}</p>
    ${Object.entries(REFERENCE_PITCHES).map(([clef, pitches]) => {
      const groups = Object.entries(pitches).map(([kind, notes]) => ({
        label: TEXT.referenceKinds[kind], notes: notes.map(parseWrittenNote),
      }));
      return `<section class="reference-clef" aria-labelledby="reference-${clef}">
        <h3 id="reference-${clef}">${TEXT.clefs[clef]}</h3>
        ${renderReferenceStaff(groups, TEXT.referenceStaffLabel(TEXT.clefs[clef], pitches.lines.join(', '), pitches.spaces.join(', ')), clef)}
        <dl class="reference-mnemonics">${Object.keys(pitches).map(kind =>
          `<dt>${TEXT.referenceKinds[kind]}</dt><dd>${TEXT.referenceMnemonics[clef][kind]}</dd>`).join('')}</dl>
      </section>`;
    }).join('')}
  </aside>`;
}
export function homeMarkup(session, quickConfig, persistent = null) {
  const current = session.statistics;
  const today = persistent?.today ?? current;
  const recent = persistent?.recent ?? { accuracy: current.accuracy, medianCorrectResponseMs: session.summary.medianCorrectResponseMs };
  const recentConfig = persistent?.recentConfig;
  return `<section class="home-view" aria-labelledby="home-title">
    <div class="home-intro">
      <p class="eyebrow">${TEXT.eyebrow}</p>
      <h1 id="home-title" tabindex="-1">${TEXT.homeTitle.replace('\n', '<br>')}</h1>
      <p class="lead">${TEXT.homeDescription}</p>
    </div>
    <div class="home-grid">
      <section class="card exercise-card" aria-labelledby="exercise-title">
        <p class="eyebrow">${TEXT.exerciseLabel}</p><h2 id="exercise-title">${quickConfig.exerciseType === 'single-note' ? TEXT.exerciseTitle : SEQ.modes[quickConfig.exerciseType]}</h2>
        <label class="form-field quick-preset" for="quick-exercise">${SEQ.mode}
          <select id="quick-exercise">${Object.entries(SEQ.modes).map(([value, label]) => `<option value="${value}"${value === quickConfig.exerciseType ? ' selected' : ''}>${label}</option>`).join('')}</select></label>
        <label class="form-field quick-preset" for="quick-input">${PIANO.input}<select id="quick-input"${quickConfig.exerciseType==='grand-staff'?' disabled':''}>${Object.entries(PIANO.inputs).map(([value,label])=>`<option value="${value}"${value===quickConfig.inputMethod?' selected':''}>${label}</option>`).join('')}</select></label>
        <label class="form-field quick-preset" for="quick-preset">${TEXT.preset}
          <select id="quick-preset">${presetOptions(quickConfig.presetId, false)}</select></label>
        ${quickConfig.exerciseType === 'sequence' ? `<p class="range-description">${exerciseDescription(quickConfig)}</p>` : ''}
        <p class="range-description">${configurationDescription(quickConfig)}</p>
        <ul class="tags"><li>${TEXT.naturalNotes}</li><li>${sessionDescription(quickConfig)}</li><li>${TEXT.namingShort[quickConfig.naming]}</li></ul>
        <div class="exercise-actions">
          <button class="button primary" data-action="quick-start">${TEXT.quickStart}<span aria-hidden="true"> →</span></button>
          <button class="button subtle" data-action="customize">${TEXT.customize}</button>
        </div>
      </section>
      ${referenceCard(quickConfig.naming)}
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
        <p class="muted">${h(exerciseDescription(recentConfig))} · ${h(sessionDescription(recentConfig))}</p></div>
      ${['single-note', 'sequence','grand-staff'].includes(recentConfig.exerciseType) && ['letter','piano'].includes(recentConfig.inputMethod)
        ? `<button class="button subtle" data-action="repeat-recent">${STATS.repeatRecent}</button>` : ''}
    </section>` : ''}
  </section>`;
}
