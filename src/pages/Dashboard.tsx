import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { confirmarEliminacion, mostrarError, useApp } from '@/context/AppContext'
import { SO_LABEL } from '@/lib/types'
import { formatearFecha } from '@/lib/utils'
import { exportarDatos, exportarMarkdown, importarDatos } from '@/lib/io'
import { cheatsheetCompleto } from '@/lib/markdown'
import {
  nombreUnico,
  PLANTILLAS_RECETAS,
  PLANTILLAS_RUTAS,
  recetaDesdePlantilla,
  rutaDesdePlantilla,
  type PlantillaReceta,
  type PlantillaRuta
} from '@/lib/plantillas'
import { Collapsible } from '@/components/Collapsible'

type Tipo = 'ruta' | 'receta'

interface Item {
  tipo: Tipo
  id: string
  nombre: string
  descripcion: string
  etiquetas: string[]
  favorito: boolean
  lastRunAt: string | null
  color: string
  icono: string
}

type Tab = 'todo' | 'rutas' | 'recetas'
type Orden = 'recientes' | 'nombre' | 'favorito'

function MiniList({
  lista,
  onOpen,
  mensajeVacio,
  showDate = false
}: {
  lista: Item[]
  onOpen: (it: Item) => void
  mensajeVacio: string
  showDate?: boolean
}) {
  if (lista.length === 0) return <p className="muted widget-empty">{mensajeVacio}</p>
  return (
    <ul className="mini-list">
      {lista.map((it) => (
        <li key={`${it.tipo}-${it.id}`}>
          <button type="button" className="mini-item" onClick={() => onOpen(it)}>
            <i className={`fa-solid ${it.icono}`} style={{ color: it.color }} aria-hidden="true" />
            <span className="mini-name">{it.nombre || '(sin nombre)'}</span>
            {showDate && it.lastRunAt && (
              <span className="mini-date muted">{formatearFecha(it.lastRunAt)}</span>
            )}
            <span className={`badge ${it.tipo}`}>{it.tipo === 'ruta' ? 'Ruta' : 'Receta'}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default function Dashboard() {
  const {
    rutas,
    recetas,
    ajustes,
    estadisticas: progreso,
    cargando,
    error,
    navegar,
    recargar,
    guardarRuta,
    guardarReceta,
    duplicarRuta,
    duplicarReceta,
    eliminarRuta,
    eliminarReceta
  } = useApp()

  const [tab, setTab] = useState<Tab>('todo')
  const [busqueda, setBusqueda] = useState('')
  const [tagFiltro, setTagFiltro] = useState('')
  const [soloFav, setSoloFav] = useState(false)
  const [orden, setOrden] = useState<Orden>('recientes')
  const fileRef = useRef<HTMLInputElement>(null)

  const items = useMemo<Item[]>(() => {
    const lista: Item[] = [
      ...rutas.map((r) => ({
        tipo: 'ruta' as const,
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion ?? '',
        etiquetas: r.etiquetas,
        favorito: r.favorito,
        lastRunAt: r.lastRunAt,
        color: r.color,
        icono: r.icono
      })),
      ...recetas.map((r) => ({
        tipo: 'receta' as const,
        id: r.id,
        nombre: r.titulo,
        descripcion: r.descripcion ?? '',
        etiquetas: r.etiquetas,
        favorito: r.favorito,
        lastRunAt: r.lastRunAt,
        color: '#0e7490',
        icono: 'list-check'
      }))
    ]
    return lista
  }, [rutas, recetas])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    let res = items.filter((it) => {
      if (tab === 'rutas' && it.tipo !== 'ruta') return false
      if (tab === 'recetas' && it.tipo !== 'receta') return false
      if (soloFav && !it.favorito) return false
      if (tagFiltro && !it.etiquetas.some((t) => t.toLowerCase().includes(tagFiltro.toLowerCase()))) return false
      if (q) {
        const hay = [it.nombre, it.descripcion, it.etiquetas.join(' ')].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    res = [...res].sort((a, b) => {
      if (orden === 'nombre') return a.nombre.localeCompare(b.nombre, 'es')
      if (orden === 'favorito') {
        if (a.favorito !== b.favorito) return a.favorito ? -1 : 1
        return a.nombre.localeCompare(b.nombre, 'es')
      }
      const ta = a.lastRunAt ? Date.parse(a.lastRunAt) : 0
      const tb = b.lastRunAt ? Date.parse(b.lastRunAt) : 0
      return tb - ta
    })
    return res
  }, [items, tab, busqueda, tagFiltro, soloFav, orden])

  const tagsDisponibles = useMemo(
    () => Array.from(new Set(items.flatMap((i) => i.etiquetas))).sort(),
    [items]
  )

  const estadisticas = useMemo(() => {
    const totalPasos =
      rutas.reduce((n, r) => n + r.pasos.length, 0) + recetas.reduce((n, r) => n + r.pasos.length, 0)
    const totalVariantes = rutas.reduce(
      (n, r) => n + r.pasos.reduce((m, p) => m + p.variantes.length, 0),
      0
    )
    const pasosDestructivos = rutas.reduce(
      (n, r) => n + r.pasos.filter((p) => p.esDestructivo).length,
      0
    )
    return {
      rutas: rutas.length,
      recetas: recetas.length,
      favoritos: items.filter((i) => i.favorito).length,
      recientes: items.filter((i) => i.lastRunAt).length,
      pasos: totalPasos,
      variantes: totalVariantes,
      destructivos: pasosDestructivos,
      etiquetas: new Set(items.flatMap((i) => i.etiquetas)).size,
      variablesGlobales: ajustes.variablesGlobales.length
    }
  }, [rutas, recetas, items, ajustes])

  const tagConteo = useMemo(() => {
    const map = new Map<string, number>()
    for (const i of items) for (const t of i.etiquetas) map.set(t, (map.get(t) ?? 0) + 1)
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
  }, [items])

  const recientes = useMemo(
    () =>
      items
        .filter((i) => i.lastRunAt)
        .sort((a, b) => Date.parse(b.lastRunAt!) - Date.parse(a.lastRunAt!))
        .slice(0, 5),
    [items]
  )

  const favoritos = useMemo(() => items.filter((i) => i.favorito), [items])

  const pendientes = useMemo(() => items.filter((i) => !i.lastRunAt), [items])

  if (cargando) return <p className="muted">Cargando…</p>
  if (error) return <p className="field-error" role="alert">Error: {error}</p>

  const abrir = (it: Item) => {
    if (it.tipo === 'ruta') navegar({ nombre: 'ejecucion', id: it.id })
    else navegar({ nombre: 'receta-detalle', id: it.id })
  }

  const eliminar = async (it: Item) => {
    const ok = await confirmarEliminacion(it.nombre)
    if (!ok) return
    try {
      if (it.tipo === 'ruta') await eliminarRuta(it.id)
      else await eliminarReceta(it.id)
    } catch (e) {
      mostrarError(e)
    }
  }

  const duplicar = async (it: Item) => {
    try {
      if (it.tipo === 'ruta') await duplicarRuta(it.id)
      else await duplicarReceta(it.id)
    } catch (e) {
      mostrarError(e)
    }
  }

  const usarPlantillaRuta = async (p: PlantillaRuta) => {
    try {
      const nombre = nombreUnico(p.nombre, rutas.map((r) => r.nombre))
      const guardada = await guardarRuta(rutaDesdePlantilla(p, nombre, ajustes.soPreferido))
      navegar({ nombre: 'ruta-editor', id: guardada.id })
    } catch (e) {
      mostrarError(e)
    }
  }

  const usarPlantillaReceta = async (p: PlantillaReceta) => {
    try {
      const titulo = nombreUnico(p.titulo, recetas.map((r) => r.titulo))
      const guardada = await guardarReceta(recetaDesdePlantilla(p, titulo))
      navegar({ nombre: 'receta-editor', id: guardada.id })
    } catch (e) {
      mostrarError(e)
    }
  }

  const importarDesdeArchivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      try {
        const data = await importarDatos(f)
        if (data) await recargar()
      } catch (err) {
        mostrarError(err)
      }
    }
    e.target.value = ''
  }

  return (
    <div>
      <div className="dashboard-widgets">
        <Collapsible
          className="dashboard-widget--full"
          title="Resumen"
          icon="fa-chart-simple"
          storageKey="resumen"
        >
          <div className="stat-row">
            <div className="stat">
              <i className="fa-solid fa-route" aria-hidden="true" />
              <span className="stat-value">{estadisticas.rutas}</span>
              <span className="stat-label">Rutas</span>
            </div>
            <div className="stat">
              <i className="fa-solid fa-list-check" aria-hidden="true" />
              <span className="stat-value">{estadisticas.recetas}</span>
              <span className="stat-label">Recetas</span>
            </div>
            <div className="stat">
              <i className="fa-solid fa-star" aria-hidden="true" />
              <span className="stat-value">{estadisticas.favoritos}</span>
              <span className="stat-label">Favoritos</span>
            </div>
            <div className="stat">
              <i className="fa-solid fa-history" aria-hidden="true" />
              <span className="stat-value">{estadisticas.recientes}</span>
              <span className="stat-label">Ejecutados</span>
            </div>
            <div className="stat">
              <i className="fa-solid fa-list-ol" aria-hidden="true" />
              <span className="stat-value">{estadisticas.pasos}</span>
              <span className="stat-label">Pasos</span>
            </div>
            <div className="stat">
              <i className="fa-solid fa-code" aria-hidden="true" />
              <span className="stat-value">{estadisticas.variantes}</span>
              <span className="stat-label">Variantes</span>
            </div>
            <div className="stat">
              <i className="fa-solid fa-tags" aria-hidden="true" />
              <span className="stat-value">{estadisticas.etiquetas}</span>
              <span className="stat-label">Etiquetas</span>
            </div>
            <div className="stat">
              <i className="fa-solid fa-square-root-variable" aria-hidden="true" />
              <span className="stat-value">{estadisticas.variablesGlobales}</span>
              <span className="stat-label">Variables globales</span>
            </div>
          </div>
        </Collapsible>

        <Collapsible title="Progreso" icon="fa-chart-line" storageKey="progreso">
          <div className="stat-row" style={{ marginBottom: 12 }}>
            <div className="stat">
              <i className="fa-solid fa-fire" aria-hidden="true" />
              <span className="stat-value">{progreso?.racha ?? 0}</span>
              <span className="stat-label">Racha</span>
            </div>
            <div className="stat">
              <i className="fa-solid fa-play" aria-hidden="true" />
              <span className="stat-value">{progreso?.totalEjecuciones ?? 0}</span>
              <span className="stat-label">Ejecuciones</span>
            </div>
            <div className="stat">
              <i className="fa-solid fa-trophy" aria-hidden="true" />
              <span className="stat-value">{progreso?.rachaMaxima ?? 0}</span>
              <span className="stat-label">Racha máx.</span>
            </div>
          </div>
          <button type="button" className="btn btn-sm" onClick={() => navegar({ nombre: 'progreso' })}>
            <i className="fa-solid fa-arrow-right" aria-hidden="true" /> Ver Progreso
          </button>
        </Collapsible>

        <Collapsible className="dashboard-widget--full" title="Acciones rápidas" icon="fa-bolt" storageKey="acciones">
          <div className="quick-actions">
            <button type="button" className="btn btn-primary" onClick={() => navegar({ nombre: 'ruta-editor' })}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> Nueva Ruta
            </button>
            <button type="button" className="btn btn-primary" onClick={() => navegar({ nombre: 'receta-editor' })}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> Nueva Receta
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              <i className="fa-solid fa-upload" aria-hidden="true" /> Importar
            </button>
            <button type="button" className="btn" onClick={() => void exportarDatos().catch(mostrarError)}>
              <i className="fa-solid fa-download" aria-hidden="true" /> Exportar
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => void exportarMarkdown('cli-workflow-cheatsheet.md', cheatsheetCompleto(rutas, recetas, ajustes))}
            >
              <i className="fa-brands fa-markdown" aria-hidden="true" /> Exportar Markdown
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => void importarDesdeArchivo(e)}
              aria-label="Seleccionar archivo para importar"
            />
          </div>
        </Collapsible>

        <Collapsible title="Plantillas" icon="fa-wand-magic-sparkles" storageKey="plantillas">
          <p className="muted widget-empty" style={{ marginBottom: 8 }}>
            Crea una ruta o receta de ejemplo para empezar en un clic.
          </p>
          <div className="widget-rows">
            <div className="widget-row">
              <span className="muted" style={{ fontWeight: 700 }}>
                <i className="fa-solid fa-route" aria-hidden="true" /> Rutas
              </span>
            </div>
            {PLANTILLAS_RUTAS.map((p) => (
              <div key={p.nombre} className="row">
                <i className={`fa-solid fa-${p.icono}`} style={{ color: p.color }} aria-hidden="true" />
                <span className="mini-name" style={{ flex: 1 }}>
                  {p.nombre}
                </span>
                <button type="button" className="btn btn-sm" onClick={() => void usarPlantillaRuta(p)}>
                  Usar
                </button>
              </div>
            ))}
            <div className="widget-row">
              <span className="muted" style={{ fontWeight: 700 }}>
                <i className="fa-solid fa-list-check" aria-hidden="true" /> Recetas
              </span>
            </div>
            {PLANTILLAS_RECETAS.map((p) => (
              <div key={p.titulo} className="row">
                <i className="fa-solid fa-list-check" aria-hidden="true" />
                <span className="mini-name" style={{ flex: 1 }}>
                  {p.titulo}
                </span>
                <button type="button" className="btn btn-sm" onClick={() => void usarPlantillaReceta(p)}>
                  Usar
                </button>
              </div>
            ))}
          </div>
        </Collapsible>

        <Collapsible
          title="Recientes"
          icon="fa-clock-rotate-left"
          storageKey="recientes"
          badge={recientes.length}
        >
          <MiniList lista={recientes} onOpen={abrir} showDate mensajeVacio="Nada ejecutado todavía." />
        </Collapsible>

        <Collapsible title="Favoritos" icon="fa-star" storageKey="favoritos" badge={favoritos.length}>
          <MiniList lista={favoritos} onOpen={abrir} mensajeVacio="Marca rutas o recetas como favoritas." />
        </Collapsible>

        <Collapsible
          title="Pendientes"
          icon="fa-hourglass-half"
          storageKey="pendientes"
          badge={pendientes.length}
        >
          <MiniList lista={pendientes} onOpen={abrir} mensajeVacio="Todo ejecutado. ¡Bien hecho!" />
        </Collapsible>

        <Collapsible title="Etiquetas" icon="fa-tags" storageKey="etiquetas" badge={tagConteo.length}>
          {tagConteo.length === 0 ? (
            <p className="muted widget-empty">Sin etiquetas.</p>
          ) : (
            <div className="tag-cloud">
              {tagConteo.map(([tag, n]) => (
                <button
                  key={tag}
                  type="button"
                  className={`chip ${tagFiltro === tag ? 'chip-active' : ''}`}
                  onClick={() => setTagFiltro((prev) => (prev === tag ? '' : tag))}
                  aria-pressed={tagFiltro === tag}
                >
                  {tag} <span className="chip-count">{n}</span>
                </button>
              ))}
            </div>
          )}
        </Collapsible>

        <Collapsible title="Ajustes" icon="fa-sliders" storageKey="ajustes">
          <div className="widget-rows">
            <div className="widget-row">
              <span className="muted">Sistema operativo preferido</span>
              <span className="badge">{SO_LABEL[ajustes.soPreferido]}</span>
            </div>
            <div className="widget-row">
              <span className="muted">Variables globales</span>
              <span>
                {ajustes.variablesGlobales.length === 0
                  ? 'Sin variables'
                  : ajustes.variablesGlobales.map((v) => v.nombre).join(', ')}
              </span>
            </div>
          </div>
        </Collapsible>

        <Collapsible title="Seguridad" icon="fa-shield-halved" storageKey="seguridad">
          {estadisticas.destructivos > 0 ? (
            <div className="alert-box danger">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
              <span>{estadisticas.destructivos} paso(s) destructivo(s). Revisa antes de ejecutar.</span>
            </div>
          ) : (
            <div className="alert-box ok">
              <i className="fa-solid fa-circle-check" aria-hidden="true" />
              <span>Sin pasos destructivos.</span>
            </div>
          )}
        </Collapsible>
      </div>

      <div className="toolbar">
        <div className="btn" role="tablist" aria-label="Filtrar por tipo">
          {(['todo', 'rutas', 'recetas'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`btn btn-sm ${tab === t ? 'btn-primary' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'todo' ? 'Todo' : t === 'rutas' ? 'Rutas' : 'Recetas'}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Buscar…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar por título, descripción o etiquetas"
          style={{ minWidth: 180 }}
        />

        <select value={tagFiltro} onChange={(e) => setTagFiltro(e.target.value)} aria-label="Filtrar por etiqueta">
          <option value="">Todas las etiquetas</option>
          {tagsDisponibles.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <button
          type="button"
          className={`btn btn-sm ${soloFav ? 'btn-primary' : ''}`}
          onClick={() => setSoloFav((v) => !v)}
          aria-pressed={soloFav}
        >
          <i className="fa-solid fa-star" aria-hidden="true" /> Favoritos
        </button>

        <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)} aria-label="Ordenar">
          <option value="recientes">Recientes</option>
          <option value="nombre">Nombre</option>
          <option value="favorito">Favoritos</option>
        </select>

        <span className="grow" />

        <button type="button" className="btn btn-primary" onClick={() => navegar({ nombre: 'ruta-editor' })}>
          <i className="fa-solid fa-plus" aria-hidden="true" /> Crear Ruta
        </button>
        <button type="button" className="btn btn-primary" onClick={() => navegar({ nombre: 'receta-editor' })}>
          <i className="fa-solid fa-plus" aria-hidden="true" /> Crear Receta
        </button>
      </div>

      {filtrados.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-folder-open" aria-hidden="true" />
          <p>No hay elementos. Crea una ruta o una receta para empezar.</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
            <button type="button" className="btn btn-primary" onClick={() => navegar({ nombre: 'ruta-editor' })}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> Crear Ruta
            </button>
            <button type="button" className="btn" onClick={() => navegar({ nombre: 'receta-editor' })}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> Crear Receta
            </button>
          </div>
        </div>
      ) : (
        <div className="card-grid">
          {filtrados.map((it) => (
            <article
              key={`${it.tipo}-${it.id}`}
              className="card dashboard-card"
              onClick={() => abrir(it)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') abrir(it)
              }}
            >
              <div className="row">
                <i className="fa-solid" style={{ color: it.color }} aria-hidden="true" />
                <span className={`badge ${it.tipo}`}>{it.tipo === 'ruta' ? 'Ruta' : 'Receta'}</span>
                {it.favorito && <i className="fa-solid fa-star" style={{ color: 'var(--color-warning)' }} aria-label="Favorito" />}
              </div>
              <div className="card-title">{it.nombre || '(sin nombre)'}</div>
              {it.descripcion && <div className="muted" style={{ fontSize: 13 }}>{it.descripcion}</div>}
              <div className="card-meta">
                {it.etiquetas.map((t) => (
                  <span key={t} className="badge">{t}</span>
                ))}
                <span>
                  <i className="fa-regular fa-clock" aria-hidden="true" /> {formatearFecha(it.lastRunAt)}
                </span>
              </div>
              <div className="row" onClick={(e) => e.stopPropagation()}>
                {it.tipo === 'ruta' ? (
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => abrir(it)}>
                    <i className="fa-solid fa-play" aria-hidden="true" /> Ejecutar
                  </button>
                ) : (
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => abrir(it)}>
                    <i className="fa-solid fa-eye" aria-hidden="true" /> Abrir
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() =>
                    navegar(it.tipo === 'ruta' ? { nombre: 'ruta-editor', id: it.id } : { nombre: 'receta-editor', id: it.id })
                  }
                >
                  <i className="fa-solid fa-pen" aria-hidden="true" /> Editar
                </button>
                <button type="button" className="btn btn-sm" onClick={() => void duplicar(it)} aria-label="Duplicar">
                  <i className="fa-solid fa-copy" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => void eliminar(it)}
                  aria-label="Eliminar"
                >
                  <i className="fa-solid fa-trash" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
