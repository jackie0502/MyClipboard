const { contextBridge, ipcRenderer } = require('electron');

console.log('preload.js 已加載');

contextBridge.exposeInMainWorld('electronAPI', {
  windowControls: {
    toggleDocked: () => ipcRenderer.invoke('window:toggle-docked'),
    hide: () => ipcRenderer.invoke('window:hide'),
    getDockState: () => ipcRenderer.invoke('window:get-dock-state'),
    startDockDrag: (screenY) =>
      ipcRenderer.send('window:start-dock-drag', screenY),
    updateDockDrag: (screenX, screenY) =>
      ipcRenderer.send('window:update-dock-drag', screenX, screenY),
    endDockDrag: () => ipcRenderer.invoke('window:end-dock-drag'),
    onDockStateChanged: (callback) => {
      const listener = (_event, collapsed) => callback(collapsed);
      ipcRenderer.on('window:dock-state', listener);
      return () => {
        ipcRenderer.removeListener('window:dock-state', listener);
      };
    }
  },
  clipboard: {
    read: () => ipcRenderer.invoke('clipboard:read'),
    write: (text) => ipcRenderer.invoke('clipboard:write', text),
    getHistory: () => ipcRenderer.invoke('clipboard:history'),
    clearHistory: () => ipcRenderer.invoke('clipboard:clear-history'),
    
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
