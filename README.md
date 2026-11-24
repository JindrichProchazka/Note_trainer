# NoteTrainer

A lightweight piano note-reading trainer built with HTML, CSS and vanilla JavaScript.
Milestone 1 — Functional Foundation is implemented. No build step, backend,
account, external font, or production dependency is required.

## Run locally

Install **Node.js 22 or newer**, then open PowerShell:

```powershell
cd C:\Users\jindr\Documents\Note_trainer\Note_trainer
npm.cmd start
```

Open [NoteTrainer locally](http://127.0.0.1:5173/Note_trainer/).
Keep the terminal open; press **Ctrl+C** to stop the server.
No `npm install` step is necessary.

If port 5173 is already in use:

```powershell
npm.cmd start -- --port 4173
```

Then open [the alternate local address](http://127.0.0.1:4173/Note_trainer/).
On other shells, `npm start` and `npm test` work as usual.
Serve the files over HTTP; opening `index.html` with a `file://` URL does not
support the application's ES modules.

## What works

- Home screen with one-click start, continue practice, current-session counters,
  and a confirmed new-session action.
- Unlimited single-note recognition: natural **C4, D4, E4, F4, G4, A4, B4, C5**
  in the **treble clef**.
- Responsive SVG notation with five staff lines, noteheads, stems and the
  middle-C ledger line. The clef is an original local vector path, so it does
  not depend on a device's music fonts.
- Touch/mouse answer buttons and physical **A–G** keyboard input. Answers
  identify the letter name: **C** answers either C4 or C5.
- Immediate textual and visual feedback. Incorrect answers reveal the correct
  pitch and highlight its letter. Correct feedback advances after 0.9 seconds;
  incorrect feedback stays for 2 seconds. **Next note** advances sooner.
- One recorded answer per question. Repeated keydown events and submissions
  during feedback cannot add duplicate attempts.
- Answered, correct and incorrect counts, accuracy, average response time,
  and active practice duration.
- Pause/resume, automatic pause on leaving Practice or hiding the page,
  accessible keyboard focus, a skip link, and live feedback announcements.
- Light, dark and system themes. Mobile answers wrap into two rows to keep
  the controls large enough to tap.

## Timing and statistics

The response clock uses `performance.now()` and starts after the SVG is
rendered and ready for input. Feedback and paused time are excluded from
individual response times. Average response time includes both correct and
incorrect answers. Practice duration includes visible feedback delays, and
excludes pauses.

Each question records its first answer only. A wrong answer advances to a new
question rather than recording a corrected retry. Questions are selected
uniformly from eligible pitches, excluding the immediately preceding exact
pitch. C4 and C5 remain different pitches even though their letter answer is
the same.

Session data and the selected theme are **in memory only**. They survive
Home/Practice navigation in the same page, and reset on reload. A new session
requires confirmation before clearing recorded answers. Saved learning history,
per-note statistics, and persistent settings belong to later milestones.

## Automated tests

```powershell
cd C:\Users\jindr\Documents\Note_trainer\Note_trainer
npm.cmd test
```

The dependency-free Node.js test runner currently runs **40 passing tests**:

- MIDI conversion, spelling, immutable notes and all supported letter answers.
- Every C4–C5 staff position, stem direction, middle C, and ledger boundaries.
- Uniform question generation, range limits, deterministic random sources,
  and immediate repetition prevention.
- Session readiness, duplicate rejection, wrong answers, feedback delays,
  pause/resume timing, independent attempt identifiers and statistics.
- Static resources and module MIME types at both the root and the expected
  GitHub Pages project path, plus missing/invalid resource handling.

Validation performed on **2026-11-24**, using Node.js **24.20.0** and the
Chromium-based embedded browser:

- All eight pitches answered correctly through the interface.
- Correct/wrong feedback, keyboard input, double-click duplicate protection,
  automatic/manual progression and pause/resume checked.
- New-session confirmation cancellation and confirmation checked.
- Home/Practice navigation, restored scroll position and keyboard skip link checked.
- Light, dark and system theme selection checked.
- Phone widths 320, 375 and 390, tablet width 768, and desktop width 1280 checked;
  no horizontal overflow. The smallest tested answer target was approximately
  56 × 54 CSS pixels.
- No browser console errors or warnings observed.

Browser captures: [mobile, light theme](docs/validation/mobile-practice.jpg) and
[desktop, dark theme](docs/validation/desktop-practice.jpg).

Physical iPhone/Android touch interaction and Safari/Firefox have not been
tested. Background-tab timing exclusion is covered by automated session tests;
an actual visibility transition could not be verified in the embedded browser,
which emulates a focused page.

## Architecture

- `js/music/`: immutable written-note/MIDI model and pure SVG notation layout.
- `js/exercises/`: question generation and letter-answer validation.
- `js/session/`: DOM-independent state machine, attempts and derived session statistics.
- `js/ui/`: screen rendering, formatting and centralized English interface copy.
- `js/app.js`: application state, navigation, input events, themes and scheduling.
- `css/`: responsive layout, reusable controls and theme variables.
- `scripts/serve.mjs`: development-only, loopback static server using Node's built-ins.
- `tests/`: automated tests using `node:test`.

The interface never calculates musical pitches or learning scores.
Internal written spelling uses international letters; future localization can
change presentation without changing note identities.

## GitHub Pages compatibility

The repository root is the static application. All production resource URLs
and module imports are relative, and navigation uses URL fragments rather
than server routes. It can be served beneath **/Note_trainer/** or another
project directory without a build or URL rewrite. The development server's
default address deliberately exercises that project subpath.

No changes have been published. Actual GitHub Pages hosting has not been tested.

## Milestone scope and limitations

This implementation stops at Milestone 1, with the explicitly requested
session response timing and initial themes. The C4 ledger line is required
to display the authorized range accurately.

Bass clef, extended ranges, configurable difficulty, Czech note naming,
timed/count-limited sessions, session summaries, saved progress, statistics
history, sequences, a virtual piano, adaptive learning, and backup/restore
remain in their planned milestones.

An installable PWA, manifest, service worker and offline caching are scheduled
for Milestone 7 and are not implemented here. The application currently needs
its static files to be served when it is opened or reloaded.

See [the product specification](docs/PRODUCT_SPEC.md) and
[implementation plan](docs/IMPLEMENTATION_PLAN.md) for the full roadmap.
