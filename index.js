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
	hiddenWindow.on('closed', () => {
		console.log('Background window closed');
	});
	return hiddenWindow;
};

exports.register = (ipcMain, registeredPaths) => {
	/* 
	Desciption: Used to populate registeredPath object, which is later used for 
		hidden window creation. This function is also responsible for setting up
		the other internal IPC listeners that handle creation and destruction of
		background workers.
	
	Args: 
		ipcRenderer (required): The ipcRenderer being used in the visible window 
			renderer process.
		registeredPaths (required): An object with keys being the process name used
			to represent each hidden worker and value being the file path of the html
			that will be used to create the hidden window.
	
	Returns: none
	*/

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
		delete workers[processName];
	});
};

exports.startBackgroundProcess = (ipcRenderer, processName, values) => {
	/* 
	Desciption: Sends an IPC message to main process to create a hidden window for
		background processing. The html file matching the processName key used during 
		registration will be created.
	
	Args: 
		ipcRenderer (required): The ipcRenderer being used in the visible window 
			renderer process.
		processName (required): The name of the process matching the one used 
			during registration of html file.
		values (optional): The initialization values that may be required for the
			background process.
	
	Returns: none
	*/

	ipcRenderer.send('BACKGROUND_PROCESS_START', {
		processName,
		values,
	});
};

exports.stopBackgroundProcess = (ipcRenderer, processName) => {
	/* 
	Desciption: Sends an IPC message to main process to stop an already running
		background process. The hidden window matching the processName key used 
		during registration will be destroyed.
	
	Args: 
		ipcRenderer (required): The ipcRenderer being used in the visible window 
			renderer process.
		processName (required): The name of the process matching the one used 
			during registration of html file.
	
	Returns: none
	*/

	ipcRenderer.send('BACKGROUND_PROCESS_STOP', {
		processName,
	});
};

exports.onInitialize = (ipcRenderer, processName, func) => {
	/* 
	Desciption: Sends an IPC message to main process letting it know that the hidden
		window has been successfully created and the blocking process can now be 
		safely started. This also takes care of passing the initilization values 
		that may be needed for the background process.
	
	Args: 
		ipcRenderer (required): The ipcRenderer being used in the hidden window 
			renderer process.
		processName (required): The name of the process matching the one used 
			during registration of the current html file.
		func (required): The fuction that when exectued will create a heavy blocking
			process.
	
	Returns: none
	*/

	ipcRenderer.on('WORKER_INIT_COMPLETE', (event, args) => {
		const { values } = args;
		func(values);
	});

	ipcRenderer.send('WORKER_INIT', {
		processName,
	});
};

exports.onFinish = (ipcRenderer, processName, func) => {
	/* 
	Desciption: A hook that is placed inside the computation function, which is
		used to terminate the blocking process on request from the visible renderer
		process. This is the place for killing the blocking thread and clean up work.
	
	Args: 
		ipcRenderer (required): The ipcRenderer being used in the hidden window 
			renderer process.
		processName (required): The name of the process matching the one used 
			during registration of the current html file.
		func (optional): The fuction that when exectued just before the process is
			killed. The place to do cleanup work.
	
	Returns: none
	*/

	ipcRenderer.on('BACKGROUND_PROCESS_STOP', (event, args) => {
		if( func ) func();
		ipcRenderer.send('WORKER_KILL', {
			processName,
		});
	});
};

exports.finish = (ipcRenderer, processName) => {
	/* 
	Desciption: If the process is a heavy computation that eventually dies out on
		its own and does not require a remote tigger to be killed, then this funtion
		is used to notify the load-balancer about the finished job so that it can
		kill the hidden process. It is somewhat of a manual trigger.
	
	Args: 
		ipcRenderer (required): The ipcRenderer being used in the hidden window 
			renderer process.
		processName (required): The name of the process matching the one used 
			during registration of the current html file.
	
	Returns: none
	*/

	ipcRenderer.send('WORKER_KILL', {
		processName,
	});
};
