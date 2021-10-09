class Logger {
	constructor() {
		this.name = 'logger';
	}

	debug(...args) {
		// eslint-disable-next-line no-console
		console.debug(...args);
	}

	info(...args) {
		// eslint-disable-next-line no-console
		console.info(...args);
	}

	warn(...args) {
		// eslint-disable-next-line no-console
		console.warn(...args);
	}

	error(...args) {
		// eslint-disable-next-line no-console
		console.error(...args);
	}

	log(...args) {
		// eslint-disable-next-line no-console
		console.log(...args);
	}

	trace(...args) {
		// eslint-disable-next-line no-console
		console.trace(...args);
	}

	fatal(...args) {
		// eslint-disable-next-line no-console
		console.error(...args);
	}
}

const logger = new Logger();

module.exports = logger;
