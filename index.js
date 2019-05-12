const { BrowserWindow } = require('electron');
const cpus = require('os').cpus().length;
const path = require('path');
const url = require('url');

let registeredPaths = {};
let workers = {};

const createHiddenWindow = filePath => {
	const startUrl = url.format({
		pathname: path.join(__dirname, `/../../${filePath}`),
		protocol: 'file:',
		slashes: true,
	});
	let hiddenWindow = new BrowserWindow({ show: false });
	hiddenWindow.loadURL(startUrl);
	hiddenWindow.on('closed', () => {});
	return hiddenWindow;
};

exports.register = (ipcMain, registeredPaths) => {
	registeredPaths = registeredPaths;
	ipcMain.on('BACKGROUND_PROCESS_START', (event, args) => {
		if (Object.keys(workers).length < cpus) {
			const { processName, values } = args;
			workers = {
				...workers,
				[processName]: {
					windowObject: createHiddenWindow(registeredPaths[processName]),
					values,
				},
			};
		} else {
			console.log('Out of CPUs');
		}
	});

	ipcMain.on('BACKGROUND_PROCESS_STOP', (event, args) => {
		const { processName } = args;
		workers[processName] &&
			workers[processName].windowObject.webContents.send('BACKGROUND_PROCESS_STOP');
	}); 

	ipcMain.on('WORKER_INIT', (event, args) => {
		const { processName } = args;
		event.sender.send('WORKER_INIT_COMPLETE', {
			values: workers[processName].values,
		});
	});

	ipcMain.on('WORKER_KILL', (event, args) => {
		const { processName } = args;
		workers[processName].windowObject.close();
		delete workers[processName];
	});

	ipcMain.on('TO_WORKER', (event, args) => {
		const { processName } = args;
		workers[processName].windowObject.webContents.send('TO_WORKER', args);
	});
};

exports.startBackgroundProcess = (ipcRenderer, processName, values) => {
	ipcRenderer.send('BACKGROUND_PROCESS_START', {
		processName,
		values,
	});
};

exports.stopBackgroundProcess = (ipcRenderer, processName) => {
	ipcRenderer.send('BACKGROUND_PROCESS_STOP', {
		processName,
	});
};

exports.onInitialize = (ipcRenderer, processName, func) => {
	ipcRenderer.on('WORKER_INIT_COMPLETE', (event, args) => {
		const { values } = args;
		func(values);
	});

	ipcRenderer.send('WORKER_INIT', {
		processName,
	});
};

exports.onFinish = (ipcRenderer, processName, func) => {
	ipcRenderer.on('BACKGROUND_PROCESS_STOP', (event, args) => {
		if (func) func();
		ipcRenderer.send('WORKER_KILL', {
			processName,
		});
	});
};

exports.finish = (ipcRenderer, processName) => {
	ipcRenderer.send('WORKER_KILL', {
		processName,
	});
};

exports.send = (ipcRenderer, processName, values) => {
	ipcRenderer.send('TO_WORKER', {
		processName,
		values,
	});
};

exports.on = (ipcRenderer, processNameOuter, func) => {
	ipcRenderer.on('TO_WORKER', (event, args) => {
		const { processName, values } = args;
		processNameOuter === processName && func(values);
	});
};
