import { DEFAULT_SETTINGS, PRESETS, migratePresetPreference } from '../config.js';

export const SETTINGS_KEY = 'notetrainer.settings';
export const SETTINGS_VERSION = 1;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const options = {
  theme: ['light', 'dark', 'system'], naming: ['international', 'czech'],
  defaultPreset: Object.keys(PRESETS), defaultSessionType: ['unlimited', 'timed', 'count'],
};

export function validateSettings(input) {
  if (!isObject(input)) throw new TypeError('Invalid settings');
  const settings = { ...DEFAULT_SETTINGS };
  for (const [key, values] of Object.entries(options)) {
    if (Object.hasOwn(input, key)) {
      const value=key==='defaultPreset'?migratePresetPreference(input[key]):input[key];
      if (!values.includes(value)) throw new TypeError('Invalid setting: ' + key);
      settings[key] = value;
    }
  }
  return Object.freeze(settings);
}

/** A settings-only adapter. Never reads, resets, or persists learning attempts. */
export function createSettingsStore(getStorage = () => globalThis.localStorage) {
  let status = 'ok';
  let loaded = false;
  let document = { schemaVersion: SETTINGS_VERSION, settings: {} };
  function load() {
    loaded = true;
    try {
      const raw = getStorage().getItem(SETTINGS_KEY);
      if (raw === null) {
        document = { schemaVersion: SETTINGS_VERSION, settings: {} };
        status = 'ok'; return { settings: DEFAULT_SETTINGS, status };
      }
      const value = JSON.parse(raw);
      if (!isObject(value) || !Number.isInteger(value.schemaVersion)) throw new TypeError();
      if (value.schemaVersion !== SETTINGS_VERSION) {
        status = 'unsupported';
        return { settings: DEFAULT_SETTINGS, status };
      }
      const settings = validateSettings(value.settings);
      document = value;
      status = 'ok';
      return { settings, status };
    } catch {
      status = 'unavailable';
      // Distinguish readable but invalid JSON from denied storage access.
      try {
        if (getStorage().getItem(SETTINGS_KEY) !== null) status = 'invalid';
      } catch { /* Storage access itself is unavailable. */ }
      return { settings: DEFAULT_SETTINGS, status };
    }
  }
  function save(input) {
    const settings = validateSettings(input);
    if (!loaded) load();
    if (status !== 'ok') return { saved: false, status };
    // Another tab or an application update may have changed the document since startup.
    if (load().status !== 'ok') return { saved: false, status };
    try {
      // Keep unknown fields in a compatible document for forward-compatible integration.
      const next = { ...document, schemaVersion: SETTINGS_VERSION,
        settings: { ...document.settings, ...settings } };
      getStorage().setItem(SETTINGS_KEY, JSON.stringify(next));
      document = next;
      return { saved: true, status };
    } catch {
      status = 'unavailable';
      return { saved: false, status };
    }
  }
  return { load, save };
}
