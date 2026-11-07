import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { getApi } from '@/lib/api'

interface Props {
  recetaId: string
}

export default function RecetaDetalle({ recetaId }: Props) {
  const { recetas, navegar, recargar } = useApp()
  const receta = recetas.find((r) => r.id === recetaId)
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [ocultar, setOcultar] = useState(false)
  const [revelados, setRevelados] = useState<Record<string, boolean>>({})
  const initRef = useRef<string | null>(null)

  useEffect(() => {
    if (!receta || initRef.current === recetaId) return
    initRef.current = recetaId
    setChecks({})
    setRevelados({})
    setOcultar(false)
  }, [receta, recetaId])

  const total = receta?.pasos.length ?? 0
  const completados = useMemo(
    () => receta?.pasos.filter((p) => checks[p.id]).length ?? 0,
    [receta, checks]
  )

  if (!receta) {
    return (
      <div className="empty-state">
        <p>No se encontró la receta.</p>
        <button type="button" className="btn" onClick={() => navegar({ nombre: 'dashboard' })}>
          Volver al Dashboard
        </button>
      </div>
    )
  }

  const marcarCompletada = async () => {
    try {
      const api = await getApi()
      const { receta: actual } = await api.getReceta(recetaId)
      await api.updateReceta(recetaId, { ...actual, lastRunAt: new Date().toISOString() })
      await recargar()
      navegar({ nombre: 'dashboard' })
    } catch {
      navegar({ nombre: 'dashboard' })
    }
  }

  const togglePaso = (id: string) => {
    setChecks((c) => {
      const next = { ...c, [id]: !c[id] }
      const todos = receta.pasos.every((p) => next[p.id])
      if (todos) {
        const api = getApi()
        void api.then(async (a) => {
          const { receta: actual } = await a.getReceta(recetaId)
          await a.updateReceta(recetaId, { ...actual, lastRunAt: new Date().toISOString() })
          await recargar()
        })
      }
      return next
    })
  }

  const pasoVisible = (id: string) => !ocultar || revelados[id]

  return (
    <div>
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>{receta.titulo}</h2>
        {receta.descripcion && <p className="muted">{receta.descripcion}</p>}
        <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
          {receta.entrada && (
            <div>
              <strong>Entrada:</strong> <span className="muted">{receta.entrada}</span>
            </div>
          )}
          {receta.salida && (
            <div>
              <strong>Salida:</strong> <span className="muted">{receta.salida}</span>
            </div>
          )}
        </div>
        {receta.etiquetas.length > 0 && (
          <div className="row" style={{ marginTop: 8 }}>
            {receta.etiquetas.map((t) => (
              <span key={t} className="badge">
                {t}
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="row" style={{ marginBottom: 12 }}>
        <span className="muted">
          Progreso: {completados} de {total}
        </span>
        <span className="grow" />
        <button
          type="button"
          className={`btn btn-sm ${ocultar ? 'btn-primary' : ''}`}
          onClick={() => setOcultar((v) => !v)}
          aria-pressed={ocultar}
        >
          <i className="fa-solid fa-eye-slash" aria-hidden="true" /> Ocultar pasos
        </button>
      </div>

      <ol style={{ paddingLeft: 20 }}>
        {receta.pasos.map((p, i) => {
          const visible = pasoVisible(p.id)
          return (
            <li key={p.id} style={{ padding: '8px 0' }}>
              {visible ? (
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    id={`check-${p.id}`}
                    checked={!!checks[p.id]}
                    onChange={() => togglePaso(p.id)}
                    aria-label={`Marcar paso ${i + 1}`}
                  />
                  <label htmlFor={`check-${p.id}`} className={checks[p.id] ? 'muted' : ''} style={{ textDecoration: checks[p.id] ? 'line-through' : 'none' }}>
                    {p.texto || '(paso vacío)'}
                  </label>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setRevelados((r) => ({ ...r, [p.id]: true }))}
                >
                  <i className="fa-solid fa-eye" aria-hidden="true" /> Paso {i + 1}
                </button>
              )}
            </li>
          )
        })}
      </ol>

      <footer className="row" style={{ marginTop: 20 }}>
        <button type="button" className="btn" onClick={() => navegar({ nombre: 'dashboard' })}>
          Volver
        </button>
        <span className="grow" />
        <button type="button" className="btn btn-primary" onClick={() => void marcarCompletada()}>
          <i className="fa-solid fa-check" aria-hidden="true" /> Terminé
        </button>
      </footer>
    </div>
  )
}
