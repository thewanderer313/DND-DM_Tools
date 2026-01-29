const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Image operations
  saveImage: (fileName, dataUrl) =>
    ipcRenderer.invoke('save-image', { fileName, dataUrl }),

  readImage: (relativePath) =>
    ipcRenderer.invoke('read-image', relativePath),

  listImages: () =>
    ipcRenderer.invoke('list-images'),

  deleteImage: (relativePath) =>
    ipcRenderer.invoke('delete-image', relativePath),

  // App info
  getAppInfo: () =>
    ipcRenderer.invoke('get-app-info'),

  // File dialogs
  saveDataFile: (defaultName, data) =>
    ipcRenderer.invoke('save-data-file', { defaultName, data }),

  loadDataFile: () =>
    ipcRenderer.invoke('load-data-file'),

  // Check if running in Electron
  isElectron: true
});
