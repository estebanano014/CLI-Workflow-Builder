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

export interface CliWFBridge {
  getConnection: () => Promise<ConnectionInfo>
  ejecutarComando: (args: { comando: string; cwd?: string; timeoutMs?: number }) => Promise<ResultadoEjecucion>
  homeDir: () => Promise<string>
  platform: string
}

declare global {
  interface Window {
    cliWF?: CliWFBridge
  }
}

export {}
