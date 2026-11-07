import { useMemo, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { EditableList } from '@/components/EditableList'
import { TagInput } from '@/components/TagInput'
import { CommandPreview } from '@/components/CommandPreview'
import type { Paso, Ruta, SO, Variante, VariableDecl } from '@/lib/types'
import { SO_LABEL } from '@/lib/types'
import {
  nuevaRuta,
  nuevoPaso,
  nuevaVariante,
  resolverComando,
  varianteParaSO,
  variablesDeRuta
} from '@/lib/utils'

const ICONOS = [
  'terminal',
  'code',
  'database',
  'server',
  'bug',
  'git-alt',
  'folder',
  'gears',
  'cloud',
  'lock',
  'file-code',
  'wand-magic-sparkles'
]

const SISTEMAS: SO[] = ['windows', 'linux', 'macos', 'any']

interface Props {
  rutaId?: string
}

export default function RutaEditor({ rutaId }: Props) {
  const { rutas, ajustes, guardarRuta, navegar } = useApp()
  const existente = rutas.find((r) => r.id === rutaId)
  const [ruta, setRuta] = useState<Ruta>(() =>
    existente ? structuredClone(existente) : nuevaRuta(ajustes.soPreferido)
  )
  const [errorNombre, setErrorNombre] = useState('')

  const valoresVista = useMemo(() => {
    const mapa: Record<string, string> = {}
    for (const g of ajustes.variablesGlobales) mapa[g.nombre] = g.valor
    for (const v of ruta.variables) if (v.defaultValue) mapa[v.nombre] = v.defaultValue
    return mapa
  }, [ajustes.variablesGlobales, ruta.variables])

  const usadas = useMemo(() => variablesDeRuta(ruta), [ruta])

  // ---------- Pasos ----------
  const addPaso = () => setRuta((r) => ({ ...r, pasos: [...r.pasos, nuevoPaso()] }))
  const deletePaso = (id: string) => setRuta((r) => ({ ...r, pasos: r.pasos.filter((p) => p.id !== id) }))
  const duplicatePaso = (id: string) =>
    setRuta((r) => {
      const idx = r.pasos.findIndex((p) => p.id === id)
      const copia = structuredClone(r.pasos[idx])
      copia.id = crypto.randomUUID()
      const pasos = [...r.pasos]
      pasos.splice(idx + 1, 0, copia)
      return { ...r, pasos }
    })
  const movePaso = (id: string, dir: -1 | 1) =>
    setRuta((r) => {
      const idx = r.pasos.findIndex((p) => p.id === id)
      const to = idx + dir
      if (to < 0 || to >= r.pasos.length) return r
      const pasos = [...r.pasos]
      const [item] = pasos.splice(idx, 1)
      pasos.splice(to, 0, item)
      return { ...r, pasos }
    })
  const updatePaso = (id: string, patch: Partial<Paso>) =>
    setRuta((r) => ({
      ...r,
      pasos: r.pasos.map((p) => (p.id === id ? { ...p, ...patch } : p))
    }))

  // ---------- Variantes ----------
  const updateVariante = (pasoId: string, varianteId: string, patch: Partial<Variante>) =>
    setRuta((r) => ({
      ...r,
      pasos: r.pasos.map((p) =>
        p.id === pasoId
          ? { ...p, variantes: p.variantes.map((v) => (v.id === varianteId ? { ...v, ...patch } : v)) }
          : p
      )
    }))

  const addVariante = (pasoId: string) =>
    setRuta((r) => ({
      ...r,
      pasos: r.pasos.map((p) => (p.id === pasoId ? { ...p, variantes: [...p.variantes, nuevaVariante()] } : p))
    }))
  const deleteVariante = (pasoId: string, varianteId: string) =>
    setRuta((r) => ({
      ...r,
      pasos: r.pasos.map((p) =>
        p.id === pasoId ? { ...p, variantes: p.variantes.filter((v) => v.id !== varianteId) } : p
      )
    }))
  const duplicateVariante = (pasoId: string, varianteId: string) =>
    setRuta((r) => ({
      ...r,
      pasos: r.pasos.map((p) => {
        if (p.id !== pasoId) return p
        const idx = p.variantes.findIndex((v) => v.id === varianteId)
        const copia = structuredClone(p.variantes[idx])
        copia.id = crypto.randomUUID()
        const variantes = [...p.variantes]
        variantes.splice(idx + 1, 0, copia)
        return { ...p, variantes }
      })
    }))
  const moveVariante = (pasoId: string, varianteId: string, dir: -1 | 1) =>
    setRuta((r) => ({
      ...r,
      pasos: r.pasos.map((p) => {
        if (p.id !== pasoId) return p
        const idx = p.variantes.findIndex((v) => v.id === varianteId)
        const to = idx + dir
        if (to < 0 || to >= p.variantes.length) return p
        const variantes = [...p.variantes]
        const [item] = variantes.splice(idx, 1)
        variantes.splice(to, 0, item)
        return { ...p, variantes }
      })
    }))

  // ---------- Variables ----------
  const addVariable = () =>
    setRuta((r) => ({ ...r, variables: [...r.variables, { nombre: '', defaultValue: '' }] }))
  const updateVariable = (id: number, patch: Partial<VariableDecl>) =>
    setRuta((r) => ({
      ...r,
      variables: r.variables.map((v, i) => (i === id ? { ...v, ...patch } : v))
    }))
  const deleteVariable = (id: number) =>
    setRuta((r) => ({ ...r, variables: r.variables.filter((_, i) => i !== id) }))

  const detectarVariables = () => {
    const declaradas = new Set(ruta.variables.map((v) => v.nombre).filter(Boolean))
    const faltantes = usadas.filter((n) => !declaradas.has(n))
    if (faltantes.length === 0) return
    setRuta((r) => ({
      ...r,
      variables: [...r.variables, ...faltantes.map((n) => ({ nombre: n, defaultValue: '' }))]
    }))
  }

  const guardar = async () => {
    if (!ruta.nombre.trim()) {
      setErrorNombre('El nombre es obligatorio.')
      return
    }
    const nombre = ruta.nombre.trim()
    const duplicado = rutas.some((r) => r.id !== ruta.id && r.nombre.trim().toLowerCase() === nombre.toLowerCase())
    if (duplicado) {
      setErrorNombre('Ya existe una ruta con ese nombre.')
      return
    }
    setErrorNombre('')
    try {
      await guardarRuta({ ...ruta, nombre })
      navegar({ nombre: 'dashboard' })
    } catch (e) {
      setErrorNombre(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div>
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="field">
          <label htmlFor="ruta-nombre">Nombre *</label>
          <input
            id="ruta-nombre"
            value={ruta.nombre}
            onChange={(e) => setRuta({ ...ruta, nombre: e.target.value })}
            placeholder="Ej. Desplegar a producción"
          />
          {errorNombre && (
            <span className="field-error" role="alert">
              {errorNombre}
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="ruta-desc">Descripción</label>
          <input
            id="ruta-desc"
            value={ruta.descripcion ?? ''}
            onChange={(e) => setRuta({ ...ruta, descripcion: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="ruta-tags">Etiquetas</label>
          <TagInput id="ruta-tags" etiquetas={ruta.etiquetas} onChange={(etiquetas) => setRuta({ ...ruta, etiquetas })} />
        </div>

        <div className="row" style={{ flexWrap: 'wrap' }}>
          <div className="field">
            <label htmlFor="ruta-color">Color</label>
            <input
              id="ruta-color"
              type="color"
              value={ruta.color}
              onChange={(e) => setRuta({ ...ruta, color: e.target.value })}
              style={{ width: 60, height: 38, padding: 2 }}
            />
          </div>
          <div className="field grow">
            <label htmlFor="ruta-icono">Icono</label>
            <select id="ruta-icono" value={ruta.icono} onChange={(e) => setRuta({ ...ruta, icono: e.target.value })}>
              {ICONOS.map((ic) => (
                <option key={ic} value={ic}>
                  {ic}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={ruta.favorito}
                onChange={(e) => setRuta({ ...ruta, favorito: e.target.checked })}
              />{' '}
              Favorito
            </label>
          </div>
        </div>
      </section>

      <h2 className="section-title">Pasos</h2>
      <EditableList<Paso>
        items={ruta.pasos}
        getId={(p) => p.id}
        singular="Paso"
        onAdd={addPaso}
        onMove={movePaso}
        onDuplicate={duplicatePaso}
        onDelete={deletePaso}
        renderItem={(paso) => (
          <div>
            <div className="field">
              <label htmlFor={`paso-titulo-${paso.id}`}>Título</label>
              <input
                id={`paso-titulo-${paso.id}`}
                value={paso.titulo}
                onChange={(e) => updatePaso(paso.id, { titulo: e.target.value })}
                placeholder="Ej. Compilar el proyecto"
              />
            </div>
            <div className="field">
              <label htmlFor={`paso-desc-${paso.id}`}>Descripción</label>
              <input
                id={`paso-desc-${paso.id}`}
                value={paso.descripcion ?? ''}
                onChange={(e) => updatePaso(paso.id, { descripcion: e.target.value })}
              />
            </div>
            <label className="row" style={{ marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={!!paso.esDestructivo}
                onChange={(e) => updatePaso(paso.id, { esDestructivo: e.target.checked })}
              />
              <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--color-error)' }} aria-hidden="true" />
              <span>Paso destructivo</span>
            </label>

            <EditableList<Variante>
              items={paso.variantes}
              getId={(v) => v.id}
              singular="Variante"
              onAdd={() => addVariante(paso.id)}
              onMove={(id, dir) => moveVariante(paso.id, id, dir)}
              onDuplicate={(id) => duplicateVariante(paso.id, id)}
              onDelete={(id) => {
                if (paso.variantes.length <= 1) return
                deleteVariante(paso.id, id)
              }}
              renderItem={(variante) => (
                <div>
                  <div className="row">
                    <div className="field grow">
                      <label htmlFor={`so-${variante.id}`}>Sistema operativo</label>
                      <select
                        id={`so-${variante.id}`}
                        value={variante.so}
                        onChange={(e) => updateVariante(paso.id, variante.id, { so: e.target.value as SO })}
                      >
                        {SISTEMAS.map((so) => (
                          <option key={so} value={so}>
                            {SO_LABEL[so]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>
                        <input
                          type="checkbox"
                          checked={!!variante.esAlternativo}
                          onChange={(e) => updateVariante(paso.id, variante.id, { esAlternativo: e.target.checked })}
                        />{' '}
                        Alternativo
                      </label>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor={`cmd-${variante.id}`}>Comando</label>
                    <textarea
                      id={`cmd-${variante.id}`}
                      rows={3}
                      value={variante.comando}
                      onChange={(e) => updateVariante(paso.id, variante.id, { comando: e.target.value })}
                      placeholder="git push origin {{rama}}"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`nota-${variante.id}`}>Nota</label>
                    <input
                      id={`nota-${variante.id}`}
                      value={variante.nota ?? ''}
                      onChange={(e) => updateVariante(paso.id, variante.id, { nota: e.target.value })}
                    />
                  </div>
                </div>
              )}
            />

            {!paso.variantes.some((v) => v.so === ajustes.soPreferido) && (
              <span className="field-hint">
                <i className="fa-solid fa-circle-info" aria-hidden="true" /> Advertencia: no hay variante para{' '}
                {SO_LABEL[ajustes.soPreferido]}.
              </span>
            )}

            <div style={{ marginTop: 8 }}>
              <CommandPreview
                comando={varianteParaSO(paso, ajustes.soPreferido)?.comando ?? ''}
                ariaLabel="Vista previa del comando"
              />
            </div>
          </div>
        )}
      />

      <h2 className="section-title">Variables de paso</h2>
      <div className="card">
        <p className="muted" style={{ fontSize: 13 }}>
          Placeholders <span className="var-token">{'{{nombre}}'}</span> usados en los comandos. Define un valor por
          defecto opcional.
        </p>
        {ruta.variables.map((v, i) => (
          <div className="row" key={i} style={{ marginBottom: 8 }}>
            <input
              value={v.nombre}
              placeholder="nombre"
              onChange={(e) => updateVariable(i, { nombre: e.target.value })}
              aria-label={`Nombre de variable ${i + 1}`}
              style={{ width: 160 }}
            />
            <input
              value={v.defaultValue ?? ''}
              placeholder="valor por defecto"
              onChange={(e) => updateVariable(i, { defaultValue: e.target.value })}
              aria-label={`Valor por defecto ${i + 1}`}
            />
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => deleteVariable(i)}
              aria-label={`Eliminar variable ${i + 1}`}
            >
              <i className="fa-solid fa-trash" aria-hidden="true" />
            </button>
          </div>
        ))}
        <div className="row">
          <button type="button" className="btn btn-sm" onClick={addVariable}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Añadir variable
          </button>
          <button type="button" className="btn btn-sm" onClick={detectarVariables}>
            <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Detectar desde comandos
          </button>
        </div>
        {usadas.length > 0 && (
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Variables detectadas: {usadas.map((n) => `{{${n}}}`).join(', ')}
          </p>
        )}
      </div>

      {Object.keys(valoresVista).length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Vista previa resuelta</h3>
          <pre className="command-block" aria-label="Vista previa resuelta">
            {ruta.pasos.map((p) => {
              const v = varianteParaSO(p, ajustes.soPreferido)
              return v ? resolverComando(v.comando, valoresVista) + '\n' : ''
            })}
          </pre>
        </section>
      )}

      <footer className="row" style={{ marginTop: 20 }}>
        <button type="button" className="btn" onClick={() => navegar({ nombre: 'dashboard' })}>
          Cancelar
        </button>
        <span className="grow" />
        <button type="button" className="btn btn-primary" onClick={() => void guardar()}>
          <i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Guardar ruta
        </button>
      </footer>
    </div>
  )
}
