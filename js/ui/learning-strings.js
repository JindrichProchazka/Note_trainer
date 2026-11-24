export const LEARN=Object.freeze({
  selection:'Question selection', modes:{uniform:'Uniform practice',adaptive:'Adaptive practice',weak:'Practice Weak Notes',mistakes:'Practice Mistakes'},
  hint:'Adaptive practice balances mistakes, speed, evidence and recency. Every eligible note remains possible. Structured sequences adapt the starting pitch and retain their contour.',
  title:'Practice with a purpose', ready:'All selected notes are ready for review.',
  scope:'Suggestions use the selected clefs, ranges, exercise and input. Sequence speed is evaluated separately.',
  noMistakes:'No recent mistakes in this configuration. Mistake practice will explore eligible notes.',
  reasons:{unseen:'Not practiced',evidence:'Limited evidence',accuracy:'Recent mistakes',speed:'Slower responses',overdue:'Due for review'},
  error:'Choose a supported question selection mode.',
  explanation:'Weights: base 1 + error (0–4) + slow response (0–2) + limited evidence (0–2) + time since practice (0–2) + Learning state (0–1). Focus modes add 8; immediate repeats are reduced to 8% of their weight.',
});
