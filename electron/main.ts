import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { randomBytes } from 'node:crypto'
import { exec, spawn, type ChildProcess, type ExecException } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { OllamaClient, OllamaError } from './ollama'
import { Assistant, type ConfirmFn } from './assistant'

let pyProc: ChildProcess | null = null
let port = 0
let token = ''
let mainWindow: BrowserWindow | null = null

// ---------------------------------------------------------------------------
// Asistente de IA local (Ollama)
// ---------------------------------------------------------------------------

interface AssistantConfig {
  ollamaUrl: string
  model: string
  temperature: number
  numCtx: number
  workspaceDir: string
  systemPrompt: string
}

const DEFAULT_SYSTEM_PROMPT = [
  'Eres un asistente de IA local integrado en "CLI Workflow Builder", una aplicación de escritorio offline para Windows que gestiona flujos de comandos de consola.',
  '',
  'Reglas:',
  '- Responde siempre en español.',
  '- Usa las herramientas disponibles para ejecutar acciones reales: comandos de terminal, operaciones de git, lectura/edición de archivos y tests del proyecto.',
  '- Cuando el usuario pida "haz los commits", primero revisa git_estado y git_diff, agrupa los cambios en commits lógicos, escribe mensajes claros en Conventional Commits (feat:, fix:, docs:, chore:, refactor:, test:, style:) y ejecútalos con git_add / git_commit.',
  '- Sé prudente con acciones destructivas o irreversibles (reset --hard, push --force, borrar ramas, descartar cambios, sobrescribir archivos): el sistema pedirá confirmación automáticamente.',
  '- Explica brevemente qué vas a hacer antes de ejecutar herramientas cuando sea relevante.',
  '- Si una herramienta devuelve un error, léelo e intenta corregir el comando o la petición.'
].join('\n')

let assistantConfig: AssistantConfig | null = null
let ollamaClient: OllamaClient | null = null
let assistant: Assistant | null = null
let assistantBusy = false
const pendingConfirms = new Map<string, (ok: boolean) => void>()

function configPath(): string {
  return join(dataDir(), 'cliwf-ia-config.json')
}

function logPath(): string {
  return join(dataDir(), 'cliwf-ia.log')
}

function defaultConfig(): AssistantConfig {
  return {
    ollamaUrl: process.env.CLI_WF_OLLAMA_URL || 'http://localhost:11434',
    model: process.env.CLI_WF_OLLAMA_MODEL || 'qwen2.5:7b',
    temperature: 0.7,
    numCtx: 8192,
    workspaceDir: app.getAppPath(),
    systemPrompt: DEFAULT_SYSTEM_PROMPT
  }
}

function loadConfig(): AssistantConfig {
  const def = defaultConfig()
  try {
    const raw = JSON.parse(readFileSync(configPath(), 'utf8')) as Partial<AssistantConfig>
    return { ...def, ...raw }
  } catch {
    return def
  }
}

function saveConfig(cfg: AssistantConfig): void {
  mkdirSync(dataDir(), { recursive: true })
  writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf8')
}

function logAction(entry: { tool: string; args: unknown; result: string; confirmed?: boolean }): void {
  try {
    mkdirSync(dataDir(), { recursive: true })
    appendFileSync(logPath(), `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`, 'utf8')
  } catch {
    /* el log no debe romper el flujo */
  }
}

function rebuildAssistant(): void {
  assistantConfig = loadConfig()
  ollamaClient = new OllamaClient({
    url: assistantConfig.ollamaUrl,
    model: assistantConfig.model,
    temperature: assistantConfig.temperature,
    numCtx: assistantConfig.numCtx,
    timeoutMs: 120000
  })
  assistant = new Assistant(ollamaClient, assistantConfig.systemPrompt, logAction)
}

