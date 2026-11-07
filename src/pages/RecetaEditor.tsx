import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { EditableList } from '@/components/EditableList'
import { TagInput } from '@/components/TagInput'
import type { Receta, RecetaPaso } from '@/lib/types'
import { nuevaReceta, uid } from '@/lib/utils'

interface Props {
  recetaId?: string
}

export default function RecetaEditor({ recetaId }: Props) {
  const { recetas, guardarReceta, navegar } = useApp()
  const existente = recetas.find((r) => r.id === recetaId)
  const [receta, setReceta] = useState<Receta>(() =>
    existente ? structuredClone(existente) : nuevaReceta()
  )
  const [errorTitulo, setErrorTitulo] = useState('')

  const addPaso = () =>
    setReceta((r) => ({ ...r, pasos: [...r.pasos, { id: uid(), texto: '' }] }))
  const updatePaso = (id: string, texto: string) =>
    setReceta((r) => ({ ...r, pasos: r.pasos.map((p) => (p.id === id ? { ...p, texto } : p)) }))
  const deletePaso = (id: string) =>
    setReceta((r) => ({ ...r, pasos: r.pasos.filter((p) => p.id !== id) }))
  const duplicatePaso = (id: string) =>
    setReceta((r) => {
      const idx = r.pasos.findIndex((p) => p.id === id)
      const copia = { ...r.pasos[idx], id: uid() }
      const pasos = [...r.pasos]
      pasos.splice(idx + 1, 0, copia)
      return { ...r, pasos }
    })
  const movePaso = (id: string, dir: -1 | 1) =>
    setReceta((r) => {
      const idx = r.pasos.findIndex((p) => p.id === id)
      const to = idx + dir
      if (to < 0 || to >= r.pasos.length) return r
      const pasos = [...r.pasos]
      const [item] = pasos.splice(idx, 1)
      pasos.splice(to, 0, item)
      return { ...r, pasos }
    })

  const guardar = async () => {
    if (!receta.titulo.trim()) {
      setErrorTitulo('El título es obligatorio.')
      return
    }
    const titulo = receta.titulo.trim()
    const duplicado = recetas.some(
      (r) => r.id !== receta.id && r.titulo.trim().toLowerCase() === titulo.toLowerCase()
    )
    if (duplicado) {
      setErrorTitulo('Ya existe una receta con ese título.')
      return
    }
    setErrorTitulo('')
    try {
      await guardarReceta({ ...receta, titulo })
      navegar({ nombre: 'dashboard' })
    } catch (e) {
      setErrorTitulo(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div>
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="field">
          <label htmlFor="receta-titulo">Título *</label>
          <input
            id="receta-titulo"
            value={receta.titulo}
            onChange={(e) => setReceta({ ...receta, titulo: e.target.value })}
            placeholder="Ej. Validar una contraseña"
          />
          {errorTitulo && (
            <span className="field-error" role="alert">
              {errorTitulo}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="receta-desc">Descripción</label>
          <textarea
            id="receta-desc"
            rows={2}
            value={receta.descripcion ?? ''}
            onChange={(e) => setReceta({ ...receta, descripcion: e.target.value })}
          />
        </div>
        <div className="row">
          <div className="field grow">
            <label htmlFor="receta-entrada">Entrada</label>
            <textarea
              id="receta-entrada"
              rows={2}
              value={receta.entrada ?? ''}
              onChange={(e) => setReceta({ ...receta, entrada: e.target.value })}
            />
          </div>
          <div className="field grow">
            <label htmlFor="receta-salida">Salida</label>
            <textarea
              id="receta-salida"
              rows={2}
              value={receta.salida ?? ''}
              onChange={(e) => setReceta({ ...receta, salida: e.target.value })}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="receta-tags">Etiquetas</label>
          <TagInput id="receta-tags" etiquetas={receta.etiquetas} onChange={(etiquetas) => setReceta({ ...receta, etiquetas })} />
        </div>
        <label className="row">
          <input
            type="checkbox"
            checked={receta.favorito}
            onChange={(e) => setReceta({ ...receta, favorito: e.target.checked })}
          />
          Favorito
        </label>
      </section>

      <h2 className="section-title">Pasos</h2>
      <EditableList<RecetaPaso>
        items={receta.pasos}
        getId={(p) => p.id}
        singular="Paso"
        onAdd={addPaso}
        onMove={movePaso}
        onDuplicate={duplicatePaso}
        onDelete={deletePaso}
        renderItem={(paso) => (
          <div className="field">
            <label htmlFor={`receta-paso-${paso.id}`}>Texto del paso</label>
            <textarea
              id={`receta-paso-${paso.id}`}
              rows={2}
              value={paso.texto}
              onChange={(e) => updatePaso(paso.id, e.target.value)}
            />
          </div>
        )}
      />

      <footer className="row" style={{ marginTop: 20 }}>
        <button type="button" className="btn" onClick={() => navegar({ nombre: 'dashboard' })}>
          Cancelar
        </button>
        <span className="grow" />
        <button type="button" className="btn btn-primary" onClick={() => void guardar()}>
          <i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Guardar receta
        </button>
      </footer>
    </div>
  )
}
