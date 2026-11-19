/**
 * Cliente de la API local de Ollama (https://github.com/ollama/ollama).
 *
 * Vive en el proceso principal de Electron: el `fetch` de Node no está sujeto a
 * CORS (a diferencia del renderer, que en producción carga por `file://`), y
 * permite centralizar la URL, el modelo y el manejo de errores.
 *
 * Soportado: `/api/chat` con tool calling y respuestas en streaming (NDJSON),
 * `/api/tags` para listar modelos y comprobar disponibilidad.
 */

export interface OllamaConfig {
  url: string
  model: string
  temperature: number
  numCtx: number
  timeoutMs: number
}

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool'

export interface ToolCall {
  function: { name: string; arguments: Record<string, unknown> }
}

export interface ChatMessage {
  role: ChatRole
  content: string
  tool_calls?: ToolCall[]
  tool_name?: string
}

export interface OllamaTool {
  type: 'function'
  function: { name: string; description: string; parameters: Record<string, unknown> }
}

export interface ChatResult {
  content: string
  tool_calls: ToolCall[]
}

export class OllamaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OllamaError'
  }
}

/** Lee una respuesta en streaming NDJSON de Ollama y emite cada objeto. */
async function* readNdjson(body: ReadableStream<Uint8Array>): AsyncGenerator<Record<string, unknown>> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim()
      buffer = buffer.slice(idx + 1)
      if (line) yield JSON.parse(line) as Record<string, unknown>
    }
  }
  buffer += decoder.decode()
  if (buffer.trim()) yield JSON.parse(buffer.trim()) as Record<string, unknown>
}

/** Fusiona tool calls fragmentados del streaming por nombre de función. */
function mergeToolCalls(list: ToolCall[], incoming: unknown): void {
  if (!Array.isArray(incoming)) return
  for (const raw of incoming) {
    const fn = (raw as { function?: { name?: string; arguments?: Record<string, unknown> } })?.function
    if (!fn) continue
    const name = fn.name
    const args = fn.arguments ?? {}
    if (!name) continue
    const existing = list.find((e) => e.function.name === name)
    if (existing) {
      existing.function.arguments = { ...existing.function.arguments, ...args }
    } else {
      list.push({ function: { name, arguments: args } })
    }
  }
}

export class OllamaClient {
  private config: OllamaConfig

  constructor(config: OllamaConfig) {
    this.config = config
  }

  private url(path: string): string {
    return this.config.url.replace(/\/+$/, '') + path
  }

  private async parseError(res: Response): Promise<OllamaError> {
    let detail = ''
    try {
      const body = (await res.json()) as { error?: string }
      detail = body.error ?? ''
    } catch {
      /* cuerpo no JSON */
    }
    if (res.status === 404 && /model.*not found/i.test(detail)) {
      return new OllamaError(
        `El modelo «${this.config.model}» no está descargado. Ejecuta: ollama pull ${this.config.model}`
      )
    }
    if (detail) return new OllamaError(`Ollama respondió ${res.status}: ${detail}`)
    return new OllamaError(`Ollama respondió ${res.status}.`)
  }

  /** Comprueba que Ollama responde y devuelve los modelos instalados. */
  async listModels(): Promise<string[]> {
    let res: Response
    try {
      res = await fetch(this.url('/api/tags'), { signal: AbortSignal.timeout(4000) })
    } catch {
      throw new OllamaError(
        `No se pudo conectar con Ollama en ${this.config.url}. ¿Está en ejecución? (ollama serve)`
      )
    }
    if (!res.ok) throw await this.parseError(res)
    const body = (await res.json()) as { models?: { name?: string }[] }
    return (body.models ?? []).map((m) => m.name ?? '').filter(Boolean)
  }

  /**
   * Envía una conversación a `/api/chat`.
   * - Si `stream` es true, invoca `onChunk` por cada fragmento de texto y
   *   acumula los `tool_calls` a partir del flujo NDJSON.
   */
  async chat(
    messages: ChatMessage[],
    tools: OllamaTool[],
    opts: { stream: boolean; onChunk?: (text: string) => void } = { stream: false }
  ): Promise<ChatResult> {
    const payload = {
      model: this.config.model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      stream: opts.stream,
      options: {
        temperature: this.config.temperature,
        num_ctx: this.config.numCtx
      }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs)
    let res: Response
    try {
      res = await fetch(this.url('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
    } catch (e) {
      clearTimeout(timer)
      if (e instanceof Error && e.name === 'AbortError') {
        throw new OllamaError('La petición a Ollama excedió el tiempo de espera.')
      }
      throw new OllamaError(
        `No se pudo conectar con Ollama en ${this.config.url}. ¿Está en ejecución? (ollama serve)`
      )
    }

    if (!res.ok) {
      clearTimeout(timer)
      throw await this.parseError(res)
    }

    if (!opts.stream) {
      clearTimeout(timer)
      const body = (await res.json()) as {
        message?: { content?: string; tool_calls?: ToolCall[] }
      }
      const msg = body.message ?? {}
      return { content: msg.content ?? '', tool_calls: msg.tool_calls ?? [] }
    }

    // Streaming
    if (!res.body) {
      clearTimeout(timer)
      throw new OllamaError('Ollama no devolvió un cuerpo de respuesta.')
    }
    let content = ''
    const toolCalls: ToolCall[] = []
    for await (const obj of readNdjson(res.body)) {
      const msg = (obj.message ?? {}) as { content?: string; tool_calls?: unknown }
      if (typeof msg.content === 'string' && msg.content) {
        content += msg.content
        opts.onChunk?.(msg.content)
      }
      mergeToolCalls(toolCalls, msg.tool_calls)
    }
    clearTimeout(timer)
    return { content, tool_calls: toolCalls }
  }
}
