import { ipcRenderer } from 'electron'
import type { PreloadApi } from '../api-types'

export const voloApi: PreloadApi['volo'] = {
  connect: (args) => ipcRenderer.invoke('volo:connect', args),
  connectFromSavedCredentials: () => ipcRenderer.invoke('volo:connectFromSavedCredentials'),
  loginWithGoogle: (args) => ipcRenderer.invoke('volo:loginWithGoogle', args),
  disconnect: () => ipcRenderer.invoke('volo:disconnect'),
  status: () => ipcRenderer.invoke('volo:status'),
  readStatus: () => ipcRenderer.invoke('volo:readStatus'),
  testConnection: () => ipcRenderer.invoke('volo:testConnection'),
  listBoards: () => ipcRenderer.invoke('volo:listBoards'),
  listMembers: (args) => ipcRenderer.invoke('volo:listMembers', args),
  listTasks: (args) => ipcRenderer.invoke('volo:listTasks', args),
  getTask: (args) => ipcRenderer.invoke('volo:getTask', args),
  createTask: (args) => ipcRenderer.invoke('volo:createTask', args),
  updateTask: (args) => ipcRenderer.invoke('volo:updateTask', args),
  moveTask: (args) => ipcRenderer.invoke('volo:moveTask', args)
}
