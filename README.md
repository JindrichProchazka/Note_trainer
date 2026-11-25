# NoteTrainer

A lightweight piano note-reading trainer built with HTML, CSS and vanilla JavaScript.
**Milestones 1–8 are implemented; application version v1.1.0.** No production build, backend, account,
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
## Grand Staff (v1.1)

Choose **Grand Staff** or a Grand Staff preset. One natural note appears on each
aligned staff with a connecting brace. Answer either hand first using its row.
For a physical keyboard, **↑** selects treble/right hand, **↓** selects bass/left
hand; then use the usual letter keys. Each row locks after one answer.

Immediate feedback reveals each answer; delayed feedback stays neutral until both
answers. Choose **Next pair** after review. Timed/free/count sessions, custom
independent ranges, adaptive/weak/mistake practice and history are supported.
Count limits mean **pairs**; Statistics counts **individual answered notes**.
A partial/interrupted pair keeps its answer; an unanswered note is never an error.

Both response clocks begin when the pair becomes ready and exclude pauses.
The second answer includes time spent on the first staff. Compare Grand Staff
with equivalent feedback/configurations, separately from isolated notes/sequences.
Pair review pauses practice. Shared active time is split equally between clefs,
never doubled. Mastery uses separate Grand Staff contexts and a 2000 ms target.
Grand Staff currently supports **paired notes with letter input**; piano input,
Grand Staff sequences, chords and rhythm are intentionally unavailable.

## Practice

**Quick start** uses the selected preset and your saved default session type and
note naming. A default timed session lasts 60 seconds; a default count session
contains 10 questions. **Customize practice** opens the full configuration.
The Practice navigation link resumes an existing session or opens configuration.

All exercises contain natural notes only:

| Preset | Treble range | Bass range |
| --- | --- | --- |
| Treble – Basic | C4–F5 | — |
| Treble – Extended | A3–C6 | — |
| Treble – Random | C2–C6 | — |
| Bass – Basic | — | G2–C4 |
| Bass – Extended | — | C2–E4 |
| Bass – Random | — | C2–C6 |
| Mixed Clefs | C4–F5 | G2–C4 |
| Grand Staff – Basic | C4–F5 | G2–C4 |
| Grand Staff – Extended | A3–C6 | C2–E4 |
| Custom | Select C2–C6 | Select C2–C6 |

Basic covers common positions. Extended gives notes outside Basic sixfold weight,
and other notes outside the staff threefold weight. Adaptive weights multiply
these factors. Structured sequences emphasize their starting pitch; random
sequences emphasize each note. Random presets uniformly use the full supported
range, bypass adaptive weighting and use random sequence generation.
Old Beginner/Staff preferences map to Basic; historical configurations stay exact.

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
Defaults apply to new sessions; themes change immediately. Preferences retain schema 1
and the logical key `notetrainer.settings`, including compatible unknown fields.

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

Grand Staff uses a separate 2000 ms mastery response target.
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

Settings includes backup, restore and confirmed statistics reset; there is no cloud sync.
See [the schema, migration and complete metric definitions](docs/STORAGE_SCHEMA.md).

## Automated tests and validation

```powershell
cd C:\Users\jindr\Documents\Note_trainer\Note_trainer
npm.cmd test
```

**253 tests pass**, including all 235 prior tests (preset expectations updated for v1.1). New tests cover complete offline
asset caching/version integrity, deployment scope, failed installation, update
approval, backup validation/migration, duplicate/conflict handling, atomic import
failures, concurrent-change guards and preference-preserving reset.

v1.1 Chromium validation on 2026-11-25 used isolated port 5177. Requested
320×568, 390×844, 430×932, 844×390 and 932×430 viewports kept both Grand Staff
answer rows and piano notation/keys visible without scrolling. Checked bass-first
and keyboard answers, delayed partial-pair reload/statistics, pair review,
stable keyboard/rotation, explicit octave pages, a 16-note paged piano sequence
and PWA update activation. No console errors/warnings were observed.
Physical iPhone touch/notches/standalone behavior still needs device verification.

Earlier embedded Chromium checks on 2026-11-24 used isolated port 5175:
server-stopped offline startup, adaptive piano sequence practice, saved results
after reload, offline export, actual exported-file preview and duplicate merge;
multi-tab update deferral/activation preserved evidence. Reset cancellation and
failed file reads preserved data. The 390 px Data Management view had no horizontal
overflow; the final browser check reported no console errors.
Malformed/future backups, replace/reset commits and quota failures were verified
automatically. The embedded browser could reimport its downloaded backup but
could not read separately created invalid-file fixtures.

Physical iPhone/Android installation, Safari/Firefox, OS restart and published
GitHub Pages remain manual checks. Earlier validation is recorded in
[Milestone 3](docs/validation/MILESTONE_3.md) and
[Milestone 4](docs/validation/MILESTONE_4.md).

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

