import { PracticeSession } from './session.js';
import { validAnswer,correctAnswer } from '../exercises/answers.js';
import { writtenName } from '../music/notes.js';
import { contextId } from '../learning/context.js';
import { localDay,splitActiveDuration } from '../learning/dates.js';
import { pairSummary } from './pair-statistics.js';
/** Two independent answers share one readiness clock. Pair review pauses practice. */
export class GrandSession extends PracticeSession {
  constructor(options){super(options);if(this.config.exerciseType!=='grand-staff')throw new RangeError('Grand Staff configuration required');this.pairs=[];}
  makeQuestion(){
    this.captureActivity();
    const target=this.generateQuestion(this.question),id=this.id+':pair:'+(++this.questionCount);
    this.question=Object.freeze({id,...target});
    this.pairs.push(Object.freeze({id,ordinal:this.questionCount,notes:Object.freeze(Object.fromEntries(
      ['treble','bass'].map(clef=>[clef,writtenName(target.notes[clef])]))),createdAt:this.isoNow()}));
    this.responseMs=0;this.readyAt=null;this.phase='presenting';
  }
  get currentAnswers(){return this.attempts.filter(a=>a.pairId===this.question?.id);}
  get pairReviewed(){return this.currentAnswers.length===2;}
  get holdFinalReview(){return this.phase==='complete'&&this.completionReason==='count'&&this.pairReviewed;}
  submit(answer,clef,expectedPair=this.question?.id){
    if(this.tick()||this.phase!=='awaiting'||expectedPair!==this.question.id||
      !['treble','bass'].includes(clef)||this.currentAnswers.some(a=>a.clef===clef)||!validAnswer(answer,this.config))return null;
    const now=this.clock(),note=this.question.notes[clef];this.captureActivity(now);
    const context={writtenNote:writtenName(note),clef,exerciseType:'grand-staff',inputMethod:'letter'},timestamp=this.isoNow();
    const attempt=Object.freeze({id:this.question.id+':'+clef+':answer',sessionId:this.id,questionId:this.question.id,
      pairId:this.question.id,itemIndex:clef==='treble'?0:1,ordinal:this.attempts.length+1,
      midi:note.midi,octave:note.octave,...context,contextId:contextId(context),answer,
      correct:correctAnswer(note,answer,this.config),responseTimeMs:Math.max(0,this.responseMs+now-this.readyAt),timestamp,day:localDay(timestamp)});
    this.attempts.push(attempt);
    if(this.pairReviewed){
      this.activeMs+=this.activeSince===null?0:now-this.activeSince;
      this.activeSince=null;this.activityWallAt=null;this.readyAt=null;this.phase='feedback';
      if(this.config.sessionType==='count'&&this.attempts.length===this.config.questionCount*2)this.finish('count');
      else this.emitChange();
    }else this.emitChange();
    return attempt;
  }
  resume(){
    if(this.phase==='paused'&&this.resumePhase==='feedback'){this.phase='feedback';this.resumePhase=null;this.emitChange();return true;}
    return super.resume();
  }
  captureActivity(now=this.clock()){
    if(this.activeSince===null||this.activityWallAt===null||!this.question)return false;
    const elapsed=Math.max(0,this.activeMs+now-this.activeSince);
    const duration=this.config.sessionType==='timed'?Math.min(elapsed,this.config.durationMs):elapsed;
    const delta=Math.max(0,duration-this.recordedDurationMs);if(!delta)return false;
    for(const part of splitActiveDuration(this.activityWallAt,delta))for(const clef of ['treble','bass']){
      let bucket=this.activity.find(item=>item.day===part.day&&item.clef===clef);
      if(!bucket){bucket={day:part.day,clef,exerciseType:'grand-staff',inputMethod:'letter',durationMs:0};this.activity.push(bucket);}
      bucket.durationMs+=part.durationMs/2; // Shared viewing time is split, never counted twice.
    }
    this.recordedDurationMs+=delta;this.activityWallAt=this.wallClock();return true;
  }
  get summary(){return {...super.summary,...pairSummary(this.pairs,this.attempts)};}
}
