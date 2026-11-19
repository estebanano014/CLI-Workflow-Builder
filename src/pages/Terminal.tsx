import { useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { comandoPermitido, EJEMPLOS_SEGUROS, esComandoPeligroso } from '@/lib/terminal'
import { uid } from '@/lib/utils'

interface Linea {
  id: string
  tipo: 'entrada' | 'salida' | 'error' | 'sistema'
  texto: string
}

const TIMEOUT_MS = 30000

export default function Terminal() {
  const [cwd, setCwd] = useState('')
  const [modoSeguro, setModoSeguro] = useState(true)
  const [comando, setComando] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([])
  const [ejecutando, setEjecutando] = useState(false)
  const salidaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void (async () => {
      try {
        const home = await window.cliWF?.homeDir()
        if (home) setCwd(home)
      } catch {
        /* sin acceso al directorio home */
      }
    })()
  }, [])

  useEffect(() => {
    const el = salidaRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lineas])

  const append = (tipo: Linea['tipo'], texto: string) =>
    setLineas((prev) => [...prev, { id: uid(), tipo, texto }])

  const ejecutar = async () => {
    const cmd = comando.trim()
    if (!cmd || ejecutando) return

    if (modoSeguro && !comandoPermitido(cmd)) {
      append('error', `Bloqueado (modo seguro): «${cmd}» no está en la lista blanca.`)
      return
    }
    if (esComandoPeligroso(cmd)) {
      const res = await Swal.fire({
        title: 'Comando potencialmente peligroso',
        text: `«${cmd}» puede borrar o modificar datos de forma irreversible. ¿Ejecutar de todos modos?`,
        icon: 'warning',
        iconColor: 'var(--color-error)',
        showCancelButton: true,
        confirmButtonText: 'Ejecutar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: 'var(--color-error)',
        reverseButtons: true
      })
      if (!res.isConfirmed) return
    }

    append('entrada', cmd)
    setEjecutando(true)
    try {
      const r = await window.cliWF!.ejecutarComando({ comando: cmd, cwd, timeoutMs: TIMEOUT_MS })
      if (r.timedOut) {
        append('error', 'Tiempo de espera agotado: el proceso fue cancelado.')
      } else if (r.error) {
        append('error', r.error)
      }
      if (r.stdout && r.stdout.trim()) append('salida', r.stdout.trimEnd())
      if (r.stderr && r.stderr.trim()) append('error', r.stderr.trimEnd())
      if (!r.error && !r.timedOut && !r.stdout.trim() && !r.stderr.trim()) {
        append('sistema', `(sin salida · código ${r.code})`)
      }
    } catch (e) {
      append('error', e instanceof Error ? e.message : String(e))
    } finally {
      setEjecutando(false)
      setComando('')
      inputRef.current?.focus()
    }
  }

  const limpiar = () => setLineas([])

  return (
    <div className="terminal">
      <div className="alert-box danger" style={{ marginBottom: 16 }}>
        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
        <span>
          <strong>Terminal real:</strong> los comandos se ejecutan de verdad en tu equipo. Empieza en{' '}
          <strong>modo seguro</strong> (lista blanca) y desactívalo solo si sabes lo que haces.
        </span>
      </div>

      <section className="card terminal-panel">
        <header className="row" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
          <div className="field grow" style={{ marginBottom: 0 }}>
            <label htmlFor="terminal-cwd">Directorio de trabajo</label>
            <input
              id="terminal-cwd"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="Carpeta donde se ejecutan los comandos (por defecto, tu carpeta de usuario)"
              aria-label="Directorio de trabajo"
            />
          </div>
          <label className="row" style={{ marginTop: 18 }}>
            <input
              type="checkbox"
              checked={modoSeguro}
              onChange={(e) => setModoSeguro(e.target.checked)}
              aria-describedby="terminal-seguro"
            />
            <span id="terminal-seguro">Modo seguro</span>
          </label>
          <button type="button" className="btn btn-sm" onClick={limpiar} style={{ marginTop: 18 }}>
            <i className="fa-solid fa-broom" aria-hidden="true" /> Limpiar
          </button>
        </header>

        <div className="terminal-output" ref={salidaRef} aria-live="polite" aria-label="Salida del terminal">
          {lineas.length === 0 ? (
            <p className="muted terminal-empty">
              {modoSeguro
                ? `Modo seguro activo. Prueba: ${EJEMPLOS_SEGUROS.join(' · ')}`
                : 'Escribe un comando y pulsa Enter para ejecutarlo.'}
            </p>
          ) : (
            lineas.map((l) => (
              <pre key={l.id} className={`terminal-line ${l.tipo}`}>
                {l.tipo === 'entrada' ? '> ' : ''}
                {l.texto}
              </pre>
            ))
          )}
        </div>

        <div className="terminal-input-row">
          <span className="terminal-prompt" aria-hidden="true">
            &gt;
          </span>
          <input
            ref={inputRef}
            value={comando}
            onChange={(e) => setComando(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void ejecutar()
            }}
            placeholder="Escribe un comando…"
            aria-label="Comando a ejecutar"
            disabled={ejecutando}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void ejecutar()}
            disabled={ejecutando || !comando.trim()}
          >
            {ejecutando ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Ejecutando…
              </>
            ) : (
              <>
                <i className="fa-solid fa-play" aria-hidden="true" /> Ejecutar
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  )
}
