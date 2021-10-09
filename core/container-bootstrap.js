const fs = require('fs');
const path = require('path');

const { Container } = require('./container');
const Timer = require('./timer');
const logger = require('./logger');
const MemoryStorage = require('./memory-storage');

const { fs: requestfs, request } = require('../request');
const pluginInformation = require('./plugin-information.json');
const {
	listFilesAbsolute,
	getAbsolutePath,
	loadEnv,
	loadEnvFromJson,
} = require('./helper');

const defaultPathConfiguration = './conf.json';
const defaultPathPipeline = './pipelines.md';
const defaultPathPlugins = './plugins';

function loadPipelinesStr(instance, pipelines) {
	instance.loadPipelinesFromString(pipelines);
}

function loadPipelinesFromFile(instance, fileName) {
	const str = fs.readFileSync(fileName, 'utf8');
	instance.loadPipelinesFromString(str);
}

function loadPipelines(instance, fileName) {
	if (Array.isArray(fileName)) {
		for (let i = 0; i < fileName.length; i += 1) {
			loadPipelines(instance, fileName[i]);
		}
	} else if (fs.existsSync(fileName)) {
		if (fs.lstatSync(fileName).isDirectory()) {
			const files = listFilesAbsolute(fileName).filter((x) =>
				x.endsWith('.md')
			);
			for (let i = 0; i < files.length; i += 1) {
				loadPipelines(instance, files[i]);
			}
		} else {
			loadPipelinesFromFile(instance, fileName);
		}
	}
}

function loadPlugins(instance, fileName) {
	if (Array.isArray(fileName)) {
		for (let i = 0; i < fileName.length; i += 1) {
			loadPlugins(instance, fileName[i]);
		}
	} else if (fs.existsSync(fileName)) {
		if (fs.lstatSync(fileName).isDirectory()) {
			const files = listFilesAbsolute(fileName).filter((x) =>
				x.endsWith('.js')
			);
			for (let i = 0; i < files.length; i += 1) {
				loadPlugins(instance, files[i]);
			}
		} else {
			/* eslint-disable-next-line */
			const plugin = require(fileName);
			instance.use(plugin);
		}
	}
}

function traverse(obj, preffix) {
	if (typeof obj === 'string') {
		if (obj.startsWith('$')) {
			return (
				process.env[`${preffix}${obj.slice(1)}`] || process.env[obj.slice(1)]
			);
		}
		return obj;
	}
	if (Array.isArray(obj)) {
		return obj.map((x) => traverse(x, preffix));
	}
	if (typeof obj === 'object') {
		const keys = Object.keys(obj);
		const result = {};
		for (let i = 0; i < keys.length; i += 1) {
			result[keys[i]] = traverse(obj[keys[i]], preffix);
		}
		return result;
	}
	return obj;
}

function containerBootstrap(
	inputSettings,
	srcMustLoadEnv,
	container,
	preffix,
	pipelines,
	parent
) {
	const mustLoadEnv = srcMustLoadEnv === undefined ? true : srcMustLoadEnv;
	const instance = container || new Container(preffix);
	instance.parent = parent;
	if (!preffix) {
		instance.register('fs', requestfs);
		instance.register('request', { get: request });
		instance.use(Timer);
		instance.use(logger);
		instance.use(MemoryStorage);
	}
	const srcSettings = inputSettings || {};
	let settings = srcSettings;
	if (typeof settings === 'string') {
		settings = {
			pathConfiguration: srcSettings,
			pathPipeline: defaultPathPipeline,
			pathPlugins: defaultPathPlugins,
		};
	} else {
		if (!settings.pathConfiguration) {
			settings.pathConfiguration = defaultPathConfiguration;
		}
		if (!settings.pathPipeline) {
			settings.pathPipeline = defaultPathPipeline;
		}
		if (!settings.pathPlugins) {
			settings.pathPlugins = defaultPathPlugins;
		}
	}
	if (
		srcSettings.loadEnv ||
		(srcSettings.loadEnv === undefined && mustLoadEnv)
	) {
		loadEnv();
	}
	settings.pathConfiguration = getAbsolutePath(settings.pathConfiguration);
	if (srcSettings.envFileName) {
		loadEnv(srcSettings.envFileName);
	}
	if (srcSettings.env) {
		loadEnvFromJson(preffix, srcSettings.env);
	}
	let configuration;
	if (settings.isChild || !fs.existsSync(settings.pathConfiguration)) {
		configuration = settings;
	} else {
		configuration = JSON.parse(
			fs.readFileSync(settings.pathConfiguration, 'utf8')
		);
	}
	configuration = traverse(configuration, preffix ? `${preffix}_` : '');
	if (configuration.pathPipeline) {
		settings.pathPipeline = configuration.pathPipeline;
	}
	if (configuration.pathPlugins) {
		settings.pathPlugins = configuration.pathPlugins;
	}
	if (configuration.settings) {
		const keys = Object.keys(configuration.settings);
		for (let i = 0; i < keys.length; i += 1) {
			instance.registerConfiguration(
				keys[i],
				configuration.settings[keys[i]],
				true
			);
		}
	}
	if (configuration.use) {
		for (let i = 0; i < configuration.use.length; i += 1) {
			const current = configuration.use[i];
			if (typeof current === 'string') {
				let infoArr = pluginInformation[current];
				if (!infoArr) {
					throw new Error(
						`Plugin information not found for plugin "${current}"`
					);
				}
				if (!Array.isArray(infoArr)) {
					infoArr = [infoArr];
				}
				for (let j = 0; j < infoArr.length; j += 1) {
					const info = infoArr[j];
					let lib;
					try {
						/* eslint-disable-next-line */
						lib = require(info.path);
					} catch (err) {
						try {
							/* eslint-disable-next-line */
							lib = require(getAbsolutePath(
								path.join('./node_modules', info.path)
							));
						} catch (err2) {
							throw new Error(
								`You have to install library "${info.path}" to use plugin "${current}"`
							);
						}
					}
					instance.use(lib[info.className], info.name, info.isSingleton);
				}
			} else {
				let lib;
				try {
					/* eslint-disable-next-line */
						lib = require(current.path);
				} catch (err) {
					/* eslint-disable-next-line */
						lib = require(getAbsolutePath(current.path));
				}
				instance.use(lib[current.className], current.name, current.isSingleton);
			}
		}
	}
	if (configuration.terraform) {
		for (let i = 0; i < configuration.terraform.length; i += 1) {
			const current = configuration.terraform[i];
			const terra = instance.get(current.className);
			instance.register(current.name, terra, true);
		}
	}
	if (configuration.childs) {
		instance.childs = configuration.childs;
	}
	if (pipelines) {
		for (let i = 0; i < pipelines.length; i += 1) {
			const pipeline = pipelines[i];
			instance.registerPipeline(
				pipeline.tag,
				pipeline.pipeline,
				pipeline.overwrite
			);
		}
	}
	loadPipelines(instance, settings.pathPipeline || './pipelines.md');
	if (configuration.pipelines) {
		loadPipelinesStr(instance, configuration.pipelines);
	}
	loadPlugins(instance, settings.pathPlugins || './plugins');
	return instance;
}

module.exports = containerBootstrap;
