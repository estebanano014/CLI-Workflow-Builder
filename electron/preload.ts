import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

function subscribe<T>(channel: string, cb: (data: T) => void): () => void {
  const listener = (_e: IpcRendererEvent, data: T) => cb(data)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('cliWF', {
  getConnection: () => ipcRenderer.invoke('cliWF:connection'),
  ejecutarComando: (args: { comando: string; cwd?: string; timeoutMs?: number }) =>
    ipcRenderer.invoke('cliWF:ejecutar', args),
  homeDir: () => ipcRenderer.invoke('cliWF:homeDir'),
  platform: process.platform,
  assistant: {
    chat: (payload: { message: string; username?: string }) => ipcRenderer.invoke('cliWF:assistant-chat', payload),
    reset: () => ipcRenderer.invoke('cliWF:assistant-reset'),
    newConversation: () => ipcRenderer.invoke('cliWF:assistant-new-conversation'),
    listConversations: (username: string) => ipcRenderer.invoke('cliWF:assistant-list-conversations', username),
    loadConversation: (id: string, username: string) =>
      ipcRenderer.invoke('cliWF:assistant-load-conversation', { id, username }),
    deleteConversation: (id: string, username: string) =>
      ipcRenderer.invoke('cliWF:assistant-delete-conversation', { id, username }),
    getConfig: () => ipcRenderer.invoke('cliWF:assistant-get-config'),
    setConfig: (config: Record<string, unknown>) => ipcRenderer.invoke('cliWF:assistant-set-config', config),
    listModels: () => ipcRenderer.invoke('cliWF:assistant-models'),
    health: () => ipcRenderer.invoke('cliWF:assistant-health'),
    confirmReply: (id: string, ok: boolean) => ipcRenderer.invoke('cliWF:assistant-confirm', { id, ok }),
    onChunk: (cb: (data: { text: string }) => void) => subscribe('ollama:chunk', cb),
    onStatus: (cb: (data: { type: string; tool?: string }) => void) => subscribe('ollama:status', cb),
    onConfirm: (cb: (data: { id: string; title: string; message: string; tool: string }) => void) =>
      subscribe('ollama:confirm', cb),
    onDone: (cb: (data: { text: string }) => void) => subscribe('ollama:done', cb),
    onError: (cb: (data: { message: string }) => void) => subscribe('ollama:error', cb)
  }
})
