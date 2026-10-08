/* The page's window into the desktop app (G3, 0.151): window.desktop — full screen, quitting and the local lobby server. Nothing else of
   Electron or Node reaches the page. */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
	app: true,
	isFullScreen: () => ipcRenderer.invoke("desktop:fullscreen:get"),
	setFullScreen: (on) => ipcRenderer.invoke("desktop:fullscreen:set", !!on),
	onFullScreen: (listener) => ipcRenderer.on("desktop:fullscreen", (_, on) => listener(!!on)),
	quit: () => ipcRenderer.invoke("desktop:quit"),
	// Starts the lobby server for the local network; { port, addresses }.
	lobby: () => ipcRenderer.invoke("desktop:lobby"),
});
