# NoteTrainer

A lightweight piano note-reading trainer built with HTML, CSS and vanilla JavaScript.
**Milestones 1 and 2 are implemented.** No production build, backend, account,
external font or runtime dependency is required.

## Launch locally

Install **Node.js 22 or newer**, then open PowerShell:

```powershell
cd C:\Users\jindr\Documents\Note_trainer\Note_trainer
npm.cmd start
```

Open [NoteTrainer locally](http://127.0.0.1:5173/Note_trainer/).
No `npm install` step is necessary. Keep the terminal open and use **Ctrl+C** to stop it.

For another port:

```powershell
npm.cmd start -- --port 4173
```

Open [the alternate address](http://127.0.0.1:4173/Note_trainer/).
On other shells, use `npm start` and `npm test` as usual.
Serve the files over HTTP: opening `index.html` through `file://` does not support ES modules.

## Practice

**Quick start** uses the selected preset and your saved default session type and
note naming. A default timed session lasts 60 seconds; a default count session
contains 10 questions. **Customize practice** opens the full configuration.
The Practice navigation link resumes an existing session or opens configuration.

All exercises contain natural notes only:

| Preset | Treble range | Bass range |
| --- | --- | --- |
| Treble – Beginner | C4–G4 | — |
| Treble – Basic | C4–C5 | — |
| Treble – Staff | E4–F5 | — |
| Treble – Extended | A3–C6 | — |
| Bass – Beginner | — | G2–D3 |
| Bass – Staff | — | G2–A3 |
| Bass – Extended | — | C2–E4 |
| Mixed Clefs | C4–C5 | G2–A3 |
| Custom | Select C2–C6 | Select C2–C6 |

Custom mixed exercises use **independent ranges for each clef**. A range may
contain just one pitch. Invalid or reversed ranges cannot start a session.
The configuration screen describes the selected ranges before practice begins.

- **Free practice:** unlimited questions; choose **Finish** whenever you want.
- **Timed practice:** 30 seconds, 60 seconds, 2 minutes, 5 minutes, or a custom
  duration of **5–3600 whole seconds**.
- **Fixed question count:** 10, 25, 50, 100, or a custom **1–1000 questions**.
  Both correct and incorrect independent answers count toward the limit.

Answer with large onscreen buttons, a mouse, or a physical keyboard.
Answers identify the **letter name**, without an octave.

| Naming | Buttons / keyboard | B natural |
| --- | --- | --- |
| Czech/German, the new-user default | C D E F G A H | H |
| International | C D E F G A B | B |

In Czech/German mode **B is not an alias for H**: B denotes B-flat, which is
outside these natural-note exercises. Keyboard letters are case-insensitive.
Feedback, configuration labels and summaries use the session's naming convention.

Correct feedback advances after 0.9 seconds, incorrect feedback after 2 seconds.
**Next note** advances sooner. The correct letter and written pitch are revealed
after a mistake. Each question accepts one answer; corrected retries and rapid
duplicate clicks cannot add attempts. Held-key repeat events are ignored.

**Pause**, Home, Settings, configuration, and hiding the page pause practice.
Return to Practice or choose **Resume** to continue. A completed or expired
session cannot accept more answers.

## Session results

Finish opens a dedicated summary with:

- Preset, clefs, ranges, naming, and configured session limit.
- Active duration, answered/correct/incorrect counts and accuracy.
- **Median correct response time**, excluding incorrect responses.
- Correct notes per minute of active practice.
- Missed pitches grouped separately by written pitch **and clef**.

Empty sessions and sessions without a correct answer show a dash for undefined
accuracy/response measures. Correct notes per minute safely displays zero.
You can repeat the same configuration, choose a different session, or return Home.
Starting another session requires confirmation before replacing recorded answers
and their summary.

Response timing uses `performance.now()` after notation is rendered and ready.
Feedback and pauses are excluded from individual response times. Active practice
duration includes visible feedback and excludes pauses. Timed duration is capped
at the exact limit even if a browser callback is delayed. Count sessions freeze
their duration on the last answer, show its feedback, then open the summary.

## Settings and storage

Settings saves theme (light, dark or system), default naming, default preset and
default session type on the current browser/device. The header theme selector
updates the same saved preference. Practice defaults apply to **new sessions**;
a session keeps its configuration. Theme changes apply immediately.

Preferences use a dedicated LocalStorage key, `notetrainer.settings`:

```json
{
  "schemaVersion": 1,
  "settings": {
    "theme": "system",
    "naming": "czech",
    "defaultPreset": "treble-basic",
    "defaultSessionType": "unlimited"
  }
}
```

Compatible unknown fields are preserved. Malformed data and unsupported schema
versions are never silently overwritten, including data changed by another tab
after startup. Unavailable/full storage falls back to preferences for the current
visit and displays a notice. Storage belongs to the site's origin: local and
published installations have separate preferences.

**Attempts, session summaries and learning history are not persisted.**
Reloading clears the current session; saved preferences remain.
Milestone 3 can integrate this settings-only adapter through an explicit schema
migration without clearing the key or introducing learning storage prematurely.

## Automated tests

```powershell
cd C:\Users\jindr\Documents\Note_trainer\Note_trainer
npm.cmd test
```

**95 tests pass** using Node's built-in test runner. The original 40-test
Milestone 1 suite remains in place.

Tests cover MIDI/spelling, both clefs and all supported staff positions,
extended ledger lines and stems, range filtering, every preset, independent mixed
ranges, deterministic generation, naming/keyboard mapping, session deadlines,
count completion, duplicates, pause/resume, summaries, settings validation and
persistence, rendered screen content, and HTTP loading of every application
module beneath `/Note_trainer/`.

Browser validation on **2026-11-24** used the embedded Chromium browser.
All presets, all session types, both naming conventions, reload persistence,
empty/all-wrong summaries, repeat/cancel/navigation, both clefs and extreme ledger
positions were exercised. All screens fit at 320 and 1280 pixels, with practice
also checked at 375, 390, 540, 640 and 768 pixels. No horizontal overflow or
critical console errors were observed.

See [the full validation report and file inventory](docs/validation/MILESTONE_2.md),
[mobile bass practice](docs/validation/m2-mobile-bass.jpg), and
[desktop summary](docs/validation/m2-desktop-summary.jpg).

Physical iPhone/Android touch, Safari/Firefox, browser restart, and actual
background-tab visibility transitions have not been tested. The embedded browser
emulates a focused page; countdown pause/resume was checked through the UI and
hidden-time exclusion is covered by deterministic session tests.

## Architecture and musical accuracy

- `js/music/`: immutable written-note/MIDI model, natural ranges, local clef
  vectors and pure diatonic notation layout. Middle C is C4/MIDI 60.
- `js/exercises/`: validated immutable configurations, centralized preset
  application, procedural generation and letter validation.
- `js/session/`: DOM-independent session state machine and derived session results.
- `js/data/settings.js`: versioned settings-only persistence adapter.
- `js/ui/`: Home, configuration, Practice, Settings and summary screens,
  display/input naming conversion, formatting and centralized English copy.
- `js/app.js`: application state, input, navigation, preferences and scheduling.
- `css/`: existing responsive layout, reusable controls, forms and theme variables.
- `scripts/serve.mjs`: development-only static server using Node's built-ins.
- `tests/`: automated regression and Milestone 2 tests.

Treble uses E4/F5 as bottom/top staff lines; bass uses G2/A3.
Vertical placement uses diatonic steps, never semitone distance. Ledger lines occur
only at additional line positions, with space notes retaining the necessary lines
between them and the staff. Stems switch direction at the middle line and extend
toward it for distant ledger notes. The SVG viewport grows for extreme custom
pitches. Both original clef vectors are bundled in source under the repository's
**MIT license**, with no dependency on installed music fonts.

Internal spelling and recorded answers remain international regardless of
display naming. Mixed exercises choose either clef with equal probability, then
choose uniformly within its range. The immediately preceding identical pitch/clef
context is excluded when another pitch is available; single-pitch ranges remain
answerable. This is uniform practice, without adaptive learning.

## GitHub Pages and milestone scope

All production resource URLs and imports are relative. Navigation uses fragments,
so the repository root works under **/Note_trainer/** without a build or URL rewrite.
The local server deliberately provides that project subpath for testing.

Milestone 2 changes are local and have not been committed, pushed or published.
Milestone 3 learning persistence, long-term statistics and mastery are deferred,
along with subsequent sequence, piano and adaptive modes.

PWA installation, a manifest, service worker, and offline caching remain scheduled
for Milestone 7. Static files must currently be available when opening/reloading.

See [the product specification](docs/PRODUCT_SPEC.md) and
[implementation plan](docs/IMPLEMENTATION_PLAN.md) for the roadmap.
