// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('saveAPI', {
  load: () => ipcRenderer.invoke('save:read'),
  save: (data) => ipcRenderer.invoke('save:write', data),
});

contextBridge.exposeInMainWorld('electronAPI', {
  toggleFullScreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  getFullScreenState: () => ipcRenderer.invoke('get-fullscreen-state'),
  quitApp: () => ipcRenderer.invoke("quit-app")
});