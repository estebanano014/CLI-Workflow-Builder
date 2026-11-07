export type SO = 'windows' | 'linux' | 'macos' | 'any'

export const SO_LABEL: Record<SO, string> = {
  windows: 'Windows',
  linux: 'Linux',
  macos: 'macOS',
  any: 'Cualquiera'
}

export interface Variante {
  id: string
  so: SO
  comando: string
  nota?: string
  esAlternativo?: boolean
}

export interface Paso {
  id: string
  titulo: string
  descripcion?: string
  esDestructivo?: boolean
  variantes: Variante[]
}

export interface VariableDecl {
  nombre: string
  defaultValue?: string
}

export interface Ruta {
  id: string
  nombre: string
  descripcion?: string
  etiquetas: string[]
  favorito: boolean
  color: string
  icono: string
  createdAt: string
  updatedAt: string
  lastRunAt: string | null
  pasos: Paso[]
  variables: VariableDecl[]
}

export interface RecetaPaso {
  id: string
  texto: string
}

export interface Receta {
  id: string
  titulo: string
  descripcion?: string
  entrada?: string
  salida?: string
  etiquetas: string[]
  favorito: boolean
  createdAt: string
  updatedAt: string
  lastRunAt: string | null
  pasos: RecetaPaso[]
}

export interface VariableGlobal {
  nombre: string
  valor: string
}

export interface Ajustes {
  variablesGlobales: VariableGlobal[]
  soPreferido: SO
}

export interface StoreData {
  schemaVersion: number
  rutas: Ruta[]
  recetas: Receta[]
  ajustes: Ajustes
}

export type Vista =
  | { nombre: 'dashboard' }
  | { nombre: 'ruta-editor'; id?: string }
  | { nombre: 'ejecucion'; id: string }
  | { nombre: 'receta-editor'; id?: string }
  | { nombre: 'receta-detalle'; id: string }
  | { nombre: 'ajustes' }
