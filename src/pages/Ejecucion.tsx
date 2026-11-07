import { useEffect, useMemo, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { useApp } from '@/context/AppContext'
import { getApi } from '@/lib/api'
import { copiarAlPortapapeles } from '@/lib/clipboard'
import { ResolvedCommand } from '@/components/CommandPreview'
import type { SO } from '@/lib/types'
import { SO_LABEL } from '@/lib/types'
import { resolverComando, varianteParaSO, variablesDeRuta } from '@/lib/utils'

interface Props {
  rutaId: string
}

type Fase = 'variables' | 'paso' | 'completado'

export default function Ejecucion({ rutaId }: Props) {
  const { rutas, ajustes, navegar, recargar } = useApp()
  const ruta = rutas.find((r) => r.id === rutaId)

  const [fase, setFase] = useState<Fase>('variables')
  const [valores, setValores] = useState<Record<string, string>>({})
  const [indice, setIndice] = useState(0)
  const [soActivo, setSoActivo] = useState<SO>(ajustes.soPreferido)
  const [copiado, setCopiado] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [listaVisible, setListaVisible] = useState(true)
  const [errorVars, setErrorVars] = useState('')

  const initRef = useRef<string | null>(null)

  const usadas = useMemo(() => (ruta ? variablesDeRuta(ruta) : []), [ruta])
  const defaults = useMemo(() => {
    const d: Record<string, string> = {}
    if (ruta) for (const v of ruta.variables) if (v.nombre) d[v.nombre] = v.defaultValue ?? ''
    return d
  }, [ruta])

  const globalsMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const g of ajustes.variablesGlobales) m[g.nombre] = g.valor
    return m
  }, [ajustes.variablesGlobales])

  useEffect(() => {
    if (!ruta || initRef.current === rutaId) return
    initRef.current = rutaId
    const init: Record<string, string> = {}
    for (const n of usadas) init[n] = defaults[n] ?? ''
    setValores(init)
    setIndice(0)
    setFase('variables')
    setSoActivo(ajustes.soPreferido)
    setCopiado(false)
    setFallback(false)
  }, [ruta, rutaId, usadas, defaults, ajustes.soPreferido])

  const pasos = ruta?.pasos ?? []
  const total = pasos.length
  const current = pasos[indice]

  const disponibles = current ? Array.from(new Set(current.variantes.map((v) => v.so))) : []
  const efectivoSo: SO = disponibles.includes(soActivo) ? soActivo : (disponibles[0] ?? 'any')
  const variante = current ? varianteParaSO(current, efectivoSo) ?? current.variantes[0] : undefined

  const todosLosValores = { ...globalsMap, ...valores }
  const comandoResuelto = variante ? resolverComando(variante.comando, todosLosValores) : ''

  const obligatorias = usadas.filter((n) => !(defaults[n] ?? ''))

  const comenzar = () => {
    const vacias = obligatorias.filter((n) => !(valores[n] ?? '').trim())
    if (vacias.length > 0) {
      setErrorVars(`Faltan variables obligatorias: ${vacias.map((n) => `{{${n}}}`).join(', ')}`)
      return
    }
    setErrorVars('')
    setIndice(0)
    setFase('paso')
  }

  const marcarCompletado = async () => {
    try {
      const api = await getApi()
      const { ruta: actual } = await api.getRuta(rutaId)
      await api.updateRuta(rutaId, { ...actual, lastRunAt: new Date().toISOString() })
      await recargar()
    } catch {
      /* no bloquea la pantalla de completado */
    }
  }

  const siguiente = () => {
    if (indice >= total - 1) {
      setFase('completado')
      void marcarCompletado()
    } else {
      setIndice((i) => i + 1)
      setCopiado(false)
      setFallback(false)
    }
  }

  const anterior = () => {
    if (indice > 0) {
      setIndice((i) => i - 1)
      setCopiado(false)
      setFallback(false)
    }
  }

  const reiniciar = async () => {
    const res = await Swal.fire({
      title: 'Reiniciar ejecución',
      text: 'Volverás al primer paso conservando los valores de variables actuales.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Reiniciar',
      cancelButtonText: 'Cancelar'
    })
    if (!res.isConfirmed) return
    setIndice(0)
    setFase('paso')
    setCopiado(false)
    setFallback(false)
  }

  const salir = async () => {
    if (fase === 'paso' && indice > 0) {
      const res = await Swal.fire({
        title: 'Salir',
        text: 'Hay progreso en curso. ¿Seguro que quieres salir?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Salir',
        cancelButtonText: 'Continuar'
      })
      if (!res.isConfirmed) return
    }
    navegar({ nombre: 'dashboard' })
  }

  const copiar = async () => {
    if (!comandoResuelto) return
    if (current?.esDestructivo) {
      const res = await Swal.fire({
        title: 'Paso destructivo',
        text: 'Este comando puede borrar o modificar datos de forma irreversible. ¿Copiar de todos modos?',
        icon: 'warning',
        iconColor: 'var(--color-error)',
        showCancelButton: true,
        confirmButtonText: 'Copiar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: 'var(--color-error)',
        reverseButtons: true
      })
      if (!res.isConfirmed) return
    }
    const ok = await copiarAlPortapapeles(comandoResuelto)
    if (ok) {
      setCopiado(true)
      setFallback(false)
      setTimeout(() => setCopiado(false), 1500)
    } else {
      setFallback(true)
    }
  }

  // Atajos de teclado (RNF-011)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      const escribiendo =
        !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')
      if (e.key === 'Escape') {
        e.preventDefault()
        void salir()
        return
      }
      if (escribiendo || fase !== 'paso') return
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        siguiente()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        anterior()
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        void copiar()
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        void reiniciar()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  if (!ruta) {
    return (
      <div className="empty-state">
        <p>No se encontró la ruta.</p>
        <button type="button" className="btn" onClick={() => navegar({ nombre: 'dashboard' })}>
          Volver al Dashboard
        </button>
      </div>
    )
  }

  if (fase === 'variables') {
    return (
      <section>
        <h2 className="section-title">Variables de esta ruta</h2>
        {usadas.length === 0 ? (
          <p className="muted">Esta ruta no usa variables. Puedes iniciar directamente.</p>
        ) : (
          <div className="card" style={{ maxWidth: 560 }}>
            {usadas.map((n) => (
              <div className="field" key={n}>
                <label htmlFor={`var-${n}`}>
                  <span className="var-token">{'{{'}{n}{'}}'}</span>
                  {obligatorias.includes(n) ? ' *' : ''}
                </label>
                <input
                  id={`var-${n}`}
                  value={valores[n] ?? ''}
                  onChange={(e) => setValores((v) => ({ ...v, [n]: e.target.value }))}
                />
              </div>
            ))}
            {errorVars && (
              <p className="field-error" role="alert">
                {errorVars}
              </p>
            )}
          </div>
        )}
        <footer className="row" style={{ marginTop: 20 }}>
          <button type="button" className="btn" onClick={() => void salir()}>
            Cancelar
          </button>
          <span className="grow" />
          <button type="button" className="btn btn-primary" onClick={comenzar}>
            <i className="fa-solid fa-play" aria-hidden="true" /> Comenzar
          </button>
        </footer>
      </section>
    )
  }

  if (fase === 'completado') {
    return (
      <section>
        <h2 className="section-title">
          <i className="fa-solid fa-circle-check" style={{ color: 'var(--color-success)' }} aria-hidden="true" />{' '}
          Ejecución completada
        </h2>
        <p className="muted">Resumen de los pasos (no se guarda en disco, salvo la fecha de última ejecución).</p>
        <div className="card-grid">
          {pasos.map((p, i) => {
            const v = varianteParaSO(p, efectivoSo) ?? p.variantes[0]
            return (
              <article className="card" key={p.id}>
                <strong>
                  Paso {i + 1}: {p.titulo || '(sin título)'}
                </strong>
                <pre className="command-block" aria-label={`Comando del paso ${i + 1}`}>
                  {v ? resolverComando(v.comando, todosLosValores) : ''}
                </pre>
              </article>
            )
          })}
        </div>
        <footer className="row" style={{ marginTop: 20 }}>
          <button type="button" className="btn" onClick={() => navegar({ nombre: 'dashboard' })}>
            Volver al Dashboard
          </button>
          <span className="grow" />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setIndice(0)
              setFase('paso')
              setCopiado(false)
            }}
          >
            <i className="fa-solid fa-rotate-right" aria-hidden="true" /> Repetir
          </button>
        </footer>
      </section>
    )
  }

  return (
    <div className="row" style={{ alignItems: 'stretch', gap: 16 }}>
      <main className="grow">
        <div className="row" style={{ marginBottom: 8 }}>
          <span className="muted">
            Paso <strong>{indice + 1}</strong> de {total}
          </span>
          <span className="grow" />
          <button type="button" className="btn btn-sm" onClick={() => setListaVisible((v) => !v)}>
            <i className="fa-solid fa-bars" aria-hidden="true" /> {listaVisible ? 'Ocultar lista' : 'Mostrar lista'}
          </button>
        </div>

        <div className="row" style={{ marginBottom: 12 }}>
          <div
            style={{
              flex: 1,
              height: 8,
              background: 'var(--color-border)',
              borderRadius: 4,
              overflow: 'hidden'
            }}
            role="progressbar"
            aria-valuenow={indice + 1}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-label="Progreso"
          >
            <div
              style={{
                width: `${((indice + 1) / total) * 100}%`,
                height: '100%',
                background: 'var(--color-primary)'
              }}
            />
          </div>
        </div>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>{current.titulo || '(sin título)'}</h2>
          {current.descripcion && <p className="muted">{current.descripcion}</p>}

          {disponibles.length > 1 && (
            <div className="field">
              <label htmlFor="so-activo">Sistema operativo</label>
              <select
                id="so-activo"
                value={efectivoSo}
                onChange={(e) => setSoActivo(e.target.value as SO)}
                style={{ maxWidth: 200 }}
              >
                {disponibles.map((so) => (
                  <option key={so} value={so}>
                    {SO_LABEL[so]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="row">
            <span className="badge">{SO_LABEL[efectivoSo]}</span>
            {variante?.esAlternativo && <span className="badge">Alternativo</span>}
          </div>

          {current.esDestructivo && (
            <div className="destructive-banner" style={{ margin: '12px 0' }} role="alert">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
              <span>Paso destructivo: este comando puede causar daños.</span>
            </div>
          )}

          <ResolvedCommand comando={variante?.comando ?? ''} valores={todosLosValores} ariaLabel="Comando resuelto" />

          {variante?.nota && <p className="muted">Nota: {variante.nota}</p>}

          {fallback && (
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="cmd-fallback">Copia manual (portapapeles no disponible)</label>
              <textarea id="cmd-fallback" readOnly value={comandoResuelto} rows={3} onFocus={(e) => e.target.select()} />
            </div>
          )}

          <div className="row" style={{ marginTop: 16 }}>
            <button type="button" className="btn" onClick={anterior} disabled={indice === 0}>
              <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Anterior
            </button>
            <button
              type="button"
              className={`btn ${copiado ? '' : 'btn-primary'}`}
              onClick={() => void copiar()}
              style={copiado ? { borderColor: 'var(--color-success)', color: 'var(--color-success)' } : undefined}
            >
              <i className={copiado ? 'fa-solid fa-check' : 'fa-solid fa-copy'} aria-hidden="true" />{' '}
              {copiado ? 'Copiado' : 'Copiar comando'}
            </button>
            <button type="button" className="btn" onClick={() => void reiniciar()}>
              <i className="fa-solid fa-rotate-right" aria-hidden="true" /> Reiniciar
            </button>
            <button type="button" className="btn" onClick={() => void salir()}>
              <i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> Salir
            </button>
            <span className="grow" />
            <button type="button" className="btn btn-primary" onClick={siguiente}>
              Siguiente <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>

      {listaVisible && (
        <aside className="card" style={{ width: 220, alignSelf: 'flex-start' }} aria-label="Lista de pasos">
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Pasos</h3>
          <ol style={{ paddingLeft: 20, margin: 0 }}>
            {pasos.map((p, i) => (
              <li key={p.id} style={{ padding: '4px 0' }} aria-current={i === indice ? 'step' : undefined}>
                <span
                  style={{
                    fontWeight: i === indice ? 700 : 400,
                    color: i === indice ? 'var(--color-primary)' : 'inherit'
                  }}
                >
                  {p.titulo || '(sin título)'}
                </span>
              </li>
            ))}
          </ol>
        </aside>
      )}
    </div>
  )
}
