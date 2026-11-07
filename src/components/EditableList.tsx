import type { ReactNode } from 'react'
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
}

/**
 * Lista ordenada editable reutilizable (RNF-008):
 * agregar, mover arriba/abajo, duplicar y eliminar (con confirmación).
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
  maxItems = 50
}: EditableListProps<T>) {
  const alcanzadoMax = items.length >= maxItems

  const handleDelete = async (id: string) => {
    const ok = await confirmarEliminacion(singular)
    if (ok) onDelete(id)
  }

  return (
    <div>
      {items.map((item, i) => (
        <section
          key={getId(item)}
          className="card"
          style={{ marginBottom: 12, position: 'relative' }}
          aria-label={`${singular} ${i + 1}`}
        >
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <strong className="muted">
              {singular} {i + 1} de {items.length}
            </strong>
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
          {renderItem(item, i)}
        </section>
      ))}

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
