import { keyboardAnswer } from './note-names.js';

/** Genuine repeated presses are allowed; held keys and second clicks of a double-click are not. */
export function createAnswerInput() {
  const held = new Set();
  return {
    keydown(event, naming) {
      const key = String(event.key).toLowerCase();
      if (event.repeat || held.has(key) || event.altKey || event.ctrlKey || event.metaKey) return null;
      held.add(key);
      return keyboardAnswer(event.key, naming);
    },
    keyup(event) { held.delete(String(event.key).toLowerCase()); },
    reset() { held.clear(); },
    pointerAllowed(event) { return event.pointerType === 'touch' || event.detail <= 1; },
  };
}
