import { adaptiveNote } from '../learning/adaptive.js';
import { SEQUENCE_STRATEGIES, INTERVAL_MIXES } from '../config.js';
import { naturalNotesBetween } from '../music/notes.js';
import { activeClefs, validateConfiguration } from './configuration.js';

export function randomIndex(length, random) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Random source must produce a value in [0, 1)');
  return Math.floor(value * length);
}
const pick = (values, random) => values[randomIndex(values.length, random)];
// Reflect at range ends; this always terminates, including a single eligible pitch.
const reflect = (index, length) => {
  if (length === 1) return 0;
  const period = 2 * (length - 1), offset = ((index % period) + period) % period;
  return offset < length ? offset : period - offset;
};

export function createSequenceGenerator(input, random = Math.random, learning = {}) {
  const config = validateConfiguration(input);
  if (config.exerciseType !== 'sequence') throw new RangeError('Sequence configuration required');
  const clefs = activeClefs(config);
  const pools = Object.fromEntries(clefs.map(clef => [clef,
    naturalNotesBetween(config.ranges[clef].minMidi, config.ranges[clef].maxMidi)]));
  let previous=null;
  return (length = config.sequenceLength) => {
    if (!Number.isInteger(length) || length < 1 || length > config.sequenceLength) throw new RangeError('Invalid sequence length');
    const clef = clefs.length === 1 ? clefs[0] : pick(clefs, random);
    const pool = pools[clef], strategy = config.sequenceStrategy;
    const adaptive=config.selectionMode && config.selectionMode!=='uniform';
    const choose = previousMidi => adaptiveNote(pool,clef,config,learning.getAttempts?.() ?? [],previousMidi,random,learning.now?.() ?? Date.now());
    let index = adaptive ? pool.indexOf(choose(previous?.clef===clef?previous.midi:null)) : randomIndex(pool.length, random);
    const notes = [pool[index]];
    const direction = pick([-1, 1], random);
    const contour = SEQUENCE_STRATEGIES.melodic.contour;
    for (let position = 1; position < length; position++) {
      if (strategy === 'random') index = adaptive ? pool.indexOf(choose(pool[index].midi)) : randomIndex(pool.length, random);
      else {
        let step;
        if (strategy === 'stepwise') {
          step = pick([-1, 1], random) *
            (randomIndex(100, random) < SEQUENCE_STRATEGIES.stepwise.adjacentWeight * 100 ? 1 : 2);
        } else if (strategy === 'melodic') step = direction * contour[(position - 1) % contour.length];
        else if (strategy === 'repeated') {
          step = randomIndex(100, random) < SEQUENCE_STRATEGIES.repeated.repeatWeight * 100 || position === 1 ? 0 : pick([-2, -1, 1, 2], random);
        } else step = pick([-1, 1], random) * pick(INTERVAL_MIXES[config.intervalMix], random);
        index = reflect(index + step, pool.length);
      }
      notes.push(pool[index]);
    }
    previous={clef,midi:notes.at(-1).midi};
    return Object.freeze({ clef, notes: Object.freeze(notes) });
  };
}
