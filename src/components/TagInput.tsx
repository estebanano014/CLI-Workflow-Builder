import { useState } from 'react'

interface TagInputProps {
  etiquetas: string[]
  onChange: (etiquetas: string[]) => void
  id?: string
}

export function TagInput({ etiquetas, onChange, id }: TagInputProps) {
  const [borrador, setBorrador] = useState('')

  const confirmar = () => {
    const nuevas = borrador
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    if (nuevas.length === 0) return
    onChange(Array.from(new Set([...etiquetas, ...nuevas])))
    setBorrador('')
  }

  const quitar = (tag: string) => {
    onChange(etiquetas.filter((t) => t !== tag))
  }

  return (
    <div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        {etiquetas.map((tag) => (
          <span key={tag} className="badge">
            {tag}
            <button
              type="button"
              className="btn-ghost"
              onClick={() => quitar(tag)}
              aria-label={`Quitar etiqueta ${tag}`}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        <input
          id={id}
          type="text"
          value={borrador}
          placeholder="etiqueta1, etiqueta2"
          onChange={(e) => setBorrador(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              confirmar()
            }
          }}
          onBlur={confirmar}
          aria-label="Añadir etiquetas separadas por comas"
        />
      </div>
    </div>
  )
}
