# Milestone 2 validation

Validated locally on 2026-11-24. Baseline commit: `a0cfec6`
(`Implement Milestone 1 - Functional foundation`). The initial checkout was clean.
No commits, pushes or publication were performed.

## Automated validation

- Baseline: 40/40 tests passed before implementation.
- Final: 95/95 tests passed with `npm.cmd test`, Node.js 24.20.0.
- All JavaScript modules and development scripts passed `node --check`.
- Git tracked-file whitespace checks passed.
- All 25 application JavaScript modules/CSS/HTML routes in the server test
  loaded at the expected project subdirectory with appropriate MIME types.
  Root hosting, HEAD, redirects, missing resources and protected paths also passed.

The suite adds musical reference positions in both clefs, ledger lines above and
below each staff, every preset endpoint and custom C2–C6 viewport bounds,
distant-note stems, note filtering and generation, equal mixed-clef eligibility,
independent ranges, natural single-pitch ranges, naming/keyboard mappings,
precise deadline guards, fixed-count termination, paused timing, summary math,
Czech summary rendering, settings validation/preservation and rendered screens.

## Browser validation

Embedded Chromium, locally served from `http://127.0.0.1:5173/Note_trainer/`.

| Area | Executed checks | Result |
| --- | --- | --- |
| Home/presets | Launched all eight presets via Quick Start; checked clef and a generated pitch against each range | Passed |
| Configuration | Reversed range rejected; independent mixed ranges displayed; invalid duration rejected; hidden inactive limits did not block Free practice | Passed |
| Mixed ranges | Treble H4 only / bass C4 only; both contexts appeared and stayed in their own ranges | Passed |
| Naming | New user Czech default; H accepted and B ignored in Czech mode; international B controls; naming in ranges, feedback and summaries | Passed |
| Free practice | Answer, pause/resume, Home/continue, manual finish, empty summary | Passed |
| Timed | Custom 5 seconds; countdown frozen during pause; resume ended automatically at 0:05 active duration | Passed |
| Fixed count | 10 independent answers including one wrong; automatic summary with 9 correct, 1 wrong and 90% accuracy | Passed |
| Custom count | 1-question all-wrong session; summary retained H4, showed zero correct, dash median and zero correct/minute | Passed |
| Duplicates | Rapid double-click recorded one answer; final count could not exceed its limit | Passed |
| Summary/repeat | All required metrics, pitch/clef mistakes, repeat configuration, cancel preserved previous results, confirmed restart reset counters | Passed |
| Settings | All four saved preferences survived page reload; header and Settings theme controls agreed | Passed |
| Notation | Bass middle C on first upper ledger; treble A3/C6, bass C2/E4; custom treble C2 and bass C6 with eight ledger lines | Passed |
| Keyboard navigation | Skip link focused main without leaving Practice; focus preserved for answer controls | Passed |
| Console | No console errors or warnings observed in final loaded application | Passed |

The renderer's notehead bounds remained within the SVG for all inspected extreme
cases. Updated distant stems are also covered by explicit musical-coordinate tests.

### Responsive checks

- All five screens (Home, custom mixed configuration, Practice, Settings, summary)
  checked at **320 × 568** and **1280 × 900**.
- Practice additionally checked at **375 × 667**, **390 × 844**, **540 × 720**,
  **640 × 800**, and **768 × 1024**.
- No unintended horizontal overflow was observed.
- At 320 px answer targets measured about **56 × 54 px**.
- At the 540 px seven-column breakpoint they measured about **50 × 64 px**.
- Other inspected answer targets were larger; all exceeded 44 px in both dimensions.

Screenshots: [mobile bass practice](m2-mobile-bass.jpg) and
[desktop summary](m2-desktop-summary.jpg). Existing Milestone 1 captures were preserved.

## Limits of validation

No physical iPhone/Android touch checks, Safari/Firefox runs, browser/OS restart,
PWA installation, offline use or remote deployment were performed.
Preference reload and fresh storage-adapter-instance behavior were tested;
actual browser restart remains unverified. The embedded browser emulates focus,
so a real hidden-tab transition could not be reproduced. Manual countdown pause
and the session model's hidden-time exclusion were tested.

Invalid, future-version, denied and full storage were exercised through automated
in-memory adapters, rather than altering a user's browser storage manually.
This milestone persists preferences only, without attempts or long-term history.

## Files created

| Layer | Files |
| --- | --- |
| Music | `js/music/clefs.js` |
| Exercises | `js/exercises/configuration.js` |
| Settings data | `js/data/settings.js` |
| UI | `js/ui/note-names.js`, `js/ui/config-description.js`, `js/ui/configuration.js`, `js/ui/settings.js`, `js/ui/summary.js` |
| Tests | `tests/configuration.test.js`, `tests/extended-notation.test.js`, `tests/naming.test.js`, `tests/session-types.test.js`, `tests/settings.test.js`, `tests/ui-rendering.test.js` |
| Validation | This report, `docs/validation/m2-mobile-bass.jpg`, `docs/validation/m2-desktop-summary.jpg` |

## Files modified

`README.md`, `docs/IMPLEMENTATION_PLAN.md`, `package.json`, `index.html`,
`css/components.css`, `js/app.js`, `js/config.js`,
`js/music/notes.js`, `js/music/notation.js`,
`js/exercises/generator.js`, `js/session/session.js`,
`js/session/statistics.js`, `js/ui/format.js`, `js/ui/home.js`,
`js/ui/practice.js`, `js/ui/strings.js`, `tests/server.test.js`.

## Decisions for Milestone 3

- Keep the stable `notetrainer.settings` key and schemaVersion 1 envelope until
  an explicit migration is introduced. Preserve unreadable/unsupported data.
- Keep attempts in memory for this milestone; derived summaries use the current
  session and never imply long-term mastery.
- Preserve canonical international spelling and clef-specific recognition
  contexts regardless of naming preference.
- Treat session configuration as an immutable snapshot. Persisted defaults
  affect new sessions; theme changes apply immediately.
- Preserve monotonic timing and terminal input guards in the session model.
  UI timer throttling must not admit expired answers.
- Retain independent clef ranges, equal clef selection and the single-pitch
  fallback when adding future exercise types.

## Manual verification

1. Run `npm.cmd start` from the repository and open the local project-path URL.
2. Use Quick Start. Answer with C D E F G A H, pause, resume, finish and inspect
   the summary.
3. Choose Customize practice, mixed clefs, treble H4–H4, bass C4–C4, and a
   custom count of 3. Answer with H/C, deliberately choose a wrong letter once,
   and verify that all three answers count.
4. Set a custom timed duration of 5 seconds. Pause for more than 5 seconds;
   confirm the countdown is unchanged. Resume and confirm automatic completion.
5. Change all four Settings preferences and reload. Start another exercise and
   verify its default preset/type/naming. Select international naming to use B.
6. Check Treble – Extended and Bass – Extended. Confirm notes and ledger lines
   remain readable in light/dark themes on a narrow viewport.
7. Repeat a session, cancel its replacement once, then confirm. Check both paths.
