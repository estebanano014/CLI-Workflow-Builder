import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('cliWF', {
  getConnection: () => ipcRenderer.invoke('cliWF:connection'),
  platform: process.platform
})
