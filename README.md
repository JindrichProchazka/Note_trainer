# NoteTrainer

A lightweight piano note-reading trainer built with HTML, CSS and vanilla JavaScript.
**Milestones 1–6 are implemented.** No production build, backend, account,
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

## Note Sequences (Milestone 4)

Choose **Note Sequences** on Home or in practice configuration. Lengths are
3, 5 (default), 8, 12 or 16 notes. Random selects independently; Stepwise favors
adjacent pitches; Melodic follows short rising/falling/repeated contours;
Repeated notes deliberately repeat; Mixed intervals offers small/balanced/wide
variety. Narrow ranges reflect movements safely at their boundaries.

Each sequence uses one clef, including mixed-clef sessions. Ordered staff systems
wrap on mobile, with active-note highlighting, submitted letters and persistent
answer controls. Quarter notes indicate pitch order; rhythm is not assessed.
Immediate feedback reveals each result. Delayed feedback reveals correctness only
at sequence review; choose Next sequence when ready. Review pauses the clock.
Distinct key presses allow repeated letters; held keys and mouse double-clicks
are guarded. Fixed counts count individual notes and shorten the final sequence.

Every answer is saved immediately, including partial/interrupted sequences.
Statistics separates exercise contexts and shows completed/partial sequences.
Later-note response times benefit from reading ahead and should be compared
within equivalent exercise configurations. Recent configurations can be repeated.
See [M4 validation and manual checks](docs/validation/MILESTONE_4.md).
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
Starting another session asks for confirmation when unfinished practice contains
answers. Its saved evidence remains in history.

Response timing uses `performance.now()` after notation is rendered and ready.
Feedback and pauses are excluded from individual response times. Active practice
duration includes visible feedback and excludes pauses. Timed duration is capped
at the exact limit even if a browser callback is delayed. Count sessions freeze
their duration on the last answer, show its feedback, then open the summary.

## Settings, persistence and Statistics

Settings saves light/dark/system theme, naming, default preset and session type.
Defaults apply to new sessions; themes change immediately. Milestone 2 preferences
remain at `notetrainer.settings`, schema 1, including compatible unknown fields.

Learning data uses a separate **schema 2** manifest and one atomic LocalStorage
document per session. Every valid answer is saved immediately; completion never
duplicates it. Reload/close keeps saved attempts and marks unfinished practice
interrupted when its prior tab can be identified. Interrupted/unfinished evidence
contributes to practice measures but never to completed-session counts. Practice
does not resume automatically after reload.

**Statistics** contains:

- Overview: active time, answered/correct/incorrect, accuracy, correct median,
  correct notes/minute, completed sessions, distinct and mastered contexts.
- Today, last 7 days, last 30 days and All time, plus clef, exercise, input and
  configuration filters. Combined configurations are explicitly identified.
- Sortable note performance: exact written pitch/octave/clef/context, counts,
  accuracy, correct median, recent accuracy, last practice and learning state.
- Treble/bass staff views, readable octave groups, U/L/F/M markers, textual legend
  and note inspection using the same notation geometry as practice.
- Five daily charts with accessible exact values, honest performance gaps and
  30-day chart pages for long histories.
- Completed/interrupted/unfinished history, old summaries and original
  configuration repeat as a new session without changing historical results.

Home keeps Quick Start prominent and adds real Today time/answers, last-seven-day
accuracy/correct median and the recently used configuration.

Accuracy is correct/answered. Medians use individual correct attempts.
Correct notes/minute uses active time, including feedback and excluding pauses.
Empty accuracy/median and rates without recorded time show a dash. Date filters
use inclusive local calendar days. History cards explicitly show whole-session
results; date/clef filters select relevant cards.

Mastery is recalculated per exact context within the selected filters:

| State | Evidence |
| --- | --- |
| Unseen | No attempts |
| Learning | Practiced, below Familiar/Mastered |
| Familiar | >=5 attempts, >=80% correct in latest 10 or all available |
| Mastered | >=20 attempts, >=95% in latest 20, correct median <1000 ms in that window |

Mastered takes precedence and can decrease with recent mistakes/slower responses.
Adaptive selection uses these classifications alongside recent evidence.

Malformed/unsupported data is preserved. Storage problems display a notice;
new evidence remains in memory and **Retry saving** revalidates before writing.
Full storage never triggers automatic history deletion. Unsaved evidence cannot
survive reload. LocalStorage is finite, synchronous and specific to origin,
browser and device; large histories can become slow. Private browsing, clearing
site data or browser eviction can remove browser-managed data. Different local
ports and the published site have separate histories. Abrupt termination can
lose the latest active-time checkpoint or leave an Unfinished record.

