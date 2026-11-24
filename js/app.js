import { compatibleAttempts, analyzePractice } from './learning/adaptive.js';
import { recommendationMarkup } from './ui/recommendation.js';
import { PianoInputView } from './ui/piano-keyboard.js';
import { visibleLearningData } from './ui/learning-disclosure.js';
import { SequenceSession } from './session/sequence-session.js';
import { SequencePracticeView } from './ui/sequence-practice.js';
import { SEQ } from './ui/sequence-strings.js';
import { createAnswerInput } from './ui/answer-input.js';
import { PracticeSession } from './session/session.js';
import { FEEDBACK_MS, PRESETS, SEQUENCE_DEFAULTS } from './config.js';
import { configurationFromSettings, validateConfiguration } from './exercises/configuration.js';
import { createSettingsStore, validateSettings } from './data/settings.js';
import { createLearningStore, tabIdentity } from './data/storage.js';
import { recordFromSession, archivedSession } from './data/recording.js';
import { LEARNING_KEY, SESSION_PREFIX } from './data/schema.js';
import { recentHomeStatistics } from './learning/statistics.js';
import { TEXT } from './ui/strings.js';
import { STATS } from './ui/statistics-strings.js';
import { homeMarkup } from './ui/home.js';
import { practiceMarkup, PracticeView } from './ui/practice.js';
import { configurationMarkup, readConfiguration } from './ui/configuration.js';
import { settingsMarkup } from './ui/settings.js';
import { summaryMarkup } from './ui/summary.js';
import { createStatisticsView, statisticsMarkup, readStatisticsFilters } from './ui/statistics.js';
import { canRepeat } from './ui/session-history.js';

