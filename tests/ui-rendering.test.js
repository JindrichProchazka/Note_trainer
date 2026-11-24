import test from 'node:test';
import assert from 'node:assert/strict';
import { PracticeSession } from '../js/session/session.js';
import { configurationForPreset } from '../js/exercises/configuration.js';
import { summaryMarkup } from '../js/ui/summary.js';
import { configurationMarkup } from '../js/ui/configuration.js';
import { homeMarkup } from '../js/ui/home.js';
import { practiceMarkup } from '../js/ui/practice.js';
import { settingsMarkup } from '../js/ui/settings.js';
import { DEFAULT_SETTINGS } from '../js/config.js';

test('all preset screen templates render without missing interface copy or invalid values',()=>{
  for(const id of ['treble-beginner','treble-basic','treble-staff','treble-extended','bass-beginner','bass-staff','bass-extended','mixed']){
    const config=configurationForPreset(id);
    const session=new PracticeSession({config});
    const html=homeMarkup(session,config)+configurationMarkup(config)+practiceMarkup(config)+settingsMarkup(DEFAULT_SETTINGS,'ok');
    assert.doesNotMatch(html,/undefined|NaN|Infinity/);
    assert.match(html,/Answer H/);
  }
});
test('summary presents Czech H names, correct-only median, and the actual clef',()=>{
  const config=configurationForPreset('treble-basic');
  const session=new PracticeSession({config,random:()=>.87,clock:()=>500});
  session.start();session.markReady();
  assert.equal(session.question.note.letter,'B');
  session.submit('C');session.finish();
  const html=summaryMarkup(session);
  assert.match(html,/<strong>H4<\/strong>/);
  assert.match(html,/Treble clef/);
  assert.doesNotMatch(html,/NaN|Infinity|undefined/);
});
test('custom duration and count controls remain visible even at preset numeric values',()=>{
  const config=configurationForPreset('treble-basic',{sessionType:'timed'});
  const html=configurationMarkup({...config,customDuration:true,customCount:true});
  assert.match(html,/<label class="form-field" for="duration-custom">/);
  assert.match(html,/<option value="custom" selected>/);
});
