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
  historial: EjecucionRegistro[]
  ajustes: Ajustes
}

/** Registro de historial: solo metadatos, nunca comandos resueltos ni variables (RNF-009). */
export interface EjecucionRegistro {
  id: string
  tipo: 'ruta' | 'receta'
  refId: string | null
  nombre: string
  pasosHechos: number
  pasosTotal: number
  duracionMs: number
  fecha: string
}

export interface ActividadDia {
  fecha: string // YYYY-MM-DD
  count: number
}

export interface Estadisticas {
  totalEjecuciones: number
  rutasEjecutadas: number
  recetasCompletadas: number
  pasosCompletados: number
  diasActivos: number
  racha: number
  rachaMaxima: number
  porDia: ActividadDia[]
  ultimaFecha: string | null
}

export type Vista =
  | { nombre: 'dashboard' }
  | { nombre: 'biblioteca' }
  | { nombre: 'progreso' }
  | { nombre: 'terminal' }
  | { nombre: 'ruta-editor'; id?: string }
  | { nombre: 'ejecucion'; id: string }
  | { nombre: 'receta-editor'; id?: string }
  | { nombre: 'receta-detalle'; id: string }
  | { nombre: 'ajustes' }
