/* جسر آمن بين النافذة والنظام (contextIsolation مفعّل) */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mdxNative', {
  platform: 'windows',
  getAppInfo:   () => ipcRenderer.invoke('app-info'),
  getLatestRelease: () => ipcRenderer.invoke('latest-release'),
  installUpdate: (version) => ipcRenderer.invoke('install-update', version),
  finishUpdateSave: () => ipcRenderer.invoke('finish-update-save'),
  ready:        () => ipcRenderer.invoke('ready'),
  newWindow:    () => ipcRenderer.invoke('new-window'),
  openFile:     (options) => ipcRenderer.invoke('open-file', options),
  readPath:     (p) => ipcRenderer.invoke('read-path', p),
  saveFile:     (p, c) => ipcRenderer.invoke('save-file', p, c),
  saveFileAs:   (name, c) => ipcRenderer.invoke('save-file-as', name, c),
  setDirty:     (v) => ipcRenderer.invoke('set-dirty', v),
  setEditState: (state) => ipcRenderer.invoke('edit-state', state),
  closeNow:     () => ipcRenderer.invoke('close-now'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  setTitle:     (name) => ipcRenderer.invoke('set-title', name),
  onOpenPath:   (cb) => ipcRenderer.on('open-path', (_e, data) => cb(data)),
  onMenu:       (cb) => ipcRenderer.on('menu', (_e, action) => cb(action))
});
