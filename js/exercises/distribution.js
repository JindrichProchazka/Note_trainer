import { BASIC_RANGES } from '../config.js';
/** Sixfold emphasis outside Basic; threefold on other notes outside the staff. */
export function distributionWeight(note,clef,config){
  if(config.noteDistribution!=='extended')return 1;
  const basic=BASIC_RANGES[clef],staff=clef==='treble'?[64,77]:[43,57];
  return note.midi<basic.minMidi||note.midi>basic.maxMidi?6:note.midi<staff[0]||note.midi>staff[1]?3:1;
}
