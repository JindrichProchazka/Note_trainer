import { PRESETS, NOTE_LIMITS, TIMED_PRESETS, COUNT_PRESETS } from '../config.js';
import { naturalNotesBetween } from '../music/notes.js';
import { noteName } from './note-names.js';
import { TEXT } from './strings.js';
import { configurationDescription } from './config-description.js';

export const selectOptions = (choices, selected) => Object.entries(choices).map(([value, label]) =>
  `<option value="${value}"${String(value) === String(selected) ? ' selected' : ''}>${label}</option>`).join('');
export const presetOptions = (selected, custom = true) => selectOptions(Object.fromEntries([
  ...Object.keys(PRESETS).map(id => [id, TEXT.presets[id]]), ...(custom ? [['custom', TEXT.custom]] : []),
]), selected);

export function configurationMarkup(draft) {
  const custom = draft.presetId === 'custom';
  const timed = draft.sessionType === 'timed';
  const counted = draft.sessionType === 'count';
  const durationSeconds = draft.durationMs / 1000;
  const customDuration = draft.customDuration ?? !TIMED_PRESETS.includes(durationSeconds);
  const customCount = draft.customCount ?? !COUNT_PRESETS.includes(draft.questionCount);
  const notes = naturalNotesBetween(NOTE_LIMITS.minMidi, NOTE_LIMITS.maxMidi);
  const noteOptions = selected => selectOptions(Object.fromEntries(notes.map(note =>
    [note.midi, noteName(note, draft.naming)])), selected);
  let description = TEXT.checkRange;
  try { description = configurationDescription(draft); } catch { /* Show validation on submit. */ }
  return `<section class="configuration-view" aria-labelledby="configuration-title">
    <p class="eyebrow">${TEXT.configureEyebrow}</p>
    <h1 id="configuration-title" tabindex="-1">${TEXT.configureTitle}</h1>
    <p class="lead">${TEXT.configureDescription}</p>
    <form id="practice-form" class="card form-card" novalidate>
      <label class="form-field" for="practice-preset">${TEXT.preset}
        <select id="practice-preset" name="preset">${presetOptions(draft.presetId)}</select>
      </label>
      <p class="range-description" id="range-preview">${description}</p>
      <div class="custom-ranges"${custom ? '' : ' hidden'}>
        <label class="form-field" for="clef-choice">${TEXT.clefChoice}
          <select id="clef-choice">${selectOptions(TEXT.clefs, draft.clef)}</select>
        </label>
        <p class="form-hint">${TEXT.rangeHint}</p>
        ${['treble', 'bass'].map(clef => `<fieldset class="range-fields"${draft.clef === clef || draft.clef === 'mixed' ? '' : ' hidden'}>
          <legend>${TEXT.clefs[clef]}</legend>
          <div class="form-grid">
            <label class="form-field" for="${clef}-low">${TEXT.lowNote}
              <select id="${clef}-low">${noteOptions(draft.ranges[clef].minMidi)}</select></label>
            <label class="form-field" for="${clef}-high">${TEXT.highNote}
              <select id="${clef}-high">${noteOptions(draft.ranges[clef].maxMidi)}</select></label>
          </div>
        </fieldset>`).join('')}
      </div>
      <div class="form-grid">
        <label class="form-field" for="session-type">${TEXT.sessionType}
          <select id="session-type">${selectOptions(TEXT.sessionTypes, draft.sessionType)}</select></label>
        <label class="form-field" for="practice-naming">${TEXT.naming}
          <select id="practice-naming">${selectOptions(TEXT.namings, draft.naming)}</select></label>
      </div>
      <div class="session-options"${timed ? '' : ' hidden'}>
        <label class="form-field" for="duration-preset">${TEXT.duration}
          <select id="duration-preset">${selectOptions({ ...TEXT.durationOptions, custom: TEXT.custom }, customDuration ? 'custom' : durationSeconds)}</select></label>
        <label class="form-field" for="duration-custom"${customDuration ? '' : ' hidden'}>${TEXT.durationSeconds}
          <input id="duration-custom" type="number" inputmode="numeric" min="5" max="3600" step="1"
            value="${Number.isFinite(durationSeconds) ? durationSeconds : ''}">
          <span class="form-hint">${TEXT.durationHint}</span></label>
      </div>
      <div class="session-options"${counted ? '' : ' hidden'}>
        <label class="form-field" for="count-preset">${TEXT.count}
          <select id="count-preset">${selectOptions(Object.fromEntries([
            ...COUNT_PRESETS.map(count => [count, TEXT.questions(count)]), ['custom', TEXT.custom],
          ]), customCount ? 'custom' : draft.questionCount)}</select></label>
        <label class="form-field" for="count-custom"${customCount ? '' : ' hidden'}>${TEXT.customCount}
          <input id="count-custom" type="number" inputmode="numeric" min="1" max="1000" step="1"
            value="${Number.isFinite(draft.questionCount) ? draft.questionCount : ''}">
          <span class="form-hint">${TEXT.countHint}</span></label>
      </div>
      <p id="configuration-error" class="form-error" role="alert" tabindex="-1" hidden></p>
      <button class="button primary" type="submit">${TEXT.start} →</button>
    </form>
  </section>`;
}

/** Capture raw form values. Validation happens before a session can be started. */
export function readConfiguration(form, previous) {
  const value = id => form.querySelector('#' + id).value;
  return {
    ...previous, presetId: value('practice-preset'), clef: value('clef-choice'),
    customDuration: value('duration-preset') === 'custom', customCount: value('count-preset') === 'custom',
    naming: value('practice-naming'), sessionType: value('session-type'),
    ranges: Object.fromEntries(['treble', 'bass'].map(clef => [clef,
      { minMidi: Number(value(clef + '-low')), maxMidi: Number(value(clef + '-high')) }])),
    durationMs: Number(value('duration-preset') === 'custom' ? value('duration-custom') : value('duration-preset')) * 1000,
    questionCount: Number(value('count-preset') === 'custom' ? value('count-custom') : value('count-preset')),
  };
}
