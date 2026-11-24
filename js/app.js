import { PracticeSession } from './session/session.js';
import { FEEDBACK_MS } from './config.js';
import { TEXT } from './ui/strings.js';
import { homeMarkup } from './ui/home.js';
import { practiceMarkup, PracticeView } from './ui/practice.js';

// One source of truth. UI modules render state and do not calculate pitches.
const state = { session: new PracticeSession(), screen: 'home', theme: 'system' };
let practiceView = null;
let feedbackTimer = null;
let readyFrame = null;
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
const app = document.querySelector('#app');

app.innerHTML = `<a class="skip-link" href="#main">${TEXT.skip}</a>
  <header class="app-header">
    <div class="header-inner">
      <a class="brand" href="#home" data-action="home" aria-label="${TEXT.appName} — ${TEXT.home}">
        <svg class="brand-mark" viewBox="0 0 36 36" aria-hidden="true">
          <rect width="36" height="36" rx="10" fill="currentColor"/>
          <path d="M23 8v17" stroke="var(--brand-ink)" stroke-width="2"/>
          <ellipse cx="18" cy="25" rx="6" ry="4" fill="var(--brand-ink)" transform="rotate(-20 18 25)"/>
        </svg><span>${TEXT.appName}</span>
      </a>
      <nav aria-label="${TEXT.navigation}">
        <a href="#home" data-action="home">${TEXT.home}</a>
        <a href="#practice" data-action="practice">${TEXT.practice}</a>
      </nav>
      <label class="theme-control"><span>${TEXT.theme}</span>
        <select id="theme-select" aria-label="${TEXT.theme}">
          ${Object.entries(TEXT.themes).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}
        </select>
      </label>
    </div>
  </header>
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

function applyTheme() {
  document.documentElement.dataset.theme = state.theme === 'system'
    ? systemTheme.matches ? 'dark' : 'light' : state.theme;
}
applyTheme();
systemTheme.addEventListener('change', applyTheme);
document.querySelector('#theme-select').addEventListener('change', event => {
  state.theme = event.target.value;
  applyTheme();
});

function clearPending() {
  clearTimeout(feedbackTimer);
  feedbackTimer = null;
  if (readyFrame !== null) cancelAnimationFrame(readyFrame);
  readyFrame = null;
}

function scheduleReady() {
  if (state.session.phase !== 'presenting') return;
  // Wait until the SVG has been painted before beginning the response clock.
  readyFrame = requestAnimationFrame(() => {
    readyFrame = requestAnimationFrame(() => {
      readyFrame = null;
      if (state.screen !== 'practice' || document.hidden) return;
      state.session.markReady();
      practiceView?.update(state.session);
    });
  });
}

function scheduleFeedback() {
  if (state.session.phase !== 'feedback') return;
  const attempt = state.session.attempts.at(-1);
  feedbackTimer = setTimeout(advance, attempt.correct ? FEEDBACK_MS.correct : FEEDBACK_MS.incorrect);
}

function updatePractice() {
  practiceView.update(state.session);
  scheduleReady();
  scheduleFeedback();
}

function showScreen(screen, { focus = true } = {}) {
  clearPending();
  state.screen = screen;
  if (screen === 'home') {
    state.session.pause();
    practiceView = null;
    main.innerHTML = homeMarkup(state.session);
  } else {
    if (state.session.phase === 'idle') state.session.start();
    // Returning from Home deliberately resumes; a visibility pause needs Resume.
    if (!document.hidden && state.session.phase === 'paused') state.session.resume();
    if (document.hidden) state.session.pause();
    main.innerHTML = practiceMarkup();
    practiceView = new PracticeView(main);
    updatePractice();
  }
  document.querySelectorAll('nav [data-action]').forEach(link => {
    if (link.dataset.action === screen) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (focus) {
    window.scrollTo(0, 0);
    main.querySelector('h1').focus({ preventScroll: true });
  }
}

function navigate(screen) {
  if (location.hash === `#${screen}`) showScreen(screen);
  else location.hash = screen;
}

function startNewSession() {
  document.querySelector('#reset-dialog').close();
  clearPending();
  state.session = new PracticeSession();
  navigate('practice');
}

function advance() {
  clearPending();
  if (state.screen !== 'practice' || !state.session.advance()) return;
  const nextHadFocus = document.activeElement?.id === 'next-button';
  updatePractice();
  if (nextHadFocus) main.querySelector('[data-answer]').focus({ preventScroll: true });
}

function submit(answer) {
  if (state.screen !== 'practice' || document.hidden) return;
  const attempt = state.session.submit(answer);
  if (!attempt) return;
  clearPending();
  updatePractice();
}

app.addEventListener('click', event => {
  const answer = event.target.closest('[data-answer]');
  if (answer) { submit(answer.dataset.answer); return; }
  const control = event.target.closest('[data-action]');
  if (!control) return;
  event.preventDefault();
  const action = control.dataset.action;
  if (action === 'home' || action === 'practice') navigate(action);
  else if (action === 'pause') {
    clearPending();
    state.session.pause();
    practiceView.update(state.session);
    main.querySelector('#pause-cover button').focus({ preventScroll: true });
  } else if (action === 'resume') {
    if (document.hidden) return;
    clearPending();
    state.session.resume();
    updatePractice();
    main.querySelector('[data-answer]').focus({ preventScroll: true });
  } else if (action === 'next') advance();
  else if (action === 'new-session') {
    if (state.session.attempts.length) {
      document.querySelector('#reset-dialog').showModal();
      document.querySelector('[data-action="cancel-new-session"]').focus();
    } else startNewSession();
  } else if (action === 'cancel-new-session') {
    document.querySelector('#reset-dialog').close();
  } else if (action === 'confirm-new-session') {
    startNewSession();
  }
});

document.addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey ||
      state.screen !== 'practice' || document.hidden || document.querySelector('dialog[open]')) return;
  if (event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
  const answer = event.key.toUpperCase();
  if (/^[A-G]$/.test(answer)) {
    event.preventDefault();
    submit(answer);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.screen === 'practice') {
    clearPending();
    state.session.pause();
    practiceView.update(state.session);
  }
  // Stay paused until the user explicitly resumes.
});

window.addEventListener('hashchange', () => {
  if (['', '#home', '#practice'].includes(location.hash)) {
    showScreen(location.hash === '#practice' ? 'practice' : 'home');
  }
});
showScreen(location.hash === '#practice' ? 'practice' : 'home', { focus: false });
setInterval(() => {
  if (state.screen === 'practice' && !document.hidden) practiceView?.updateStatistics(state.session);
}, 250);
