import type { Ajustes, Ruta, Receta, StoreData } from '@/lib/types'
import type { ConnectionInfo } from '@/vite-env'

export class ApiError extends Error {
  status: number
  detail?: string
  constructor(status: number, message: string, detail?: string) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

export class ApiClient {
  private base: string
  private token: string

  constructor(conn: ConnectionInfo) {
    this.base = `http://127.0.0.1:${conn.port}`
    this.token = conn.token
  }

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(this.base + path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...(init.headers ?? {})
      }
    })
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
      throw new ApiError(res.status, detail ?? `Error HTTP ${res.status}`, detail)
    }
    return body as T
  }

  salud = () => this.req<{ ok: boolean; schemaVersion: number }>('/v1/salud')

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
