const { ipcMain, ipcRenderer, BrowserWindow } = require('electron');
const cpus = require('os').cpus().length;
const path = require('path');
const url = require('url');

let registeredPath = [];
let workerList = []; 

const createHiddenWindow = ( filePath ) => {
	const startUrl = url.format({
		pathname: path.join(__dirname, filePath),
		protocol: 'file:',
		slashes: true,
	});
	hiddenWindow = new BrowserWindow({ show: false });
	hiddenWindow.loadURL(startUrl);
	hiddenWindow.on('closed', () => {
		console.log('background window closed');
	});
}

ipcMain.on( "START_BACKGROUND_PROCESS", (event, args) => {

} )

exports.printMsg = () => {
	console.log("This is a message from the demo package");
}

exports.startBackgroundProcess = ( processName, args ) => {
	/* 
	Desciption: Takes an array of objects with each object
	having a key value pair of 'name':'filepath'
	*/
	ipcRenderer.send("START_BACKGROUND_PROCESS", args)
}

exports.register = ( args ) => {
	/* 
	Desciption: Takes an array of objects with each object
	having a key value pair of 'processName':'filepath'
	*/
	registeredPath = args;
}

exports.initialize = ( args ) => {
	/* 
	Desciption: Takes an array of objects with each object
	having a key value pair of 'processName':'filepath'
	*/
	registeredPath = args;
}

exports.kill = ( args ) => {
	/* 
	Desciption: Takes an array of objects with each object
	having a key value pair of 'processName':'filepath'
	*/
	registeredPath = args;
}