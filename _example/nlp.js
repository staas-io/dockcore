const { Clonable, containerBootstrap } = require('../index');
const {DefaultSplitter, DefaultGuesser, DefaultStorage} = require('./default_engine')
class NlpAutolearn extends Clonable {
  constructor(settings = {}, container) {
    super(
      {
        settings: {},
        container: settings.container || container || containerBootstrap(),
      },
      container
    );
    this.applySettings(this.settings, settings);
    if (!this.settings.tag) {
      this.settings.tag = `nlpautolearn`;
    }
    this.registerDefault();
    this.applySettings(
      this.settings,
      this.container.getConfiguration(this.settings.tag)
    );
    this.splitter = this.container.get(
      'nlpautolearn-splitter',
      this.settings.splitter
    );
    this.guesser = this.container.get(
      'nlpautolearn-guesser',
      this.settings.guesser
    );
    this.storage = this.container.get(
      'nlpautolearn-storage',
      this.settings.storage
    );
    this.initialize();
  }

  registerDefault() {
    this.container.registerConfiguration(
      'nlpautolearn',
      {
        threshold: 0.5,
        modelFileName: 'nlpautolearn-model.nlp',
      },
      false
    );
    this.use(DefaultSplitter);
    this.use(DefaultGuesser);
    this.use(DefaultStorage);
  }

  initialize() {
    /*
     * Initiliaze this and its children
     */
  }

  async accumulate(locale, utteranceText) {
    const input = (typeof locale == 'object')? locale: {locale, utteranceText}

    let utterances = this.splitter.split(utteranceText);
    if (!utterances || utterances.length == 0) {return null;}

    let guessedUtterances = utterances.reduce( (guessed, currentUtt) => {
      let score = this.guesser.guess(currentUtt);
      if (score >= this.settings.threshold) { guessed.push(currentUtt); }
      return guessed;
    },[]);

    if (guessedUtterances.length > 0 && this.storage && this.storage.store) { this.storage.store(guessedUtterances) };
    return guessedUtterances;
  }

  toJSON() {
    const result = {
      settings: { ...this.settings },
      autolearn: this.autolearn.toJSON(),
    };
    delete result.settings.container;

    return result;
  }

  fromJSON(json) {
    this.applySettings(this.settings, json.settings);
    this.autolearn.load(json.autolearn);
  }

  export(minified = false) {
    const clone = this.toJSON();
    return minified ? JSON.stringify(clone) : JSON.stringify(clone, null, 2);
  }

  import(data) {
    const clone = typeof data === 'string' ? JSON.parse(data) : data;
    this.fromJSON(clone);
  }

  async save(srcFileName, minified = false) {
    const fs = this.container.get('fs');
    const fileName = srcFileName || 'nlpautolearn-model.nlp';
    await fs.writeFile(fileName, this.export(minified));
  }

  async load(srcFileName) {
    const fs = this.container.get('fs');
    const fileName = srcFileName || 'nlpautolearn-model.nlp';
    const data = await fs.readFile(fileName);
    if (data) {
      this.import(data);
      return true;
    }
    return false;
  }
}

module.exports = {NlpAutolearn};
