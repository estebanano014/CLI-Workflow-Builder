/**
 * Orquestador del asistente: mantiene la conversación y ejecuta el bucle de
 * tool-calling contra Ollama.
 *
 * Flujo por mensaje del usuario:
 *   1. Envía la conversación a Ollama con las herramientas y `stream: true`.
 *   2. Si la respuesta trae `tool_calls`, ejecuta cada herramienta (pidiendo
 *      confirmación cuando corresponde), añade el resultado como mensaje
 *      `role: "tool"` y repite.
 *   3. Si no hay más `tool_calls`, la respuesta es el texto final (ya enviado
 *      por streaming).
 */
import {
  OllamaClient,
  type ChatMessage,
  type OllamaTool,
  type ToolCall
} from './ollama'
import { getTool, TOOLS, type ToolContext } from './tools'

export interface AssistantEvents {
  onChunk: (text: string) => void
  onToolStart: (tool: string) => void
  onToolEnd: (tool: string) => void
}

export interface ConfirmRequest {
  tool: string
  title: string
  message: string
}

export type ConfirmFn = (req: ConfirmRequest) => Promise<boolean>

export type LogFn = (entry: { tool: string; args: unknown; result: string; confirmed?: boolean }) => void

const MAX_ITERATIONS = 10

export class Assistant {
  private client: OllamaClient
  private systemPrompt: string
  private tools: OllamaTool[]
  private messages: ChatMessage[]
  private log: LogFn

  constructor(client: OllamaClient, systemPrompt: string, log: LogFn) {
    this.client = client
    this.systemPrompt = systemPrompt
    this.log = log
    this.tools = TOOLS.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters }
    }))
    this.messages = [{ role: 'system', content: systemPrompt }]
  }

  reset(): void {
    this.messages = [{ role: 'system', content: this.systemPrompt }]
  }

  /** Devuelve una copia de los mensajes (sin el `system`) para persistirlos. */
  snapshot(): ChatMessage[] {
    return this.messages.slice(1).map((m) => JSON.parse(JSON.stringify(m)) as ChatMessage)
  }

  /** Restaura una conversación a partir de mensajes persistidos (sin `system`). */
  restore(saved: ChatMessage[]): void {
    this.messages = [{ role: 'system', content: this.systemPrompt }, ...saved]
  }

  async chat(
    userText: string,
    workspaceDir: string,
    events: AssistantEvents,
    confirmFn: ConfirmFn
  ): Promise<string> {
    this.messages.push({ role: 'user', content: userText })

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const res = await this.client.chat(this.messages, this.tools, {
        stream: true,
        onChunk: events.onChunk
      })

      const toolCalls: ToolCall[] = res.tool_calls
      if (toolCalls.length === 0) {
        return res.content
      }

      // Registrar el mensaje del asistente con sus tool_calls antes de responder.
      this.messages.push({ role: 'assistant', content: res.content, tool_calls: toolCalls })

      for (const call of toolCalls) {
        const toolName = call.function.name
        const args = call.function.arguments ?? {}
        events.onToolStart(toolName)

        const tool = getTool(toolName)
        let result: string

        if (!tool) {
          result = `Error: la herramienta «${toolName}» no existe.`
        } else {
          const ctx: ToolContext = { workspaceDir }
          try {
            const necesitaConfirmacion = tool.requiresConfirmation?.(args, ctx) ?? false
            if (necesitaConfirmacion) {
              const ok = await confirmFn({
                tool: toolName,
                title: `Confirmar acción de la IA`,
                message: `La IA quiere ejecutar «${toolName}».\nParámetros: ${JSON.stringify(args)}`
              })
              if (!ok) {
                result = 'El usuario canceló esta acción.'
              } else {
                result = await tool.execute(args, ctx)
                this.log({ tool: toolName, args, result, confirmed: true })
              }
            } else {
              result = await tool.execute(args, ctx)
              this.log({ tool: toolName, args, result })
            }
          } catch (e) {
            result = `Error: ${e instanceof Error ? e.message : String(e)}`
            this.log({ tool: toolName, args, result })
          }
        }

        events.onToolEnd(toolName)
        this.messages.push({ role: 'tool', content: result, tool_name: toolName })
      }
    }

    return 'Se alcanzó el límite de iteraciones de herramientas sin una respuesta final.'
  }
}
