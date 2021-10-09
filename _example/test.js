
const { Dock } = require('../index')

const { NlpAutolearn } = require('./nlp');

const run = () => {
  console.log('test');
  const nlp = new NlpAutolearn();
  let output = nlp.accumulate('vi', 'tôi là ai?');
  console.log('output', output);
}

const run_dock = async () => {
  await Dock.start();
  const container = Dock.getContainer();
  const nlp = container.get('nlpautolearn');
  let output = nlp.accumulate('vi', 'tôi là ai?');
  console.log('test with dock => ', output);
}

run();
// run_dock();
