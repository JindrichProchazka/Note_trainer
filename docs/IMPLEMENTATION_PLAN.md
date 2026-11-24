\# NoteTrainer – Implementation Plan



\## 1. Technology stack



\- HTML5

\- CSS3

\- Vanilla JavaScript (ES modules)

\- SVG musical notation

\- LocalStorage

\- Web App Manifest

\- Service Worker

\- GitHub Pages

\- Node.js built-in test runner for development tests



No backend is required.



No production build process should be necessary.



Avoid external dependencies unless they provide a

clear technical advantage.



All production assets must be available offline.



\## 2. Proposed project structure



Note\_trainer/

&#x20; AGENTS.md

&#x20; README.md

&#x20; LICENSE

&#x20; index.html

&#x20; manifest.json

&#x20; sw.js

&#x20; package.json



&#x20; docs/

&#x20;   PRODUCT\_SPEC.md

&#x20;   IMPLEMENTATION\_PLAN.md



&#x20; assets/

&#x20;   icons/



&#x20; css/

&#x20;   style.css

&#x20;   components.css

&#x20;   themes.css



&#x20; js/

&#x20;   app.js

&#x20;   config.js



&#x20;   music/

&#x20;     notes.js

&#x20;     clefs.js

&#x20;     notation.js

&#x20;     intervals.js



&#x20;   exercises/

&#x20;     generator.js

&#x20;     single-note.js

&#x20;     sequence.js

&#x20;     piano.js



&#x20;   learning/

&#x20;     mastery.js

&#x20;     adaptive.js

&#x20;     statistics.js



&#x20;   data/

&#x20;     storage.js

&#x20;     migrations.js



&#x20;   ui/

&#x20;     navigation.js

&#x20;     home.js

&#x20;     practice.js

&#x20;     statistics.js

&#x20;     settings.js

&#x20;     piano-keyboard.js



&#x20; tests/

&#x20;   notes.test.js

&#x20;   notation.test.js

&#x20;   generator.test.js

&#x20;   mastery.test.js

&#x20;   storage.test.js



This structure is a proposed architecture.

Files should be introduced when needed.



Do not create unused placeholder modules.



\## 3. Architectural principles



Separate the application into independent layers:



1\. Music theory and notation.

2\. Exercise generation.

3\. Session management.

4\. Learning and mastery.

5\. Persistent storage.

6\. User interface.



Music theory and learning logic must not depend

on the DOM.



The user interface must not independently calculate

musical pitches or mastery scores.



Use reusable components and pure functions wherever

practical.



Maintain a single source of truth for application state.



\## 4. Musical data model



Use MIDI note numbers for sounding pitches.



Represent written notes separately from their MIDI value.



Example:



{

&#x20; midi: 60,

&#x20; letter: "C",

&#x20; accidental: 0,

&#x20; octave: 4

}



Accidental values:



\- -1: flat

\-  0: natural

\-  1: sharp



Use international notation internally.



Convert note names to Czech/German notation

only in the presentation layer.



Middle C is C4, MIDI 60.



MIDI conversion:



midi = 12 \* (octave + 1)

&#x20;      + pitchClass

&#x20;      + accidental



Natural pitch classes:



C = 0

D = 2

E = 4

F = 5

G = 7

A = 9

B = 11



\## 5. Musical notation engine



Render musical notation using SVG.



The renderer must support:



\- Five staff lines.

\- Treble clef.

\- Bass clef.

\- Noteheads.

\- Stems.

\- Ledger lines.

\- Multiple consecutive notes.

\- Responsive sizing.



Use diatonic staff positions rather than MIDI distance

to calculate vertical note positions.



Accidentals change sounding pitch but do not change

the vertical staff position of the written note.



Treble clef reference:



Bottom line: E4

Top line: F5



Bass clef reference:



Bottom line: G2

Top line: A3



Middle C must appear on the correct ledger line

in both clefs.



Clef symbols must render consistently across devices.

Do not rely on unsupported system music glyphs.



Use locally bundled, appropriately licensed SVG paths

or musical fonts when necessary.



