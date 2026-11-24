import { PracticeSession } from './session/session.js';
import { FEEDBACK_MS, PRESETS } from './config.js';
import { configurationForPreset, configurationFromSettings, validateConfiguration } from './exercises/configuration.js';
import { createSettingsStore, validateSettings } from './data/settings.js';
import { TEXT } from './ui/strings.js';
import { keyboardAnswer } from './ui/note-names.js';
import { homeMarkup } from './ui/home.js';
import { practiceMarkup, PracticeView } from './ui/practice.js';
import { configurationMarkup, readConfiguration } from './ui/configuration.js';
import { settingsMarkup } from './ui/settings.js';
import { summaryMarkup } from './ui/summary.js';

const settingsStore = createSettingsStore();
const loaded = settingsStore.load();
const initialConfig = configurationFromSettings(loaded.settings);
// One source of truth; session configuration is a snapshot and preferences are settings-only.
const state = {
  session: new PracticeSession({ config: initialConfig }), screen: 'home',
  settings: loaded.settings, storageStatus: loaded.status,
  quickPreset: loaded.settings.defaultPreset, draft: initialConfig, pendingConfig: null,
};
let practiceView = null;
let feedbackTimer = null;
let deadlineTimer = null;
let readyFrame = null;
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
const app = document.querySelector('#app');
app.innerHTML = `<a class="skip-link" href="#main">${TEXT.skip}</a>
  <header class="app-header"><div class="header-inner">
    <a class="brand" href="#home" data-action="home" aria-label="${TEXT.appName} — ${TEXT.home}">
      <svg class="brand-mark" viewBox="0 0 36 36" aria-hidden="true">
        <rect width="36" height="36" rx="10" fill="currentColor"/>
        <path d="M23 8v17" stroke="var(--brand-ink)" stroke-width="2"/>
        <ellipse cx="18" cy="25" rx="6" ry="4" fill="var(--brand-ink)" transform="rotate(-20 18 25)"/>
      </svg><span>${TEXT.appName}</span>
    </a>
    <nav aria-label="${TEXT.navigation}">
      ${['home', 'practice', 'settings'].map(screen =>
        `<a href="#${screen}" data-action="${screen}">${TEXT[screen]}</a>`).join('')}
    </nav>
    <label class="theme-control"><span>${TEXT.theme}</span>
      <select id="theme-select" aria-label="${TEXT.theme}">
        ${Object.entries(TEXT.themes).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}
      </select>
    </label>
  </div></header>
  <p id="storage-banner" class="storage-banner" role="status" hidden></p>
  <main id="main" tabindex="-1"></main>
  <dialog id="reset-dialog" aria-labelledby="reset-title" aria-describedby="reset-description">
    <h2 id="reset-title">${TEXT.newSessionTitle}</h2>
    <p id="reset-description" class="muted">${TEXT.newSessionConfirm}</p>
    <div class="dialog-actions">
      <button class="button subtle" data-action="cancel-new-session">${TEXT.cancel}</button>
      <button class="button primary" data-action="confirm-new-session">${TEXT.newSession}</button>
    </div>
  </dialog>
  <footer class="app-footer"><span>${TEXT.footer}</span><span>${TEXT.appTagline}</span></footer>`;
const main = document.querySelector('#main');
const resetDialog = document.querySelector('#reset-dialog');

function applyTheme() {
  const preference = state.settings.theme;
  document.documentElement.dataset.theme = preference === 'system'
    ? systemTheme.matches ? 'dark' : 'light' : preference;
  document.querySelector('#theme-select').value = preference;
  const settingsTheme = document.querySelector('#settings-theme');
  if (settingsTheme) settingsTheme.value = preference;
}
function updateStorageStatus() {
  const message = TEXT.storageStatus[state.storageStatus];
  const banner = document.querySelector('#storage-banner');
  banner.hidden = !message;
  banner.textContent = message ?? '';
  const status = document.querySelector('#settings-status');
  if (status) status.textContent = message ?? TEXT.settingsSaved;
}
function updatePreferences(patch) {
  state.settings = validateSettings({ ...state.settings, ...patch });
  state.storageStatus = settingsStore.save(state.settings).status;
  if (Object.keys(patch).some(key => key !== 'theme')) {
    state.quickPreset = state.settings.defaultPreset;
    state.draft = configurationFromSettings(state.settings);
  }
  applyTheme();
  updateStorageStatus();
}
applyTheme();
updateStorageStatus();
systemTheme.addEventListener('change', applyTheme);
document.querySelector('#theme-select').addEventListener('change', event =>
  updatePreferences({ theme: event.target.value }));

