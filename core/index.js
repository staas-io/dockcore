const containerBootstrap = require('./container-bootstrap');
const Clonable = require('./clonable');
const { Container, defaultContainer } = require('./container');
const Dock = require('./dock');
const Context = require('./context');
const MemoryStorage = require('./memory-storage');

const Timer = require('./timer');
const Logger = require('./logger');
const UUID = require('./uuid');

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
	Dock,
	Context,
	Clonable,
	Container,
	MemoryStorage,

	dockStart,
	defaultContainer,
	containerBootstrap,

	UUID,
	Timer,
	Logger,
	Helper: {
		...require('./helper'),
		...require('./utilities'),
	},
};
