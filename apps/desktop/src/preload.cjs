const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('engine', {
  getEnginePort: () => ipcRenderer.invoke('engine:get-port'),
});

contextBridge.exposeInMainWorld('appControl', {
  quit: () => ipcRenderer.invoke('app:quit'),
});
