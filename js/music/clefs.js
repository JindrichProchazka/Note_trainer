import { createNote, diatonicIndex } from './notes.js';

// Original SVG paths, distributed under this repository's MIT license.
// Treble G spiral is centred on the second line; bass dots straddle the fourth (F3).
export const CLEFS = Object.freeze({
  treble: Object.freeze({
    bottomIndex: diatonicIndex(createNote('E', 4)),
    svg: `<g class="clef" data-clef="treble" transform="translate(4 4)" fill="none" stroke="currentColor"
      stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M79 154 C43 154 39 127 56 110 C73 93 94 77 90 51 C87 29 74 30 73 49
        C71 72 78 105 82 130 L91 179 C96 205 61 207 61 186 C61 172 80 174 78 186
        C77 194 66 193 65 186"/>
      <path d="M79 137 C60 136 59 117 73 111 C94 103 109 129 93 142"/>
    </g>`,
  }),
  bass: Object.freeze({
    bottomIndex: diatonicIndex(createNote('G', 2)),
    svg: `<g class="clef" data-clef="bass" fill="currentColor">
      <path d="M61 92 C58 75 71 66 84 71 C103 80 92 107 61 127
        C88 117 108 98 104 81 C100 62 77 60 65 69 C58 75 55 84 58 92 Z"/>
      <circle cx="62" cy="88" r="7"/>
      <circle cx="118" cy="78" r="3.7"/>
      <circle cx="118" cy="98" r="3.7"/>
    </g>`,
  }),
});
