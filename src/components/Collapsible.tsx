import { useState, type ReactNode } from 'react'

interface CollapsibleProps {
  title: string
  icon?: string
  /** Clave estable para recordar el estado plegado/desplegado en localStorage. */
  storageKey: string
  defaultOpen?: boolean
  badge?: number | string
  className?: string
  children: ReactNode
}

const PREFIX = 'cliwf.dashboard.'

/** Lee el estado guardado de un widget (open/closed) con fallback seguro. */
function readSaved(key: string, fallback: boolean): boolean {
  try {
    const saved = localStorage.getItem(PREFIX + key)
    return saved === null ? fallback : saved === 'open'
  } catch {
    return fallback
  }
}

/**
 * Sección colapsable del Dashboard. Persiste su estado abierto/cerrado en
 * localStorage y expone `aria-expanded`/`aria-controls` para accesibilidad.
 */
export function Collapsible({
  title,
  icon,
  storageKey,
  defaultOpen = true,
  badge,
  className = '',
  children
}: CollapsibleProps) {
  const [open, setOpen] = useState<boolean>(() => readSaved(storageKey, defaultOpen))

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(PREFIX + storageKey, next ? 'open' : 'closed')
      } catch {
        /* almacenamiento no disponible */
      }
      return next
    })
  }

  const contentId = `dashboard-widget-${storageKey}`

  return (
    <section className={`card dashboard-widget ${className}`.trim()}>
      <header className="widget-header">
        <button
          type="button"
          className="widget-toggle"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={contentId}
        >
          {icon && <i className={`fa-solid ${icon}`} aria-hidden="true" />}
          <span className="widget-title">{title}</span>
          {badge !== undefined && <span className="badge">{badge}</span>}
          <i
            className={`fa-solid fa-chevron-${open ? 'up' : 'down'} widget-chevron`}
            aria-hidden="true"
          />
        </button>
      </header>
      {open && (
        <div className="widget-body" id={contentId}>
          {children}
        </div>
      )}
    </section>
  )
}