function sanitizeConfig(patch: unknown): Partial<AssistantConfig> {
  const out: Partial<AssistantConfig> = {}
  if (!patch || typeof patch !== 'object') return out
  const p = patch as Record<string, unknown>
  if (typeof p.ollamaUrl === 'string' && p.ollamaUrl.trim()) out.ollamaUrl = p.ollamaUrl.trim()
  if (typeof p.model === 'string' && p.model.trim()) out.model = p.model.trim()
  if (typeof p.temperature === 'number') out.temperature = Math.min(2, Math.max(0, p.temperature))
  if (typeof p.numCtx === 'number') out.numCtx = Math.min(131072, Math.max(512, Math.round(p.numCtx)))
  if (typeof p.workspaceDir === 'string' && p.workspaceDir.trim()) out.workspaceDir = p.workspaceDir.trim()
  return out
}

// Enlace profundo: cliwf://... abre (o enfoca) la app instalada.
const PROTOCOL = 'cliwf'

function enfocarVentana(): void {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      const p = typeof addr === 'object' && addr ? addr.port : 0
      srv.close(() => resolve(p))
    })
  })
}

function pythonCommand(): string {
  const override = process.env.CLI_WF_PYTHON
  if (override) return override
  if (app.isPackaged) {
    const embedded = join(process.resourcesPath, 'python', 'python.exe')
    if (existsSync(embedded)) return embedded
  }
  // En desarrollo, en Windows se prefiere el launcher `py` para evitar el alias de Microsoft Store.
  return process.platform === 'win32' ? 'py' : 'python3'
}

function coreDir(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'python-core')
    : join(app.getAppPath(), 'python-core')
}

function dataDir(): string {
  return app.isPackaged ? app.getPath('userData') : join(app.getAppPath(), 'data')
}

function startPython(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    token = randomBytes(32).toString('hex')
    port = await findFreePort()
    const dir = coreDir()

    pyProc = spawn(pythonCommand(), ['-m', 'app.main'], {
      cwd: dir,
      env: {
        ...process.env,
        CLI_WF_TOKEN: token,
        CLI_WF_PORT: String(port),
        CLI_WF_DATA_DIR: dataDir()
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    })

    let settled = false
    const done = (err?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (err) reject(err)
      else resolve()
    }
    const timer = setTimeout(() => done(new Error('Tiempo de espera al iniciar el núcleo Python')), 15000)

    pyProc.stdout?.on('data', (d: Buffer) => {
      const line = d.toString()
      process.stdout.write(`[python] ${line}`)
      if (line.includes('CLI_WF_READY')) done()
    })
    pyProc.stderr?.on('data', (d: Buffer) => process.stderr.write(`[python:err] ${d.toString()}`))
    pyProc.on('error', (err) => done(err))
    pyProc.on('exit', (code) => {
      pyProc = null
      if (!settled) done(new Error(`El núcleo Python terminó con código ${code}`))
    })
  })
}

