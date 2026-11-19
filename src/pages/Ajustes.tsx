import { useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { mostrarError, useApp } from '@/context/AppContext'
import { exportarDatos, importarDatos } from '@/lib/io'
import { PasswordInput } from '@/components/PasswordInput'
import { APP_VERSION, ajustesDefault } from '@/lib/utils'
import type { SO } from '@/lib/types'
import { SO_LABEL } from '@/lib/types'

const SISTEMAS: SO[] = ['windows', 'linux', 'macos', 'any']

export default function Ajustes() {
  const { ajustes, guardarAjustes, recargar, username, cerrarSesion, cambiarPassword } = useApp()
  const [draft, setDraft] = useState(structuredClone(ajustes))
  const fileRef = useRef<HTMLInputElement>(null)

  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [passError, setPassError] = useState<string | null>(null)

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

  const importarDesdeArchivo = async (archivo: File) => {
    try {
      const data = await importarDatos(archivo)
      if (data) {
        await recargar()
        setDraft(structuredClone(data.ajustes ?? ajustesDefault()))
      }
    } catch (e) {
      mostrarError(e)
    }
  }

  const cerrarSesionHandler = async () => {
    const confirm = await Swal.fire({
      title: 'Cerrar sesión',
      text: 'Volverás a la pantalla de inicio. Tus datos se conservan.',
      icon: 'warning',
      iconColor: 'var(--color-warning)',
      showCancelButton: true,
      confirmButtonText: 'Cerrar sesión',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-warning)',
      reverseButtons: true
    })
    if (!confirm.isConfirmed) return
    await cerrarSesion()
  }

  const cambiarPasswordHandler = async () => {
    setPassError(null)
    if (!actual) {
      setPassError('Escribe tu contraseña actual.')
      return
    }
    if (!nueva) {
      setPassError('Escribe la nueva contraseña.')
      return
    }
    if (nueva !== nueva.trim()) {
      setPassError('La contraseña no puede empezar ni terminar con espacios.')
      return
    }
    if (nueva.length < 8) {
      setPassError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    const confirm = await Swal.fire({
      title: 'Cambiar contraseña',
      text: 'Se cerrará tu sesión y tendrás que iniciar sesión de nuevo. ¿Continuar?',
      icon: 'warning',
      iconColor: 'var(--color-warning)',
      showCancelButton: true,
      confirmButtonText: 'Cambiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-warning)',
      reverseButtons: true
    })
    if (!confirm.isConfirmed) return
    try {
      await cambiarPassword(actual, nueva)
      await Swal.fire({
        title: 'Contraseña cambiada',
        text: 'Inicia sesión con tu nueva contraseña.',
        icon: 'success'
      })
    } catch (e) {
      mostrarError(e)
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>
          <i className="fa-solid fa-circle-info" aria-hidden="true" /> Acerca de
        </h2>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          <strong>CLI Workflow Builder</strong> · versión {APP_VERSION} · 100&nbsp;% sin conexión. Interfaz
          Electron + React + TypeScript y núcleo Python con API local. Tus datos se guardan en un único
          archivo JSON local (<code>datos_flujos.json</code>) con copia de seguridad automática.
        </p>

        <h3 className="about-subtitle">Atajos del Modo Ejecución</h3>
        <ul className="shortcut-list">
          <li>
            <span className="kbd">→</span> o <span className="kbd">Enter</span> siguiente paso
          </li>
          <li>
            <span className="kbd">←</span> paso anterior
          </li>
          <li>
            <span className="kbd">C</span> copiar comando
          </li>
          <li>
            <span className="kbd">R</span> reiniciar
          </li>
          <li>
            <span className="kbd">Esc</span> salir
          </li>
        </ul>
        <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
          Consejo: en la Biblioteca usa el buscador por <em>acción</em> (por ejemplo, “subir cambios” o
          “buscar texto”) y filtra por sistema operativo para ver la variante correcta.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Cuenta</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Sesión iniciada como <strong>{username ?? 'usuario'}</strong>. Cuenta única local de este
          equipo.
        </p>
        <div className="row">
          <button type="button" className="btn btn-danger" onClick={() => void cerrarSesionHandler()}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Cambiar contraseña</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Al cambiarla se cerrará tu sesión. Entre 8 y 128 caracteres, sin espacios al inicio ni al
          final. Si la olvidas, borra <code>datos_auth.json</code> para restablecer el acceso.
        </p>
        <PasswordInput
          id="pass-actual"
          label="Contraseña actual"
          value={actual}
          onChange={setActual}
          autoComplete="current-password"
        />
        <PasswordInput
          id="pass-nueva"
          label="Nueva contraseña"
          value={nueva}
          onChange={setNueva}
          autoComplete="new-password"
        />
        {passError && (
          <p className="field-error" role="alert" aria-live="assertive">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {passError}
          </p>
        )}
        <button type="button" className="btn btn-primary" onClick={() => void cambiarPasswordHandler()}>
          <i className="fa-solid fa-key" aria-hidden="true" /> Cambiar contraseña
        </button>
      </section>

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
          Valores reutilizables en todas las rutas. Se resuelven en silencio (precedencia: variable de
          paso &gt; global).
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
              if (f) void importarDesdeArchivo(f)
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