Test all supported staff positions and ledger lines.



\## 6. Exercise generation



Generate exercises procedurally.



Do not maintain a manually authored question bank

for basic note recognition.



The generator shall accept:



\- Clef configuration.

\- Minimum pitch.

\- Maximum pitch.

\- Allowed accidentals.

\- Exercise type.

\- Sequence length.

\- Selection strategy.

\- Input method.



Validate all configurations before starting a session.



Every generated question must have a valid answer.



Avoid excessive repetition while allowing

occasional repeated notes.



Support deterministic random generation in tests.



\## 7. Session management



A practice session shall contain:



\- Unique session identifier.

\- Exercise configuration.

\- Start timestamp.

\- Session type.

\- Current question.

\- Submitted answers.

\- Active practice duration.

\- Session status.



Session types:



\- Unlimited.

\- Timed.

\- Fixed question count.



Use a monotonic clock for measuring response times.



Start timing when the question is displayed

and ready for interaction.



Exclude feedback delays from individual response times.



Pause or invalidate timing when the application

is not visible.



Prevent duplicate answer submissions.



Persist completed attempts during practice,

not only when the session ends.



For sequence exercises, measure each answer separately.

Track sequence performance independently from

single-note recognition.



\## 8. Learning evidence



Store independent recognition attempts.



Example attempt:



{

&#x20; id: "unique-attempt-id",

&#x20; sessionId: "session-id",

&#x20; questionId: "question-id",

&#x20; midi: 60,

&#x20; writtenNote: "C4",

&#x20; clef: "treble",

&#x20; exerciseType: "single-note",

&#x20; inputMethod: "letter",

&#x20; correct: true,

&#x20; responseTimeMs: 850,

&#x20; timestamp: "ISO-8601 timestamp"

}



Corrected retries must not be counted as

independent mastery evidence.



Keep recognition contexts separate.



A note identified in the treble clef must not

automatically be considered mastered in the bass clef.



Likewise, letter recognition and exact piano-key

recognition must be tracked separately.



\## 9. Mastery calculation



Implement four mastery states:



\- Unseen

\- Learning

\- Familiar

\- Mastered



Initial rules:



Unseen:

\- No recorded independent attempts.



Learning:

\- Does not satisfy Familiar criteria.



Familiar:

\- At least 5 independent attempts.

\- At least 80% accuracy over the latest

&#x20; 10 attempts or all available attempts.



Mastered:

\- At least 20 independent attempts.

\- At least 95% accuracy over the latest 20 attempts.

\- Median correct response time below 1000 ms

&#x20; within the same evaluation window.



Evaluate Mastered before Familiar.



Mastery thresholds must be centrally configurable.



Mastery must be derived from recorded evidence,

not permanently awarded.



Do not classify unusually fast repeated submissions

as valid independent learning evidence.



\## 10. Adaptive selection



Implement weighted random selection.



Increase selection weight for notes with:



\- Low recent accuracy.

\- Slow correct response times.

\- Few recorded attempts.

\- Long time since last practice.



Every eligible note must retain a non-zero

probability of selection.



Prevent the algorithm from repeatedly presenting

only a small group of difficult notes.



Introduce adaptive selection after uniform

random generation is fully tested.



Keep selection logic independent from the UI.



Document the final weighting formula.



\## 11. Persistent storage



Use versioned LocalStorage data.



Use a dedicated application storage namespace.



Example structure:



{

&#x20; schemaVersion: 1,

&#x20; settings: {},

&#x20; attempts: \[],

&#x20; sessions: \[]

}



Derived statistics should be calculated from

recorded learning evidence.



Requirements:



\- Validate loaded data.

\- Handle missing or invalid data safely.

\- Support schema migrations.

\- Preserve existing progress across updates.

\- Handle storage capacity errors.

\- Never silently overwrite unreadable data.

\- Never automatically reset user progress.



Do not send learning data to external services.



Introduce a more suitable storage technology

if LocalStorage becomes a measurable limitation.



\## 12. User interface architecture



Use a responsive single-page application.



