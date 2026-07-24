const { contextBridge, ipcRenderer } = require('electron');

console.log('preload.js 已加載');

contextBridge.exposeInMainWorld('electronAPI', {
  clipboard: {
    read: () => ipcRenderer.invoke('clipboard:read'),
    write: (text) => ipcRenderer.invoke('clipboard:write', text)
  }
});

console.log('window.electronAPI 已暴露');
