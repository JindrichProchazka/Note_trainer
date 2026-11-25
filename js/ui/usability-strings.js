export const V11=Object.freeze({
  basic:'Common positions',extended:'Ledger-line emphasis',random:'Uniform full-range random',uniform:'Uniform selection',
  randomHint:'Random presets use uniform full-range selection, without adaptive weighting or melodic constraints.',
  marker:'Show octave reference markers',page:(low,high,page,total)=>low+'–'+high+(total>1?' · '+page+'/'+total:''),
  pianoHint:'The keyboard stays still. Use octave buttons for wider ranges, or turn your phone sideways.',
  previousOctave:'Previous keyboard octave',nextOctave:'Next keyboard octave',middleC:'Middle C',
  pageSystem:'Staff page',previousSystem:'Previous staff page',nextSystem:'Next staff page',
});
export const GRAND=Object.freeze({
  title:'Read both staves.',eyebrow:'GRAND STAFF',name:'Grand Staff',treble:'Treble / Right hand',bass:'Bass / Left hand',
  instruction:'Answer either staff first.',saved:'Answer saved.',review:'Pair review',next:'Next pair',
  answers:count=>count+'/2 answered',pairCount:(current,total)=>'Pair '+current+(total?' / '+total:''),
  pairs:count=>count+' '+(count===1?'pair':'pairs'),count:'Note pairs',customCount:'Custom pair count',
  countHint:'Counted sessions count pairs. Statistics record each answered note separately.',
  timingHint:'Both response clocks start when the pair is ready. Compare Grand Staff with the same feedback mode, not isolated notes.',
  keyboardHint:'↑ Right hand · ↓ Left hand · letter keys answer the selected staff.',
  completed:'Completed pairs',partial:'Partial pairs',resultHint:'Unanswered notes are not counted as errors.',
  withheld:'Current delayed-pair results stay hidden until both answers or session end.',
  unsupported:'Grand Staff currently supports paired natural notes with letter answers.',
});
