# Milestone 3 validation — 2026-11-24

## Scope and baseline

Implemented Persistence and Statistics only in the existing Note_trainer checkout.
Read AGENTS.md, PRODUCT_SPEC.md, IMPLEMENTATION_PLAN.md and the complete M2 report
before editing. Baseline: **95/95 tests passed** on Node.js 24.20.0.
The existing M1/M2 implementation was preserved; no commit, push or publication was performed by this task.

## Implemented

- Dedicated schema v2 LocalStorage learning layer, immediate independent attempts,
  per-session atomic records, validation/migration, append-only deduplication,
  interrupted evidence, quota/denied/corrupt-data warnings and retry.
- Existing settings key/schema and all four M2 preferences preserved.
- DOM-free statistics, stable exact contexts, local-day/date/clef/type/input/config
  filters, weighted aggregates, centrally defined mastery and degradation.
- Statistics navigation, ten overview metrics, five native SVG daily charts with
  gaps, axis units, 30-day paging and an exact-values table.
- Sortable/paginated note performance, correct/recent measures and last practice;
  separate clef/octave staff views sharing the existing geometry, U/L/F/M labels,
  legend and inspectable practiced/unseen contexts.
- Completed/interrupted/unfinished history, immutable old summaries, original
  configuration repeat as a new session, and real Home Today/recent metrics.
- Relative production paths and the existing visual identity, themes and practice
  functionality preserved. No later exercise modes, adaptive selection or PWA.

See [storage, schema, migrations and metric definitions](../STORAGE_SCHEMA.md).

## Automated validation

Final suite: **139 tests, 139 passed, 0 failed, 0 skipped** with Node's built-in
runner; all original 95 tests remain passing. No dependencies installed.

New tests cover schema consistency, known migrations, byte-preserved preferences,
answer-on-disk-before-submit-return, reload/new adapter, duplicate and corrected
retry protection, completed/unfinished/interrupted persistence, terminal immutability,
independent tab sessions, corrupt/future/partial/denied/full storage and retry,
exact context separation, weighted accuracy, individual medians, rates, local-day
boundaries, midnight activity splits, mixed-clef denominators, configuration/input
filters, empty/all-wrong data, history and Home calculations, chart gaps/paging,
exact mastery thresholds/ordering/degradation, accessible rendered content/naming,
and shared performance/practice notation geometry for all C2–C6 natural notes in
both clefs.

The HTTP test discovers every JS/CSS resource and checks MIME/status under
/Note_trainer/. Syntax checks passed for all 51 JavaScript files; git diff --check passed
with no whitespace errors. Git only reported its normal LF/CRLF conversion notices.

## Browser validation

Embedded Chromium, isolated **http://127.0.0.1:5174/Note_trainer/** origin.
The normal 5173 and published origins were not used for generated learning data.
Browser controls performed the sessions; no localStorage fixtures were injected.

Observed results:

- Opened empty Statistics: 0 counts, unavailable measures, meaningful empty states,
  five chart placeholders and no fabricated progress.
- Before enabling M3, saved M2 dark/international/bass-staff/count preferences.
  Reloading the upgraded application preserved all four selected values.
- Completed five bass B2 answers: 5 correct, one completed session, Familiar state,
  100% accuracy and correct-only median. Reload opened the saved summary with the
  same five attempts and measures.
- Repeated that configuration, answered C incorrectly and reloaded. History
  contained the original completed 5-answer result plus a separate interrupted
  1-answer, 0%-accuracy result. Completed count stayed 1 and total attempts became 6.
- Opened the original summary: its 5/5 result was unchanged.
- Changed to Czech/light, practiced treble H4 using physical-keyboard simulation
  for H and a pointer answer for a deliberate mistake; manually finished.
  Combined totals became 8 answers, 6 correct, 2 incorrect and 2 completed sessions.
  Treble filter selected 2 attempts and bass selected 6.
- Notes inspection showed Unseen with 0 attempts/dashes, Familiar after five
  correct attempts and readable H2/H4 names in Czech. Both clef/range selectors
  and the practiced-context list worked. The browser-observed mastery level was
  Familiar; Mastered/degradation are tested deterministically, not claimed as a
  browser speed result.
