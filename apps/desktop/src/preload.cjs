const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('engine', {
  getEnginePort: () => ipcRenderer.invoke('engine:get-port'),
});
