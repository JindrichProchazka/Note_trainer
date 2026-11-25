import { distributionWeight } from '../exercises/distribution.js';
import { naturalNotesBetween, writtenName } from '../music/notes.js';
import { contextId, compareAttempts } from './context.js';
import { learningState, median } from './mastery.js';
export const ADAPTIVE_RULES=Object.freeze({
  window:20, evidenceTarget:20, weakEvidence:5, accuracyTarget:.8, dueDays:14,
  singleTargetMs:1000, sequenceTargetMs:500, grandTargetMs:2000, repeatMultiplier:.08,
  base:1, error:4, slow:2, sparse:2, overdue:2, learning:1, focusBonus:8,
});
export function compatibilityKey(config) {
  return JSON.stringify([config.exerciseType,config.inputMethod,
    ...(config.exerciseType==='grand-staff'?[config.feedbackMode]:[]),...(config.octaveMarkers?['octave-markers']:[]),
    ...(config.exerciseType==='sequence'?[config.sequenceLength,config.sequenceStrategy,config.feedbackMode,config.sequenceStrategy==='intervals'?config.intervalMix:null]:[]),
    ...(config.inputMethod==='piano'?[config.keyboardMin,config.keyboardMax,config.noteLabels]:[])]);
}
export function compatibleAttempts(data,config) {
  const key=compatibilityKey(config);
  return data.sessions.filter(record=>compatibilityKey(record.session.config)===key).flatMap(record=>record.attempts);
}
export function contextProfile(context,attempts,now=Date.now(),rules=ADAPTIVE_RULES) {
  const id=contextId(context), unique=new Map();
  for(const attempt of attempts) if(attempt.contextId===id)unique.set(attempt.id,attempt);
  const ordered=[...unique.values()].sort(compareAttempts), recent=ordered.slice(-rules.window);
  const correct=recent.filter(a=>a.correct);
  const accuracy=recent.length?correct.length/recent.length:null;
  const response=median(correct.map(a=>a.responseTimeMs));
  const days=ordered.length?Math.max(0,(now-Date.parse(ordered.at(-1).timestamp))/86400000):0;
  const target=context.exerciseType==='grand-staff'?rules.grandTargetMs:context.exerciseType==='sequence'?rules.sequenceTargetMs:rules.singleTargetMs;
  const reasons=[];
  if(!ordered.length)reasons.push('unseen');
  else {
    if(ordered.length<rules.weakEvidence)reasons.push('evidence');
    if(accuracy<rules.accuracyTarget)reasons.push('accuracy');
    if(response!==null&&response>target)reasons.push('speed');
    if(days>=rules.dueDays)reasons.push('overdue');
  }
  const state=learningState(ordered);
  const weight=rules.base+rules.error*(accuracy===null?.5:1-accuracy)+
    rules.slow*(response===null?0:Math.min(1,Math.max(0,response/target-1)))+
    rules.sparse*(1-Math.min(ordered.length/rules.evidenceTarget,1))+
    rules.overdue*Math.min(days/rules.dueDays,1)+(state==='learning'?rules.learning:0);
  return {...context,contextId:id,attempts:ordered.length,accuracy,response,days,state,reasons,
    mistakes:recent.some(a=>!a.correct),weight};
}
export function analyzePractice(config,attempts,now=Date.now()) {
  const clefs=['mixed','grand'].includes(config.clef)?['treble','bass']:[config.clef];
  return clefs.flatMap(clef=>naturalNotesBetween(config.ranges[clef].minMidi,config.ranges[clef].maxMidi)
    .map(note=>({...contextProfile({writtenNote:writtenName(note),clef,exerciseType:config.exerciseType,inputMethod:config.inputMethod},attempts,now),note})));
}
export function weightedPick(items,weights,random=Math.random) {
  if(!items.length||weights.length!==items.length||weights.some(w=>!Number.isFinite(w)||w<=0))throw new RangeError('Positive weights required');
  const r=random();if(!Number.isFinite(r)||r<0||r>=1)throw new RangeError('Invalid random source');
  let value=r*weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<items.length;i++){value-=weights[i];if(value<0)return items[i];}
  return items.at(-1);
}
export function adaptiveNote(notes,clef,config,attempts,previousMidi,random=Math.random,now=Date.now(),rules=ADAPTIVE_RULES) {
  const weights=notes.map(note=>{
    const profile=contextProfile({writtenNote:writtenName(note),clef,exerciseType:config.exerciseType,inputMethod:config.inputMethod},attempts,now,rules);
    const focus=config.selectionMode==='mistakes'?profile.mistakes:config.selectionMode==='weak'?profile.reasons.length>0:false;
    return distributionWeight(note,clef,config)*(profile.weight+(focus?rules.focusBonus:0))*(notes.length>1&&note.midi===previousMidi?rules.repeatMultiplier:1);
  });
  return weightedPick(notes,weights,random);
}
