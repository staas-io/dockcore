const { dock } = require('./core');

run = () => {
  dock.start();
  let container = dock.getContainer()
}



run();
