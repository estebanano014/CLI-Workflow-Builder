import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Swal from 'sweetalert2'
import { useApp } from '@/context/AppContext'
import { fuzzyMatch } from '@/lib/fuzzy'
import {
  comandosPara,
  COMANDOS,
  textoBuscable,
  todasLasVariantes,
  type CatalogoSO,
  type ComandoCatalogado
} from '@/lib/catalogo'
import { copiarAlPortapapeles } from '@/lib/clipboard'
import type { SO } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
}

type Grupo = 'Acciones' | 'Rutas' | 'Recetas' | 'Comandos'

interface Entrada {
  id: string
  grupo: Grupo
  label: string
  hint: string
  icono: string
  color?: string
  textoBuscable: string
  ejecutar: () => void | Promise<void>
}

interface Resultado extends Entrada {
  indices: number[]
}

const MAX_RESULTADOS = 15
const DEFAULT_MAX = 12

function comandoParaCopiar(c: ComandoCatalogado, soPreferido: SO): string {
  const soCat: CatalogoSO = soPreferido === 'any' ? 'windows' : soPreferido
  const variantes = comandosPara(c, soCat)
  if (variantes.length > 0) return variantes[0].texto
  const todas = todasLasVariantes(c)
  return todas.length > 0 ? todas[0].texto : ''
}

function resaltar(texto: string, indices: number[]): ReactNode {
  if (indices.length === 0) return texto
  const set = new Set(indices)
  return Array.from(texto).map((ch, i) =>
    set.has(i) ? <mark key={i}>{ch}</mark> : ch
  )
}

