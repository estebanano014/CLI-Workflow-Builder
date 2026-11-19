/**
 * Registro de herramientas ("tools") del asistente.
 *
 * Cada herramienta expone un nombre, una descripción y un esquema JSON de
 * parámetros para el modelo, más una función `execute` que se ejecuta en el
 * proceso principal (donde están disponibles `child_process`, `fs` y `path`).
 *
 * Las herramientas destructivas declaran `requiresConfirmation`; el orquestador
 * pide confirmación al usuario antes de ejecutarlas.
 */
import { exec, type ExecException } from 'node:child_process'
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { isAbsolute, join, resolve, sep } from 'node:path'

export interface ToolContext {
  /** Carpeta raíz del proyecto sobre la que opera el asistente. */
  workspaceDir: string
}

export interface Tool {
  name: string
  description: string
  parameters: Record<string, unknown>
  /** Devuelve true si la acción requiere confirmación previa del usuario. */
  requiresConfirmation?: (args: Record<string, unknown>, ctx: ToolContext) => boolean
  execute: (args: Record<string, unknown>, ctx: ToolContext) => string | Promise<string>
}

const IGNORED_DIRS = new Set(['node_modules', '.git', 'out', 'dist', 'data', 'build', 'vendor', '__pycache__', '.vscode'])
const MAX_OUTPUT = 8000
const MAX_SEARCH_FILES = 2000

function truncate(text: string, max = MAX_OUTPUT): string {
  if (text.length <= max) return text
  return text.slice(0, max) + `\n… [recortado, ${text.length - max} caracteres más]`
}

interface RunResult {
  stdout: string
  stderr: string
  code: number | null
  timedOut: boolean
  error: string | null
}

function runCommand(command: string, cwd: string, timeoutMs = 60000): Promise<RunResult> {
  return new Promise((resolve) => {
    exec(
      command,
      { cwd, timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024, windowsHide: true, shell: process.env.ComSpec || 'cmd.exe' },
      (error, stdout, stderr) => {
        if (error) {
          const err = error as ExecException
          resolve({
            stdout: stdout ?? '',
            stderr: stderr ?? '',
            code: err.code ?? null,
            timedOut: err.killed === true,
            error: err.message ?? String(error)
          })
        } else {
          resolve({ stdout: stdout ?? '', stderr: stderr ?? '', code: 0, timedOut: false, error: null })
        }
      }
    )
  })
}

function formatRun(r: RunResult): string {
  const out: string[] = []
  if (r.stdout.trim()) out.push(r.stdout.trim())
  if (r.stderr.trim()) out.push(`[stderr]\n${r.stderr.trim()}`)
  if (r.timedOut) out.push('[timeout] proceso cancelado por exceder el tiempo')
  else if (r.error) out.push(`[error] ${r.error}`)
  else out.push(`[ok] código ${r.code}`)
  return truncate(out.join('\n'))
}

function git(cwd: string, args: string, timeoutMs = 30000): Promise<string> {
  return runCommand(`git ${args}`, cwd, timeoutMs).then(formatRun)
}

/** Resuelve una ruta relativa (o absoluta) confinada al directorio del proyecto. */
function safePath(workspaceDir: string, input: string): string {
  const p = isAbsolute(input) ? input : join(workspaceDir, input)
  const resolved = resolve(p)
  const root = resolve(workspaceDir)
  if (resolved !== root && !resolved.startsWith(root + sep)) {
    throw new Error(`La ruta «${input}» está fuera del proyecto.`)
  }
  return resolved
}

/** Lista nombres de una carpeta (un nivel) con indicador de tipo. */
function listDir(workspaceDir: string, relPath: string): string {
  const dir = safePath(workspaceDir, relPath || '.')
  if (!existsSync(dir)) return `La carpeta «${relPath || '.'}» no existe.`
  const entries = readdirSync(dir, { withFileTypes: true })
    .filter((e) => !IGNORED_DIRS.has(e.name))
    .sort((a, b) => (a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1))
  const lines = entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
  return lines.length ? lines.join('\n') : '(carpeta vacía)'
}

