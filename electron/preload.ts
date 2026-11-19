import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('cliWF', {
  getConnection: () => ipcRenderer.invoke('cliWF:connection'),
  ejecutarComando: (args: { comando: string; cwd?: string; timeoutMs?: number }) =>
    ipcRenderer.invoke('cliWF:ejecutar', args),
  homeDir: () => ipcRenderer.invoke('cliWF:homeDir'),
  platform: process.platform
})
