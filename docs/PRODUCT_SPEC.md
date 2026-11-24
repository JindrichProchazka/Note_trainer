\# NoteTrainer – Product Specification



\## 1. Product vision



NoteTrainer is a personal learning application focused on

developing fluent piano sheet music reading skills.



The ultimate goal is to read musical notation and play the

corresponding notes on a piano without consciously translating

each note into its letter name.



The application should support short daily practice sessions

as well as longer structured learning sessions.



\## 2. Product principles



\- Free and open-source.

\- Mobile-first.

\- Offline-first.

\- No advertisements.

\- No mandatory registration.

\- No subscriptions.

\- Minimal and functional interface.

\- Unlimited procedurally generated exercises.

\- Learning efficiency over gamification.



\## 3. Target platforms



\- iPhone

\- iPad

\- Android

\- Windows

\- Desktop web browsers



The application shall be available as an installable PWA

hosted on GitHub Pages.



\## 4. Learning objectives



The application shall progressively develop:



1\. Recognition of individual notes.

2\. Automatic recognition of note positions.

3\. Recognition of different octaves.

4\. Fluent reading of note sequences.

5\. Direct mapping between notation and piano keys.

6\. Recognition of musical intervals.

7\. Recognition of chords.

8\. Understanding of rhythm and note duration.

9\. Reading both staves simultaneously.

10\. Real-time piano sight-reading.



\## 5. Main navigation



The application shall contain four main sections:



\- Home

\- Practice

\- Statistics

\- Settings



\## 6. Home screen



The home screen shall display:



\- Quick start practice button.

\- Recommended practice session.

\- Recently used exercise.

\- Today's practice duration.

\- Today's answered notes.

\- Recent accuracy.

\- Average response time.

\- Areas requiring additional practice.



The user should be able to start practicing with minimal

interaction.



\## 7. Practice modes



\### 7.1 Single Note Recognition



Display one randomly selected note on a musical staff.



The user identifies the note using:



\- Letter buttons.

\- Physical computer keyboard.

\- Optional virtual piano keyboard.



Features:



\- Immediate feedback.

\- Automatic progression to the next question.

\- Configurable clef.

\- Configurable pitch range.

\- Optional accidentals.

\- Response time measurement.

\- Accuracy tracking.

\- Adaptive question generation.



Letter-based answers identify the note name.

Piano-based answers identify the exact pitch and octave.



\### 7.2 Note Sequences



Display multiple notes on a single musical staff.



The user identifies all notes in the correct order.



Configurable sequence lengths:



\- 3 notes

\- 5 notes

\- 8 notes

\- 12 notes

\- 16 notes



Exercise options:



\- Immediate feedback for each note.

\- Feedback after completing the entire sequence.

\- Random note sequences.

\- Stepwise melodic sequences.

\- Sequences containing intervals and repeated notes.



Record accuracy and response time for each individual note.



Encourage reading ahead rather than focusing exclusively

on the currently active note.



\### 7.3 Piano Keyboard Practice



Display musical notation and an interactive piano keyboard.



The user selects the corresponding piano key.



Features:



\- Correct black and white key arrangement.

\- Configurable keyboard range.

\- Exact pitch and octave validation.

\- Optional note labels.

\- Optional synthesized piano-like sound.

\- Immediate visual feedback.



The displayed keyboard must always contain the target pitch.



This mode should develop direct association between musical

notation and physical piano keys.



\### 7.4 Interval Recognition



Display two consecutive or simultaneous notes.



The user identifies the musical interval or selects

the corresponding second note.



Planned for a later development milestone.



\### 7.5 Chord Recognition



Display multiple simultaneous notes.



The user identifies individual notes or the entire chord.



Planned for a later development milestone.



\### 7.6 Rhythm Practice



Practice musical durations and rhythmic patterns.



Future functionality:



\- Whole notes.

\- Half notes.

\- Quarter notes.

\- Eighth notes.

\- Sixteenth notes.

\- Dotted notes.

\- Rests.

