import { diatonicIndex } from './notes.js';
import { CLEFS } from './clefs.js';

export const STAFF = Object.freeze({
  width: 480, height: 236, left: 32, right: 448,
  bottomY: 148, lineSpacing: 20, noteX: 282,
});
export function staffPosition(note, clef = 'treble') {
  if (!Object.hasOwn(CLEFS, clef)) throw new RangeError('Unknown clef');
  return diatonicIndex(note) - CLEFS[clef].bottomIndex;
}
export const treblePosition = note => staffPosition(note, 'treble');
export const bassPosition = note => staffPosition(note, 'bass');
export function ledgerPositions(position) {
  if (!Number.isInteger(position)) throw new RangeError('Staff position must be an integer');
  const positions = [];
  for (let step = -2; step >= position; step -= 2) positions.push(step);
  for (let step = 10; step <= position; step += 2) positions.push(step);
  return positions;
}
export function notationLayout(note, clef = 'treble') {
  const position = staffPosition(note, clef);
  const yFor = step => STAFF.bottomY - step * STAFF.lineSpacing / 2;
  return {
    position, y: yFor(position), ledgerYs: ledgerPositions(position).map(yFor),
    stemDirection: position >= 4 ? 'down' : 'up',
  };
}
export function notationStem(layout) {
  const up = layout.stemDirection === 'up';
  const middleY = STAFF.bottomY - 2 * STAFF.lineSpacing;
  return {
    x: STAFF.noteX + (up ? 12 : -12),
    endY: up ? Math.min(layout.y - 66, middleY) : Math.max(layout.y + 66, middleY),
  };
}
function escapeText(value) {
  return String(value).replace(/[&<>"']/g, character =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
export function notationViewport(layout) {
  const minY = Math.min(0, layout.y - 22);
  const maxY = Math.max(STAFF.height, layout.y + 22);
  return { minY, height: maxY - minY };
}
function staffMarkup(right = STAFF.right) {
  return `<g class="staff-lines" fill="none" stroke="currentColor" stroke-width="1.4">${Array.from({ length: 5 }, (_, index) => {
    const lineY = STAFF.bottomY - index * STAFF.lineSpacing;
    return `<line x1="${STAFF.left}" x2="${right}" y1="${lineY}" y2="${lineY}"/>`;
  }).join('')}</g>`;
}
/** Both practice and performance views use this exact note and ledger geometry. */
function noteMarkup(note, clef, x, state = null, title = '') {
  if (note.accidental !== 0) throw new RangeError('Accidental rendering is not enabled');
  const layout = notationLayout(note, clef);
  const { position, y, ledgerYs } = layout;
  const stem = notationStem(layout), stemX = stem.x + x - STAFF.noteX;
  return `<g class="note" data-position="${position}"${state ? ` data-state="${state}"` : ''} fill="currentColor" stroke="currentColor">
    ${title ? `<title>${escapeText(title)}</title>` : ''}
    <g class="ledger-lines" stroke-width="2">${ledgerYs.map(ledgerY =>
      `<line x1="${x - 23}" x2="${x + 23}" y1="${ledgerY}" y2="${ledgerY}"/>`).join('')}</g>
    <ellipse class="notehead" cx="${x}" cy="${y}" rx="13" ry="9" transform="rotate(-20 ${x} ${y})" stroke="none"/>
    <line class="stem" x1="${stemX}" x2="${stemX}" y1="${y}" y2="${stem.endY}" stroke-width="2.5"/>
  </g>`;
}
export function renderNotation(note, label, clef = 'treble') {
  const viewport = notationViewport(notationLayout(note, clef));
  return `<svg class="notation" viewBox="0 ${viewport.minY} ${STAFF.width} ${viewport.height}"
    data-clef="${clef}" role="img" aria-label="${escapeText(label)}" xmlns="http://www.w3.org/2000/svg">
    ${staffMarkup()}${CLEFS[clef].svg}${noteMarkup(note, clef, STAFF.noteX)}
  </svg>`;
}

/** Read-only statistics visualization, not a sequence exercise. At most four notes per staff. */
export function renderPerformanceStaff(entries, label, clef = 'treble') {
  if (!entries.length || entries.length > 4) throw new RangeError('Use one to four overview notes');
  if (entries.some(entry => !['unseen', 'learning', 'familiar', 'mastered'].includes(entry.state))) {
    throw new RangeError('Invalid performance state');
  }
  const viewports = entries.map(entry => notationViewport(notationLayout(entry.note, clef)));
  const minY = Math.min(...viewports.map(viewport => viewport.minY));
  const bottom = Math.max(...viewports.map(viewport => viewport.minY + viewport.height));
  return `<svg class="notation performance-notation" viewBox="0 ${minY} ${STAFF.width} ${bottom + 32 - minY}"
    data-clef="${clef}" role="img" aria-label="${escapeText(label)}" xmlns="http://www.w3.org/2000/svg">
    ${staffMarkup()}${CLEFS[clef].svg}
    ${entries.map((entry, index) => {
      const x = 190 + index * 70;
      return noteMarkup(entry.note, clef, x, entry.state, entry.label) +
        `<g class="state-marker" data-state="${entry.state}">
          <circle cx="${x}" cy="${bottom + 12}" r="12" fill="var(--surface)" stroke="currentColor" stroke-width="2"/>
          <text x="${x}" y="${bottom + 17}" text-anchor="middle" fill="currentColor" font-size="15" font-weight="700">${escapeText(entry.marker)}</text>
        </g>`;
    }).join('')}
  </svg>`;
}

/** Consecutive quarter notes share the exact practice/learning note geometry. */
export function renderSequenceSystem(entries, label, clef = 'treble') {
  if (!entries.length || entries.length > 6) throw new RangeError('Use one to six notes per system');
  const width = Math.max(400, 160 + entries.length * 80);
  const viewports = entries.map(entry => notationViewport(notationLayout(entry.note, clef)));
  const minY = Math.min(...viewports.map(viewport => viewport.minY));
  const bottom = Math.max(...viewports.map(viewport => viewport.minY + viewport.height));
  return `<svg class="notation sequence-notation" viewBox="0 ${minY} ${width} ${bottom + 62 - minY}"
    data-clef="${clef}" role="img" aria-label="${escapeText(label)}" xmlns="http://www.w3.org/2000/svg">
    ${staffMarkup(width - 32)}${CLEFS[clef].svg}
    ${entries.map((entry, index) => {
      const x = 160 + index * 80;
      return `<g class="sequence-note" data-item-index="${entry.index}" data-result="${escapeText(entry.result)}"${entry.active ? ' data-active="true"' : ''}>
        ${entry.active ? `<rect class="active-note-ring" x="${x - 31}" y="${minY + 12}" width="62" height="${bottom - minY - 8}" rx="10"/>` : ''}
        ${noteMarkup(entry.note, clef, x)}
        <text class="note-number" x="${x}" y="${bottom + 13}" text-anchor="middle">${entry.index + 1}</text>
        <text class="submitted-answer" x="${x}" y="${bottom + 38}" text-anchor="middle">${escapeText(entry.answer ?? '·')}</text>
        ${entry.correction ? `<text class="note-correction" x="${x}" y="${bottom + 57}" text-anchor="middle">${escapeText(entry.correction)}</text>` : ''}
      </g>`;
    }).join('')}
  </svg>`;
}