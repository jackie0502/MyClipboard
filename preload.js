const { contextBridge, ipcRenderer } = require('electron');

console.log('preload.js 已加載');

contextBridge.exposeInMainWorld('electronAPI', {
  clipboard: {
    read: () => ipcRenderer.invoke('clipboard:read'),
    write: (text) => ipcRenderer.invoke('clipboard:write', text),
    getHistory: () => ipcRenderer.invoke('clipboard:history'),
    
    onHistoryUpdated: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('clipboard:history-updated', listener);
      return () => {
        ipcRenderer.removeListener('clipboard:history-updated', listener);
      };
    }

  }
});

console.log('window.electronAPI 已暴露');
