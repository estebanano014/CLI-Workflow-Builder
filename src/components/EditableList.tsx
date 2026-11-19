import { useState, type ReactNode } from 'react'
import { confirmarEliminacion } from '@/context/AppContext'

interface EditableListProps<T> {
  items: T[]
  getId: (item: T) => string
  singular: string
  onAdd: () => void
  onMove: (id: string, dir: -1 | 1) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  renderItem: (item: T, index: number) => ReactNode
  maxItems?: number
  /** Habilita el reordenado por arrastrar y soltar (drag & drop). */
  onReorder?: (from: number, to: number) => void
  /** Clave única para aislar arrastres entre listas anidadas distintas. */
  dragKey?: string
  /** Permite plegar/desplegar cada elemento para reducir el ruido visual. */
  collapsible?: boolean
}

/**
 * Lista ordenada editable reutilizable (RNF-008):
 * agregar, mover (botones ↑/↓ y, opcionalmente, arrastrar y soltar), duplicar,
 * eliminar (con confirmación) y, opcionalmente, plegar cada elemento.
 */
export function EditableList<T>({
  items,
  getId,
  singular,
  onAdd,
  onMove,
  onDuplicate,
  onDelete,
  renderItem,
  maxItems = 50,
  onReorder,
  dragKey,
  collapsible = false
}: EditableListProps<T>) {
  const alcanzadoMax = items.length >= maxItems
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const tipoDrag = `application/x-cliwf-${dragKey ?? 'item'}`

  const handleDelete = async (id: string) => {
    const ok = await confirmarEliminacion(singular)
    if (ok) onDelete(id)
  }

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleDragStart = (e: React.DragEvent, i: number) => {
    setDragIndex(i)
    e.dataTransfer.setData(tipoDrag, String(i))
    e.dataTransfer.setData('text/plain', String(i))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, i: number) => {
    if (!Array.from(e.dataTransfer.types).includes(tipoDrag)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overIndex !== i) setOverIndex(i)
  }

  const handleDrop = (e: React.DragEvent, i: number) => {
    const raw = e.dataTransfer.getData(tipoDrag)
    if (raw === '') return
    e.preventDefault()
    const from = Number(raw)
    if (!Number.isNaN(from) && from !== i) onReorder?.(from, i)
    setDragIndex(null)
    setOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setOverIndex(null)
  }

  return (
    <div>
      {items.map((item, i) => {
        const id = getId(item)
        const estaColapsado = collapsed.has(id)
        const bodyId = `editable-item-${id}`
        return (
          <section
            key={id}
            className={`card editable-card${dragIndex === i ? ' dragging' : ''}${
              overIndex === i && dragIndex !== i ? ' drag-over' : ''
            }`}
            style={{ marginBottom: 12 }}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={(e) => handleDrop(e, i)}
            aria-label={`${singular} ${i + 1}`}
          >
            <div
              className="row"
              style={{ justifyContent: 'space-between', marginBottom: collapsible && estaColapsado ? 0 : 8 }}
            >
              <div className="row">
                {onReorder && (
                  <span
                    className="drag-handle"
                    draggable
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragEnd={handleDragEnd}
                    aria-hidden="true"
                    title="Arrastrar para reordenar"
                  >
                    <i className="fa-solid fa-grip-vertical" />
                  </span>
                )}
                {collapsible && (
                  <button
                    type="button"
                    className="btn btn-icon btn-sm"
                    onClick={() => toggleCollapse(id)}
                    aria-expanded={!estaColapsado}
                    aria-controls={bodyId}
                    title={estaColapsado ? 'Desplegar' : 'Plegar'}
                  >
                    <i className={`fa-solid fa-chevron-${estaColapsado ? 'right' : 'down'}`} aria-hidden="true" />
                  </button>
                )}
                <strong className="muted">
                  {singular} {i + 1} de {items.length}
                </strong>
              </div>
              <div className="row">
                <button
                  type="button"
                  className="btn btn-icon btn-sm"
                  onClick={() => onMove(getId(item), -1)}
                  disabled={i === 0}
                  aria-label={`Subir ${singular} ${i + 1}`}
                  title="Subir"
                >
                  <i className="fa-solid fa-arrow-up" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn-icon btn-sm"
                  onClick={() => onMove(getId(item), 1)}
                  disabled={i === items.length - 1}
                  aria-label={`Bajar ${singular} ${i + 1}`}
                  title="Bajar"
                >
                  <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn-icon btn-sm"
                  onClick={() => onDuplicate(getId(item))}
                  aria-label={`Duplicar ${singular} ${i + 1}`}
                  title="Duplicar"
                >
                  <i className="fa-solid fa-copy" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn-icon btn-sm btn-danger"
                  onClick={() => void handleDelete(getId(item))}
                  aria-label={`Eliminar ${singular} ${i + 1}`}
                  title="Eliminar"
                >
                  <i className="fa-solid fa-trash" aria-hidden="true" />
                </button>
              </div>
            </div>
            {(!collapsible || !estaColapsado) && (
              <div id={collapsible ? bodyId : undefined}>{renderItem(item, i)}</div>
            )}
          </section>
        )
      })}

      <button type="button" className="btn" onClick={onAdd} disabled={alcanzadoMax}>
        <i className="fa-solid fa-plus" aria-hidden="true" /> Agregar {singular}
      </button>
      {alcanzadoMax && (
        <span className="field-error" role="alert">
          {' '}
          Máximo {maxItems} {singular.toLowerCase()}s por flujo.
        </span>
      )}
    </div>
  )
}
