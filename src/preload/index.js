import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Folders
  getFolders: () => ipcRenderer.invoke('folders:getAll'),
  createFolder: (data) => ipcRenderer.invoke('folders:create', data),
  updateFolder: (data) => ipcRenderer.invoke('folders:update', data),
  deleteFolder: (id) => ipcRenderer.invoke('folders:delete', id),

  // Notes
  getNotes: (params) => ipcRenderer.invoke('notes:getAll', params),
  getNote: (id) => ipcRenderer.invoke('notes:get', id),
  createNote: (data) => ipcRenderer.invoke('notes:create', data),
  updateNote: (data) => ipcRenderer.invoke('notes:update', data),
  trashNote: (id) => ipcRenderer.invoke('notes:trash', id),
  restoreNote: (id) => ipcRenderer.invoke('notes:restore', id),
  deleteNote: (id) => ipcRenderer.invoke('notes:delete', id),
  emptyTrash: () => ipcRenderer.invoke('notes:emptyTrash'),
  getNoteStats: () => ipcRenderer.invoke('notes:getStats'),

  // Tags
  getTags: () => ipcRenderer.invoke('tags:getAll'),
  createTag: (data) => ipcRenderer.invoke('tags:create', data),
})
