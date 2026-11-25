export const PIANO = Object.freeze({
  instruction: 'Play the displayed pitch.',
  input: 'Answer input', inputs: { letter: 'Letter answers', piano: 'Virtual piano' },
  low: 'Keyboard lowest pitch', high: 'Keyboard highest pitch', labels: 'Show note labels',
  labelOptions: {off:'Off',on:'On'}, feedbackHint:'The correct key is highlighted. Read its pitch and octave.',
  title: 'Piano keyboard', hint: 'Play the exact pitch and octave. Use the octave buttons when needed, or Tab and Enter.',
  previous: 'Keyboard left', next: 'Keyboard right', play: name => 'Play ' + name,
  error: 'Choose a keyboard range from C2 to C6 containing every selected target pitch.',
});
