const { BrowserWindow } = require('electron');
const cpus = require('os').cpus().length;
const path = require('path');
const url = require('url');

let registeredPath = {};
let workerList = {};

const createHiddenWindow = filePath => {
	const startUrl = url.format({
		pathname: path.join(__dirname, `/../${filePath}`),
		protocol: 'file:',
		slashes: true,
	});
	let hiddenWindow = new BrowserWindow({ show: false });
	hiddenWindow.loadURL(startUrl);
	hiddenWindow.on('closed', () => {
		console.log('background window closed');
	});
	return hiddenWindow;
};

exports.startBackgroundProcess = (ipcRenderer, processName, args) => {
	/* 
	Desciption: Starts the background prcoess matching the
	name from the registeredpath array
	*/
	ipcRenderer.send('BACKGROUND_PROCESS_START', { processName, values: args });
};

exports.stopBackgroundProcess = (ipcRenderer, processName) => {
	/* 
	Desciption: Starts the background prcoess matching the
	name from the registeredpath array
	*/
	ipcRenderer.send('BACKGROUND_PROCESS_STOP', { processName });
};

exports.register = (ipcMain, args) => {
	/* 
	Desciption: Takes an array of objects with each object
	having a key value pair of 'processName':'filepath'
	*/

	registeredPath = args;
	ipcMain.on('BACKGROUND_PROCESS_START', (event, args) => {
		if (Object.keys(workerList).length < cpus) {
			const { processName, values } = args;
			workerList = {
				...workerList,
				[processName]: {
					windowObject: createHiddenWindow(registeredPath[processName]),
					values,
				},
			};
		} else {
			console.log('Out of CPU');
		}
	});

	ipcMain.on('BACKGROUND_PROCESS_STOP', (event, args) => {
		const { processName } = args;
		workerList[processName].windowObject.webContents.send('BACKGROUND_PROCESS_STOP');
	});

	ipcMain.on('BACKGROUND_PROCESS_INITIALIZED', (event, args) => {
		// use this to pass the initialization data
		// send back initialization data
		const { processName } = args;
		event.sender.send('BACKGROUND_PROCESS_WORKING', {
			values: workerList[processName].values,
		});
	});

	ipcMain.on('BACKGROUND_PROCESS_FINISHED', (event, args) => {
		// use this to pass the initialization data
		const { processName } = args;
		delete workerList[processName];
	});
};

exports.initialize = (ipcRenderer, processName, func) => {
	/* 
	Desciption: Sends an ipc confirmation ensuring that
	the frameless window has been created. Can be used 
	send initialization data
	*/

	ipcRenderer.on('BACKGROUND_PROCESS_WORKING', (event, args) => {
		const { values } = args;
		func(values);
	});

	ipcRenderer.send('BACKGROUND_PROCESS_INITIALIZED', {
		processName,
	});
};

exports.kill = (ipcRenderer, processName, func) => {
	/* 
	Desciption: Sends an IPC signal to kill the process
	*/
	ipcRenderer.on('BACKGROUND_PROCESS_STOP', (event, args) => {
		func();
		ipcRenderer.send('BACKGROUND_PROCESS_FINISHED', {
			processName,
		});
	});
};
