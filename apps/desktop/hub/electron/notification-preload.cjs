const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cravenNotificationPanel', {
  action: (payload) => ipcRenderer.send('hub:notification-panel-action', payload),
});
