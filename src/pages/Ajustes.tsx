import { useRef, useState } from 'react'
import { mostrarError, useApp } from '@/context/AppContext'
import { exportarDatos, importarDatos } from '@/lib/io'
import type { SO } from '@/lib/types'
import { SO_LABEL } from '@/lib/types'

const SISTEMAS: SO[] = ['windows', 'linux', 'macos', 'any']

export default function Ajustes() {
  const { ajustes, guardarAjustes } = useApp()
  const [draft, setDraft] = useState(structuredClone(ajustes))
  const fileRef = useRef<HTMLInputElement>(null)

  const setVariables = (nombre: string, valor: string, i: number) => {
    setDraft((d) => ({
      ...d,
      variablesGlobales: d.variablesGlobales.map((v, idx) => (idx === i ? { nombre, valor } : v))
    }))
  }
  const addVariable = () =>
    setDraft((d) => ({ ...d, variablesGlobales: [...d.variablesGlobales, { nombre: '', valor: '' }] }))
  const deleteVariable = (i: number) =>
    setDraft((d) => ({ ...d, variablesGlobales: d.variablesGlobales.filter((_, idx) => idx !== i) }))

  const guardar = async () => {
    try {
      await guardarAjustes(draft)
    } catch (e) {
      mostrarError(e)
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Sistema operativo preferido</h2>
        <div className="field">
          <label htmlFor="so-preferido">Sistema operativo</label>
          <select
            id="so-preferido"
            value={draft.soPreferido}
            onChange={(e) => setDraft({ ...draft, soPreferido: e.target.value as SO })}
            style={{ maxWidth: 240 }}
          >
            {SISTEMAS.map((so) => (
              <option key={so} value={so}>
                {SO_LABEL[so]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Variables globales</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Valores reutilizables en todas las rutas. Se resuelven en silencio (precedencia: variable de paso &gt;
          global).
        </p>
        {draft.variablesGlobales.map((v, i) => (
          <div className="row" key={i} style={{ marginBottom: 8 }}>
            <input
              value={v.nombre}
              placeholder="nombre"
              onChange={(e) => setVariables(e.target.value, v.valor, i)}
              aria-label={`Nombre de variable global ${i + 1}`}
              style={{ width: 160 }}
            />
            <input
              value={v.valor}
              placeholder="valor"
              onChange={(e) => setVariables(v.nombre, e.target.value, i)}
              aria-label={`Valor de variable global ${i + 1}`}
            />
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => deleteVariable(i)}
              aria-label={`Eliminar variable global ${i + 1}`}
            >
              <i className="fa-solid fa-trash" aria-hidden="true" />
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-sm" onClick={addVariable}>
          <i className="fa-solid fa-plus" aria-hidden="true" /> Añadir variable
        </button>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Importar / Exportar</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Exporta o restaura el archivo de datos (datos_flujos.json).
        </p>
        <div className="row">
          <button type="button" className="btn" onClick={() => void exportarDatos().catch(mostrarError)}>
            <i className="fa-solid fa-download" aria-hidden="true" /> Exportar datos
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            <i className="fa-solid fa-upload" aria-hidden="true" /> Importar datos
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importarDatos(f).catch(mostrarError)
              e.target.value = ''
            }}
            aria-label="Seleccionar archivo para importar"
          />
        </div>
      </section>

      <footer className="row">
        <span className="grow" />
        <button type="button" className="btn btn-primary" onClick={() => void guardar()}>
          <i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Guardar ajustes
        </button>
      </footer>
    </div>
  )
}