- Today/7/30/All time selected the same six actual Today attempts present at that stage.
  Multi-date inclusion/exclusion and missing-day charts use automated fixtures;
  no artificial historical browser data was created.
- Exercise/input/configuration filters worked; selecting the treble configuration
  produced 2 answers. Configuration options respected current Czech naming.
  Combined configuration differences are labelled.
- All five populated charts and exact daily table rendered with real evidence.
  Home showed Today time/answers, last-seven-day accuracy/median and recent config.
- Light and dark rendering, both naming systems, mobile and desktop checked.
  All Statistics tabs, saved summaries, Home and Settings fit at 320 px; note
  controls were 60 px high. Note views also fit at 390, 540, 640, 768, 900 and
  1280 px; overview/history fit at desktop size. All five note sort controls
  worked, and system theme selection resolved correctly. No unintended horizontal
  overflow or NaN/Infinity/undefined values were observed.
- No critical console errors or warnings were observed.

Screenshots: [desktop overview](m3-desktop-overview.jpg),
[mobile note visualization](m3-mobile-notes.jpg).

## Limits of validation and storage

No physical touch device, Safari/Firefox, browser/OS restart, published GitHub
Pages deployment or actual hidden-tab lifecycle transition was tested. The
embedded browser emulates focus. The session model's pause/hidden-time exclusion
is covered by deterministic tests; UI keyboard/pointer interactions were tested.
No claim of production multi-tab crash/transaction guarantees or unbounded-history
performance is made.

Quota, unavailable, corrupted and future-version storage were tested using
automated adapters, not by damaging browser storage. Storage is origin/browser/
device specific and finite. Successfully saved answers survive normal reload;
unsaved in-memory evidence cannot survive it. Abrupt termination can lose active
time after the last checkpoint and can leave an Unfinished history record.
No pruning, backup, restore, reset or cross-device sync is included.

## Files created for Milestone 3

| Layer | Files |
| --- | --- |
| Data | js/data/schema.js, migrations.js, storage.js, recording.js |
| Learning | js/learning/context.js, dates.js, mastery.js, statistics.js |
| UI | js/ui/html.js, statistics-strings.js, charts.js, note-performance.js, session-history.js, statistics.js |
| Styles | css/statistics.css |
| Tests | tests/helpers/learning-fixtures.js, learning-storage.test.js, learning-statistics.test.js, mastery.test.js, statistics-ui.test.js |
| Documentation | docs/STORAGE_SCHEMA.md, this report and two m3-*.jpg captures |

## Files modified for Milestone 3

README.md, docs/IMPLEMENTATION_PLAN.md, package.json, index.html, js/app.js,
js/music/notes.js, js/music/notation.js, js/session/session.js, js/ui/home.js,
js/ui/summary.js, tests/server.test.js.

These lists describe M3 work relative to the existing Milestone 2 checkout
(512cf48). All M3 changes remain local and uncommitted.

## Manual verification

1. From the repository run npm.cmd test, then npm.cmd start; open
   http://127.0.0.1:5173/Note_trainer/. Use port 5174 instead for an isolated
   validation origin: npm.cmd start -- --port 5174.
2. With no history, open Statistics and each tab. Confirm dashes for unavailable
   accuracy/median/rate, no fake mastery and readable Unseen note inspection.
3. Save non-default theme/naming/preset/type in Settings and reload. Confirm all
   remain selected. Try keyboard H in Czech and B in international practice.
4. Customize a single-pitch range and five-question session. Answer all five
   correctly. Inspect summary, reload, and verify exactly five saved attempts,
   one completed session, Familiar note state and Home Today evidence.
5. Repeat the saved configuration, answer once and reload before completion.
   Open History: original completed and new interrupted records remain distinct;
   interrupted practice must not increase Completed sessions.
6. Open the original saved summary, repeat again and finish. Verify the original
   result stays unchanged and new evidence has a new history card.
7. Inspect both staff clefs and octaves C2–C6, note details, all five sort orders,
   date/clef/type/input/config filters and the daily data disclosure.
8. Check light/dark/system, 320 px and a desktop width, scrolling all views and
   checking chart units, text alternatives, clear focus and no horizontal overflow.
9. For mastery, use controlled test evidence via npm.cmd test. Classification is
   scoped to the selected period; All time uses all recorded evidence.
