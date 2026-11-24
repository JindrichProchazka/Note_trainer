# Learning storage and metric definitions

Milestone 3, 2026-11-24. Production code uses LocalStorage only; no backend,
network telemetry, account, dependency, or stored aggregate counters.

## Keys and versions

| Key | Schema | Contents |
| --- | --- | --- |
| `notetrainer.settings` | 1 | Existing M2 preferences and compatible unknown fields |
| `notetrainer.learning` | 2 | Learning manifest: `recordsPrefix`, `settingsKey`, `createdAt` |
| `notetrainer.session.<session-id>` | 2 | One session, independent attempts, cumulative active-time buckets |
| `notetrainer.tab` (SessionStorage) | ID | Per-tab reload identity; no learning evidence |

Preferences retain their existing key, format and validation adapter. Upgrading
from M2 requires no rewrite or reset: learning metadata references the preference
key, and a learning manifest is created on the first saved session. M2 never
stored learning history, so there is no missing pre-M3 evidence to reconstruct.

`js/data/schema.js` validates every stored record. `migrations.js` dispatches
explicitly by version. Known learning v1 manifests keep existing metadata and
gain the record prefix/version; known v1 session records retain parent session
and activity fields and enrich attempts with canonical context, octave, local
day, item index (default 0) and ordinal. These v1 learning shapes are a documented
compatibility contract, not a claim that M2 produced them. Migration is
non-mutating on read; validated upgraded records are written on their next save.
Unknown versions and malformed documents are preserved and reported.

## Session record

```json
{
  "schemaVersion": 2,
  "session": {
    "id": "unique-session-id",
    "ownerId": "unique-page-run-id",
    "tabId": "stable-tab-id",
    "config": {
      "presetId": "treble-basic",
      "clef": "treble",
      "ranges": {
        "treble": { "minMidi": 60, "maxMidi": 72 },
        "bass": { "minMidi": 43, "maxMidi": 57 }
      },
      "sessionType": "unlimited",
      "durationMs": 60000,
      "questionCount": 10,
      "naming": "czech",
      "exerciseType": "single-note",
      "inputMethod": "letter"
    },
    "status": "in-progress",
    "startedAt": "2026-11-24T11:00:00.000Z",
    "updatedAt": "2026-11-24T11:00:00.500Z",
    "finishedAt": null,
    "interruptedAt": null,
    "completionReason": null
  },
  "attempts": [{
    "id": "unique-session-id:1:answer",
    "sessionId": "unique-session-id",
    "questionId": "unique-session-id:1",
    "ordinal": 1,
    "itemIndex": 0,
    "writtenNote": "C4",
    "midi": 60,
    "octave": 4,
    "clef": "treble",
    "exerciseType": "single-note",
    "inputMethod": "letter",
    "contextId": "v1:treble:C4:single-note:letter",
    "answer": "C",
    "correct": true,
    "responseTimeMs": 500,
    "timestamp": "2026-11-24T11:00:00.500Z",
    "day": "2026-11-24"
  }],
  "activity": [{
    "day": "2026-11-24",
    "clef": "treble",
    "exerciseType": "single-note",
    "inputMethod": "letter",
    "durationMs": 500
  }]
}
```

Configuration is an immutable snapshot. Unused configuration controls retain
validated defaults. IDs and exercise/input identifiers have restricted syntax.
Validation checks note spelling against MIDI/octave/context, canonical letter
answers against correctness, timestamps/day syntax, nonnegative finite durations,
parent/context/range consistency, duplicate IDs/questions/ordinals/buckets, and
session limits. Unknown compatible fields are retained.

Context identity is `v1:<clef>:<encoded-written-note>:<exercise>:<input>`.
Canonical written notes and submitted letters use international spelling even
when H is displayed/typed. C4/C5, treble/bass, B#/C, exercise types and input
methods remain distinct. Naming convention is presentation, never identity.
Item index supports sequence positions. Unsupported future exercise/input IDs
remain isolated and cannot be repeated by the current letter-answer UI.

## Persistence and interruption

The session model synchronously notifies the data adapter after each valid
independent answer, before returning feedback to the UI. A single atomic
`setItem` writes its session evidence. Duplicate answers are blocked by the
session state; storage additionally deduplicates attempt IDs and question/item
pairs. Completion writes the same attempts, never a second result stream.

Each session has its own document, so two independent tabs do not rewrite a
shared history array or shared summary counters. Storage reads and merges the
latest document before saving. Attempts are append-only; cumulative active-time
buckets merge by maximum; terminal records cannot reopen or change. This is not
a general multi-writer transactional database. Session ownership is per run;
tabs create separate sessions.

