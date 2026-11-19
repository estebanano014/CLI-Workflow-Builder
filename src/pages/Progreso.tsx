import { useMemo } from 'react'
import Swal from 'sweetalert2'
import { mostrarError, useApp } from '@/context/AppContext'
import { formatearFecha } from '@/lib/utils'
import type { ActividadDia, EjecucionRegistro } from '@/lib/types'

const SEMANAS = 26
const LISTA_MAX = 30

function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Nivel de intensidad 0..4 a partir del número de ejecuciones de un día. */
function nivel(count: number): number {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

interface Celda {
  key: string
  count: number
  futuro: boolean
}

function construirCalendario(porDia: ActividadDia[]): Celda[] {
  const map = new Map<string, number>()
  for (const d of porDia) map.set(d.fecha, d.count)

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const dow = (hoy.getDay() + 6) % 7 // lunes = 0 … domingo = 6
  const inicio = new Date(hoy)
  inicio.setDate(hoy.getDate() - dow - (SEMANAS - 1) * 7)

  const celdas: Celda[] = []
  for (let i = 0; i < SEMANAS * 7; i++) {
    const d = new Date(inicio)
    d.setDate(inicio.getDate() + i)
    const key = toIso(d)
    celdas.push({ key, count: map.get(key) ?? 0, futuro: d.getTime() > hoy.getTime() })
  }
  return celdas
}

function formatearDuracion(ms: number): string {
  if (!ms || ms <= 0) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r > 0 ? `${m}m ${r}s` : `${m}m`
}

function CalendarioActividad({ porDia }: { porDia: ActividadDia[] }) {
  const celdas = useMemo(() => construirCalendario(porDia), [porDia])
  const semanas = useMemo(() => {
    const out: Celda[][] = []
    for (let i = 0; i < celdas.length; i += 7) out.push(celdas.slice(i, i + 7))
    return out
  }, [celdas])

  return (
    <div className="activity-calendar">
      <div className="activity-grid" role="img" aria-label="Calendario de actividad de los últimos 6 meses">
        {semanas.map((semana, w) => (
          <div className="activity-week" key={w}>
            {semana.map((c) => (
              <span
                key={c.key}
                className={`activity-day level-${c.futuro ? 0 : nivel(c.count)}`}
                title={
                  c.futuro
                    ? c.key
                    : `${c.key} · ${c.count} ejecución${c.count !== 1 ? 'es' : ''}`
                }
              />
            ))}
          </div>
        ))}
      </div>
      <div className="activity-legend" aria-hidden="true">
        <span className="muted">Menos</span>
        {[0, 1, 2, 3, 4].map((n) => (
          <span key={n} className={`activity-day level-${n}`} />
        ))}
        <span className="muted">Más</span>
      </div>
    </div>
  )
}

function FilaHistorial({ reg }: { reg: EjecucionRegistro }) {
  const esRuta = reg.tipo === 'ruta'
  return (
    <li>
      <div className="mini-item" style={{ cursor: 'default' }}>
        <i
          className={`fa-solid ${esRuta ? 'fa-route' : 'fa-list-check'}`}
          style={{ color: esRuta ? 'var(--color-primary)' : 'var(--color-info)' }}
          aria-hidden="true"
        />
        <span className="mini-name">{reg.nombre || '(sin nombre)'}</span>
        <span className="mini-date muted">{formatearFecha(reg.fecha)}</span>
        <span className="mini-date muted">
          {reg.pasosHechos}/{reg.pasosTotal} pasos
        </span>
        <span className="mini-date muted">{formatearDuracion(reg.duracionMs)}</span>
        <span className={`badge ${reg.tipo}`}>{esRuta ? 'Ruta' : 'Receta'}</span>
      </div>
    </li>
  )
}

export default function Progreso() {
  const { historial, estadisticas, limpiarHistorial } = useApp()

  if (!estadisticas) return <p className="muted">Cargando…</p>

  const recientes = historial.slice(0, LISTA_MAX)

  const vaciar = async () => {
    const res = await Swal.fire({
      title: 'Vaciar historial',
      text: 'Se eliminará todo el registro de actividad (tus rutas y recetas no se tocan). Esta acción no se puede deshacer.',
      icon: 'warning',
      iconColor: 'var(--color-error)',
      showCancelButton: true,
      confirmButtonText: 'Vaciar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-error)',
      reverseButtons: true
    })
    if (!res.isConfirmed) return
    try {
      await limpiarHistorial()
      await Swal.fire({
        title: 'Historial vaciado',
        text: 'El registro de actividad se eliminó correctamente.',
        icon: 'success',
        timer: 1800,
        showConfirmButton: false
      })
    } catch (e) {
      mostrarError(e)
    }
  }

  return (
    <div>
      <section className="progreso-hero" aria-label="Resumen de progreso">
        <p className="hero-lead">
          Tu actividad queda registrada cada vez que completas una <strong>ruta</strong> o una{' '}
          <strong>receta</strong>. Construye una racha practicando a diario.
        </p>
        <div className="stat-row">
          <div className="stat">
            <i className="fa-solid fa-fire" aria-hidden="true" />
            <span className="stat-value">{estadisticas.racha}</span>
            <span className="stat-label">Racha actual (días)</span>
          </div>
          <div className="stat">
            <i className="fa-solid fa-trophy" aria-hidden="true" />
            <span className="stat-value">{estadisticas.rachaMaxima}</span>
            <span className="stat-label">Racha máxima</span>
          </div>
          <div className="stat">
            <i className="fa-solid fa-play" aria-hidden="true" />
            <span className="stat-value">{estadisticas.totalEjecuciones}</span>
            <span className="stat-label">Ejecuciones</span>
          </div>
          <div className="stat">
            <i className="fa-solid fa-list-ol" aria-hidden="true" />
            <span className="stat-value">{estadisticas.pasosCompletados}</span>
            <span className="stat-label">Pasos completados</span>
          </div>
          <div className="stat">
            <i className="fa-solid fa-calendar-days" aria-hidden="true" />
            <span className="stat-value">{estadisticas.diasActivos}</span>
            <span className="stat-label">Días activos</span>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }} aria-label="Calendario de actividad">
        <h2 className="section-title" style={{ fontSize: 18 }}>
          <i className="fa-solid fa-calendar-days" aria-hidden="true" /> Actividad
        </h2>
        <CalendarioActividad porDia={estadisticas.porDia} />
      </section>

      <section aria-label="Actividad reciente">
        <div className="row" style={{ marginBottom: 8 }}>
          <h2 className="section-title" style={{ fontSize: 18, margin: 0 }}>
            <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> Actividad reciente
          </h2>
          <span className="grow" />
          {historial.length > 0 && (
            <button type="button" className="btn btn-sm" onClick={() => void vaciar()}>
              <i className="fa-solid fa-broom" aria-hidden="true" /> Vaciar historial
            </button>
          )}
        </div>

        {recientes.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-chart-line" aria-hidden="true" />
            <p>Todavía no hay actividad. Completa una ruta o una receta para empezar a registrar tu progreso.</p>
          </div>
        ) : (
          <ul className="mini-list">
            {recientes.map((reg) => (
              <FilaHistorial key={reg.id} reg={reg} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
