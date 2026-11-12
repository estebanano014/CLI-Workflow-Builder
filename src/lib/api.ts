import type { Ajustes, Ruta, Receta, StoreData } from '@/lib/types'
import type { ConnectionInfo } from '@/vite-env'

export class ApiError extends Error {
  status: number
  detail?: string
  retryAfter?: number
  constructor(status: number, message: string, detail?: string, retryAfter?: number) {
    super(message)
    this.status = status
    this.detail = detail
    this.retryAfter = retryAfter
  }
}

export class ApiClient {
  private base: string
  private token: string
  private sessionToken: string | null = null

  constructor(conn: ConnectionInfo) {
    this.base = `http://127.0.0.1:${conn.port}`
    this.token = conn.token
  }

  /** Define (o limpia) el token de sesión usado en la cabecera `X-Session-Token`. */
  setSessionToken(token: string | null): void {
    this.sessionToken = token
  }

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
      ...(init.headers as Record<string, string> | undefined)
    }
    if (this.sessionToken) {
      headers['X-Session-Token'] = this.sessionToken
    }
    const res = await fetch(this.base + path, { ...init, headers })
    if (res.status === 204) return undefined as T
    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      body = null
    }
    if (!res.ok) {
      const detail =
        body && typeof body === 'object' && 'detail' in body
          ? String((body as { detail: unknown }).detail)
          : undefined
      const retryAfter =
        body && typeof body === 'object' && 'retryAfter' in body
          ? Number((body as { retryAfter: unknown }).retryAfter)
          : undefined
      throw new ApiError(res.status, detail ?? `Error HTTP ${res.status}`, detail, retryAfter)
    }
    return body as T
  }

  salud = () => this.req<{ ok: boolean; schemaVersion: number }>('/v1/salud')

  // --- Autenticación de usuario (sesión local) ---
  register = (username: string, password: string) =>
    this.req<{ username: string }>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
  login = (username: string, password: string) =>
    this.req<{ token: string; username: string }>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
  logout = () => this.req<{ ok: boolean }>('/v1/auth/logout', { method: 'POST' })
  session = () => this.req<{ autenticado: boolean; username: string }>('/v1/auth/session')
  changePassword = (current: string, nueva: string) =>
    this.req<{ ok: boolean }>('/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current, new: nueva })
    })

  // --- Rutas ---
  listRutas = () => this.req<{ rutas: Ruta[] }>('/v1/rutas')
  getRuta = (id: string) => this.req<{ ruta: Ruta }>(`/v1/rutas/${id}`)
  createRuta = (ruta: Ruta) => this.req<{ ruta: Ruta }>('/v1/rutas', { method: 'POST', body: JSON.stringify(ruta) })
  updateRuta = (id: string, ruta: Ruta) =>
    this.req<{ ruta: Ruta }>(`/v1/rutas/${id}`, { method: 'PUT', body: JSON.stringify(ruta) })
  deleteRuta = (id: string) => this.req<void>(`/v1/rutas/${id}`, { method: 'DELETE' })

  // --- Recetas ---
  listRecetas = () => this.req<{ recetas: Receta[] }>('/v1/recetas')
  getReceta = (id: string) => this.req<{ receta: Receta }>(`/v1/recetas/${id}`)
  createReceta = (receta: Receta) =>
    this.req<{ receta: Receta }>('/v1/recetas', { method: 'POST', body: JSON.stringify(receta) })
  updateReceta = (id: string, receta: Receta) =>
    this.req<{ receta: Receta }>(`/v1/recetas/${id}`, { method: 'PUT', body: JSON.stringify(receta) })
  deleteReceta = (id: string) => this.req<void>(`/v1/recetas/${id}`, { method: 'DELETE' })

  // --- Ajustes ---
  getAjustes = () => this.req<{ ajustes: Ajustes }>('/v1/ajustes')
  updateAjustes = (ajustes: Ajustes) =>
    this.req<{ ajustes: Ajustes }>('/v1/ajustes', { method: 'PUT', body: JSON.stringify(ajustes) })

  // --- Import/Export ---
  exportData = () => this.req<StoreData>('/v1/export')
  importData = (data: StoreData) =>
    this.req<{ importados: { rutas: number; recetas: number } }>('/v1/import', {
      method: 'POST',
      body: JSON.stringify(data)
    })
}

let cachedClient: ApiClient | null = null

export async function getApi(): Promise<ApiClient> {
  if (cachedClient) return cachedClient
  if (!window.cliWF) throw new ApiError(0, 'Puente de Electron no disponible')
  const conn = await window.cliWF.getConnection()
  cachedClient = new ApiClient(conn)
  return cachedClient
}

/** Mensaje legible para el usuario a partir de un error (sin detalles técnicos). */
export function mensajeDeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      const s = err.retryAfter ?? 30
      return `Demasiados intentos. Inténtalo de nuevo en ${s} s.`
    }
    if (err.message && !err.message.startsWith('Error HTTP')) return err.message
    return 'Ocurrió un error. Inténtalo de nuevo.'
  }
  if (err instanceof Error && err.message) return err.message
  return 'Ocurrió un error inesperado.'
}