No backup, restore, destructive reset or cloud sync is included.
See [the schema, migration and complete metric definitions](docs/STORAGE_SCHEMA.md).

## Automated tests and validation

```powershell
cd C:\Users\jindr\Documents\Note_trainer\Note_trainer
npm.cmd test
```

**210 tests pass**, including all 95 Milestone 1/2 tests. Node's built-in runner
covers music/ledger geometry, generation, naming, session timing and limits,
settings, schemas/migrations, immediate evidence/deduplication, interruption,
storage failure/retry, context separation, filtered/weighted metrics, dates,
mastery/degradation, history, Home, rendered views and all JS/CSS resources
served under the GitHub Pages project subpath.

Embedded Chromium validation on **2026-11-24** exercised empty/populated
Statistics, actual practice recording, reload persistence, preservation of M2
preferences, repeat/history, both clefs/naming systems, charts/filters, Home,
light/dark and responsive mobile/desktop layouts. No horizontal overflow or
critical console errors were observed. Validation data used isolated port 5174.

See [the M3 validation report, file inventory and manual checks](docs/validation/MILESTONE_3.md),
[desktop overview](docs/validation/m3-desktop-overview.jpg) and
[mobile note view](docs/validation/m3-mobile-notes.jpg).
[The M2 report](docs/validation/MILESTONE_2.md) records the earlier baseline.

Physical touch devices, Safari/Firefox, browser/OS restart, actual background-tab
transitions and published hosting remain untested. Corrupt/denied/full storage,
multi-day history and exact mastery boundaries use deterministic automated
fixtures; they were not injected into browser storage.

## Architecture and musical accuracy

- `js/music/`: immutable written-note/MIDI model, natural ranges, local clef
  vectors and pure diatonic notation layout. Middle C is C4/MIDI 60.
- `js/exercises/`: validated immutable configurations, centralized preset
  application, procedural generation and letter validation.
- `js/session/`: DOM-independent session state machine and derived session results.
- `js/data/`: isolated settings, validated versioned learning storage, migrations and recording adapters.
- `js/learning/`: DOM-independent context identity, dates, mastery and statistics.
- `js/ui/`: Home, configuration, Practice, Settings, Statistics/history/note views and summaries,
  display/input naming conversion, formatting and centralized English copy.
- `js/app.js`: application state, input, navigation, preferences and scheduling.
- `css/`: existing responsive layout, reusable controls, forms and theme variables.
- `scripts/serve.mjs`: development-only static server using Node's built-ins.
- `tests/`: automated regression and Milestone 2/3 tests.

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
answerable. Uniform mode preserves this behavior; adaptive modes use evidence-based weights.

## GitHub Pages and milestone scope

All production resource URLs and imports are relative. Navigation uses fragments,
so the repository root works under **/Note_trainer/** without a build or URL rewrite.
The local server deliberately provides that project subpath for testing.

Milestones 5–6 changes are local and have not been committed, pushed or published.
PWA, backup, rhythm, chords and hardware MIDI remain deferred.

PWA installation, a manifest, service worker, and offline caching remain scheduled
for Milestone 7. Static files must currently be available when opening/reloading.

See [the product specification](docs/PRODUCT_SPEC.md) and
[implementation plan](docs/IMPLEMENTATION_PLAN.md) for the roadmap.

## Virtual piano and adaptive practice

Choose **Virtual piano** as Answer input on Home or in practice configuration.
Single notes and sequences validate the exact MIDI pitch and octave. Configure
the keyboard within C2–C6; it must contain the selected target ranges. Labels are
off by default. Keys keep their size and scroll within the keyboard; automatic
panning keeps the active target visible. Tab/Enter can activate keys. Targets
remain natural notes; black keys are available as piano responses.

Question selection offers Uniform, Adaptive, Practice Weak Notes and Practice
Mistakes. Home explains weak areas and launches a recommended configuration;
summaries also offer mistake practice. Focus modes prioritize their evidence
while retaining every eligible note. Random sequences adapt every pitch;
structured strategies adapt the starting pitch and preserve their contour.
Sequence speed is scoped separately from isolated recognition.

Learning schema 2 and existing history/settings are preserved. Piano contexts
use inputMethod piano and numeric MIDI answers, separately from letter input.
See docs/STORAGE_SCHEMA.md for the weighting formula and evidence scope.

Validation: 210 tests passed, including all 194 prior tests; syntax checks passed.
Essential Chromium checks covered wrong-octave feedback, Enter activation,
delayed piano sequences, labels, 320 px key sizes/scrolling, recommendations,
weak/mistake handoff, filtered statistics and reload persistence. No console
errors or page overflow were observed. Physical touch, Safari/Firefox, actual
background-tab transitions and browser/OS restart remain untested.
