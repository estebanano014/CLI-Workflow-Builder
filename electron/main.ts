import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { randomBytes } from 'node:crypto'
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'

let pyProc: ChildProcess | null = null
let port = 0
let token = ''
let mainWindow: BrowserWindow | null = null

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
