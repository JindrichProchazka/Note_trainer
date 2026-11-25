import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, EXERCISE_CONFIG, DEFAULT_SETTINGS } from '../js/config.js';
import { naturalNotesBetween, writtenName } from '../js/music/notes.js';
import { configurationForPreset, configurationFromSettings, validateConfiguration } from '../js/exercises/configuration.js';
import { distributionWeight } from '../js/exercises/distribution.js';
import { createQuestionGenerator, nextNote } from '../js/exercises/generator.js';

const expected = {
  'treble-beginner': ['treble',60,67], 'treble-basic':['treble',60,77],
  'treble-staff':['treble',64,77], 'treble-extended':['treble',57,84],
  'bass-beginner':['bass',43,50], 'bass-staff':['bass',43,57], 'bass-extended':['bass',36,64],
};
for (const [id,[clef,min,max]] of Object.entries(expected)) {
  test(`${id} implements the specified natural-note range`,()=>{
    const config=configurationForPreset(id);
    assert.equal(config.clef,clef);
    assert.deepEqual(config.ranges[clef],{minMidi:min,maxMidi:max});
    const pool=naturalNotesBetween(min,max);
    for(let i=0;i<pool.length;i++){
      const weights=pool.map(note=>distributionWeight(note,clef,config)),total=weights.reduce((a,b)=>a+b,0);
      const midpoint=(weights.slice(0,i).reduce((a,b)=>a+b,0)+weights[i]/2)/total;
      const generate=createQuestionGenerator(config,()=>midpoint);
      assert.equal(generate().note.midi,pool[i].midi);
    }
  });
}
test('natural ranges filter semitone bounds, preserve octaves, and reject invalid bounds',()=>{
  assert.deepEqual(naturalNotesBetween(61,66).map(writtenName),['D4','E4','F4']);
  assert.deepEqual(naturalNotesBetween(61,61),[]);
  assert.deepEqual(naturalNotesBetween(71,72).map(writtenName),['B4','C5']);
  for(const bounds of [[72,60],[-1,60],[60,128],[60.5,72],[NaN,72]])assert.throws(()=>naturalNotesBetween(...bounds),RangeError);
});
test('mixed preset uses common Basic ranges in both independently selected clefs',()=>{
  const config=configurationForPreset('mixed');
  assert.equal(config.clef,'mixed');
  assert.deepEqual(config.ranges,{treble:{minMidi:60,maxMidi:77},bass:{minMidi:43,maxMidi:60}});
});
test('mixed clefs are equally reachable and use independent custom ranges',()=>{
  const config=validateConfiguration({...EXERCISE_CONFIG,presetId:'custom',clef:'mixed',
    ranges:{treble:{minMidi:83,maxMidi:84},bass:{minMidi:36,maxMidi:38}}});
  for(const value of [0,.49,.5,.99]){
    const generate=createQuestionGenerator(config,()=>value);
    const target=generate();
    assert.equal(target.clef,value<.5?'treble':'bass');
    assert.ok(target.note.midi>=config.ranges[target.clef].minMidi);
    assert.ok(target.note.midi<=config.ranges[target.clef].maxMidi);
  }
});
test('no generated question escapes its preset during a deterministic random run',()=>{
  let seed=1;
  const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
  for(const id of Object.keys(PRESETS)){
    const config=configurationForPreset(id), generate=createQuestionGenerator(config,random);
    let previous=null;
    for(let i=0;i<500;i++){
      const target=generate(previous), targets=target.clef==='grand'?Object.entries(target.notes):[[target.clef,target.note]];
      for(const [clef,note]of targets){const range=config.ranges[clef];assert.ok(note.midi>=range.minMidi && note.midi<=range.maxMidi);assert.equal(note.accidental,0);}
      if(previous?.clef===target.clef&&target.clef!=='grand'&&!id.endsWith('-random'))assert.notEqual(previous.note.midi,target.note.midi);
      previous=target;
    }
  }
});
test('a single-pitch range stays answerable without an infinite repetition loop',()=>{
  const config=validateConfiguration({...EXERCISE_CONFIG,presetId:'custom',
    ranges:{...EXERCISE_CONFIG.ranges,treble:{minMidi:71,maxMidi:71}}});
  const generate=createQuestionGenerator(config,()=>0);
  const first=generate();
  assert.equal(generate(first).note.midi,71);
  assert.throws(()=>nextNote(null,()=>0,[]),RangeError);
});
test('invalid configurations are rejected before starting',()=>{
  for(const patch of [
    {clef:'alto'},{naming:'unknown'},{sessionType:'other'},{presetId:'missing'},
    {sessionType:'timed',durationMs:4999},{sessionType:'timed',durationMs:3600001},
    {sessionType:'timed',durationMs:NaN},{sessionType:'timed',durationMs:5500},
    {sessionType:'count',questionCount:0},{sessionType:'count',questionCount:1.5},
    {ranges:{treble:{minMidi:72,maxMidi:60},bass:EXERCISE_CONFIG.ranges.bass}},
    {ranges:{treble:{minMidi:61,maxMidi:72},bass:EXERCISE_CONFIG.ranges.bass}},
    {ranges:{treble:{minMidi:35,maxMidi:72},bass:EXERCISE_CONFIG.ranges.bass}},
    {ranges:null},
  ])assert.throws(()=>validateConfiguration({...EXERCISE_CONFIG,...patch}),RangeError);
  assert.throws(()=>configurationForPreset('missing'),RangeError);
});
test('preset identity cannot claim a different clef or range',()=>{
  assert.throws(()=>validateConfiguration({...EXERCISE_CONFIG,clef:'bass'}),RangeError);
  const config=configurationFromSettings(DEFAULT_SETTINGS);
  assert.equal(config.naming,'czech');
  assert.equal(config.presetId,'treble-basic');
  assert.ok(Object.isFrozen(config.ranges.treble));
});

test('hidden ranges and inactive session limits cannot block a valid selected exercise',()=>{
  const config=validateConfiguration({...EXERCISE_CONFIG,durationMs:NaN,questionCount:0,
    ranges:{treble:EXERCISE_CONFIG.ranges.treble,bass:{minMidi:72,maxMidi:36}}});
  assert.equal(config.durationMs,60000);
  assert.equal(config.questionCount,10);
  assert.equal(config.clef,'treble');
  const timed=validateConfiguration({...EXERCISE_CONFIG,sessionType:'timed',durationMs:5000,questionCount:NaN});
  assert.equal(timed.questionCount,10);
});
