import { dataManagementMarkup } from './data-management.js';
import { TEXT } from './strings.js';
import { selectOptions, presetOptions } from './configuration.js';

export function settingsMarkup(settings, storageStatus) {
  return `<section class="settings-view" aria-labelledby="settings-title">
    <p class="eyebrow">${TEXT.settingsEyebrow}</p>
    <h1 id="settings-title" tabindex="-1">${TEXT.settingsTitle}</h1>
    <p class="lead">${TEXT.settingsDescription}</p>
    <form id="settings-form" class="card form-card">
      <label class="form-field" for="settings-theme">${TEXT.theme}
        <select id="settings-theme" name="theme">${selectOptions(TEXT.themes, settings.theme)}</select></label>
      <label class="form-field" for="settings-naming">${TEXT.defaultNaming}
        <select id="settings-naming" name="naming">${selectOptions(TEXT.namings, settings.naming)}</select></label>
      <label class="form-field" for="settings-preset">${TEXT.defaultPreset}
        <select id="settings-preset" name="defaultPreset">${presetOptions(settings.defaultPreset, false)}</select></label>
      <label class="form-field" for="settings-session-type">${TEXT.defaultSessionType}
        <select id="settings-session-type" name="defaultSessionType">${selectOptions(TEXT.sessionTypes, settings.defaultSessionType)}</select></label>
      <p class="form-hint">${TEXT.settingsHint}</p>
      <p class="settings-status" id="settings-status" role="status">${storageStatus === 'ok' ? TEXT.settingsSaved : TEXT.storageStatus[storageStatus]}</p>
    </form>
    ${dataManagementMarkup()}
  </section>`;
}