Active evidence is checkpointed every second while visible and on answer,
advance, pause, finish and page hide. Navigation away from Practice pauses it.
Starting another session or a normal page hide interrupts unfinished practice.
On reload, unfinished records owned by the previous run of the same tab become
interrupted. Other tabs are not interrupted. A browser crash or a newly opened
tab without the prior SessionStorage identity may leave a record marked
Unfinished; evidence remains visible and it never counts as completed.
Interrupted/unfinished practice is not resumed after reload.

An abrupt process termination can lose active time since the latest checkpoint
(normally at most about one second when timers run). Every successfully saved
answer already exists independently of completion.

## Storage failures and limits

Malformed/future manifests block learning writes; malformed individual records
are retained while readable history remains available. The UI reports partial
history, conflicts, denied storage and quota errors separately. New valid evidence
is kept in memory with a persistent warning and a Retry saving action. Retry
re-reads and validates disk data; it never silently replaces unreadable history.
There is no automatic pruning, reset, backup or restore in this milestone.

LocalStorage is synchronous, browser/origin/device specific and capacity limited
(often a few megabytes; browser policy varies). Session documents are rewritten
as they grow and history is enumerated to derive statistics; very large histories
can become slow or fill capacity. There is no unlimited-history performance claim.
Pending unsaved evidence is lost when the visit closes/reloads. Existing saved
history is not deleted to make space. Clearing site data, private browsing
policies, browser eviction or device loss can remove browser-managed data.
Different localhost ports and the published origin have independent storage.

## Metric definitions and filtering

All values are derived from attempts plus activity, not persisted counters.

- Answered = independent attempts; correct/incorrect partition that count.
- Accuracy = correct / answered. Empty accuracy is unavailable (dash).
- Correct median = median of individual correct response times, including the
  middle-pair average for an even count; no correct responses means unavailable.
- Response time starts after notation readiness, uses a monotonic clock and
  excludes feedback and pauses. It is not a whole-session average.
- Active duration includes visible feedback, excludes pauses/navigation/hidden
  time and is capped at the timed limit. Fixed-count sessions stop timing on the
  final answer. Activity is attributed to the displayed clef, exercise/input
  and split across local calendar midnights.
- Correct notes/minute = correct count * 60000 / active milliseconds. It is
  unavailable without recorded active time; all-wrong timed evidence yields 0.
  Legacy session summaries retain their safe zero-rate empty-session display.
- Completed sessions = terminal completed records whose finish day is selected;
  interrupted and unfinished sessions never contribute.
- Distinct practiced contexts = unique context IDs among selected attempts.
- Recent note accuracy uses the last 10 selected attempts, or all if fewer.
- Last practice = latest selected attempt timestamp.
- Home Today uses today's evidence; recent accuracy/median uses the last seven
  local calendar days. The recently used configuration comes from the latest
  started saved session.

Today/7/30 are inclusive local calendar ranges (today plus previous 6/29 days).
Each attempt's recorded local day stays stable if the device later changes time
zone. Activity buckets record the day at capture. UTC timestamps retain event
ordering; deterministic ID/ordinal tie breakers handle equal timestamps. Device
clock/time-zone changes are not corrected by a server.

Date, clef, exercise, input and configuration filters constrain both attempts and
active-time denominators. A configuration comparison key contains active clefs,
active ranges, session type/limit, exercise and input; naming and preset aliases
do not split equivalent exercises. Combined totals are explicitly labelled and
included configurations can be inspected or individually selected.

History filters select sessions by finish/interruption/latest checkpoint day and
relevant clef/type/input/configuration. History cards and old summaries explicitly
show whole-session results, even when a date/clef filter selected the card.
Repeating creates a new ID and leaves old evidence unchanged.

Daily accuracy uses daily correct/answered counts, daily median uses individual
correct attempts, and daily rate uses daily active time. Session ratios/medians
are never averaged. Days without evidence have 0 count/duration and missing
accuracy/response/rate points, with broken chart lines. Active days without a
correct response have missing median but a real zero accuracy/rate where defined.
All-time charts paginate 30 calendar days; they do not compress away older data.
Exact daily values are available in a responsive accessible table.

## Mastery

`js/learning/mastery.js` centrally defines thresholds. Evidence is chronologically
ordered per exact recognition context; Mastered is evaluated before Familiar.

| State | Rule |
| --- | --- |
| Unseen | No independent attempts |
| Mastered | At least 20 total attempts, >=95% correct in the latest 20, and median correct response <1000 ms in that same window |
| Familiar | At least 5 total attempts, >=80% correct over latest 10 (or all available) |
| Learning | Any other practiced context |

Classification is derived again after every query and may decrease. Statistics
states and mastered counts deliberately use only the selected period/filters;
select All time for lifetime evidence. Staff groups use the selected clef and
octave; their exercise/input scope is labelled explicitly. The shared notation
engine draws up to four notes per group, and U/L/F/M markers plus textual
controls/legend avoid relying on color. This is a read-only learning overview,
not sequence practice or adaptive generation.

## Milestone 4 additive sequence extension

