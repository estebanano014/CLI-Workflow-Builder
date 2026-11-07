import type { Ajustes, Paso, Ruta, Receta, SO, Variante } from '@/lib/types'

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function nuevoPaso(): Paso {
  return {
    id: uid(),
    titulo: '',
    descripcion: '',
    esDestructivo: false,
    variantes: [nuevaVariante('any')]
  }
}

export function nuevaVariante(so: SO = 'any'): Variante {
  return { id: uid(), so, comando: '', nota: '', esAlternativo: false }
}

export function nuevaRuta(soPreferido: SO): Ruta {
  const ahora = new Date().toISOString()
  const paso: Paso = {
    id: uid(),
    titulo: '',
    descripcion: '',
    esDestructivo: false,
    variantes: [nuevaVariante(soPreferido)]
  }
  return {
    id: uid(),
    nombre: '',
    descripcion: '',
    etiquetas: [],
    favorito: false,
    color: '#2563eb',
    icono: 'terminal',
    createdAt: ahora,
    updatedAt: ahora,
    lastRunAt: null,
    pasos: [paso],
    variables: []
  }
}

export function nuevaReceta(): Receta {
  const ahora = new Date().toISOString()
  return {
    id: uid(),
    titulo: '',
    descripcion: '',
    entrada: '',
    salida: '',
    etiquetas: [],
    favorito: false,
    createdAt: ahora,
    updatedAt: ahora,
    lastRunAt: null,
    pasos: [{ id: uid(), texto: '' }]
  }
}

const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

/** Extrae los nombres de variables de paso usadas en una cadena. */
export function extraerVariables(texto: string): string[] {
  const nombres = new Set<string>()
  let m: RegExpExecArray | null
  VAR_RE.lastIndex = 0
  while ((m = VAR_RE.exec(texto)) !== null) {
    nombres.add(m[1])
  }
  return Array.from(nombres)
}

/** Variables usadas en toda una ruta (a partir de los comandos de sus pasos). */
export function variablesDeRuta(ruta: Ruta): string[] {
  const nombres = new Set<string>()
  for (const paso of ruta.pasos) {
    for (const v of paso.variantes) {
      for (const n of extraerVariables(v.comando)) nombres.add(n)
    }
  }
  return Array.from(nombres)
}

/** Variables usadas en un único paso. */
export function variablesDePaso(paso: Paso): string[] {
  const nombres = new Set<string>()
  for (const v of paso.variantes) for (const n of extraerVariables(v.comando)) nombres.add(n)
  return Array.from(nombres)
}

/**
 * Resuelve un comando sustituyendo {{x}} por valores.
 * Precedencia: variable de paso > variable global. Las no resueltas se dejan como token.
 */
export function resolverComando(comando: string, valores: Record<string, string>): string {
  return comando.replace(VAR_RE, (_, nombre: string) => {
    const v = valores[nombre]
    return v !== undefined && v !== '' ? v : `{{${nombre}}}`
  })
}

/** Elige la variante a mostrar para un sistema operativo preferido. */
export function varianteParaSO(paso: Paso, soPreferido: SO): Variante | undefined {
  return (
    paso.variantes.find((v) => v.so === soPreferido) ??
    paso.variantes.find((v) => v.so === 'any') ??
    paso.variantes[0]
  )
}

export function splitTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    )
  )
}

export function formatearFecha(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

export function ajustesDefault(): Ajustes {
  return { variablesGlobales: [], soPreferido: 'windows' }
}