function readFile(workspaceDir: string, relPath: string, lineas?: number): string {
  const p = safePath(workspaceDir, relPath)
  if (!existsSync(p)) return `El archivo «${relPath}» no existe.`
  const stat = statSync(p)
  if (stat.isDirectory()) return `«${relPath}» es una carpeta, no un archivo.`
  const content = readFileSync(p, 'utf8')
  if (lineas && lineas > 0) {
    return content.split('\n').slice(0, lineas).join('\n')
  }
  return truncate(content)
}

function writeFile(workspaceDir: string, relPath: string, content: string): string {
  const p = safePath(workspaceDir, relPath)
  const existed = existsSync(p)
  writeFileSync(p, content, 'utf8')
  return existed ? `Se sobrescribió «${relPath}».` : `Se creó «${relPath}».`
}

function editFile(workspaceDir: string, relPath: string, buscar: string, reemplazar: string): string {
  const p = safePath(workspaceDir, relPath)
  if (!existsSync(p)) return `El archivo «${relPath}» no existe.`
  const content = readFileSync(p, 'utf8')
  if (!content.includes(buscar)) return `No se encontró el texto a reemplazar en «${relPath}».`
  const count = content.split(buscar).length - 1
  writeFileSync(p, content.split(buscar).join(reemplazar), 'utf8')
  return `Se reemplazaron ${count} ocurrencia(s) en «${relPath}».`
}

function searchFiles(workspaceDir: string, texto: string, relPath: string, tipoArchivo?: string): string {
  const start = safePath(workspaceDir, relPath || '.')
  const results: string[] = []
  const needle = texto.toLowerCase()
  let scanned = 0

  function walk(dir: string): void {
    if (scanned >= MAX_SEARCH_FILES || results.length >= 200) return
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (IGNORED_DIRS.has(e.name)) continue
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        walk(full)
        continue
      }
      if (tipoArchivo && !e.name.endsWith(tipoArchivo)) continue
      scanned++
      try {
        const content = readFileSync(full, 'utf8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length && results.length < 200; i++) {
          if (lines[i].toLowerCase().includes(needle)) {
            results.push(`${relative(workspaceDir, full)}:${i + 1}: ${lines[i].trim()}`)
          }
        }
      } catch {
        /* archivo binario o ilegible */
      }
    }
  }

  walk(start)
  if (results.length === 0) return `No se encontraron coincidencias para «${texto}».`
  return truncate(results.join('\n'))
}

function relative(from: string, to: string): string {
  return to.slice(from.length).replace(/^[\\/]/, '')
}

const PELIGROSOS = [
  /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b/,
  /\bdel\s+(\/[sqf]+\s+)+\b/,
  /\brmdir\s+\/s\b/,
  /\bformat\b/,
  /\bdiskpart\b/,
  /\bshutdown\b/,
  /\breboot\b/,
  /\bchkdsk\s+\/f\b/,
  /\bgit\s+(reset\s+--hard|clean\s+-[a-z]*f|push\s+--force|push\s+-f)\b/,
  /\bdrop\s+(table|database)\b/,
  /\bdd\s+if=/
]

function esComandoPeligroso(command: string): boolean {
  return PELIGROSOS.some((re) => re.test(command.toLowerCase()))
}

function proyectoResumen(ctx: ToolContext): Promise<string> {
  const dir = ctx.workspaceDir
  let pkg = ''
  try {
    const raw = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
      name?: string
      version?: string
      scripts?: Record<string, string>
    }
    const scripts = Object.entries(raw.scripts ?? {}).map(([k, v]) => `  ${k}: ${v}`).join('\n')
    pkg = `Aplicación: ${raw.name ?? '?'} ${raw.version ?? '?'}\nScripts:\n${scripts}`
  } catch {
    pkg = '(no se encontró package.json)'
  }
  const rama = runCommand('git branch --show-current', dir, 10000).then((r) =>
    r.code === 0 ? r.stdout.trim() || '(sin rama)' : '(no es un repo git o sin git)'
  )
  const top = listDir(dir, '.')
  return rama.then(
    (r) => `Carpeta del proyecto: ${dir}\nRama git actual: ${r}\n\n${pkg}\n\nContenido raíz:\n${top}`
  )
}