function clearPending() {
  clearTimeout(feedbackTimer); feedbackTimer = null;
  clearTimeout(deadlineTimer); deadlineTimer = null;
  if (readyFrame !== null) cancelAnimationFrame(readyFrame);
  readyFrame = null;
}
function showSummary() { navigate('summary'); }
function scheduleDeadline() {
  clearTimeout(deadlineTimer);
  deadlineTimer = null;
  const session = state.session;
  if (session.config.sessionType !== 'timed' || session.activeSince === null || session.phase === 'complete') return;
  deadlineTimer = setTimeout(() => {
    if (state.screen !== 'practice' || document.hidden) return;
    if (session.tick()) showSummary();
    else scheduleDeadline();
  }, session.remainingMs);
}
function scheduleReady() {
  if (state.session.phase !== 'presenting') return;
  readyFrame = requestAnimationFrame(() => {
    readyFrame = requestAnimationFrame(() => {
      readyFrame = null;
      if (state.screen !== 'practice' || document.hidden) return;
      state.session.markReady();
      if (state.session.phase === 'complete') { showSummary(); return; }
      practiceView?.update(state.session);
      scheduleDeadline();
    });
  });
}
function scheduleFeedback() {
  const session = state.session;
  if (session.phase !== 'feedback' && !(session.phase === 'complete' && session.completionReason === 'count')) return;
  const attempt = session.attempts.at(-1);
  feedbackTimer = setTimeout(advance, attempt.correct ? FEEDBACK_MS.correct : FEEDBACK_MS.incorrect);
}
function updatePractice() {
  practiceView.update(state.session);
  scheduleReady(); scheduleFeedback(); scheduleDeadline();
}
function showScreen(requested, { focus = true } = {}) {
  clearPending();
  let screen = requested;
  if (screen === 'practice' && state.session.phase === 'idle') screen = 'configure';
  if (screen === 'practice' && state.session.phase === 'complete') screen = 'summary';
  if (screen === 'summary' && state.session.phase !== 'complete') screen = 'home';
  if (screen !== requested) history.replaceState(null, '', '#' + screen);
  state.screen = screen;
  practiceView = null;
  if (screen !== 'practice') state.session.pause();
  if (screen === 'home') main.innerHTML = homeMarkup(state.session, configurationFromSettings(state.settings, state.quickPreset));
  else if (screen === 'configure') main.innerHTML = configurationMarkup(state.draft);
  else if (screen === 'settings') main.innerHTML = settingsMarkup(state.settings, state.storageStatus);
  else if (screen === 'summary') main.innerHTML = summaryMarkup(state.session);
  else {
    if (!document.hidden && state.session.phase === 'paused') state.session.resume();
    if (document.hidden) state.session.pause();
    // A navigation can encounter the deadline before a pending timer has run.
    if (state.session.tick()) { showScreen('summary', { focus }); return; }
    main.innerHTML = practiceMarkup(state.session.config);
    practiceView = new PracticeView(main);
    updatePractice();
  }
  const navScreen = ['configure', 'summary'].includes(screen) ? 'practice' : screen;
  document.querySelectorAll('nav [data-action]').forEach(link => {
    if (link.dataset.action === navScreen) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (focus) {
    window.scrollTo(0, 0);
    main.querySelector('h1').focus({ preventScroll: true });
  }
}
function navigate(screen) {
  if (location.hash === '#' + screen) showScreen(screen);
  else location.hash = screen;
}
function startSession(config) {
  state.pendingConfig = null;
  resetDialog.close();
  clearPending();
  state.session = new PracticeSession({ config });
  state.session.start();
  navigate('practice');
}
function requestSession(config) {
  const validated = validateConfiguration(config);
  if (state.session.attempts.length) {
    state.pendingConfig = validated;
    resetDialog.showModal();
    document.querySelector('[data-action="cancel-new-session"]').focus();
  } else startSession(validated);
}
function advance() {
  clearPending();
  if (state.screen !== 'practice') return;
  if (state.session.tick()) { showSummary(); return; }
  if (!state.session.advance()) return;
  const nextHadFocus = document.activeElement?.id === 'next-button';
  updatePractice();
  if (nextHadFocus) main.querySelector('[data-answer]').focus({ preventScroll: true });
}
function submit(answer) {
  if (state.screen !== 'practice' || document.hidden || resetDialog.open) return;
  const attempt = state.session.submit(answer);
  if (!attempt) {
    if (state.session.phase === 'complete') showSummary();
    return;
  }
  clearPending(); updatePractice();
}
function pausePractice() {
  clearPending();
  state.session.pause();
  if (state.session.phase === 'complete') { showSummary(); return; }
  practiceView.update(state.session);
  main.querySelector('#pause-cover button').focus({ preventScroll: true });
}
function rerenderConfiguration(focusId) {
  main.innerHTML = configurationMarkup(state.draft);
  if (focusId) main.querySelector('#' + focusId)?.focus({ preventScroll: true });
}

app.addEventListener('click', event => {
  const answer = event.target.closest('[data-answer]');
  if (answer) { submit(answer.dataset.answer); return; }
  const control = event.target.closest('[data-action]');
  if (!control) return;
  event.preventDefault();
  const action = control.dataset.action;
  if (['home', 'practice', 'settings', 'summary'].includes(action)) navigate(action);
  else if (action === 'quick-start') requestSession(configurationFromSettings(state.settings, state.quickPreset));
  else if (action === 'customize') {
    state.draft = { ...configurationFromSettings(state.settings, state.quickPreset), presetId: 'custom' };
    navigate('configure');
  } else if (action === 'different') {
    state.draft = state.session.config;
    navigate('configure');
  } else if (action === 'repeat') requestSession(state.session.config);
  else if (action === 'pause') pausePractice();
  else if (action === 'resume') {
    if (document.hidden) return;
    clearPending(); state.session.resume(); updatePractice();
    main.querySelector('[data-answer]').focus({ preventScroll: true });
  } else if (action === 'finish') {
    clearPending(); state.session.finish(); showSummary();
  } else if (action === 'next') advance();
  else if (action === 'cancel-new-session') {
    state.pendingConfig = null; resetDialog.close();
  } else if (action === 'confirm-new-session' && state.pendingConfig) startSession(state.pendingConfig);
});
resetDialog.addEventListener('cancel', () => { state.pendingConfig = null; });
app.addEventListener('change', event => {
  if (event.target.id === 'quick-preset') {
    state.quickPreset = event.target.value;
    main.innerHTML = homeMarkup(state.session, configurationFromSettings(state.settings, state.quickPreset));
    main.querySelector('#quick-preset').focus({ preventScroll: true });
  } else if (event.target.closest('#settings-form')) {
    updatePreferences({ [event.target.name]: event.target.value });
  } else if (event.target.closest('#practice-form')) {
    const raw = readConfiguration(main.querySelector('#practice-form'), state.draft);
    if (event.target.id === 'practice-preset' && raw.presetId !== 'custom') {
      state.draft = { ...raw, ...PRESETS[raw.presetId] };
    } else state.draft = raw;
    // Number fields must not replace the submit button during a blur/change click.
    if (!event.target.matches('input')) rerenderConfiguration(event.target.id);
  }
});
app.addEventListener('submit', event => {
  event.preventDefault();
  if (event.target.id !== 'practice-form') return;
  state.draft = readConfiguration(event.target, state.draft);
  try { requestSession(state.draft); }
  catch (error) {
    const message = main.querySelector('#configuration-error');
    message.textContent = (error.clef ? TEXT.clefs[error.clef] + ': ' : '') + TEXT.configurationErrors[error.code];
    message.hidden = false; message.focus({ preventScroll: false });
  }
});
document.addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey ||
      state.screen !== 'practice' || document.hidden || resetDialog.open) return;
  if (event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
  const answer = keyboardAnswer(event.key, state.session.config.naming);
  if (answer) { event.preventDefault(); submit(answer); }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.screen === 'practice') {
    clearPending(); state.session.pause();
    practiceView.update(state.session);
  }
});
window.addEventListener('hashchange', () => {
  const screen = location.hash.slice(1) || 'home';
  if (['home', 'practice', 'configure', 'settings', 'summary'].includes(screen)) {
    if (resetDialog.open) resetDialog.close();
    showScreen(screen);
  }
});
const initialScreen = location.hash.slice(1) || 'home';
showScreen(['home', 'practice', 'configure', 'settings', 'summary'].includes(initialScreen) ? initialScreen : 'home', { focus: false });
setInterval(() => {
  if (state.screen !== 'practice' || document.hidden) return;
  if (state.session.tick() && !(state.session.completionReason === 'count' && feedbackTimer !== null)) {
    showSummary(); return;
  }
  practiceView?.updateStatistics(state.session);
}, 100);
