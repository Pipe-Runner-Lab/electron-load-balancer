const { BrowserWindow } = require('electron');
const cpus = require('os').cpus().length;
const path = require('path');
const url = require('url');

let globalRegisteredPaths = {};
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
  globalRegisteredPaths = registeredPaths;

  ipcMain.on('BACKGROUND_PROCESS_START', (event, args) => {
    if (Object.keys(workers).length < cpus) {
      const { processName, values } = args;
      workers = {
        ...workers,
        [processName]: {
          windowObject: createHiddenWindow(globalRegisteredPaths[processName]),
          values,
        },
      };
    } else {
      console.log('Out of CPUs');
    }
  });

  ipcMain.on('BACKGROUND_PROCESS_STOP', (event, args) => {
		const { processName } = args;
    workers[processName].windowObject.webContents.send('WORKER_KILL');
    workers[processName].windowObject.close();
    delete workers[processName];
  });

  ipcMain.on('WORKER_INIT', (event, args) => {
    const { processName, killfunc } = args;
    workers = {
      ...workers,
      [processName]: {
        ...workers[processName],
        killfunc,
      },
    };
    event.sender.send('WORKER_INIT_COMPLETE', {
      values: workers[processName].values,
    });
  });

  ipcMain.on('TO_WORKER', (event, args) => {
    const { processName } = args;
    workers[processName].windowObject.webContents.send('TO_WORKER', args);
  });
};

exports.stopAll = () => {
  Object.keys(workers).map(processName => {
    workers[processName].windowObject.webContents.send('WORKER_KILL');
    workers[processName].windowObject.close();
    delete workers[processName];
  });
};

exports.start = (ipcRenderer, processName, values) => {
  ipcRenderer.send('BACKGROUND_PROCESS_START', {
    processName,
    values,
  });
};

exports.stop = (ipcRenderer, processName) => {
  ipcRenderer.send('BACKGROUND_PROCESS_STOP', {
    processName,
  });
};

exports.job = (ipcRenderer, processName, func, killfunc) => {
  ipcRenderer.on('WORKER_INIT_COMPLETE', (event, args) => {
    const { values } = args;
    func(values);
  });

  ipcRenderer.on('WORKER_KILL', (event, args) => {
    killfunc && killfunc();
  });

  ipcRenderer.send('WORKER_INIT', {
    processName,
  });
};

exports.sendData = (ipcRenderer, processName, values) => {
  ipcRenderer.send('TO_WORKER', {
    processName,
    values,
  });
};

exports.onReceiveData = (ipcRenderer, processNameOuter, func) => {
  ipcRenderer.on('TO_WORKER', (event, args) => {
    const { processName, values } = args;
    processNameOuter === processName && func(values);
  });
};

