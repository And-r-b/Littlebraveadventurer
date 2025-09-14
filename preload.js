// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('saveAPI', {
  load: () => ipcRenderer.invoke('save:read'),
  save:  (data) => ipcRenderer.invoke('save:write', data),
  clear: () => ipcRenderer.invoke('save:clear')   // <—
});

contextBridge.exposeInMainWorld('electronAPI', {
  toggleFullScreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  getFullScreenState: () => ipcRenderer.invoke('get-fullscreen-state'),
  quitApp: () => ipcRenderer.invoke("quit-app")
});