Main navigation:



\- Home

\- Practice

\- Statistics

\- Settings



Requirements:



\- Mobile-first layout.

\- Light and dark themes.

\- System theme support.

\- Touch-friendly controls.

\- Keyboard accessibility.

\- Visible focus indicators.

\- Clear feedback.

\- Responsive musical staff.

\- No unnecessary horizontal scrolling.

\- No unnecessary animations.



Practice screens should prioritize the musical

notation and answer controls.



Keep all user-facing text centralized.



The initial interface language shall be English.



Allow future Czech localization without

rewriting application logic.



\## 13. Piano keyboard



Generate an interactive piano keyboard

from a configurable MIDI range.



Requirements:



\- Correct arrangement of white and black keys.

\- Correct pitch and octave mapping.

\- Touch and mouse input.

\- Optional note labels.

\- Accessible key names.

\- Target pitch always visible.

\- Responsive layout.



Exact MIDI pitch must be validated when

answering using the piano keyboard.



Audio playback is optional and must not be

required for normal practice.



\## 14. PWA and GitHub Pages



The application shall be deployable directly

from the repository root.



Use relative resource URLs.



Do not assume deployment at the domain root.



The expected deployment path is:



/Note\_trainer/



Provide:



\- Web App Manifest.

\- Application icons.

\- Service Worker.

\- Offline application shell.

\- Versioned application cache.

\- Safe cache update strategy.



Do not cache or overwrite user progress

through the Service Worker.



Remove obsolete application caches only.



Verify installation and offline behavior

on supported mobile and desktop browsers.



\## 15. Development milestones



\### Milestone 1 — Functional foundation



Implement:



\- Basic application structure.

\- Responsive application shell.

\- Home and Practice screens.

\- Musical note data model.

\- SVG treble clef notation.

\- Natural notes from C4 to C5.

\- Single-note recognition.

\- Letter answer buttons.

\- Physical keyboard input.

\- Immediate answer feedback.

\- Unlimited practice.

\- Basic session counters.

\- Basic automated tests.



Acceptance criteria:



\- Application runs without a backend.

\- Notes are positioned correctly.

\- Answers are validated correctly.

\- Every question is answerable.

\- No duplicate answer submissions.

\- Works on mobile and desktop.

\- No critical console errors.



\### Milestone 2 — Extended note recognition



Implement:



\- Bass clef.

\- Extended note ranges.

\- Ledger lines.

\- Mixed clef exercises.

\- Difficulty presets.

\- Custom pitch range.

\- Czech and international note naming.

\- Timed sessions.

\- Fixed question count sessions.

\- Session summaries.



\### Milestone 3 — Persistence and statistics



Implement:



\- Local progress storage.

\- Versioned data schema.

\- Individual note statistics.

\- Response time measurement.

\- Practice history.

\- Accuracy calculations.

\- Statistics overview.

\- Note mastery visualization.



\### Milestone 4 — Note sequences



Implement:



\- Multiple notes on one staff.

\- Configurable sequence lengths.

\- Random and melodic sequences.

\- Sequential answer validation.

\- Immediate and delayed feedback.

\- Sequence-specific statistics.



\### Milestone 5 — Piano keyboard



Implement:



\- Interactive virtual piano.

\- Exact pitch validation.

\- Configurable keyboard range.

\- Optional note labels.

\- Piano-specific learning statistics.



\### Milestone 6 — Adaptive learning



Implement:



\- Mastery calculations.

\- Weighted question selection.

\- Weak area detection.

\- Recommended practice sessions.

\- Practice mistakes mode.

\- Long-term progress charts.



\### Milestone 7 — PWA and first release



Implement:



\- Application manifest.

\- Service Worker.

\- Offline caching.

\- Application icons.

\- Installable mobile application.

\- Light and dark theme refinement.

\- GitHub Pages deployment.

\- Cross-device testing.

\- README documentation.



Release version: v1.0.0



\### Milestone 8 — Backup and restore



Implement:



\- JSON progress export.

\- Validated progress import.

\- Backup schema versioning.

