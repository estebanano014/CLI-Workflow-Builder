/**
 * Búsqueda fuzzy ligera y sin dependencias (para la paleta de comandos).
 *
 * Coincidencia por subsecuencia, insensible a mayúsculas, con bonus por
 * inicio de palabra, inicio de cadena y caracteres consecutivos. Devuelve la
 * puntuación y las posiciones coincidentes para resaltarlas en la UI.
 */

export interface FuzzyResult {
  score: number
  /** Posiciones del texto original que coincidieron (para resaltar). */
  indices: number[]
}

export function fuzzyMatch(query: string, texto: string): FuzzyResult | null {
  const q = query.trim().toLowerCase()
  const t = texto.toLowerCase()
  if (!q) return { score: 0, indices: [] }
  if (!t) return null

  let qi = 0
  const indices: number[] = []
  let score = 0
  let prevIndex = -1
  let consecutive = 0

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue

    indices.push(ti)
    if (prevIndex >= 0 && ti === prevIndex + 1) {
      consecutive += 8
    } else {
      consecutive = 0
    }
    const prevChar = ti === 0 ? '' : t[ti - 1]
    const wordStart = ti === 0 || prevChar === ' ' || prevChar === '-' || prevChar === '_' || prevChar === '/'
    score += 10 + consecutive + (wordStart ? 12 : 0) + (ti === 0 ? 8 : 0)
    prevIndex = ti
    qi++
  }

  if (qi < q.length) return null // la subsecuencia no se completó

  // Penalización leve por longitud sobrante para preferir coincidencias cortas.
  score -= Math.max(0, t.length - q.length) * 0.1

  return { score, indices }
}