v1.1 changes are local; nothing has been committed, pushed, tagged or
published. Rhythm, intervals, chords and hardware MIDI remain deferred.

See [the product specification](docs/PRODUCT_SPEC.md) and
[implementation plan](docs/IMPLEMENTATION_PLAN.md) for the roadmap.

## Virtual piano and adaptive practice

Choose **Virtual piano** as Answer input on Home or in practice configuration.
Single notes and sequences validate exact MIDI pitch and octave. The default
keyboard covers the chosen targets; custom bounds remain available within C2–C6.
Labels and octave/middle-C reference markers are optional and off by default.

Basic ranges fit portrait screens without horizontal scrolling (white keys are
at least 24 CSS px; about 27 px at 320 px). Wider configured ranges use labelled
octave pages or fit more keys in landscape. Pages never follow/reveal the target;
use the arrow buttons deliberately. Rotation preserves the question, attempts,
timer and selected octave where paging is needed.

Piano/Grand Staff practice uses a compact Home/Pause/Finish toolbar and safe-area
padding. Landscape keeps notation, feedback, progress and keyboard together.
Long piano sequences use readable staff pages with manual review navigation.

Question selection offers Uniform, Adaptive, Practice Weak Notes and Practice
Mistakes. Home explains weak areas and launches a recommended configuration;
summaries also offer mistake practice. Focus modes prioritize their evidence
while retaining every eligible note. Random sequences adapt every pitch;
structured strategies adapt the starting pitch and preserve their contour.
Sequence speed is scoped separately from isolated recognition.

Learning schema 2 and existing history/settings are preserved. Piano contexts
use inputMethod piano and numeric MIDI answers, separately from letter input.
See docs/STORAGE_SCHEMA.md for the weighting formula and evidence scope.

## Install, offline use and updates

Open the HTTPS deployment online and wait for **Available offline on this device**.
All production resources are local and cached, including every existing practice
mode and Statistics. Open the installed app online once as well.

- **iPhone:** in Safari, Share → Add to Home Screen → enable **Open as Web App**
  if offered → Add. See [Apple's instructions](https://support.apple.com/guide/iphone/iphea86e5236/ios).
- **Android:** in Chrome, menu → Install and create shortcut (or Add to home screen) → Install.
- **Desktop:** in Chrome/Edge, use the address-bar install icon or browser app
  installation menu. See [Chrome's instructions](https://support.google.com/chrome/answer/9658361).

Updates download in the background. **Update now** activates a ready version only
when every open trainer tab has finished practice and saved pending evidence.
Settings → **Check for updates** checks manually. Failed downloads keep the
previous application usable; cache cleanup never touches learning storage.

After changing production HTML/JS/CSS/icons/manifest/worker, run:

```powershell
npm.cmd run prepare:offline
npm.cmd test
```

Commit the generated `sw-assets.js` together with the changed application files
when publishing manually. This refreshes the content-derived cache version and
complete asset list; the test suite detects stale output. No bundler is required.
GitHub Pages must serve the repository root over HTTPS, including `sw.js`,
`sw-assets.js`, manifest and assets, under the same deployment directory.

## Backup, restore and reset

Settings → **Data Management** exports all validated saved evidence, pending
in-memory answers and preferences to a dated JSON file. Keep periodic copies
outside browser storage and transfer the file manually between devices.

Choose a backup to validate and preview it before confirmation. **Merge** keeps
current preferences, adds compatible evidence and deduplicates IDs. Conflicting
records are identified and block merge. **Replace** explicitly uses the backup's
history and preferences. Both require a separate acknowledgement and confirmation.
Imported unfinished sessions become interrupted; answers remain recorded.

**Reset learning statistics** also requires acknowledgement and confirmation; it
keeps preferences. Canceling, invalid input, changed previews and failed staging
leave the active data unchanged. Other open tabs must reload after a data change.
Learning schema 1 migrations are supported; future unsupported formats are rejected.

Backups are limited to 20 MB. Imports need free LocalStorage capacity to stage a
complete copy. Previous generations are retained for safe failure recovery and
consume space; reset clears active statistics but does not reclaim those copies.
Browser-local storage and offline caches can still be cleared or evicted; neither
installation nor a retained generation replaces a downloaded backup.

Manual iPhone verification after deployment: launch from Home Screen online,
wait for offline readiness, enable airplane mode, close/reopen, complete a short
practice and reopen Statistics. Verify saved answers, export to Files, preview the
same file, and merge without increasing counts. Reconnect, finish all trainer
sessions and check update activation on a later application build. Browser and
Home Screen storage may differ; transfer progress with a backup when necessary.
