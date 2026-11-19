import { useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import type { AssistantConfig } from '@/vite-env'
import { uid } from '@/lib/utils'

interface Mensaje {
  id: string
  rol: 'usuario' | 'asistente' | 'error'
  texto: string
}

export default function Asistente() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [streaming, setStreaming] = useState('')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [tool, setTool] = useState<string | null>(null)
  const [online, setOnline] = useState<boolean | null>(null)
  const [modelos, setModelos] = useState<string[]>([])
  const [config, setConfig] = useState<AssistantConfig | null>(null)
  const [mostrarConfig, setMostrarConfig] = useState(false)
  const finalRef = useRef<HTMLDivElement>(null)

  const bridge = window.cliWF?.assistant

  // Suscripción a eventos del asistente (una sola vez).
  useEffect(() => {
    if (!bridge) return
    const offs = [
      bridge.onChunk((data) => setStreaming((prev) => prev + data.text)),
      bridge.onDone((data) => {
        const texto = data.text || ''
        if (texto.trim()) setMensajes((prev) => [...prev, { id: uid(), rol: 'asistente', texto }])
        setStreaming('')
        setTool(null)
        setBusy(false)
      }),
      bridge.onError((data) => {
        setMensajes((prev) => [...prev, { id: uid(), rol: 'error', texto: data.message }])
        setStreaming('')
        setTool(null)
        setBusy(false)
      }),
      bridge.onStatus((data) => {
        if (data.type === 'tool-start' && data.tool) setTool(data.tool)
      }),
      bridge.onConfirm((data) => {
        void Swal.fire({
          title: data.title,
          text: data.message,
          icon: 'warning',
          iconColor: 'var(--color-warning)',
          showCancelButton: true,
          confirmButtonText: 'Permitir',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: 'var(--color-warning)',
          reverseButtons: true
        }).then((res) => {
          void bridge.confirmReply(data.id, res.isConfirmed)
        })
      })
    ]
    return () => offs.forEach((off) => off())
  }, [bridge])

  useEffect(() => {
    if (!bridge) return
    void (async () => {
      try {
        const cfg = await bridge.getConfig()
        setConfig(cfg)
      } catch {
        /* sin config */
      }
      await refrescarSalud()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge])

  useEffect(() => {
    finalRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, streaming])

  const refrescarSalud = async () => {
    if (!bridge) return
    try {
      const h = await bridge.health()
      setOnline(h.online)
      if (h.models) setModelos(h.models)
    } catch {
      setOnline(false)
    }
  }

  const guardarConfig = async () => {
    if (!bridge || !config) return
    try {
      const actualizada = await bridge.setConfig(config)
      setConfig(actualizada)
      await Swal.fire({ title: 'Configuración guardada', icon: 'success', timer: 1400, showConfirmButton: false })
      await refrescarSalud()
    } catch (e) {
      await Swal.fire({ title: 'Error', text: e instanceof Error ? e.message : String(e), icon: 'error' })
    }
  }

  const enviar = async () => {
    if (!bridge || busy) return
    const texto = input.trim()
    if (!texto) return
    setInput('')
    setMensajes((prev) => [...prev, { id: uid(), rol: 'usuario', texto }])
    setBusy(true)
    setStreaming('')
    setTool(null)
    try {
      const res = await bridge.chat(texto)
      if (!res.ok && res.error) {
        const mensajeError = res.error
        setMensajes((prev) => [...prev, { id: uid(), rol: 'error', texto: mensajeError }])
      }
    } catch (e) {
      setMensajes((prev) => [...prev, { id: uid(), rol: 'error', texto: e instanceof Error ? e.message : String(e) }])
    } finally {
      setBusy(false)
    }
  }

  const nuevaConversacion = async () => {
    await bridge?.reset()
    setMensajes([])
    setStreaming('')
    setTool(null)
  }

  if (!bridge) {
    return (
      <div className="empty-state">
        <p>El puente de Electron no está disponible.</p>
      </div>
    )
  }

  return (
    <div className="assistant">
      <section className="card assistant-header">
        <div className="row">
          <i className="fa-solid fa-robot" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
          <div className="grow">
            <strong>Asistente de IA local</strong>
            <div className="muted" style={{ fontSize: 13 }}>
              {online === null
                ? 'Comprobando conexión…'
                : online
                  ? `Ollama en línea · modelo ${config?.model ?? '…'}`
                  : 'Ollama no disponible'}
            </div>
          </div>
          <span className={`badge ${online ? 'ruta' : 'receta'}`}>
            <i className={`fa-solid ${online ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} aria-hidden="true" />{' '}
            {online ? 'Conectado' : 'Sin conexión'}
          </span>
          <button type="button" className="btn btn-sm" onClick={() => setMostrarConfig((v) => !v)} aria-expanded={mostrarConfig}>
            <i className="fa-solid fa-gear" aria-hidden="true" /> Configuración
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void nuevaConversacion()}>
            <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Nueva conversación
          </button>
        </div>
      </section>

      {mostrarConfig && config && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Configuración del asistente</h3>
          <div className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field grow">
              <label htmlFor="ia-url">URL de Ollama</label>
              <input id="ia-url" value={config.ollamaUrl} onChange={(e) => setConfig({ ...config, ollamaUrl: e.target.value })} />
            </div>
            <div className="field grow">
              <label htmlFor="ia-model">Modelo</label>
              <input
                id="ia-model"
                list="ia-modelos"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
              />
              <datalist id="ia-modelos">
                {modelos.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field">
              <label htmlFor="ia-temp">Temperatura ({config.temperature})</label>
              <input
                id="ia-temp"
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label htmlFor="ia-ctx">Contexto (num_ctx)</label>
              <input
                id="ia-ctx"
                type="number"
                min={512}
                max={131072}
                value={config.numCtx}
                onChange={(e) => setConfig({ ...config, numCtx: Number(e.target.value) })}
                style={{ width: 120 }}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="ia-dir">Directorio de trabajo (proyecto)</label>
            <input id="ia-dir" value={config.workspaceDir} onChange={(e) => setConfig({ ...config, workspaceDir: e.target.value })} />
          </div>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => void guardarConfig()}>
              <i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Guardar
            </button>
            <button type="button" className="btn" onClick={() => void refrescarSalud()}>
              <i className="fa-solid fa-rotate" aria-hidden="true" /> Probar conexión
            </button>
            {modelos.length > 0 && (
              <span className="muted" style={{ fontSize: 12 }}>
                {modelos.length} modelo{modelos.length !== 1 ? 's' : ''} instalado{modelos.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </section>
      )}

      <section className="card assistant-chat" aria-label="Conversación con el asistente">
        <div className="assistant-messages">
          {mensajes.length === 0 && !streaming && (
            <p className="muted assistant-empty">
              Pregúntame lo que quieras. Por ejemplo: «resume el estado del proyecto» o «haz los commits de este repositorio».
            </p>
          )}
          {mensajes.map((m) => (
            <div key={m.id} className={`assistant-msg ${m.rol}`}>
              {m.rol !== 'asistente' && <span className="assistant-rol">{m.rol === 'usuario' ? 'Tú' : 'Error'}</span>}
              <div className="assistant-bubble">{m.texto}</div>
            </div>
          ))}
          {streaming && (
            <div className="assistant-msg asistente">
              <div className="assistant-bubble">
                {streaming}
                <span className="assistant-cursor" aria-hidden="true">▍</span>
              </div>
            </div>
          )}
          {tool && (
            <div className="assistant-msg sistema">
              <div className="assistant-bubble assistant-tool">
                <i className="fa-solid fa-gears fa-spin" aria-hidden="true" /> Ejecutando herramienta: <code>{tool}</code>
              </div>
            </div>
          )}
          <div ref={finalRef} />
        </div>

        <div className="assistant-input-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void enviar()
              }
            }}
            placeholder="Escribe tu petición… (Enter para enviar)"
            aria-label="Mensaje para el asistente"
            disabled={busy}
          />
          <button type="button" className="btn btn-primary" onClick={() => void enviar()} disabled={busy || !input.trim()}>
            {busy ? <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> : <i className="fa-solid fa-paper-plane" aria-hidden="true" />}{' '}
            Enviar
          </button>
        </div>
      </section>
    </div>
  )
}