\- Metronome.

\- Time signatures.



Planned for a later development milestone.



\### 7.7 Sight-Reading



Display continuous musical notation that must be read

and performed in real time.



Future functionality:



\- Adjustable tempo.

\- Treble and bass staves.

\- Moving playback cursor.

\- Rhythmic accuracy.

\- Pitch accuracy.

\- Chords.

\- MIDI input.



Planned for a later development milestone.



\## 8. Musical notation



Support the following clef configurations:



\- Treble clef.

\- Bass clef.

\- Randomly alternating clefs.

\- Grand staff in future exercises.



Use standard musical notation conventions.



Correctly render:



\- Staff lines.

\- Noteheads.

\- Stems.

\- Clefs.

\- Ledger lines.

\- Accidentals.

\- Octaves.



The same pitch displayed in different clefs must be

tracked as a different recognition context.



Use MIDI note numbers as internal pitch identifiers.



Preserve written note spelling separately from MIDI pitch,

because enharmonic notes can share the same sounding pitch.



Middle C is C4, MIDI note 60.



\## 9. Difficulty and configuration



Difficulty must be configurable rather than permanently

restricted to predefined levels.



\### Suggested presets



Level 1:

\- Treble clef.

\- C4 to G4.

\- Natural notes only.



Level 2:

\- Treble clef.

\- C4 to C5.

\- Natural notes only.



Level 3:

\- Extended treble clef.

\- Ledger lines.



Level 4:

\- Bass clef.

\- Basic note range.



Level 5:

\- Extended bass clef.

\- Ledger lines.



Level 6:

\- Randomly alternating treble and bass clefs.



Level 7:

\- Sharps and flats.



Level 8:

\- Extended range and advanced notation.



\### Custom difficulty



Allow the user to configure:



\- Clef.

\- Lowest pitch.

\- Highest pitch.

\- Accidentals.

\- Sequence length.

\- Exercise duration.

\- Feedback behavior.

\- Question selection strategy.

\- Input method.



\## 10. Session types



\### Free Practice



Unlimited practice without a time limit.



\### Timed Practice



Available durations:



\- 30 seconds.

\- 60 seconds.

\- 2 minutes.

\- 5 minutes.

\- Custom duration.



\### Fixed Question Count



Available session sizes:



\- 10 notes.

\- 25 notes.

\- 50 notes.

\- 100 notes.



\### Weak Areas



Practice notes with:



\- Low accuracy.

\- High response time.

\- Insufficient practice history.

\- Long time since last review.



\### Adaptive Practice



Automatically combine mastered, weak and less familiar notes.



\## 11. Learning and adaptation



Track each note recognition context independently.



A recognition context includes:



\- Written pitch.

\- Octave.

\- Clef.

\- Accidental spelling.

\- Exercise type.

\- Input method.



Collect:



\- Total attempts.

\- Correct attempts.

\- Incorrect attempts.

\- Response times.

\- Recent accuracy.

\- Last practice date.

\- Recent mistakes.



Adaptive selection should prioritize:



1\. Frequently incorrect notes.

2\. Slowly recognized notes.

3\. Previously unseen notes.

4\. Notes requiring review.



Mastered notes must still appear periodically.



Avoid excessive immediate repetition of the same note.



A repeated answer to the same question must not generate

additional independent mastery evidence.



Do not treat guessing or rapid repeated clicking as mastery.



Keep the adaptive algorithm explainable and maintainable.



\## 12. Mastery system



Use the following learning states:



\- Unseen.

\- Learning.

\- Familiar.

\- Mastered.



Mastery shall depend on both accuracy and response time.



Initial suggested mastery criteria:



\- At least 20 independent attempts.

\- At least 95% accuracy over the last 20 attempts.

\- Median correct response time below 1 second.



These are configurable learning targets, not universal

musical proficiency standards.



Previously mastered notes may return to a lower learning

state when performance consistently deteriorates.



\## 13. Feedback



Correct answer:



\- Clear positive visual feedback.

\- Optional sound.

