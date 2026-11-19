import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { randomBytes } from 'node:crypto'
import { exec, spawn, type ChildProcess, type ExecException } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

let pyProc: ChildProcess | null = null
let port = 0
let token = ''
let mainWindow: BrowserWindow | null = null

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
