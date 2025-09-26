// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('saveAPI', {
  load: () => ipcRenderer.invoke('save:read'),
  save:  (data) => ipcRenderer.invoke('save:write', data),
  clear: () => ipcRenderer.invoke('save:clear')   // <—
});

contextBridge.exposeInMainWorld('electronAPI', {
  // fullscreen you already use
  toggleFullScreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  getFullScreenState: () => ipcRenderer.invoke('get-fullscreen-state'),

  // quit
  quitApp: () => ipcRenderer.invoke('quit-app'),

  // save system
  saveRead:  () => ipcRenderer.invoke('save:read'),
  saveWrite: (saveObj) => ipcRenderer.invoke('save:write', saveObj),
  saveClear: () => ipcRenderer.invoke('save:clear'),
});