\- Automatic progression.



Incorrect answer:



\- Display the correct answer.

\- Highlight the corresponding note or piano key.

\- Allow sufficient time to understand the mistake.

\- Do not count the corrected retry as a new independent

&#x20; successful attempt.



Avoid unnecessary interruptions during timed practice.



In sequence exercises, allow feedback after each answer

or after completing the entire sequence.



\## 14. Statistics



\### Overview



Display:



\- Total practice time.

\- Total answered notes.

\- Overall accuracy.

\- Median response time.

\- Correct notes per minute.

\- Practice history.

\- Number of mastered notes.



\### Individual note statistics



For each recognition context display:



\- Note name.

\- Octave.

\- Clef.

\- Number of attempts.

\- Accuracy.

\- Median response time.

\- Mastery state.

\- Last practice date.



\### Progress charts



Display historical development of:



\- Accuracy.

\- Response time.

\- Correct notes per minute.

\- Practice duration.

\- Mastered notes.



Available time ranges:



\- Last 7 days.

\- Last 30 days.

\- All time.



\### Weak area analysis



Identify notes that are:



\- Frequently answered incorrectly.

\- Recognized slowly.

\- Rarely practiced.



Allow starting a practice session directly from a weak area.



Compare performance within equivalent exercise configurations

to avoid misleading progress measurements.



\## 15. Session summary



After completing a session, display:



\- Session duration.

\- Number of questions.

\- Correct answers.

\- Incorrect answers.

\- Accuracy.

\- Median response time.

\- Correct notes per minute.

\- Most problematic notes.



Available actions:



\- Repeat session.

\- Practice mistakes.

\- Return home.



\## 16. Settings



\### Appearance



\- Light theme.

\- Dark theme.

\- System theme.



\### Note naming



Czech/German notation:



C D E F G A H



International notation:



C D E F G A B



Correctly distinguish international B-flat from

Czech/German B.



\### Practice settings



\- Default clef.

\- Default pitch range.

\- Default session duration.

\- Default input method.

\- Feedback duration.

\- Sound enabled or disabled.

\- Automatic progression.

\- Adaptive practice enabled or disabled.



\### Data management



\- Export progress.

\- Import progress.

\- Reset statistics with explicit confirmation.



Backup and restore may be implemented in a later milestone.



\## 17. User interface requirements



\- Clean, minimalist visual design.

\- Large readable musical notation.

\- Responsive layout.

\- Large touch targets.

\- Accessible contrast.

\- No horizontal overflow on standard mobile screens.

\- Consistent navigation.

\- Clear typography.

\- Minimal animations.

\- No unnecessary decorative elements.



Prioritize the musical staff and answer controls

during practice sessions.



\## 18. Data persistence



All user settings and learning progress shall be stored

locally on the device.



No personal data shall be transmitted to a server.



Data must survive:



\- Page reload.

\- Application restart.

\- Browser restart.

\- Compatible application updates.



Use versioned data structures.



Do not assume browser storage is permanent.

Provide backup and restore functionality in a future milestone.



\## 19. Minimum viable product



The first usable release shall include:



\- Single note recognition.

\- Note sequence recognition.

\- Virtual piano keyboard practice.

\- Treble and bass clefs.

\- Configurable natural note ranges.

\- Correct octave and ledger line rendering.

\- Free and timed practice.

\- Fixed question count sessions.

\- Immediate feedback.

\- Session summaries.

\- Basic learning statistics.

\- Adaptive question selection.

\- Local progress persistence.

\- Responsive light and dark themes.

\- Offline PWA functionality.

\- GitHub Pages compatibility.



\## 20. Future development



Potential future features:



\- Advanced accidentals.

\- Key signatures.

\- Intervals.

\- Chords.

\- Rhythm training.

\- Grand staff exercises.

\- MIDI piano integration.

\- Real-time sight-reading.

\- Backup and restore.

\- MusicXML support.

\- Custom sheet music exercises.



Future features must not compromise the simplicity

or performance of the core application.

