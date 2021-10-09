const {
  Among,
  ArrToObj,
  Clonable,
  Container,
  defaultContainer,
  ObjToArr,
  Timer,
  logger,
  MemoryStorage,
  uuid,
  Context,
} = require('./core');

const containerBootstrap = require('./container-bootstrap');
const dock = require('./dock');

const {
  hasUnicode,
  unicodeToArray,
  asciiToArray,
  stringToArray,
  compareWildcars,
  listFiles,
  loadEnv,
  listFilesAbsolute,
  getAbsolutePath,
} = require('./helper');

async function dockStart(settings, mustLoadEnv) {
  await dock.start(settings, mustLoadEnv);
  return dock;
}

module.exports = {
  Among,
  ArrToObj,
  containerBootstrap,
  Clonable,
  Container,
  defaultContainer,
  hasUnicode,
  unicodeToArray,
  asciiToArray,
  stringToArray,
  compareWildcars,
  getAbsolutePath,
  listFiles,
  listFilesAbsolute,
  loadEnv,
  ObjToArr,
  Stemmer,
  Stopwords,
  Tokenizer,
  Timer,
  logger,
  MemoryStorage,
  uuid,
  dock,
  Context,
  dockStart,
};
