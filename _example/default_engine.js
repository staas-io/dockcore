const { Clonable } = require('../index');

const DefaultSplitter = {
  name: 'nlpautolearn-splitter',
  split: (text) => { return [text]; }
};

const DefaultGuesser = {
  name: 'nlpautolearn-guesser',
  guess: () => { return true; }
};

class DefaultStorage extends Clonable {
  constructor (settings = {}, container) {
    super({
      settings: {},
      container: settings.container || container
    }, container);

    this.settings.tag = this.settings.tag || 'nlpautolearn-storage';
    this.registerDefault();
    this.applySettings(
      this.settings,
      this.container.getConfiguration(this.settings.tag)
    )
  };
  registerDefault () {
    this.container.registerConfiguration(
      'nlpautolearn-storage-??',
      {
        connStr: 'dummy'
      },
      false
    );
  };

  store(textArray) { return true; };
  load() { return 'dummy'; };
}

module.exports = {
  DefaultSplitter,
  DefaultGuesser,
  DefaultStorage
}