export const TOOLS: Tool[] = [
  {
    name: 'proyecto_resumen',
    description:
      'Obtiene un resumen del proyecto: carpeta raíz, rama git actual, nombre/versión, scripts npm y contenido de la carpeta raíz. Úsala al empezar para orientarte.',
    parameters: { type: 'object', properties: {}, required: [] },
    execute: (_args, ctx) => proyectoResumen(ctx)
  },
  {
    name: 'terminal_ejecutar',
    description:
      'Ejecuta un comando de terminal en el directorio del proyecto (o en una subcarpeta) y devuelve la salida. Úsala para cualquier cosa que no tenga herramienta específica.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Comando a ejecutar.' },
        cwd: { type: 'string', description: 'Subcarpeta relativa al proyecto (opcional).' }
      },
      required: ['command']
    },
    requiresConfirmation: (args) => esComandoPeligroso(String(args.command ?? '')),
    execute: async (args, ctx) => {
      const command = String(args.command ?? '').trim()
      if (!command) return 'No se indicó ningún comando.'
      const cwd = args.cwd ? safePath(ctx.workspaceDir, String(args.cwd)) : ctx.workspaceDir
      return formatRun(await runCommand(command, cwd))
    }
  },
  {
    name: 'git_estado',
    description: 'Muestra el estado del repositorio git (rama actual y cambios pendientes).',
    parameters: { type: 'object', properties: {}, required: [] },
    execute: (_args, ctx) => git(ctx.workspaceDir, 'status --short --branch')
  },
  {
    name: 'git_diff',
    description: 'Muestra las diferencias de los cambios (sin confirmar, o ya preparados si staged=true).',
    parameters: {
      type: 'object',
      properties: { staged: { type: 'boolean', description: 'true para ver el diff de lo ya preparado (staged).' } },
      required: []
    },
    execute: (args, ctx) =>
      git(ctx.workspaceDir, args.staged ? 'diff --cached' : 'diff')
  },
  {
    name: 'git_log',
    description: 'Muestra el historial de commits (más recientes primero).',
    parameters: {
      type: 'object',
      properties: { count: { type: 'number', description: 'Número de commits a mostrar (por defecto 15).' } },
      required: []
    },
    execute: (args, ctx) => git(ctx.workspaceDir, `log --oneline -${Number(args.count) || 15}`)
  },
  {
    name: 'git_ramas',
    description: 'Lista las ramas locales y marca la actual.',
    parameters: { type: 'object', properties: {}, required: [] },
    execute: (_args, ctx) => git(ctx.workspaceDir, 'branch')
  },
  {
    name: 'git_checkout',
    description: 'Cambia a una rama existente o crea una nueva (si crear=true).',
    parameters: {
      type: 'object',
      properties: {
        branch: { type: 'string', description: 'Nombre de la rama.' },
        crear: { type: 'boolean', description: 'true para crearla y cambiarte a ella.' }
      },
      required: ['branch']
    },
    execute: (args, ctx) => {
      const branch = String(args.branch ?? '').trim()
      if (!branch) return 'Falta el nombre de la rama.'
      return git(ctx.workspaceDir, args.crear ? `checkout -b ${branch}` : `checkout ${branch}`)
    }
  },
  {
    name: 'git_add',
    description: 'Prepara (stage) archivos para el commit. Sin rutas, prepara todo.',
    parameters: {
      type: 'object',
      properties: { rutas: { type: 'array', items: { type: 'string' }, description: 'Rutas a preparar (opcional).' } },
      required: []
    },
    execute: (args, ctx) => {
      const rutas = Array.isArray(args.rutas) ? (args.rutas as string[]).join(' ') : '.'
      return git(ctx.workspaceDir, `add ${rutas}`)
    }
  },
  {
    name: 'git_commit',
    description:
      'Crea un commit con el mensaje indicado (Conventional Commits recomendado). Prepara los archivos indicados en rutas (o los ya staged) y confirma.',
    parameters: {
      type: 'object',
      properties: {
        mensaje: { type: 'string', description: 'Mensaje del commit, por ejemplo «feat: ...».' },
        rutas: { type: 'array', items: { type: 'string' }, description: 'Rutas a incluir (opcional; si se omiten se usa lo ya preparado).' }
      },
      required: ['mensaje']
    },
    execute: async (args, ctx) => {
      const mensaje = String(args.mensaje ?? '').trim()
      if (!mensaje) return 'Falta el mensaje del commit.'
      if (Array.isArray(args.rutas) && args.rutas.length) {
        await runCommand(`git add ${(args.rutas as string[]).join(' ')}`, ctx.workspaceDir)
      }
      return git(ctx.workspaceDir, `commit -m "${mensaje.replace(/"/g, '\\"')}"`)
    }
  },
  {
    name: 'git_push',
    description: 'Sube los commits al remoto. Con fuerza=true hace push --force (peligroso).',
    parameters: {
      type: 'object',
      properties: {
        remoto: { type: 'string', description: 'Remoto (por defecto origin).' },
        rama: { type: 'string', description: 'Rama (por defecto la actual).' },
        fuerza: { type: 'boolean', description: 'true para forzar (--force).' }
      },
      required: []
    },
    requiresConfirmation: (args) => args.fuerza === true,
    execute: (args, ctx) => {
      const remoto = String(args.remoto ?? 'origin')
      const rama = args.rama ? String(args.rama) : ''
      const fuerza = args.fuerza ? ' --force' : ''
      return git(ctx.workspaceDir, `push ${remoto} ${rama}${fuerza}`.trim())
    }
  },
  {
    name: 'git_pull',
    description: 'Descarga y fusiona los cambios del remoto.',
    parameters: {
      type: 'object',
      properties: {
        remoto: { type: 'string', description: 'Remoto (por defecto origin).' },
        rama: { type: 'string', description: 'Rama (por defecto la actual).' }
      },
      required: []
    },
    execute: (args, ctx) => {
      const remoto = String(args.remoto ?? 'origin')
      const rama = args.rama ? String(args.rama) : ''
      return git(ctx.workspaceDir, `pull ${remoto} ${rama}`.trim())
    }
  },
  {
    name: 'git_reset',
    description: 'Deshace commits moviendo la rama (modo: soft, mixed o hard). hard es destructivo.',
    parameters: {
      type: 'object',
      properties: {
        modo: { type: 'string', enum: ['soft', 'mixed', 'hard'], description: 'Tipo de reset (por defecto mixed).' },
        ref: { type: 'string', description: 'Referencia (por ejemplo HEAD~1). Por defecto HEAD.' }
      },
      required: []
    },
    requiresConfirmation: (args) => args.modo === 'hard',
    execute: (args, ctx) => {
      const modo = String(args.modo ?? 'mixed')
      const ref = args.ref ? String(args.ref) : 'HEAD'
      return git(ctx.workspaceDir, `reset --${modo} ${ref}`)
    }
  },
  {
    name: 'git_deshacer',
    description: 'Descarta los cambios sin confirmar de los archivos indicados (git restore). Irreversible.',
    parameters: {
      type: 'object',
      properties: { rutas: { type: 'array', items: { type: 'string' }, description: 'Archivos a restaurar.' } },
      required: ['rutas']
    },
    requiresConfirmation: () => true,
    execute: (args, ctx) => {
      const rutas = (args.rutas as string[]).join(' ')
      return git(ctx.workspaceDir, `restore ${rutas}`)
    }
  },
  {
    name: 'archivo_leer',
    description: 'Lee el contenido de un archivo del proyecto (opcionalmente limitado a N primeras líneas).',
    parameters: {
      type: 'object',
      properties: {
        ruta: { type: 'string', description: 'Ruta relativa al proyecto.' },
        lineas: { type: 'number', description: 'Número máximo de líneas a leer.' }
      },
      required: ['ruta']
    },
    execute: (args, ctx) => {
      try {
        return readFile(ctx.workspaceDir, String(args.ruta), args.lineas ? Number(args.lineas) : undefined)
      } catch (e) {
        return e instanceof Error ? e.message : String(e)
      }
    }
  },
  {
    name: 'archivo_escribir',
    description: 'Crea o sobrescribe un archivo del proyecto con el contenido indicado.',
    parameters: {
      type: 'object',
      properties: {
        ruta: { type: 'string', description: 'Ruta relativa al proyecto.' },
        contenido: { type: 'string', description: 'Contenido completo del archivo.' }
      },
      required: ['ruta', 'contenido']
    },
    requiresConfirmation: (args, ctx) => {
      try {
        return existsSync(safePath(ctx.workspaceDir, String(args.ruta)))
      } catch {
        return false
      }
    },
    execute: async (args, ctx) => {
      try {
        return writeFile(ctx.workspaceDir, String(args.ruta), String(args.contenido ?? ''))
      } catch (e) {
        return e instanceof Error ? e.message : String(e)
      }
    }
  },
  {
    name: 'archivo_editar',
    description:
      'Reemplaza todas las ocurrencias de un texto dentro de un archivo (edición dirigida). Útil para refactorizar.',
    parameters: {
      type: 'object',
      properties: {
        ruta: { type: 'string', description: 'Ruta relativa al proyecto.' },
        buscar: { type: 'string', description: 'Texto exacto a buscar.' },
        reemplazar: { type: 'string', description: 'Texto con el que reemplazar.' }
      },
      required: ['ruta', 'buscar', 'reemplazar']
    },
    execute: async (args, ctx) => {
      try {
        return editFile(ctx.workspaceDir, String(args.ruta), String(args.buscar), String(args.reemplazar))
      } catch (e) {
        return e instanceof Error ? e.message : String(e)
      }
    }
  },
  {
    name: 'archivos_listar',
    description: 'Lista el contenido de una carpeta del proyecto (un nivel).',
    parameters: {
      type: 'object',
      properties: { ruta: { type: 'string', description: 'Subcarpeta relativa al proyecto (por defecto la raíz).' } },
      required: []
    },
    execute: (args, ctx) => {
      try {
        return listDir(ctx.workspaceDir, String(args.ruta ?? '.'))
      } catch (e) {
        return e instanceof Error ? e.message : String(e)
      }
    }
  },
  {
    name: 'archivos_buscar',
    description: 'Busca texto dentro de los archivos del proyecto (ignora node_modules, .git, out, dist, etc.).',
    parameters: {
      type: 'object',
      properties: {
        texto: { type: 'string', description: 'Texto a buscar (sin distinguir mayúsculas).' },
        ruta: { type: 'string', description: 'Subcarpeta donde buscar (por defecto todo el proyecto).' },
        tipoArchivo: { type: 'string', description: 'Extensión a filtrar, por ejemplo «.ts» (opcional).' }
      },
      required: ['texto']
    },
    execute: (args, ctx) => {
      try {
        return searchFiles(ctx.workspaceDir, String(args.texto), String(args.ruta ?? '.'), args.tipoArchivo ? String(args.tipoArchivo) : undefined)
      } catch (e) {
        return e instanceof Error ? e.message : String(e)
      }
    }
  },
  {
    name: 'tests_ejecutar',
    description: 'Ejecuta los tests del proyecto (Python, TypeScript/typecheck, o ambos).',
    parameters: {
      type: 'object',
      properties: {
        alcance: { type: 'string', enum: ['python', 'frontend', 'todo'], description: 'Qué tests ejecutar (por defecto todo).' }
      },
      required: []
    },
    execute: async (args, ctx) => {
      const alcance = String(args.alcance ?? 'todo')
      const partes: string[] = []
      if (alcance === 'python' || alcance === 'todo') {
        partes.push('--- Python (unittest) ---')
        partes.push(await runCommand('py -m unittest discover -s python-core/tests -t python-core', ctx.workspaceDir, 120000).then(formatRun))
      }
      if (alcance === 'frontend' || alcance === 'todo') {
        partes.push('--- Frontend (typecheck) ---')
        partes.push(await runCommand('npm run typecheck', ctx.workspaceDir, 120000).then(formatRun))
      }
      return truncate(partes.join('\n'))
    }
  }
]

export function getTool(name: string): Tool | undefined {
  return TOOLS.find((t) => t.name === name)
}
