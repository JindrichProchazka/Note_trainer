\# NoteTrainer – Development Instructions



\## Project purpose



NoteTrainer is a lightweight, mobile-first application designed

to improve piano sheet music reading and sight-reading skills.



The primary goal is to develop an automatic connection between

written musical notation and the corresponding piano keys.



\## Documentation



Before implementing or modifying any feature, read:



\- docs/PRODUCT\_SPEC.md

\- docs/IMPLEMENTATION\_PLAN.md



These documents define the product requirements, architecture,

learning principles and development roadmap.



\## Technical requirements



\- Use HTML, CSS and vanilla JavaScript.

\- Avoid unnecessary frameworks and dependencies.

\- Maintain compatibility with GitHub Pages.

\- Design the application as a Progressive Web App (PWA).

\- Support offline functionality.

\- Prioritize iPhone and mobile devices.

\- Support desktop and tablet layouts.

\- Store user progress locally.

\- Do not require a backend, account or subscription.

\- Use relative paths for all application resources.



\## Musical accuracy



\- Follow standard musical notation conventions.

\- Support treble and bass clefs.

\- Correctly represent octaves, ledger lines and accidentals.

\- Support both Czech and international note naming.

\- Distinguish note names from exact pitches.

\- Keep music theory logic separate from the user interface.

\- Verify notation accuracy with automated tests.



\## Learning principles



\- Prioritize active recall over passive recognition.

\- Track both accuracy and response time.

\- Adapt exercises to individual weaknesses.

\- Introduce new concepts progressively.

\- Encourage direct recognition instead of counting staff lines.

\- Progress from individual notes to sequences, intervals,

&#x20; chords, rhythm and real-time sight-reading.



\## User experience



\- Keep the interface minimal and distraction-free.

\- Support light and dark themes.

\- Provide immediate and understandable feedback.

\- Minimize the number of interactions required to start practice.

\- Avoid unnecessary animations and gamification.

\- Support touch, mouse and keyboard input.

\- Keep interface text centralized for future localization.



\## Data management



\- Preserve existing user progress when updating the application.

\- Use versioned data structures and stable note identifiers.

\- Track learning progress separately for each pitch and clef.

\- Support future data export and import.

\- Never delete user data without explicit confirmation.



\## Code quality



\- Keep code modular and maintainable.

\- Separate presentation, exercise generation, music theory,

&#x20; learning logic and persistent storage.

\- Avoid duplicated logic.

\- Test critical functionality.

\- Do not introduce unrelated features.

\- Do not add dependencies without a clear justification.



\## Development workflow



\- Follow the implementation roadmap.

\- Implement features incrementally.

\- Keep the application functional after each milestone.

\- Update documentation when requirements or architecture change.

\- Report completed features, test results and known limitations.

\- Do not claim that untested functionality works.

\- Do not commit or push changes without explicit permission.



\## Future extensions



The architecture should allow future support for:



\- MIDI input from a physical digital piano.

\- Real-time sight-reading exercises.

\- Rhythm recognition.

\- Intervals and chords.

\- Adaptive learning algorithms.

\- Detailed learning statistics.



Do not implement future extensions before they are authorized

by the implementation plan.

