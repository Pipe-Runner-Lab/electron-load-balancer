# electron-load-balancer :fire:  

> Electron background task runner for humans :hearts:  
  
  ---
  
Fund this project using the following link:  
<a href="https://www.buymeacoffee.com/4gmBYV0" target="_blank">
	<img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" 
	     style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;"
	     >
</a>

Read my [article on Medium](https://medium.com/heuristics/electron-react-python-part-3-boilerplate-3-3-1a9cdd0a6b9d) for detailed walkthrough and sample application.
  
  ---

There are three possible ways of doing heavy computation ( thread blocking jobs ) in electron environment without chocking the app
* Web workers 
* Forking
* Hidden renderer process :white_check_mark: 

This libary lets you use the third one with very clean and easy to understand boilerplate code. Just **five** functions and your are golden.
The need for this library came up when I was unable to find a standard approach to use the hidden renderer process technique to do some heavy lifting with electron. Why we are using the hidden renderer process in the first place is yet another topic for discussion. You can give this article a quick read if you are interested to know [more](https://medium.freecodecamp.org/how-to-build-an-electron-desktop-app-in-javascript-multithreading-sqlite-native-modules-and-1679d5ec0ac).  
I have kept it very minimalistic in nature, thus it will not bound you to do any kind of data communication through the libary itself. It will just do what it is supposed to do - *manage hidden windows* and get out of your way.  
The rest is upto you.

## Installation 
```bash
npm install --save electron-load-balancer
```

## Usage 
There are a few things that you should probably know before using this library. 
* Every hidden window is an **html** file with just the script tag in it. All the JS code goes inside this script tag. Everything else is just your usual NodeJS code.
* Each background task is predefined as you will be writing the **html** files for them, but the arguments can be passed dynamically.
* A registration of each background task defined in **html** files need to be done at the starting, in your application entry point ( Main process ).
* There are two use cases of the libary - one in which a task needs to be started and killed by the action of the user, second in which the task will be allowed to run its full course and will not accept any kind of interuption from user. Both of these cases have been covered.

***

### Registration
#### 1. *register( ipcMain, registeredPaths )*
```
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
```
First off, you need to register all the background processes that you plan to execute in your app. The ```registeredPaths``` is an object with keys being the **process name** and values being the **html file path**. As the syntax shows, you'll need to pass the ipcMain object as the first argument. Here is a quick example.  
  
```javascript
// in electron.js
const { ipcMain } = require('electron');
const loadBalancer = require('electron-load-balancer');

.
.
.
.

loadBalancer.register(
	ipcMain,
	{
		'oscilloscope':  '/background_tasks/oscilloscope.html',
		'logicAnalyser': '/background_tasks/logicAnalyser.html',
	}
)
```
**Note**: The file path should be derived from the **project root**. Here is my file structure for more clarity.  
```
|--node_modules
|
|--src
|	|
|	|--main.js
|
|--background_tasks
|		|
|		|--oscilloscope.html
|		|--logicAnalyser.html
```

***

### Start / Stop background process from visible window
#### 2. *start( ipcRenderer, processName, values )*
```
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
```

This function is used to tell the library to start initializing the background process. The **processName** mentioned as the second argument must match exactly to one of the processes mentioned during registration.  
The third argument lets you pass any extra data that your background process may need to get started. It is wise to use an object, hence use key value pairs in case of multiple values.  
The first argument will the the ipcRenderer object that will be imported in the renderer process.  
Here is a quick example on how to use it assuming I wish to call it from a react component on a button click.

```javascript
// in App.js
import React, { Component } from 'react';
.
.
const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;
const loadBalancer = window.require('electron-load-balancer');

.
.
.

class App extends Component {

	.
	.
	.

	componentDidMount(){
		loadBalancer.start(ipcRenderer, 'oscilloscope');
	}

	.
	.
	.
}

export default App
```

#### 3. *stop( ipcRenderer, processName )*
```
Desciption: Sends an IPC message to main process to stop an already running
	background process. The hidden window matching the processName key used 
	during registration will be destroyed.

Args: 
	ipcRenderer (required): The ipcRenderer being used in the visible window 
		renderer process.
	processName (required): The name of the process matching the one used 
		during registration of html file.

Returns: none
```

This function is used to tell the library to stop and destroy the background process thus cleaning up resouruces in the process. The **processName** mentioned as the second argument must match exactly to one of the processes mentioned during registration.  
The first argument will the the ipcRenderer object that will be imported in the renderer process. This is used only when the user is actually allowed to intervene in the background process.
Here is a quick example on how to use it assuming I wish to call it from a react component on a button click.

```javascript
// in App.js
import React, { Component } from 'react';
.
.
const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;
const loadBalancer = window.require('electron-load-balancer');

.
.
.

class App extends Component {

	.
	.
	.

	componentWillUnmount(){
		loadBalancer.stop(ipcRenderer, 'oscilloscope');
	}

	.
	.
	.
}
```  
  
Note: If you create background processes using the start method, you are obligated to stop it using this method as for now, there is no way to auto clean resources.

***

### Initilization / Kill hook in hidden renderer process
#### 4. *job( ipcRenderer, processName, func, cleanup_func )*
```
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
	cleanup_func (optional) : This function executes when the process is force stoped using the stop function from JS realm.

Returns: none
```

This function is used to notify the main process about the successful creation of hidden window. After this, the main process sends the initialization values that may be required for the background process to start.  
The **processName** must match the one provided during registration for this particular html file.  
The third argument is the function which when executed shall start the blocking process. The argument of this function will be the initialization value that the user may have provided.
Here is a quick example on how to use it.

```html
// in oscilloscope.html
<script>
	const { ipcRenderer } = require('electron');
	const loadBalancer = require('electron-load-balancer');
	
	loadBalancer.job(
		ipcRenderer, 
		'oscilloscope', 
		initialValues => {

			/* -------------------- Blocking code here ----------------------- */

			.
			.
			.

			/* --------------------------------------------------------------- */

		},
		() => {
				/* Cleanup code here */
		}
	);

</script>
```  
  
Note: The cleanup code is executed **only** when the stop function is called from JS realm. It is the obligation of the developer to manaully call stop if the job finishes eventually. A nice way to use this architecture to your advantage is to have a never ending loop that listens for events and spaws multiple threads for background processing via python. A nice example of this has been implemented by me in the [PSLab Project](https://github.com/fossasia/pslab-desktop/blob/development/background_tasks/linker.html), feel free to use this.

### Sending / Recieving data in background process while processing
The need for this occurs when you have a loop like structure accepting a command and data and initiates a long blocking computation task, but does not exit even after the computation is over, rather the loop continues waiting for its next command. In such cases a means to send and recieve data while processing becomes necessary.
#### 5. *onReceiveData ( ipcRenderer, processName, func )*
```
Desciption: Sets up an event listener for any data being sent from visible renderer process that is meant for this particular process.

Args: 
	ipcRenderer (required): The ipcRenderer being used in the hidden window 
		renderer process.
	processName (required): The name of the process matching the one used 
		during registration of the current html file.
	func (optional) : The function that will be used to process this data and do the needful. The function takes an argument which 			 will basically be the data meant to be recieved.

Returns: none
```
Here is a quick example for it.

```html
// in oscilloscope.html
<script>
	const { ipcRenderer } = require('electron');
	const loadBalancer = require('electron-load-balancer');
	
	loadBalancer.job(
		ipcRenderer, 
		'oscilloscope', 
		initialValues => {
	
			/*------------------ Setting up event listeners ----------------- */
			
			loadBalancer.onReceiveData(ipcRenderer, 'linker', value => {
				// Do something with value
			});
			
			/*---------------------------------------------------------------- */

			/* -------------------- Blocking code here ----------------------- */

			.
			.
			.

			/* --------------------------------------------------------------- */

		},
		() => {
				/* Cleanup code here */
		}
	);

</script>
```  

#### 6. *sendData ( ipcRenderer, processName, value )*

Desciption: Sends data to an already running background process (provided it is using onRecieve data)

Args: 
	ipcRenderer (required): The ipcRenderer being used in the hidden window 
		renderer process.
	processName (required): The name of the process matching the one used 
		during registration of the current html file.
	value (optional) :The data that needs to be sent to the background process.

Here is a quick example for it.

```js
// in oscilloscope.js
const electron = window.require('electron');
const { ipcRenderer } = electron;
const loadBalancer = window.require('electron-load-balancer');

loadBalancer.sendData(ipcRenderer, 'oscilloscope', {
        command: 'GET_CONFIG_OSC',
});
```  
  
Note: It can be observed that there are special functions in the library to send data to and recive data in background process, but there is no special provision for doing it the other way round. The reason for it is quite simple, the library is internally managing the background process and we are not exposing the api for direct communication to make things easy for the developer. But while sending data from background process to visible render, we can do it using trivial IPC methods provided by electron itself. 
A good example for this can be found in: 
- https://github.com/fossasia/pslab-desktop/blob/development/background_tasks/linker.html#L50
- https://github.com/fossasia/pslab-desktop/blob/development/src/screen/Oscilloscope/components/Graph.js#L35
- https://github.com/fossasia/pslab-desktop/blob/development/public/electron.js#L87
  
The 3 files mentioned above shall show you how to send data from background process to renderer process.

## How it works
As a picture is worth a thousand words, here is a simple flow diagram of my architecture which is pretty primitive to be honest, but hey, it works!! :wink:

![Contribution guidelines for this project](https://i.redd.it/43iv1cr2qnr21.jpg)
