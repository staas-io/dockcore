const { defaultContainer } = require('./container');

class Clonable {
	/**
	 * Constructor of the class
	 * @param {object} settings
	 */
	constructor(settings = {}, container = defaultContainer, name = 'clonable') {
		this.name = settings.name || name;
		this.container = settings.container || container;
		this.applySettings(this, this.container?.getConfiguration(this.name) || settings);
	}

	get logger() {
		return this.container.get('logger');
	}

	/**
	 * Apply default settings to an object.
	 * @param {object} obj Target object.
	 * @param {object} settings Input settings.
	 */
	applySettings(srcobj, settings = {}) {
		const obj = srcobj || {};
		Object.keys(settings).forEach((key) => {
			if (obj[key] === undefined) {
				obj[key] = settings[key];
			}
		});
		return obj;
	}

	toJSON() {
		const settings = this.jsonExport || {};
		const result = {};
		const keys = Object.keys(this);
		for (let i = 0; i < keys.length; i += 1) {
			const key = keys[i];
			if (
				key !== 'jsonExport' &&
				key !== 'jsonImport' &&
				key !== 'container' &&
				!key.startsWith('pipeline')
			) {
				const fn = settings[key] === undefined ? true : settings[key];
				if (typeof fn === 'function') {
					const value = fn.bind(this)(result, this, key, this[key]);
					if (value) {
						result[key] = value;
					}
				} else if (typeof fn === 'boolean') {
					if (fn) {
						result[key] = this[key];
						if (key === 'settings') {
							delete result[key].container;
						}
					}
				} else if (typeof fn === 'string') {
					result[fn] = this[key];
				}
			}
		}
		return result;
	}

	fromJSON(json) {
		const settings = this.jsonImport || {};
		const keys = Object.keys(json);
		for (let i = 0; i < keys.length; i += 1) {
			const key = keys[i];
			const fn = settings[key] === undefined ? true : settings[key];
			if (typeof fn === 'function') {
				const value = fn.bind(this)(this, json, key, json[key]);
				if (value) {
					this[key] = value;
				}
			} else if (typeof fn === 'boolean') {
				if (fn) {
					this[key] = json[key];
				}
			} else if (typeof fn === 'string') {
				this[fn] = json[key];
			}
		}
	}

	objToValues(obj, srcKeys) {
		const keys = srcKeys || Object.keys(obj);
		const result = [];
		for (let i = 0; i < keys.length; i += 1) {
			result.push(obj[keys[i]]);
		}
		return result;
	}

	valuesToObj(values, keys) {
		const result = {};
		for (let i = 0; i < values.length; i += 1) {
			result[keys[i]] = values[i];
		}
		return result;
	}

	getPipeline(tag) {
		return this.container.getPipeline(tag);
	}

	async runPipeline(input, pipeline) {
		return this.container.runPipeline(pipeline || this.pipeline, input, this);
	}

	use(item) {
		this.container.use(item);
	}
}

module.exports = Clonable;