Learning schema remains 2; existing v1 migrations and all M3 records/IDs/settings
remain compatible and are not rewritten on read. New sequence records add
`sequenceEvidenceVersion: 1` and `sequences`: immutable definitions with id,
ordinal, clef, canonical written-note array and createdAt. Each attempt adds
`sequenceId`; existing questionId identifies that sequence and zero-based itemIndex
identifies its position. Definitions merge append-only and are validated against
attempt order, clef, spelling, selected range and shortened final length.

Exercise type `sequence` keeps mastery separate from `single-note`. Configuration
snapshots/comparison keys include length, strategy, feedback and relevant interval
variety. Completed/partial sequence counts derive from definitions and recorded
answers; unanswered notes never become wrong attempts. Filtered sequence counts
use the last answered note's recorded day, and the sequence's clef.

Sequence answering duration is the sum of individual response intervals, excluding
pauses, review and the brief unavailable render transitions. The first interval
begins after the full sequence is ready; later intervals begin after the next
active indicator is painted. Reading ahead can shorten later response times.
Sequence active session time excludes review (single-note timing is unchanged).
Fixed count measures notes; final targets may contain fewer than the chosen length.

Delayed correctness is persisted immediately but withheld in practice until review.
Home/Statistics/saved routes temporarily omit the current session while a delayed
sequence has pending answers, with an explanatory notice. Review or session end
reveals results. Reload interrupts the session and retains partial evidence.
Quarter notes indicate pitch order only; no rhythm is assessed.

## Milestones 5–6 additions

Schema remains 2. Piano uses inputMethod piano with an integer MIDI answer;
validation checks exact MIDI correctness and configured keyboard bounds.
Optional config fields keyboardMin/keyboardMax/noteLabels describe the keyboard.
Old letter records, recognition IDs, settings and v1 migrations are retained.
Comparison keys additionally identify piano hints/range and non-uniform
selectionMode; context IDs remain written pitch + clef + exercise + input.

Adaptive rules live in js/learning/adaptive.js (ADAPTIVE_RULES).
For each exact context, use the latest 20 independent answers:
w = 1 + 4*(1-accuracy) + 2*clamp(correctMedian/target-1,0,1)
    + 2*(1-min(totalAttempts/20,1)) + 2*min(daysSincePractice/14,1)
    + (Learning state ? 1 : 0).
Unseen accuracy defaults to 0.5; absent correct median contributes no speed term,
and unseen recency contributes zero. Targets are 1000 ms for isolated notes and
500 ms for sequences. Weak focus adds 8 for unseen, fewer than 5 attempts,
accuracy below 80%, slow correct median or 14-day review due. Mistake focus adds
8 when the recent window includes an error. An immediate repeat receives 8% of
its weight when alternatives exist. All weights remain positive and bounded.

History is scoped by exercise/input, sequence length/strategy/feedback/relevant
interval variety, and piano hints/range. Ranges and clefs constrain candidates;
same-context evidence from different pitch ranges remains useful. Current
answers join saved history by unique ID. Selection mode does not split learning
contexts. Structured sequences weight the start, preserving their movement
rules; random sequences weight each pitch. Mistake practice with no matching
mistakes falls back to exploration. No history is reset or pruned.

## Milestones 7–8: release, backups and atomic data changes

The Service Worker caches only application responses in scope-owned, content-
versioned caches. It never reads or writes learning storage. Failed installs
preserve the active worker; update activation requires safe votes from open tabs.

Backup format `notetrainer-backup`, schema 1, carries `exportedAt`, `appVersion`,
`learningSchemaVersion`, and `data` containing the preferences envelope, learning
manifest and all session documents. Existing validators and v1→v2 migrations run
before any mutation; unsupported formats and duplicate IDs are rejected.
Export includes pending valid in-memory evidence and preserves compatible fields.

Merge preserves device preferences and deduplicates session/attempt IDs.
Compatible unfinished checkpoints can extend evidence; conflicting terminal
records block merge with their session IDs. Replace uses imported preferences
and history after explicit confirmation. Imported unfinished sessions become
interrupted without losing answers. Stale previews fail rather than overwrite.

Until the first restore/reset, the existing logical keys remain physical keys.
Afterward, `notetrainer.data-head` identifies a generation whose keys start with
`notetrainer.generation.<id>.`; settings/learning adapters retain their logical
key interface. All replacement documents are staged and read back, then a single
atomic head write commits them. Failed staging never changes the active head.
Old tabs detect the head change and must reload; staging events are ignored.

Prior generations and legacy documents remain untouched, consuming extra quota.
Reset empties active learning data, preserves the raw preferences envelope and
does not reclaim old copies. Browser eviction can remove all generations.
A downloaded backup remains necessary. Import has a 20 MB file limit and needs
enough free quota for staging; no cloud synchronization or automatic pruning.
