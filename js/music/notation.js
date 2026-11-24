import { diatonicIndex } from './notes.js';
import { CLEFS } from './clefs.js';

export const STAFF = Object.freeze({
  width: 480, height: 236, left: 32, right: 448,
  bottomY: 148, lineSpacing: 20, noteX: 282,
});

/** Each line OR space is one diatonic step. Accidentals never move a note. */
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

/** Very high/low notes extend their stems toward the middle staff line. */
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

/** Extend the viewport for extreme custom pitches without moving staff reference lines. */
export function notationViewport(layout) {
  const minY = Math.min(0, layout.y - 22);
  const maxY = Math.max(STAFF.height, layout.y + 22);
  return { minY, height: maxY - minY };
}

/** Single-note SVG; layout, clef paths and viewport calculation remain reusable. */
export function renderNotation(note, label, clef = 'treble') {
  if (note.accidental !== 0) throw new RangeError('Accidental rendering is not enabled');
  const layout = notationLayout(note, clef);
  const { position, y, ledgerYs } = layout;
  const viewport = notationViewport(layout);
  const x = STAFF.noteX;
  const { x: stemX, endY: stemEnd } = notationStem(layout);
  const staff = Array.from({ length: 5 }, (_, index) => {
    const lineY = STAFF.bottomY - index * STAFF.lineSpacing;
    return `<line x1="${STAFF.left}" x2="${STAFF.right}" y1="${lineY}" y2="${lineY}"/>`;
  }).join('');
  return `<svg class="notation" viewBox="0 ${viewport.minY} ${STAFF.width} ${viewport.height}"
    data-clef="${clef}" role="img" aria-label="${escapeText(label)}" xmlns="http://www.w3.org/2000/svg">
    <g class="staff-lines" fill="none" stroke="currentColor" stroke-width="1.4">${staff}</g>
    ${CLEFS[clef].svg}
    <g class="note" data-position="${position}" fill="currentColor" stroke="currentColor">
      <g class="ledger-lines" stroke-width="2">${ledgerYs.map(ledgerY =>
        `<line x1="${x - 23}" x2="${x + 23}" y1="${ledgerY}" y2="${ledgerY}"/>`).join('')}</g>
      <ellipse class="notehead" cx="${x}" cy="${y}" rx="13" ry="9"
        transform="rotate(-20 ${x} ${y})" stroke="none"/>
      <line class="stem" x1="${stemX}" x2="${stemX}" y1="${y}" y2="${stemEnd}" stroke-width="2.5"/>
    </g>
  </svg>`;
}
