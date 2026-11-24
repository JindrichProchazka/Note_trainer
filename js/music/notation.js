import { createNote, diatonicIndex } from './notes.js';

export const STAFF = Object.freeze({
  width: 480, height: 236, left: 32, right: 448,
  bottomY: 148, lineSpacing: 20, noteX: 282,
});
const BOTTOM_LINE = diatonicIndex(createNote('E', 4));

/** Each line OR space is one diatonic step. Accidentals never move a note. */
export function treblePosition(note) {
  return diatonicIndex(note) - BOTTOM_LINE;
}

export function ledgerPositions(position) {
  if (!Number.isInteger(position)) throw new RangeError('Staff position must be an integer');
  const positions = [];
  for (let step = -2; step >= position; step -= 2) positions.push(step);
  for (let step = 10; step <= position; step += 2) positions.push(step);
  return positions;
}

export function notationLayout(note) {
  const position = treblePosition(note);
  const yFor = step => STAFF.bottomY - step * STAFF.lineSpacing / 2;
  return {
    position,
    y: yFor(position),
    ledgerYs: ledgerPositions(position).map(yFor),
    stemDirection: position >= 4 ? 'down' : 'up',
  };
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, character =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

/**
 * Original vector treble clef, independent of installed fonts.
 * Its inner spiral surrounds the G4 line (second line from the bottom).
 * This renderer is intentionally limited to natural single notes for Milestone 1.
 */
export function renderNotation(note, label) {
  if (note.accidental !== 0) throw new RangeError('Accidental rendering is not enabled');
  const { position, y, ledgerYs, stemDirection } = notationLayout(note);
  const x = STAFF.noteX;
  const up = stemDirection === 'up';
  const stemX = x + (up ? 12 : -12);
  const stemEnd = y + (up ? -66 : 66);
  const staff = Array.from({ length: 5 }, (_, index) => {
    const lineY = STAFF.bottomY - index * STAFF.lineSpacing;
    return `<line x1="${STAFF.left}" x2="${STAFF.right}" y1="${lineY}" y2="${lineY}"/>`;
  }).join('');
  return `<svg class="notation" viewBox="0 0 ${STAFF.width} ${STAFF.height}"
    role="img" aria-label="${escapeText(label)}" xmlns="http://www.w3.org/2000/svg">
    <g class="staff-lines" fill="none" stroke="currentColor" stroke-width="1.4">${staff}</g>
    <g class="clef" transform="translate(4 4)" fill="none" stroke="currentColor"
      stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M79 154 C43 154 39 127 56 110
        C73 93 94 77 90 51 C87 29 74 30 73 49
        C71 72 78 105 82 130 L91 179
        C96 205 61 207 61 186 C61 172 80 174 78 186
        C77 194 66 193 65 186"/>
      <path d="M79 137 C60 136 59 117 73 111
        C94 103 109 129 93 142"/>
    </g>
    <g class="note" data-position="${position}" fill="currentColor" stroke="currentColor">
      <g class="ledger-lines" stroke-width="2">${ledgerYs.map(ledgerY =>
        `<line x1="${x - 23}" x2="${x + 23}" y1="${ledgerY}" y2="${ledgerY}"/>`).join('')}</g>
      <ellipse class="notehead" cx="${x}" cy="${y}" rx="13" ry="9"
        transform="rotate(-20 ${x} ${y})" stroke="none"/>
      <line class="stem" x1="${stemX}" x2="${stemX}" y1="${y}" y2="${stemEnd}"
        stroke-width="2.5"/>
    </g>
  </svg>`;
}
