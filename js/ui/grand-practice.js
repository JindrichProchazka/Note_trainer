import { PracticeView,practiceMarkup } from './practice.js';
import { GRAND } from './usability-strings.js';
import { TEXT } from './strings.js';
import { LETTERS } from '../music/notes.js';
import { renderGrandStaff } from '../music/notation.js';
import { noteName,letterName,answerName } from './note-names.js';
export function grandPracticeMarkup(config){
  const rows='<div class="grand-answers">'+['treble','bass'].map(clef=>
    '<section class="grand-answer-row" data-grand-clef="'+clef+'"><button class="grand-hand" data-action="grand-focus" data-clef="'+clef+'" aria-pressed="'+(clef==='treble')+'">'+GRAND[clef]+'</button>'+
    '<div class="answer-buttons" role="group" aria-label="'+GRAND[clef]+'">'+LETTERS.map(letter=>
      '<button class="answer-button" data-answer="'+letter+'" aria-label="'+GRAND[clef]+': '+letterName(letter,config.naming)+'" aria-disabled="true">'+letterName(letter,config.naming)+'</button>').join('')+
    '</div><p class="grand-answer-feedback" aria-live="polite"></p></section>').join('')+'</div>';
  return practiceMarkup(config).replace('class="practice-view"','class="practice-view grand-practice"')
    .replace(TEXT.practiceEyebrow,GRAND.eyebrow).replace(TEXT.practiceTitle,GRAND.title)
    .replace(/<div class="answer-buttons"[^>]*>[\s\S]*?<\/div>/,rows);
}
export class GrandPracticeView {
  constructor(root){this.root=root;this.stats=new PracticeView(root);this.activeClef='treble';}
  focusStaff(clef){if(['treble','bass'].includes(clef)){this.activeClef=clef;this.update(this.session);}}
  update(session){
    if(!session)return;this.session=session;
    const paused=session.phase==='paused',complete=session.phase==='complete';
    const revealed=session.config.feedbackMode==='immediate'||session.pairReviewed||['complete','interrupted'].includes(session.phase);
    const answers=session.currentAnswers,results={};
    if(answers.some(a=>a.clef===this.activeClef)&&answers.length===1)this.activeClef=answers[0].clef==='treble'?'bass':'treble';
    for(const clef of ['treble','bass']){
      const attempt=answers.find(a=>a.clef===clef),row=this.root.querySelector('[data-grand-clef="'+clef+'"]');
      row.querySelector('.grand-hand').setAttribute('aria-pressed',String(this.activeClef===clef));
      row.querySelectorAll('[data-answer]').forEach(button=>{
        button.setAttribute('aria-disabled',String(paused||session.phase!=='awaiting'||!!attempt));delete button.dataset.result;
        if(attempt&&revealed){
          if(button.dataset.answer===session.question.notes[clef].letter)button.dataset.result='correct';
          else if(button.dataset.answer===attempt.answer)button.dataset.result='incorrect';
        }
      });
      row.querySelector('.grand-answer-feedback').textContent=attempt?revealed?
        attempt.correct?TEXT.correctFeedback(noteName(session.question.notes[clef],session.config.naming)):
          TEXT.incorrectFeedback(answerName(attempt.answer,session.config.naming),noteName(session.question.notes[clef],session.config.naming)):GRAND.saved:'';
      results[clef]=attempt?revealed?attempt.correct?'correct':'incorrect':'answered':'unanswered';
    }
    this.root.querySelector('#question-notation').innerHTML=renderGrandStaff(session.question.notes,GRAND.instruction,results);
    this.root.querySelector('#staff-caption').textContent=GRAND.name;
    this.root.querySelector('#pause-cover').hidden=!paused;
    this.root.querySelector('.staff-stage').classList.toggle('is-paused',paused);
    const pause=this.root.querySelector('#pause-button');pause.textContent=paused?TEXT.resumeShort:TEXT.pause;pause.dataset.action=paused?'resume':'pause';pause.disabled=complete;
    this.root.querySelector('#finish-button').disabled=complete;
    const next=this.root.querySelector('#next-button');next.hidden=!session.pairReviewed||paused;next.textContent=(complete?TEXT.viewSummary:GRAND.next)+' →';
    this.root.querySelector('#feedback-message').textContent=paused?TEXT.paused:session.pairReviewed?GRAND.review:GRAND.answers(answers.length)+' · '+GRAND.instruction;
    this.root.querySelector('#feedback-detail').textContent=GRAND.keyboardHint;
    this.updateStatistics(session);
  }
  updateStatistics(session){
    this.stats.updateStatistics(session,session.config.feedbackMode==='delayed'&&!session.pairReviewed&&!['complete','interrupted'].includes(session.phase));
    if(session.config.sessionType!=='timed')this.root.querySelector('#session-progress').textContent=GRAND.pairCount(session.questionCount,session.config.sessionType==='count'?session.config.questionCount:null);
  }
}
