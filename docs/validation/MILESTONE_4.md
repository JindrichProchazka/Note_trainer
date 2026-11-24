# Milestone 4 validation — 2026-11-24

Implemented Note Sequences on the existing M3 checkout (c5c3702), preserving the
uncommitted implementation when resuming. No commits, pushes or publication.

- Lengths 3/5/8/12/16; one treble/bass clef per sequence, mixed selection,
  presets/custom ranges, Czech/international naming and existing session types.
- Random, predominantly stepwise, melodic contour, repeated-note and mixed-interval
  strategies. Interval variety is selectable; bounded reflection handles narrow ranges.
- Shared SVG note/ledger geometry, ordered wrapping, current-note highlighting,
  submitted answers, immediate/delayed feedback, explicit review/continue.
- Immediate independent persistence, partial sequences, note-based count limits,
  shortened final sequences, pause/resume and timed expiry.
- Sequence-specific contexts, statistics, summaries/history/repeat and Home mode choice.

## Validation

Baseline 139 tests passed. Final suite: 194 passed, 0 failed, 0 skipped.
New coverage includes all lengths/strategies, range boundaries/narrow ranges,
mixed clefs, repeated answers, timing/pause/review, expiry/count limits, partials,
storage compatibility/deduplication, delayed disclosure, rendering and statistics.
Existing HTTP coverage includes every new module/style under /Note_trainer/.

Browser checks before interruption verified five-note Czech/treble delayed practice,
a deliberately wrong neutral answer, no correctness leakage through Statistics,
separate H key presses, review, a final shortened two-note sequence for a seven-note
limit, session completion and reload. The existing eight M3 answers remained visible.

Essential resumed checks used the same isolated port 5174 and existing tab:
saved sequence summary retained 7 answers and 2 completed sequences; a 16-note
international/bass mixed-interval exercise in light theme wrapped into six systems
at 320 px and three at desktop width. Immediate mistake correction, accessible
controls, pause/resume and reload interruption worked. Sequence-filtered statistics
showed 8 answers, 2 completed sequences and 1 partial sequence; history distinguished
the original completed session and the interrupted one-answer session.
No page-level horizontal overflow or critical console errors/warnings were observed.
[Mobile capture](m4-mobile-sequence.jpg).

Not every strategy/length/session-type combination was repeated in the browser;
deterministic tests cover that matrix. Physical touch, Safari/Firefox, OS/browser
restart and actual hidden-tab transitions remain unverified. LocalStorage capacity
and in-memory fallback limitations remain as documented for M3. No later milestones.

## Changed files

New: css/sequences.css; js/exercises/sequence.js; js/session/sequence-session.js,
sequence-statistics.js; js/ui/answer-input.js, learning-disclosure.js,
sequence-practice.js, sequence-results.js, sequence-strings.js; tests/helpers/
sequence-fixtures.js; tests/sequence-generation.test.js, sequence-session.test.js,
sequence-integration.test.js; this report and its screenshot.

Modified: index.html, package.json, README.md, docs/IMPLEMENTATION_PLAN.md,
docs/STORAGE_SCHEMA.md, js/app.js, js/config.js, js/data/recording.js, schema.js,
storage.js, js/exercises/configuration.js, js/learning/context.js, statistics.js,
js/music/notation.js, js/ui/config-description.js, configuration.js, home.js,
practice.js, session-history.js, statistics.js, strings.js, summary.js.

## Quick manual check

Run npm.cmd test and npm.cmd start from the repository; open
http://127.0.0.1:5173/Note_trainer/. Select Note Sequences, customize length,
strategy, feedback and range. For a seven-note count and length five, verify
5+2 notes. In delayed mode make a mistake: it must remain neutral until review.
Reload after a partial sequence, then inspect interrupted history and sequence
Statistics. Try a 16-note sequence on a narrow screen and switch back to Single Notes.
