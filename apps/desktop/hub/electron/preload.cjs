const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cravenDesktop', {
  platform: process.platform,
  getVersion: () => ipcRenderer.invoke('hub:get-version'),
  openExternal: (url) => ipcRenderer.invoke('hub:open-external', url),
  onNavigate: (listener) => {
    const handler = (_event, route) => listener(route);
    ipcRenderer.on('hub:navigate', handler);
    return () => ipcRenderer.removeListener('hub:navigate', handler);
  },
  notifications: {
    isSupported: () => ipcRenderer.invoke('hub:notification-supported'),
    show: (payload) => ipcRenderer.invoke('hub:notification-show', payload),
  },
  window: {
    minimize: () => ipcRenderer.invoke('hub:window-minimize'),
    toggleMaximize: () => ipcRenderer.invoke('hub:window-toggle-maximize'),
    close: () => ipcRenderer.invoke('hub:window-close'),
    isMaximized: () => ipcRenderer.invoke('hub:window-is-maximized'),
    onStateChange: (listener) => {
      const handler = (_event, state) => listener(state);
      ipcRenderer.on('hub:window-state', handler);
      return () => ipcRenderer.removeListener('hub:window-state', handler);
    },
  },
});