export function CommandPalette({ open, onClose }: Props) {
  const { rutas, recetas, ajustes, navegar } = useApp()
  const [busqueda, setBusqueda] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (open) {
      setBusqueda('')
      setActive(0)
    }
  }, [open])

  const entradas = useMemo<Entrada[]>(() => {
    const acciones: Entrada[] = [
      { id: 'a-biblioteca', grupo: 'Acciones', label: 'Ir a la Biblioteca', hint: 'Navegación', icono: 'fa-book', textoBuscable: 'ir a la biblioteca navegacion comandos', ejecutar: () => navegar({ nombre: 'biblioteca' }) },
      { id: 'a-dashboard', grupo: 'Acciones', label: 'Ir al Dashboard', hint: 'Navegación', icono: 'fa-gauge-high', textoBuscable: 'ir al dashboard navegacion', ejecutar: () => navegar({ nombre: 'dashboard' }) },
      { id: 'a-progreso', grupo: 'Acciones', label: 'Ver Progreso', hint: 'Navegación · rachas', icono: 'fa-chart-line', textoBuscable: 'ver progreso estadisticas rachas navegacion', ejecutar: () => navegar({ nombre: 'progreso' }) },
      { id: 'a-ajustes', grupo: 'Acciones', label: 'Ir a Ajustes', hint: 'Navegación', icono: 'fa-gear', textoBuscable: 'ir a ajustes configuracion navegacion', ejecutar: () => navegar({ nombre: 'ajustes' }) },
      { id: 'a-nueva-ruta', grupo: 'Acciones', label: 'Nueva Ruta', hint: 'Crear', icono: 'fa-plus', textoBuscable: 'nueva ruta crear flujo comandos', ejecutar: () => navegar({ nombre: 'ruta-editor' }) },
      { id: 'a-nueva-receta', grupo: 'Acciones', label: 'Nueva Receta', hint: 'Crear', icono: 'fa-plus', textoBuscable: 'nueva receta crear logica pasos', ejecutar: () => navegar({ nombre: 'receta-editor' }) }
    ]

    const porRecientes = (a: { lastRunAt: string | null }, b: { lastRunAt: string | null }) =>
      (b.lastRunAt ? Date.parse(b.lastRunAt) : 0) - (a.lastRunAt ? Date.parse(a.lastRunAt) : 0)

    const rutasEntradas: Entrada[] = [...rutas]
      .sort(porRecientes)
      .map((r) => ({
        id: `r-${r.id}`,
        grupo: 'Rutas' as const,
        label: r.nombre,
        hint: `${r.pasos.length} paso${r.pasos.length !== 1 ? 's' : ''}`,
        icono: `fa-${r.icono}`,
        color: r.color,
        textoBuscable: [r.nombre, r.descripcion ?? '', ...r.etiquetas].join(' ').toLowerCase(),
        ejecutar: () => navegar({ nombre: 'ejecucion', id: r.id })
      }))

    const recetasEntradas: Entrada[] = [...recetas]
      .sort(porRecientes)
      .map((r) => ({
        id: `rec-${r.id}`,
        grupo: 'Recetas' as const,
        label: r.titulo,
        hint: `${r.pasos.length} paso${r.pasos.length !== 1 ? 's' : ''}`,
        icono: 'fa-list-check',
        textoBuscable: [r.titulo, r.descripcion ?? '', ...r.etiquetas].join(' ').toLowerCase(),
        ejecutar: () => navegar({ nombre: 'receta-detalle', id: r.id })
      }))

    const comandosEntradas: Entrada[] = COMANDOS.map((c) => {
      const texto = comandoParaCopiar(c, ajustes.soPreferido)
      return {
        id: `c-${c.id}`,
        grupo: 'Comandos' as const,
        label: c.accion,
        hint: texto || c.categoria,
        icono: 'fa-terminal',
        textoBuscable: textoBuscable(c),
        ejecutar: async () => {
          if (!texto) return
          const ok = await copiarAlPortapapeles(texto)
          await Swal.fire({
            title: ok ? 'Comando copiado' : 'No se pudo copiar',
            text: ok ? c.accion : 'Revisa el portapapeles y vuelve a intentarlo.',
            icon: ok ? 'success' : 'error',
            timer: 1600,
            showConfirmButton: false
          })
        }
      }
    })

    return [...acciones, ...rutasEntradas, ...recetasEntradas, ...comandosEntradas]
  }, [rutas, recetas, ajustes.soPreferido, navegar])

  const resultados = useMemo<Resultado[]>(() => {
    const q = busqueda.trim()
    if (!q) {
      return entradas
        .filter((e) => e.grupo === 'Acciones' || e.grupo === 'Rutas' || e.grupo === 'Recetas')
        .slice(0, DEFAULT_MAX)
        .map((e) => ({ ...e, indices: [] }))
    }
    const conScore: { entrada: Entrada; indices: number[]; score: number }[] = []
    for (const e of entradas) {
      const rank = fuzzyMatch(q, e.textoBuscable)
      if (!rank) continue
      const indices = fuzzyMatch(q, e.label)?.indices ?? []
      conScore.push({ entrada: e, indices, score: rank.score })
    }
    conScore.sort((a, b) => b.score - a.score)
    return conScore.slice(0, MAX_RESULTADOS).map((c) => ({ ...c.entrada, indices: c.indices }))
  }, [busqueda, entradas])

  useEffect(() => {
    document.getElementById(`palette-opt-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const ejecutar = (e: Entrada) => {
    onClose()
    void e.ejecutar()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (resultados[active]) ejecutar(resultados[active])
    }
  }

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="palette-input-wrap">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            autoFocus
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Buscar comandos, rutas, recetas…"
            aria-label="Buscar comandos, rutas, recetas y acciones"
          />
        </div>

        {resultados.length === 0 ? (
          <p className="palette-empty muted">Sin resultados para «{busqueda}».</p>
        ) : (
          <ul className="palette-list" role="listbox" aria-label="Resultados">
            {resultados.map((e, i) => (
              <li
                key={e.id}
                id={`palette-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={`palette-item ${i === active ? 'active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => ejecutar(e)}
              >
                <i className={`fa-solid ${e.icono}`} style={e.color ? { color: e.color } : undefined} aria-hidden="true" />
                <span className="palette-label">{resaltar(e.label, e.indices)}</span>
                <span className="palette-hint muted">{e.hint}</span>
                <span className="badge">{e.grupo}</span>
              </li>
            ))}
          </ul>
        )}

        <footer className="palette-footer muted" aria-hidden="true">
          <span>
            <kbd className="kbd">↑</kbd>
            <kbd className="kbd">↓</kbd> navegar
          </span>
          <span>
            <kbd className="kbd">Enter</kbd> abrir
          </span>
          <span>
            <kbd className="kbd">Esc</kbd> cerrar
          </span>
        </footer>
      </div>
    </div>
  )
}
