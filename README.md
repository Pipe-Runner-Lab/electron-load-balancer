# electron-load-balancer :fire:  

> Electron background task runner for humans :hearts:  

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
// in main.js
const { ipcMain } = require('electron');
const loadBalancer = require('electron-load-balancer');

.
.
.
.

loadBalancer.register(
	ipcMain,
	{
		'oscilloscope': '/../linkers/oscilloscope.html',
		'logicAnalyser': '/../linkers/logicAnalyser.html',
	}
)
```
**Note**: The file path should be derived from the place where main.js actually resides. Here is my file structure for more clarity.  
```
|--node_modules
|
|--src
|	|
|	|--main.js
|
|--linkers
|	|
|	|--oscilloscope.html
|	|--logicAnalyser.html
```

***

### Start / Stop background process from visible window
#### 2. *startBackgroundProcess( ipcRenderer, processName, values )*
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
The third argument lets you pass any extra data that your background process may need to get started.  
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

	onClick = () => {
		loadBalancer.startBackgroundProcess( ipcRenderer ,'oscilloscope');
	}

	.
	.
	.
}

export default App
```

#### 3. *stopBackgroundProcess( ipcRenderer, processName )*
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

This function is used to tell the library to stop and destroy the background process. The **processName** mentioned as the second argument must match exactly to one of the processes mentioned during registration.  
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

	onClick = () => {
		loadBalancer.stopBackgroundProcess( ipcRenderer ,'oscilloscope');
	}

	.
	.
	.
}
```

***

### Initilization / Kill hook in hidden renderer process
#### 4. *onInitialize( ipcRenderer, processName, func )*
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

Returns: none
```

This function is used to notify the main process about the successful creation of hidden window. After this, the main process sends the initialization values that may be required for the background process to start.  
The **processName** must match the one provided during registration for this particular html file.  
The third argument is the function which when executed shall start the blocking process. The argument of this function will be the initialization value that the user may have provided.
Here is a quick example on how to use it.

```html
// in oscilloscope.js
<script>
	const { ipcRenderer } = require('electron');
	const loadBalancer = require('electron-load-balancer');
	
	loadBalancer.onInitialize(ipcRenderer, 'oscilloscope', initialValues => {
		
		/* -------------------- Blocking code here ----------------------- */

		.
		.
		.

		/* --------------------------------------------------------------- */
	
	});

</script>
```

#### 5. *onFinish( ipcRenderer, processName, func )*
```
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
```

This function comes in handy when the user is allowed to kill the process at will. When the user triggers the **stopBackgroundProcess** function, this hook is triggered and the function passed as the third argument is executed, which can be used to kill the process. The destruction of the hidden window will be handled by the library itself.
Here is a little example with a **while loop** being the blocking process which can be terminated by changing the value of **variable**. Important thing to note here is the the hook is placed within the fucntion passed to the **onInitialize** hook.

```html
// in oscilloscope.js
<script>
	const { ipcRenderer } = require('electron');
	const loadBalancer = require('electron-load-balancer');
	
	loadBalancer.initialize(ipcRenderer, 'oscilloscope', initialValues => {
		
		/* -------------------- Blocking code here ----------------------- */

		let x = true;

		loadBalancer.onFinish(ipcRenderer, 'oscilloscope', () => {
			x = false;
		});

		while( x ){
			console.log( 'Loop running' );
		}

		/* --------------------------------------------------------------- */
	
	});

</script>
```

#### 6. *finish( ipcRenderer, processName )*
```
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
```

This function is optional and needs to be used if we don't use the kill hook which would mean that the user is not allowed to interupt the process once started. This function is necessary in that case as we will still need to let the library know that the task has been completed.   
Here is an example demonstrating a **while loop** that is *blocking the thread but will release it eventually on its own*. 

```html
// in oscilloscope.js
<script>
	const { ipcRenderer } = require('electron');
	const loadBalancer = require('electron-load-balancer');
	
	loadBalancer.initialize(ipcRenderer, 'oscilloscope', initialValues => {
		
		/* -------------------- Blocking code here ----------------------- */

		let x = 100000000;

		while( x-- ){
			console.log( 'Loop running' );
		}
		
		/* --------------------------------------------------------------- */
	
		loadBalancer.finish(ipcRenderer, 'oscilloscope');
	});

</script>
```
## How it works
As a picture is worth a thousand words, here is a simple flow diagram of my architecture which is pretty primitive to be honest, but hey, it works!! :wink:

![Contribution guidelines for this project](https://i.redd.it/43iv1cr2qnr21.jpg)