\- Explicit reset confirmation.



\### Future milestones



Not authorized for initial implementation:



\- Advanced accidentals.

\- Key signatures.

\- Interval recognition.

\- Chord recognition.

\- Rhythm exercises.

\- Grand staff.

\- MIDI hardware integration.

\- Real-time sight-reading.

\- MusicXML import.



\## 16. Testing requirements



Use automated tests for:



\- MIDI pitch conversion.

\- Note spelling.

\- Treble clef positioning.

\- Bass clef positioning.

\- Ledger line calculation.

\- Note range filtering.

\- Exercise generation.

\- Answer validation.

\- Session calculations.

\- Mastery classification.

\- Adaptive selection.

\- Storage validation.

\- Data migrations.



Introduce tests alongside the relevant milestone.



Perform manual browser testing for:



\- Touch controls.

\- Keyboard controls.

\- Responsive layouts.

\- Musical notation rendering.

\- Theme switching.

\- Offline operation.

\- PWA installation.

\- Application updates.



Do not report unexecuted tests as passed.



\## 17. Development workflow



For each milestone:



1\. Read project documentation.

2\. Inspect the existing implementation.

3\. Implement the authorized milestone.

4\. Write or update automated tests.

5\. Execute available tests.

6\. Perform available manual validation.

7\. Update documentation.

8\. Report completed changes.

9\. Report known limitations.

10\. Stop before the next milestone.



Do not implement unrelated future features.



Do not commit or push without explicit permission.



\## 18. Definition of done



A milestone is complete when:



\- All required features are implemented.

\- Acceptance criteria are satisfied.

\- Available tests pass.

\- Musical notation is correct.

\- Existing functionality remains operational.

\- Existing learning data is preserved.

\- Documentation matches implementation.

\- Known limitations are documented.



\## 19. Current development status



Milestone 1: Complete (2026-11-24)

Milestone 2: Not started

Milestone 3: Not started

Milestone 4: Not started

Milestone 5: Not started

Milestone 6: Not started

Milestone 7: Not started

Milestone 8: Not started



Currently authorized milestone: Milestone 1 only.



### Milestone 1 implementation notes — 2026-11-24

Milestone 1 is complete.

- Implemented the responsive Home and Practice screens using HTML, CSS and vanilla
  JavaScript ES modules, with no production dependencies or build step.
- Implemented the written-note/MIDI data model, original vector treble clef,
  diatonic staff positions, appropriate stem directions and the C4 ledger line.
- Implemented uniformly generated natural notes C4–C5, letter buttons,
  physical A–G keyboard input, unlimited practice, immediate feedback,
  automatic progression and duplicate-answer protection.
- Implemented basic session counters, pause/resume and hidden-page pause handling.
  Session-only response measurements and light/dark/system themes were included
  because they were explicitly requested for this implementation.
- Session attempts and themes remain in memory. Milestone 3 persistence,
  learning history and detailed statistics have not been started.
- Added a dependency-free local static server and relative application URLs,
  validated under the expected /Note_trainer/ project path.
- Updated README.md with exact launch/test commands, architecture, validation,
  deployment compatibility and known limitations.

Validation: 40 automated tests passed on Node.js 24.20.0. Embedded Chromium browser
checks covered all eight notes, correct/incorrect feedback, keyboard and mouse
input, double-click protection, automatic/manual progression, pause/resume,
confirmed reset, keyboard skip navigation, themes, and responsive layouts at
320, 375, 390, 768 and 1280 CSS-pixel widths. No horizontal overflow or console
errors/warnings were observed. The smallest measured answer target was about
56 × 54 CSS pixels.

Physical mobile devices and Safari/Firefox are untested. Actual hidden-tab
visibility transitions could not be validated in the focused embedded browser;
pause timing is covered by automated session tests and manual pause/resume.
GitHub Pages compatibility was checked locally, not through a published site.

The additional ledger-line ranges, bass clef, naming options and session modes
remain in Milestone 2. PWA installation and offline caching remain in Milestone 7.
Milestones 2–8 remain not started. No commits or pushes were made.
