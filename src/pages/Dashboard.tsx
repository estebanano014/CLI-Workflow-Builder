import { useMemo, useState } from 'react'
import { confirmarEliminacion, mostrarError, useApp } from '@/context/AppContext'
import { formatearFecha } from '@/lib/utils'

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

export default function Dashboard() {
  const { rutas, recetas, cargando, error, navegar, duplicarRuta, duplicarReceta, eliminarRuta, eliminarReceta } =
    useApp()

  const [tab, setTab] = useState<Tab>('todo')
  const [busqueda, setBusqueda] = useState('')
  const [tagFiltro, setTagFiltro] = useState('')
  const [soloFav, setSoloFav] = useState(false)
  const [orden, setOrden] = useState<Orden>('recientes')

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

  return (
    <div>
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