function stopPython(): void {
  if (pyProc && !pyProc.killed) {
    try {
      pyProc.kill()
    } catch {
      /* ignorar */
    }
    pyProc = null
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#111827',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

ipcMain.handle('cliWF:connection', () => ({ port, token }))

interface ResultadoEjecucion {
  stdout: string
  stderr: string
  code: number | null
  timedOut: boolean
  error: string | null
}

interface EjecutarArgs {
  comando: string
  cwd?: string
  timeoutMs?: number
}

function resultadoVacio(error: string): ResultadoEjecucion {
  return { stdout: '', stderr: '', code: null, timedOut: false, error }
}

// Terminal integrado (Fase 5): ejecuta un comando real en una shell del sistema.
ipcMain.handle('cliWF:ejecutar', async (_e, args: EjecutarArgs | undefined): Promise<ResultadoEjecucion> => {
  const comando = typeof args?.comando === 'string' ? args.comando : ''
  if (!comando.trim()) return resultadoVacio('Comando vacío')
  if (comando.length > 20000) return resultadoVacio('Comando demasiado largo')

  let cwd = typeof args?.cwd === 'string' && args.cwd.trim() ? args.cwd.trim() : homedir()
  if (cwd.includes('\0')) return resultadoVacio('Directorio de trabajo no válido')

  const timeoutMs =
    typeof args?.timeoutMs === 'number' ? Math.min(Math.max(args.timeoutMs, 1000), 120000) : 30000
  const shellPath = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : '/bin/sh'

  return new Promise<ResultadoEjecucion>((resolve) => {
    exec(
      comando,
      { cwd, timeout: timeoutMs, shell: shellPath, maxBuffer: 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          const err = error as ExecException
          const timedOut = err.killed === true || err.signal != null
          resolve({
            stdout: stdout ?? '',
            stderr: stderr ?? '',
            code: err.code ?? null,
            timedOut,
            error: err.message ?? String(error)
          })
        } else {
          resolve({ stdout: stdout ?? '', stderr: stderr ?? '', code: 0, timedOut: false, error: null })
        }
      }
    )
  })
})

ipcMain.handle('cliWF:homeDir', () => homedir())

// ---- Asistente de IA (Ollama) ----
ipcMain.handle('cliWF:assistant-get-config', () => assistantConfig ?? loadConfig())

ipcMain.handle('cliWF:assistant-set-config', (_e, patch: unknown) => {
  assistantConfig = { ...(assistantConfig ?? loadConfig()), ...sanitizeConfig(patch) }
  saveConfig(assistantConfig)
  rebuildAssistant()
  return assistantConfig
})

ipcMain.handle('cliWF:assistant-models', async () => {
  if (!ollamaClient) rebuildAssistant()
  return await ollamaClient!.listModels()
})

ipcMain.handle('cliWF:assistant-health', async () => {
  if (!ollamaClient) rebuildAssistant()
  try {
    const models = await ollamaClient!.listModels()
    return { online: true, models }
  } catch (e) {
    return { online: false, error: e instanceof Error ? e.message : String(e) }
  }
})

ipcMain.handle('cliWF:assistant-reset', () => {
  assistant?.reset()
  return { ok: true }
})

ipcMain.handle('cliWF:assistant-confirm', (_e, payload: { id?: string; ok?: boolean } | undefined) => {
  const id = payload?.id
  if (id) {
    const resolve = pendingConfirms.get(id)
    if (resolve) {
      pendingConfirms.delete(id)
      resolve(payload?.ok === true)
    }
  }
  return { ok: true }
})

ipcMain.handle('cliWF:assistant-chat', async (event, message: unknown) => {
  if (!ollamaClient || !assistant) rebuildAssistant()
  const text = typeof message === 'string' ? message : ''
  if (!text.trim()) return { ok: false, error: 'Mensaje vacío.' }
  if (assistantBusy) return { ok: false, error: 'El asistente ya está procesando otra petición.' }
  assistantBusy = true
  const cfg = assistantConfig as AssistantConfig
  try {
    const confirmFn: ConfirmFn = (req) =>
      new Promise<boolean>((resolveFn) => {
        const id = randomBytes(16).toString('hex')
        pendingConfirms.set(id, resolveFn)
        event.sender.send('ollama:confirm', {
          id,
          tool: req.tool,
          title: req.title,
          message: req.message
        })
      })
    const finalText = await assistant!.chat(
      text,
      cfg.workspaceDir,
      {
        onChunk: (chunk) => event.sender.send('ollama:chunk', { text: chunk }),
        onToolStart: (tool) => event.sender.send('ollama:status', { type: 'tool-start', tool }),
        onToolEnd: (tool) => event.sender.send('ollama:status', { type: 'tool-end', tool })
      },
      confirmFn
    )
    event.sender.send('ollama:done', { text: finalText })
    return { ok: true, text: finalText }
  } catch (e) {
    const errMsg = e instanceof OllamaError || e instanceof Error ? e.message : String(e)
    event.sender.send('ollama:error', { message: errMsg })
    return { ok: false, error: errMsg }
  } finally {
    assistantBusy = false
  }
})

// Registrar el protocolo cliwf:// para que un enlace abra la app instalada.
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL)
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  // Si la app ya está abierta y se pulsa el enlace cliwf://, se enfoca la ventana existente.
  app.on('second-instance', () => {
    enfocarVentana()
  })

  app.whenReady().then(async () => {
    try {
      await startPython()
    } catch (err) {
      console.error('No se pudo iniciar el núcleo Python:', err)
    }
    rebuildAssistant()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('before-quit', () => {
    stopPython()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
