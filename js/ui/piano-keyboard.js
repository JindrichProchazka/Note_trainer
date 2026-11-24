import { pianoKeys } from '../music/piano.js';
import { noteName } from './note-names.js';
import { PIANO } from './piano-strings.js';
export function pianoMarkup(config) {
  const layout = pianoKeys(config.keyboardMin, config.keyboardMax);
  return `<div class="piano-input"><div class="piano-toolbar"><span>${PIANO.title}</span>
    <button class="button subtle" data-action="piano-left" aria-label="${PIANO.previous}">←</button>
    <button class="button subtle" data-action="piano-right" aria-label="${PIANO.next}">→</button></div>
    <p class="piano-hint">${PIANO.hint}</p>
    <div class="piano-scroll" role="group" aria-label="${PIANO.title}">
      <div class="piano-keys" style="width:${layout.width}px">${layout.keys.map(key => `<button class="piano-key ${key.black ? 'black-key' : 'white-key'}"
        style="left:${key.left}px" data-piano="${key.midi}" aria-disabled="true"
        aria-label="${PIANO.play(noteName(key.note,config.naming))}">${config.noteLabels ? '<span>' + noteName(key.note,config.naming) + '</span>' : ''}</button>`).join('')}</div>
    </div></div>`;
}
export class PianoInputView {
  constructor(root, base) {
    this.root=root;this.base=base;this.token=null;
    this.scroll=root.querySelector('.piano-scroll');
    this.observer = new ResizeObserver(()=>this.ensureVisible());
    this.observer.observe(this.scroll);
  }
  ensureVisible() {
    if (!this.session) return;
    const session=this.session, note=session.question.notes?.[Math.min(session.itemIndex, session.question.notes.length-1)] ?? session.question.note;
    const key=this.root.querySelector('[data-piano="' + note.midi + '"]');
    if (!key) return;
    if (key.offsetLeft < this.scroll.scrollLeft || key.offsetLeft+key.offsetWidth > this.scroll.scrollLeft+this.scroll.clientWidth) {
      const octaveStart = this.root.querySelector('[data-piano="' + (12 * Math.floor(note.midi/12)) + '"]');
      this.scroll.scrollLeft=Math.max(0,(octaveStart?.offsetLeft ?? key.offsetLeft)-48);
      if(key.offsetLeft+key.offsetWidth>this.scroll.scrollLeft+this.scroll.clientWidth)
        this.scroll.scrollLeft=key.offsetLeft+key.offsetWidth-this.scroll.clientWidth+8;
    }
  }
  update(session) {
    this.session=session;this.base.update(session);
    const token=session.question.id + ':' + (session.itemIndex ?? 0);
    if(this.token!==token){this.token=token;this.ensureVisible();}
    if(['feedback','complete'].includes(session.phase))this.ensureVisible();
    const sequence=session.config.exerciseType==='sequence';
    const revealed=!sequence || session.config.feedbackMode==='immediate' || session.sequenceReviewed;
    const attempt=session.attempts.at(-1);
    this.root.querySelectorAll('[data-piano]').forEach(key=>{
      key.setAttribute('aria-disabled',String(session.phase!=='awaiting'));delete key.dataset.result;
      if(revealed && attempt && (!sequence && ['feedback','complete'].includes(session.phase) || sequence && session.sequenceReviewed)){
        if(Number(key.dataset.piano)===attempt.midi)key.dataset.result='correct';
        else if(Number(key.dataset.piano)===attempt.answer)key.dataset.result='incorrect';
      }
    });
    if(!sequence && ['feedback','complete'].includes(session.phase) && attempt && !attempt.correct)
      this.root.querySelector('#feedback-detail').textContent=PIANO.feedbackHint;
    if(!sequence && session.phase==='awaiting') this.root.querySelector('#feedback-message').textContent=PIANO.instruction;
    if(sequence && session.config.feedbackMode==='immediate' && !session.currentAnswers.length && session.phase!=='paused')
      this.root.querySelector('#feedback-detail').textContent=PIANO.hint;
    if(!sequence && !['feedback','complete','paused'].includes(session.phase))
      this.root.querySelector('#feedback-detail').textContent=PIANO.hint;
  }
  updateStatistics(session){this.base.updateStatistics(session);}
  dispose(){this.observer.disconnect();this.base.dispose?.();}
}