let idCounter = 0;
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `run-${Date.now()}-${++idCounter}`;
const identity = { ownerId: makeId(), tabId: tabIdentity(makeId) };
const settingsStore = createSettingsStore();
const loaded = settingsStore.load();
const learningStore = createLearningStore();
learningStore.load();
learningStore.recoverInterrupted(identity.tabId, identity.ownerId);
const initialConfig = configurationFromSettings(loaded.settings);
const recentConfiguration = recentHomeStatistics(learningStore.snapshot()).recentConfig;
const answerInput = createAnswerInput();
const state = {
  session: createSession(initialConfig), screen: 'home',
  settings: loaded.settings, storageStatus: loaded.status,
  quickSelection: recentConfiguration?.selectionMode ?? 'uniform',
  quickInput: recentConfiguration?.inputMethod === 'piano' ? 'piano' : 'letter',
  pianoOptions: recentConfiguration?.inputMethod === 'piano' ? recentConfiguration : {},
  quickExercise: canRepeat(recentConfiguration ?? {}) ? recentConfiguration.exerciseType : 'single-note',
  sequenceOptions: { ...SEQUENCE_DEFAULTS, ...(recentConfiguration?.exerciseType === 'sequence' ? recentConfiguration : {}) },
  quickPreset: loaded.settings.defaultPreset, draft: initialConfig, pendingConfig: null,
  statistics: createStatisticsView(), archiveId: null,
};
state.draft = quickConfiguration();
let practiceView = null, feedbackTimer = null, deadlineTimer = null, readyFrame = null;
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
      ${['home', 'practice', 'statistics', 'settings'].map(screen =>
        `<a href="#${screen}" data-action="${screen}">${screen === 'statistics' ? STATS.navigation : TEXT[screen]}</a>`).join('')}
    </nav>
    <label class="theme-control"><span>${TEXT.theme}</span>
      <select id="theme-select" aria-label="${TEXT.theme}">${Object.entries(TEXT.themes).map(([value, label]) =>
        `<option value="${value}">${label}</option>`).join('')}</select>
    </label>
  </div></header>
  <div id="storage-banner" class="storage-banner" role="status" hidden>
    <p id="storage-message"></p><button class="button subtle" data-action="retry-storage" id="retry-storage" hidden>${STATS.retry}</button>
  </div>
  <main id="main" tabindex="-1"></main>
  <dialog id="reset-dialog" aria-labelledby="reset-title" aria-describedby="reset-description">
    <h2 id="reset-title">${TEXT.newSessionTitle}</h2><p id="reset-description" class="muted">${STATS.startConfirm}</p>
    <div class="dialog-actions"><button class="button subtle" data-action="cancel-new-session">${TEXT.cancel}</button>
      <button class="button primary" data-action="confirm-new-session">${TEXT.newSession}</button></div>
  </dialog>
  <footer class="app-footer"><span>${TEXT.footer}</span><span>${TEXT.appTagline}</span></footer>`;
const main = document.querySelector('#main'), resetDialog = document.querySelector('#reset-dialog');

function createSession(config) {
  const Session = config.exerciseType === 'sequence' ? SequenceSession : PracticeSession;
  return new Session({ config, getAttempts:()=>compatibleAttempts(learningStore.snapshot(),config), onChange: current => {
    const record = recordFromSession(current, identity);
    if (record) learningStore.saveRecord(record);
    updateStorageStatus();
  } });
}
function applyTheme() {
  const preference = state.settings.theme;
  document.documentElement.dataset.theme = preference === 'system'
    ? systemTheme.matches ? 'dark' : 'light' : preference;
  document.querySelector('#theme-select').value = preference;
  const settingsTheme = document.querySelector('#settings-theme');
  if (settingsTheme) settingsTheme.value = preference;
}
function updateStorageStatus() {
  const health = learningStore.health();
  const progress = STATS.progressMessages[health.status] ?? (health.unreadableCount ? STATS.progressMessages.partial : null);
  const preferences = TEXT.storageStatus[state.storageStatus];
  const message = [preferences, progress].filter(Boolean).join(' ');
  const banner = document.querySelector('#storage-banner');
  if (!banner) return;
  banner.hidden = !message;
  const text = document.querySelector('#storage-message');
  if (text.textContent !== message) text.textContent = message;
  document.querySelector('#retry-storage').hidden = !(health.status !== 'ok' || health.pendingCount);
  const status = document.querySelector('#settings-status');
  if (status) status.textContent = preferences ?? TEXT.settingsSaved;
}
function updatePreferences(patch) {
  state.settings = validateSettings({ ...state.settings, ...patch });
  state.storageStatus = settingsStore.save(state.settings).status;
  if (Object.keys(patch).some(key => key !== 'theme')) {
    state.quickPreset = state.settings.defaultPreset;
    state.draft = quickConfiguration();
  }
  applyTheme(); updateStorageStatus();
}
applyTheme(); updateStorageStatus();
systemTheme.addEventListener('change', applyTheme);
document.querySelector('#theme-select').addEventListener('change', event => updatePreferences({ theme: event.target.value }));

function clearPending() {
  clearTimeout(feedbackTimer); feedbackTimer = null;
  clearTimeout(deadlineTimer); deadlineTimer = null;
  if (readyFrame !== null) cancelAnimationFrame(readyFrame);
  readyFrame = null;
}
function showSummary() { navigate('summary'); }
function scheduleDeadline() {
  clearTimeout(deadlineTimer); deadlineTimer = null;
  const session = state.session;
  if (session.config.sessionType !== 'timed' || session.activeSince === null || session.phase === 'complete') return;
  deadlineTimer = setTimeout(() => {
    if (state.screen !== 'practice' || document.hidden) return;
    if (session.tick()) showSummary(); else scheduleDeadline();
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
      practiceView?.update(state.session); scheduleDeadline();
    });
  });
}
function scheduleFeedback() {
  const session = state.session;
  if (session.config.exerciseType === 'sequence') return;
  if (session.phase !== 'feedback' && !(session.phase === 'complete' && session.completionReason === 'count')) return;
  const attempt = session.attempts.at(-1);
  feedbackTimer = setTimeout(advance, attempt.correct ? FEEDBACK_MS.correct : FEEDBACK_MS.incorrect);
}
function updatePractice() {
  practiceView.update(state.session); scheduleReady(); scheduleFeedback(); scheduleDeadline();
}
function quickConfiguration() {
  const draft={ ...SEQUENCE_DEFAULTS, ...state.sequenceOptions, ...state.pianoOptions,
    ...configurationFromSettings(state.settings, state.quickPreset), exerciseType: state.quickExercise, inputMethod: state.quickInput, selectionMode: state.quickSelection };
  if(draft.inputMethod==='piano') {
    const clefs=draft.clef==='mixed'?['treble','bass']:[draft.clef];
    draft.keyboardMin=Math.min(draft.keyboardMin ?? 36,...clefs.map(c=>draft.ranges[c].minMidi));
    draft.keyboardMax=Math.max(draft.keyboardMax ?? 84,...clefs.map(c=>draft.ranges[c].maxMidi));
  }
  return validateConfiguration(draft);
}
function displayData() { return visibleLearningData(learningStore.snapshot(), state.session); }
function homeView() {
  const data = displayData();
  const persistent = recentHomeStatistics(data);
  persistent.recentConfig = recentHomeStatistics(learningStore.snapshot()).recentConfig;
  return homeMarkup(state.session, quickConfiguration(), persistent) + recommendationMarkup(analyzePractice(quickConfiguration(),compatibleAttempts(data,quickConfiguration())),state.settings.naming) +
    (data.withheld ? '<p class="sequence-pending-notice" role="status">' + SEQ.withheld + '</p>' : '');
}
function renderStatistics(focusSelector = null) {
  main.innerHTML = statisticsMarkup(displayData(), state.statistics, state.settings.naming,
    state.session.phase === 'paused' ? state.session.id : null);
  if (focusSelector) main.querySelector(focusSelector)?.focus({ preventScroll: true });
}
function findSaved(id) { return displayData().sessions.find(record => record.session.id === id); }

function showScreen(requested, { focus = true } = {}) {
  clearPending();
  practiceView?.dispose?.();
  answerInput.reset();
  let screen = requested, desiredHash = requested;
  if (requested.startsWith('session/')) {
    try { state.archiveId = decodeURIComponent(requested.slice(8)); } catch { state.archiveId = null; }
    screen = 'saved-summary';
  }
  if (screen === 'practice' && state.session.phase === 'idle') screen = desiredHash = 'configure';
  if (screen === 'practice' && state.session.phase === 'complete') screen = desiredHash = 'summary';
  if (screen === 'summary' && state.session.phase !== 'complete') {
    const latest = learningStore.snapshot().sessions.filter(record => record.session.status === 'completed')
      .sort((a, b) => Date.parse(b.session.finishedAt) - Date.parse(a.session.finishedAt))[0];
    if (latest) { state.archiveId = latest.session.id; screen = 'saved-summary'; desiredHash = 'session/' + encodeURIComponent(state.archiveId); }
    else screen = desiredHash = 'home';
  }
  if (screen !== 'practice') state.session.pause();
  if (screen === 'saved-summary' && !findSaved(state.archiveId)) {
    screen = desiredHash = 'statistics'; state.statistics.tab = 'history';
  }
  if (desiredHash !== requested) history.replaceState(null, '', '#' + desiredHash);
  state.screen = screen; practiceView = null;
  if (screen === 'home') main.innerHTML = homeView();
  else if (screen === 'configure') main.innerHTML = configurationMarkup(state.draft);
  else if (screen === 'settings') main.innerHTML = settingsMarkup(state.settings, state.storageStatus);
  else if (screen === 'statistics') renderStatistics();
  else if (screen === 'saved-summary') main.innerHTML = summaryMarkup(archivedSession(findSaved(state.archiveId)),
    { historical: true, naming: state.settings.naming });
  else if (screen === 'summary') main.innerHTML = summaryMarkup(state.session);
  else {
    if (!document.hidden && state.session.phase === 'paused') state.session.resume();
    if (document.hidden) state.session.pause();
    if (state.session.tick()) { showScreen('summary', { focus }); return; }
    main.innerHTML = practiceMarkup(state.session.config);
    practiceView = state.session.config.exerciseType === 'sequence' ? new SequencePracticeView(main) : new PracticeView(main);
    if(state.session.config.inputMethod==='piano') practiceView=new PianoInputView(main,practiceView);
    updatePractice();
  }
  const navScreen = screen === 'saved-summary' ? 'statistics' : ['configure', 'summary'].includes(screen) ? 'practice' : screen;
  document.querySelectorAll('nav [data-action]').forEach(link => {
    if (link.dataset.action === navScreen) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  updateStorageStatus();
  if (focus) { window.scrollTo(0, 0); main.querySelector('h1').focus({ preventScroll: true }); }
}
function navigate(screen) {
  if (location.hash === '#' + screen) showScreen(screen); else location.hash = screen;
}
function startSession(config) {
  state.pendingConfig = null; resetDialog.close(); clearPending();
  state.session.interrupt(); // Previous unfinished evidence stays in history.
  state.quickSelection=config.selectionMode ?? 'uniform';
  state.quickExercise = config.exerciseType; state.quickInput=config.inputMethod;
  if(config.inputMethod==='piano') state.pianoOptions=config;
  if (config.exerciseType === 'sequence') state.sequenceOptions = config;
  state.draft = config;
  state.session = createSession(config); state.session.start(); navigate('practice');
}
function requestSession(config) {
  const validated = validateConfiguration(config);
  if (state.session.attempts.length && !['complete', 'interrupted'].includes(state.session.phase)) {
    state.pendingConfig = validated; resetDialog.showModal();
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
  if (!attempt) { if (state.session.phase === 'complete' && !state.session.holdFinalReview) showSummary(); return; }
  clearPending(); updatePractice();
}
function pausePractice() {
  clearPending(); state.session.pause();
  if (state.session.phase === 'complete') { showSummary(); return; }
  practiceView.update(state.session);
  main.querySelector('#pause-cover button').focus({ preventScroll: true });
}
function rerenderConfiguration(focusId) {
  main.innerHTML = configurationMarkup(state.draft);
  if (focusId) main.querySelector('#' + focusId)?.focus({ preventScroll: true });
}

app.addEventListener('click', event => {
  const piano = event.target.closest('[data-piano]');
  if(piano){if(answerInput.pointerAllowed(event))submit(Number(piano.dataset.piano));return;}
  const answer = event.target.closest('[data-answer],[data-piano]');
  if (answer) { if (answerInput.pointerAllowed(event)) submit(answer.dataset.answer); return; }
  const control = event.target.closest('[data-action]');
  if (!control) return;
  event.preventDefault();
  const action = control.dataset.action;
  if(action.startsWith('learn-')){requestSession({...quickConfiguration(),selectionMode:action.slice(6)});return;}
  if(action==='practice-mistakes'){const saved=control.dataset.sessionId?findSaved(control.dataset.sessionId):null;requestSession({...saved?.session.config??state.session.config,selectionMode:'mistakes'});return;}
  if(action==='piano-left'||action==='piano-right'){const keyboard=main.querySelector('.piano-scroll');keyboard.scrollLeft+=(action==='piano-left'?-1:1)*192;return;}
  if (['home', 'practice', 'statistics', 'settings', 'summary'].includes(action)) navigate(action);
  else if (action === 'quick-start') requestSession(quickConfiguration());
  else if (action === 'customize') {
    state.draft = { ...quickConfiguration(), presetId: 'custom' }; navigate('configure');
  } else if (action === 'different') { state.draft = state.session.config; navigate('configure'); }
  else if (action === 'repeat') requestSession(state.session.config);
  else if (action === 'repeat-recent') {
    const config = recentHomeStatistics(learningStore.snapshot()).recentConfig;
    if (config && canRepeat(config)) requestSession(config);
  } else if (['open-session', 'repeat-history', 'different-history'].includes(action)) {
    const record = findSaved(control.dataset.sessionId);
    if (!record) return;
    if (action === 'open-session') navigate('session/' + encodeURIComponent(record.session.id));
    else if (canRepeat(record.session.config)) {
      if (action === 'repeat-history') requestSession(record.session.config);
      else { state.draft = record.session.config; navigate('configure'); }
    }
  } else if (action === 'back-to-statistics') { state.statistics.tab = 'history'; navigate('statistics'); }
  else if (action === 'pause') pausePractice();
  else if (action === 'resume') {
    if (document.hidden) return;
    clearPending(); state.session.resume(); updatePractice();
    main.querySelector('[data-answer]').focus({ preventScroll: true });
  } else if (action === 'finish') { clearPending(); state.session.finish(); showSummary(); }
  else if (action === 'next') advance();
  else if (action === 'cancel-new-session') { state.pendingConfig = null; resetDialog.close(); }
  else if (action === 'confirm-new-session' && state.pendingConfig) startSession(state.pendingConfig);
  else if (action === 'retry-storage') {
    learningStore.retry(); updateStorageStatus();
    if (state.screen === 'statistics') renderStatistics();
  } else if (action === 'statistics-tab') {
    state.statistics.tab = control.dataset.statTab;
    renderStatistics('[data-stat-tab="' + state.statistics.tab + '"]');
  } else if (action === 'inspect-note') {
    state.statistics.selectedContext = control.dataset.contextId;
    renderStatistics();
    main.querySelector('.note-detail')?.focus({ preventScroll: false });
  } else if (['chart-older', 'chart-newer', 'notes-previous', 'notes-next', 'history-previous', 'history-next'].includes(action)) {
    const field = action.startsWith('chart') ? 'chartPage' : action.startsWith('notes') ? 'notePage' : 'historyPage';
    state.statistics[field] = Math.max(0, state.statistics[field] + (['chart-older', 'notes-next', 'history-next'].includes(action) ? 1 : -1));
    renderStatistics('[data-action="' + action + '"]');
  }
});
resetDialog.addEventListener('cancel', () => { state.pendingConfig = null; });
app.addEventListener('change', event => {
  if(event.target.id==='quick-input'){state.quickInput=event.target.value;state.draft=quickConfiguration();main.innerHTML=homeView();main.querySelector('#quick-input').focus();}
  else if (event.target.id === 'quick-exercise') {
    state.quickExercise = event.target.value;
    state.draft = quickConfiguration();
    main.innerHTML = homeView(); main.querySelector('#quick-exercise').focus({ preventScroll: true });
  } else if (event.target.id === 'quick-preset') {
    state.quickPreset = event.target.value; main.innerHTML = homeView();
    main.querySelector('#quick-preset').focus({ preventScroll: true });
  } else if (event.target.closest('#settings-form')) updatePreferences({ [event.target.name]: event.target.value });
  else if (event.target.closest('#statistics-filters')) {
    state.statistics.filters = readStatisticsFilters(main.querySelector('#statistics-filters'));
    Object.assign(state.statistics, { chartPage: 0, notePage: 0, historyPage: 0, selectedContext: null });
    renderStatistics('#' + event.target.id);
  } else if (['staff-clef', 'staff-octave', 'note-sort'].includes(event.target.id)) {
    if (event.target.id === 'staff-clef') state.statistics.clef = event.target.value;
    if (event.target.id === 'staff-octave') state.statistics.octave = Number(event.target.value);
    if (event.target.id === 'note-sort') { state.statistics.sort = event.target.value; state.statistics.notePage = 0; }
    else state.statistics.selectedContext = null;
    renderStatistics('#' + event.target.id);
  } else if (event.target.closest('#practice-form')) {
    const raw = readConfiguration(main.querySelector('#practice-form'), state.draft);
    state.draft = event.target.id === 'practice-preset' && raw.presetId !== 'custom' ? { ...raw, ...PRESETS[raw.presetId] } : raw;
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
  if (event.repeat && ['Enter', ' '].includes(event.key) && event.target.closest('[data-answer]')) event.preventDefault();
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || state.screen !== 'practice' || document.hidden || resetDialog.open) return;
  if (event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
  if(state.session.config.inputMethod==='piano') return;
  const answer = answerInput.keydown(event, state.session.config.naming);
  if (answer) { event.preventDefault(); submit(answer); }
});
document.addEventListener('keyup', event => answerInput.keyup(event));
window.addEventListener('blur', () => answerInput.reset());
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.screen === 'practice') {
    answerInput.reset(); clearPending(); state.session.pause(); practiceView.update(state.session);
  }
});
window.addEventListener('pagehide', () => { clearPending(); state.session.interrupt(); });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
window.addEventListener('storage', event => {
  if (event.key === LEARNING_KEY || event.key?.startsWith(SESSION_PREFIX)) {
    learningStore.load(); updateStorageStatus();
    if (state.screen === 'statistics') renderStatistics();
    if (state.screen === 'home') main.innerHTML = homeView();
  }
});
function validRoute(route) {
  return ['home', 'practice', 'configure', 'settings', 'summary', 'statistics'].includes(route) || route.startsWith('session/');
}
window.addEventListener('hashchange', () => {
  const screen = location.hash.slice(1) || 'home';
  if (validRoute(screen)) { if (resetDialog.open) resetDialog.close(); showScreen(screen); }
});
const initialScreen = location.hash.slice(1) || 'home';
showScreen(validRoute(initialScreen) ? initialScreen : 'home', { focus: false });
setInterval(() => {
  if (state.screen !== 'practice' || document.hidden) return;
  if (state.session.tick() && !state.session.holdFinalReview && !(state.session.completionReason === 'count' && feedbackTimer !== null)) { showSummary(); return; }
  practiceView?.updateStatistics(state.session);
}, 100);
setInterval(() => { if (!document.hidden) state.session.checkpoint(); }, 1000);
