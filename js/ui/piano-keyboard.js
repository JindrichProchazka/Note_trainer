import { pianoKeys,midiNote } from '../music/piano.js';
import { keyboardPages,keyboardGeometry } from '../music/piano-layout.js';
import { noteName } from './note-names.js';
import { PIANO } from './piano-strings.js';
import { V11 } from './usability-strings.js';
function keysMarkup(config,layout){
  return layout.keys.map(key=>'<button class="piano-key '+(key.black?'black-key':'white-key')+'" style="left:'+key.left+'px" data-piano="'+key.midi+
    '" aria-disabled="true" aria-label="'+PIANO.play(noteName(key.note,config.naming))+'">'+
    (config.noteLabels?'<span>'+noteName(key.note,config.naming)+'</span>':
      config.octaveMarkers&&key.note.letter==='C'&&!key.black?'<span class="octave-marker">'+(key.midi===60?'C4 · '+V11.middleC:noteName(key.note,'international'))+'</span>':'')+'</button>').join('');
}
export function pianoMarkup(config){
  const layout=pianoKeys(config.keyboardMin,config.keyboardMax);
  return '<div class="piano-input"><div class="piano-toolbar"><button class="button subtle" data-action="piano-left" aria-label="'+V11.previousOctave+'">←</button>'+
    '<span class="piano-page-range" role="status">'+PIANO.title+'</span><button class="button subtle" data-action="piano-right" aria-label="'+V11.nextOctave+'">→</button></div>'+
    '<p class="piano-hint">'+V11.pianoHint+'</p><div class="piano-scroll" role="group" aria-label="'+PIANO.title+'"><div class="piano-keys" style="width:'+layout.width+'px">'+keysMarkup(config,layout)+'</div></div></div>';
}
export class PianoInputView {
  constructor(root,base){
    this.root=root;this.base=base;this.scroll=root.querySelector('.piano-scroll');this.anchor=null;this.layoutKey=null;
    this.observer=new ResizeObserver(()=>this.layout());this.observer.observe(this.scroll);
  }
  layout(){
    if(!this.session||!this.scroll.clientWidth)return;
    const config=this.session.config,width=this.scroll.clientWidth,pages=keyboardPages(config.keyboardMin,config.keyboardMax,width);
    const page=Math.max(0,pages.findIndex(p=>this.anchor!==null&&this.anchor>=p.min&&this.anchor<=p.max)),range=pages[page];
    this.pages=pages;this.page=page;
    if(this.anchor===null)this.anchor=range.min;
    const key=[range.min,range.max,width,config.noteLabels,config.octaveMarkers].join(':');
    if(this.layoutKey!==key){
      this.layoutKey=key;
      const focused=this.root.querySelector('.piano-key:focus')?.dataset.piano,layout=keyboardGeometry(range.min,range.max,width);
      const host=this.root.querySelector('.piano-keys');
      host.style.width=layout.width+'px';host.style.setProperty('--white-width',layout.whiteWidth+'px');host.style.setProperty('--black-width',layout.blackWidth+'px');
      host.innerHTML=keysMarkup(config,layout);
      if(focused)this.root.querySelector('[data-piano="'+focused+'"]')?.focus({preventScroll:true});
    }
    this.root.querySelector('.piano-page-range').textContent=V11.page(noteName(midiNote(range.min),config.naming),noteName(midiNote(range.max),config.naming),page+1,pages.length);
    for(const [action,disabled]of [['piano-left',page===0],['piano-right',page===pages.length-1]]){
      const button=this.root.querySelector('[data-action="'+action+'"]');button.disabled=disabled;button.hidden=pages.length===1;
    }
    this.root.querySelector('.piano-hint').hidden=pages.length===1;
    this.paintKeys();
  }
  navigate(direction){
    if(!this.pages)return;
    const next=Math.max(0,Math.min(this.pages.length-1,this.page+direction));
    if(next!==this.page){this.anchor=this.pages[next].min+0.1;this.layout();}
  }
  paintKeys(){
    const session=this.session;if(!session)return;
    const sequence=session.config.exerciseType==='sequence',revealed=!sequence||session.config.feedbackMode==='immediate'||session.sequenceReviewed;
    const attempt=session.attempts.at(-1);
    this.root.querySelectorAll('[data-piano]').forEach(key=>{
      key.setAttribute('aria-disabled',String(session.phase!=='awaiting'));delete key.dataset.result;
      if(revealed&&attempt&&(!sequence&&['feedback','complete'].includes(session.phase)||sequence&&session.sequenceReviewed)){
        if(Number(key.dataset.piano)===attempt.midi)key.dataset.result='correct';
        else if(Number(key.dataset.piano)===attempt.answer)key.dataset.result='incorrect';
      }
    });
  }
  update(session){
    this.session=session;this.base.update(session);this.layout();
    if(session.config.exerciseType!=='sequence'){
      if(session.phase==='awaiting')this.root.querySelector('#feedback-message').textContent=PIANO.instruction;
      if(!['feedback','complete','paused'].includes(session.phase))this.root.querySelector('#feedback-detail').textContent='';
      if(['feedback','complete'].includes(session.phase)&&session.attempts.at(-1)&&!session.attempts.at(-1).correct)
        this.root.querySelector('#feedback-detail').textContent=PIANO.feedbackHint;
    }
  }
  navigateSystem(direction){this.base.navigateSystem?.(direction);}
  updateStatistics(session){this.base.updateStatistics(session);}
  dispose(){this.observer.disconnect();this.base.dispose?.();}
}
