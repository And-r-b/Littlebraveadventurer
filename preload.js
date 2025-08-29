// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleFullScreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  getFullScreenState: () => ipcRenderer.invoke('get-fullscreen-state'),
  quitApp: () => ipcRenderer.invoke("quit-app")
});