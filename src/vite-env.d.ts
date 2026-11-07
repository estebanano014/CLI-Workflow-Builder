/// <reference types="vite/client" />

export interface ConnectionInfo {
  port: number
  token: string
}

export interface CliWFBridge {
  getConnection: () => Promise<ConnectionInfo>
  platform: string
}

declare global {
  interface Window {
    cliWF?: CliWFBridge
  }
}

export {}
