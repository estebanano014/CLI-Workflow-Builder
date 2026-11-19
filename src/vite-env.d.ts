/// <reference types="vite/client" />

export interface ConnectionInfo {
  port: number
  token: string
}

export interface ResultadoEjecucion {
  stdout: string
  stderr: string
  code: number | null
  timedOut: boolean
  error: string | null
}

export interface AssistantConfig {
  ollamaUrl: string
  model: string
  temperature: number
  numCtx: number
  workspaceDir: string
  systemPrompt: string
}

export interface AssistantHealth {
  online: boolean
  models?: string[]
  error?: string
}

export interface AssistantChatResult {
  ok: boolean
  text?: string
  error?: string
}

export interface AssistantConfirmPayload {
  id: string
  tool: string
  title: string
  message: string
}

export interface AssistantBridge {
  chat: (message: string) => Promise<AssistantChatResult>
  reset: () => Promise<{ ok: boolean }>
  getConfig: () => Promise<AssistantConfig>
  setConfig: (config: AssistantConfig) => Promise<AssistantConfig>
  listModels: () => Promise<string[]>
  health: () => Promise<AssistantHealth>
  confirmReply: (id: string, ok: boolean) => Promise<{ ok: boolean }>
  onChunk: (cb: (data: { text: string }) => void) => () => void
  onStatus: (cb: (data: { type: string; tool?: string }) => void) => () => void
  onConfirm: (cb: (data: AssistantConfirmPayload) => void) => () => void
  onDone: (cb: (data: { text: string }) => void) => () => void
  onError: (cb: (data: { message: string }) => void) => () => void
}

export interface CliWFBridge {
  getConnection: () => Promise<ConnectionInfo>
  ejecutarComando: (args: { comando: string; cwd?: string; timeoutMs?: number }) => Promise<ResultadoEjecucion>
  homeDir: () => Promise<string>
  platform: string
  assistant: AssistantBridge
}

declare global {
  interface Window {
    cliWF?: CliWFBridge
  }
}

export {}
