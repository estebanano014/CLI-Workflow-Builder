export type CatalogoSO = 'windows' | 'macos' | 'linux'

export interface ComandoCatalogado {
  id: string
  /** Acción buscable, en lenguaje humano. */
  accion: string
  /** Descripción breve del comando. */
  descripcion: string
  /** Categoría a la que pertenece. */
  categoria: string
  /** Palabras clave extra para el buscador (opcional). */
  etiquetas?: string[]
  /** true cuando el comando es idéntico en Windows, macOS y Linux. */
  sameInAllOS: boolean
  /** Comando único cuando sameInAllOS es true. */
  comando?: string
  /** Variante de Windows (CMD y, si difiere, PowerShell). */
  windows?: { cmd: string; powershell?: string }
  macos?: string
  linux?: string
}

export const CATEGORIAS = [
  'Git y GitHub',
  'Navegación de archivos',
  'Gestión de archivos',
  'Permisos y usuarios',
  'Red',
  'Procesos',
  'Instalación de paquetes',
  'Búsqueda',
  'Variables de entorno',
  'Redirecciones y pipes'
] as const

export const COMANDOS: ComandoCatalogado[] = [
  // ============================ Git y GitHub ============================
  { id: 'git-init', accion: 'Inicializar un repositorio Git', descripcion: 'Crea un repositorio Git en el directorio actual.', categoria: 'Git y GitHub', sameInAllOS: true, comando: 'git init', etiquetas: ['git', 'repo', 'repositorio'] },
  { id: 'git-add', accion: 'Preparar cambios para el commit', descripcion: 'Añade los cambios al área de preparación (staging).', categoria: 'Git y GitHub', sameInAllOS: true, comando: 'git add .', etiquetas: ['git', 'stage', 'preparar'] },
  { id: 'git-commit', accion: 'Confirmar los cambios', descripcion: 'Guarda los cambios preparados en el historial con un mensaje.', categoria: 'Git y GitHub', sameInAllOS: true, comando: 'git commit -m "mensaje"', etiquetas: ['git', 'confirmar'] },
  { id: 'git-push', accion: 'Subir cambios al repositorio remoto', descripcion: 'Envía los commits locales a la rama remota.', categoria: 'Git y GitHub', sameInAllOS: true, comando: 'git push', etiquetas: ['git', 'subir', 'remote'] },
  { id: 'git-push-all', accion: 'Subir cambios al repositorio de GitHub', descripcion: 'Añade, confirma y sube los cambios en un solo paso.', categoria: 'Git y GitHub', sameInAllOS: true, comando: 'git add . && git commit -m "mensaje" && git push', etiquetas: ['git', 'github', 'subir', 'push'] },
  { id: 'git-pull', accion: 'Descargar cambios del repositorio remoto', descripcion: 'Trae y fusiona los cambios de la rama remota.', categoria: 'Git y GitHub', sameInAllOS: true, comando: 'git pull', etiquetas: ['git', 'descargar', 'pull'] },
  { id: 'git-clone', accion: 'Clonar un repositorio remoto', descripcion: 'Copia un repositorio remoto a tu máquina.', categoria: 'Git y GitHub', sameInAllOS: true, comando: 'git clone <url>', etiquetas: ['git', 'clonar', 'descargar'] },
  { id: 'git-branch', accion: 'Listar las ramas', descripcion: 'Muestra las ramas locales del repositorio.', categoria: 'Git y GitHub', sameInAllOS: true, comando: 'git branch', etiquetas: ['git', 'rama'] },
  { id: 'git-checkout', accion: 'Cambiar de rama', descripcion: 'Cambia a una rama existente.', categoria: 'Git y GitHub', sameInAllOS: true, comando: 'git checkout <rama>', etiquetas: ['git', 'rama', 'cambiar'] },
  { id: 'git-merge', accion: 'Fusionar una rama', descripcion: 'Integra los cambios de una rama en la rama actual.', categoria: 'Git y GitHub', sameInAllOS: true, comando: 'git merge <rama>', etiquetas: ['git', 'fusionar'] },
  { id: 'git-status', accion: 'Ver el estado del repositorio', descripcion: 'Muestra los cambios pendientes y archivos modificados.', categoria: 'Git y GitHub', sameInAllOS: true, comando: 'git status', etiquetas: ['git', 'estado'] },
  { id: 'git-log', accion: 'Ver el historial de commits', descripcion: 'Muestra el historial de confirmaciones en una línea.', categoria: 'Git y GitHub', sameInAllOS: true, comando: 'git log --oneline', etiquetas: ['git', 'historial', 'log'] },

  // ====================== Navegación de archivos ======================
  { id: 'nav-cd', accion: 'Cambiar de directorio', descripcion: 'Se mueve a la carpeta indicada.', categoria: 'Navegación de archivos', sameInAllOS: true, comando: 'cd <ruta>', etiquetas: ['cd', 'directorio', 'carpeta'] },
  { id: 'nav-listar', accion: 'Listar el contenido de un directorio', descripcion: 'Muestra los archivos y carpetas del directorio actual.', categoria: 'Navegación de archivos', sameInAllOS: false, windows: { cmd: 'dir', powershell: 'Get-ChildItem' }, macos: 'ls', linux: 'ls', etiquetas: ['ls', 'dir', 'listar'] },
  { id: 'nav-pwd', accion: 'Mostrar la ruta actual', descripcion: 'Imprime la ruta del directorio de trabajo.', categoria: 'Navegación de archivos', sameInAllOS: false, windows: { cmd: 'cd', powershell: 'Get-Location' }, macos: 'pwd', linux: 'pwd', etiquetas: ['pwd', 'ruta', 'donde estoy'] },
  { id: 'nav-mkdir', accion: 'Crear un directorio', descripcion: 'Crea una carpeta nueva.', categoria: 'Navegación de archivos', sameInAllOS: true, comando: 'mkdir <nombre>', etiquetas: ['mkdir', 'carpeta', 'crear'] },
  { id: 'nav-rm-archivo', accion: 'Eliminar un archivo', descripcion: 'Borra un archivo de forma permanente.', categoria: 'Navegación de archivos', sameInAllOS: false, windows: { cmd: 'del <archivo>', powershell: 'Remove-Item <archivo>' }, macos: 'rm <archivo>', linux: 'rm <archivo>', etiquetas: ['rm', 'del', 'borrar', 'eliminar'] },
  { id: 'nav-rm-dir', accion: 'Eliminar un directorio', descripcion: 'Borra una carpeta y su contenido.', categoria: 'Navegación de archivos', sameInAllOS: false, windows: { cmd: 'rmdir /s <carpeta>', powershell: 'Remove-Item -Recurse <carpeta>' }, macos: 'rm -r <carpeta>', linux: 'rm -r <carpeta>', etiquetas: ['rmdir', 'borrar', 'carpeta'] },
  { id: 'nav-cp', accion: 'Copiar un archivo o carpeta', descripcion: 'Duplica un archivo o carpeta en otra ubicación.', categoria: 'Navegación de archivos', sameInAllOS: false, windows: { cmd: 'copy <origen> <destino>', powershell: 'Copy-Item <origen> <destino>' }, macos: 'cp -r <origen> <destino>', linux: 'cp -r <origen> <destino>', etiquetas: ['cp', 'copy', 'copiar'] },
  { id: 'nav-mv', accion: 'Mover o renombrar un archivo', descripcion: 'Desplaza un archivo o le cambia el nombre.', categoria: 'Navegación de archivos', sameInAllOS: false, windows: { cmd: 'move <origen> <destino>', powershell: 'Move-Item <origen> <destino>' }, macos: 'mv <origen> <destino>', linux: 'mv <origen> <destino>', etiquetas: ['mv', 'move', 'renombrar'] },

  // ======================== Gestión de archivos ========================
  { id: 'gest-ver', accion: 'Ver el contenido de un archivo', descripcion: 'Muestra el contenido de un archivo de texto.', categoria: 'Gestión de archivos', sameInAllOS: false, windows: { cmd: 'type <archivo>', powershell: 'Get-Content <archivo>' }, macos: 'cat <archivo>', linux: 'cat <archivo>', etiquetas: ['cat', 'type', 'ver'] },
  { id: 'gest-crear', accion: 'Crear un archivo vacío', descripcion: 'Crea un archivo nuevo sin contenido.', categoria: 'Gestión de archivos', sameInAllOS: false, windows: { cmd: 'type nul > <archivo>', powershell: 'New-Item <archivo>' }, macos: 'touch <archivo>', linux: 'touch <archivo>', etiquetas: ['touch', 'crear', 'archivo'] },
  { id: 'gest-editar', accion: 'Editar un archivo en un editor', descripcion: 'Abre un archivo en un editor de texto.', categoria: 'Gestión de archivos', sameInAllOS: false, windows: { cmd: 'notepad <archivo>', powershell: 'notepad <archivo>' }, macos: 'nano <archivo>', linux: 'nano <archivo>', etiquetas: ['nano', 'vim', 'notepad', 'editar'] },
  { id: 'gest-echo', accion: 'Imprimir texto en pantalla', descripcion: 'Muestra un mensaje en la consola.', categoria: 'Gestión de archivos', sameInAllOS: true, comando: 'echo <texto>', etiquetas: ['echo', 'imprimir', 'texto'] },

  // ======================= Permisos y usuarios =======================
  { id: 'perm-chmod', accion: 'Cambiar permisos de un archivo', descripcion: 'Hace ejecutable un archivo o ajusta sus permisos.', categoria: 'Permisos y usuarios', sameInAllOS: false, windows: { cmd: 'icacls <archivo> /grant Users:F' }, macos: 'chmod +x <archivo>', linux: 'chmod +x <archivo>', etiquetas: ['chmod', 'permisos'] },
  { id: 'perm-chown', accion: 'Cambiar el propietario de un archivo', descripcion: 'Transfiere la propiedad de un archivo.', categoria: 'Permisos y usuarios', sameInAllOS: false, windows: { cmd: 'takeown /f <archivo>' }, macos: 'chown <usuario> <archivo>', linux: 'chown <usuario> <archivo>', etiquetas: ['chown', 'propietario'] },
  { id: 'perm-sudo', accion: 'Ejecutar un comando como administrador', descripcion: 'Ejecuta un comando con privilegios elevados.', categoria: 'Permisos y usuarios', sameInAllOS: false, windows: { cmd: 'runas /user:Administrator <comando>', powershell: 'Start-Process <comando> -Verb RunAs' }, macos: 'sudo <comando>', linux: 'sudo <comando>', etiquetas: ['sudo', 'admin', 'root'] },
  { id: 'perm-whoami', accion: 'Ver el usuario actual', descripcion: 'Muestra el nombre del usuario conectado.', categoria: 'Permisos y usuarios', sameInAllOS: true, comando: 'whoami', etiquetas: ['whoami', 'usuario'] },

  // ================================ Red ================================
  { id: 'red-ping', accion: 'Comprobar conectividad con un host', descripcion: 'Envía paquetes para verificar si un host responde.', categoria: 'Red', sameInAllOS: true, comando: 'ping <host>', etiquetas: ['ping', 'conexion', 'red'] },
  { id: 'red-ip', accion: 'Ver la configuración de red (IP)', descripcion: 'Muestra la dirección IP y configuración de red.', categoria: 'Red', sameInAllOS: false, windows: { cmd: 'ipconfig' }, macos: 'ifconfig', linux: 'ifconfig', etiquetas: ['ip', 'ipconfig', 'ifconfig'] },
  { id: 'red-curl', accion: 'Hacer una petición HTTP', descripcion: 'Realiza una petición a una URL.', categoria: 'Red', sameInAllOS: true, comando: 'curl <url>', etiquetas: ['curl', 'http', 'peticion'] },
  { id: 'red-wget', accion: 'Descargar un archivo', descripcion: 'Descarga un archivo desde una URL.', categoria: 'Red', sameInAllOS: false, windows: { cmd: 'curl -o <archivo> <url>', powershell: 'Invoke-WebRequest <url> -OutFile <archivo>' }, macos: 'wget <url>', linux: 'wget <url>', etiquetas: ['wget', 'descargar', 'download'] },
  { id: 'red-netstat', accion: 'Ver conexiones de red activas', descripcion: 'Lista las conexiones y puertos en uso.', categoria: 'Red', sameInAllOS: false, windows: { cmd: 'netstat -ano' }, macos: 'netstat -an', linux: 'netstat -an', etiquetas: ['netstat', 'puertos', 'conexiones'] },

  // ============================= Procesos =============================
  { id: 'proc-ps', accion: 'Listar los procesos en ejecución', descripcion: 'Muestra la lista de procesos activos.', categoria: 'Procesos', sameInAllOS: false, windows: { cmd: 'tasklist', powershell: 'Get-Process' }, macos: 'ps aux', linux: 'ps aux', etiquetas: ['ps', 'tasklist', 'procesos'] },
  { id: 'proc-top', accion: 'Ver procesos en tiempo real', descripcion: 'Abre un monitor de uso de recursos.', categoria: 'Procesos', sameInAllOS: false, windows: { cmd: 'taskmgr', powershell: 'Get-Process' }, macos: 'top', linux: 'top', etiquetas: ['top', 'htop', 'monitor'] },
  { id: 'proc-kill', accion: 'Terminar un proceso', descripcion: 'Fuerza el cierre de un proceso por su identificador.', categoria: 'Procesos', sameInAllOS: false, windows: { cmd: 'taskkill /PID <pid> /F' }, macos: 'kill <pid>', linux: 'kill <pid>', etiquetas: ['kill', 'taskkill', 'cerrar'] },

  // ===================== Instalación de paquetes =====================
  { id: 'pkg-winget', accion: 'Instalar un paquete (Windows)', descripcion: 'Instala software con el gestor de paquetes de Windows.', categoria: 'Instalación de paquetes', sameInAllOS: false, windows: { cmd: 'winget install <paquete>' }, etiquetas: ['winget', 'instalar', 'windows'] },
  { id: 'pkg-choco', accion: 'Instalar un paquete (Windows)', descripcion: 'Instala software con Chocolatey.', categoria: 'Instalación de paquetes', sameInAllOS: false, windows: { cmd: 'choco install <paquete>' }, etiquetas: ['choco', 'chocolatey', 'instalar'] },
  { id: 'pkg-brew', accion: 'Instalar un paquete (macOS)', descripcion: 'Instala software con Homebrew.', categoria: 'Instalación de paquetes', sameInAllOS: false, macos: 'brew install <paquete>', etiquetas: ['brew', 'homebrew', 'instalar'] },
  { id: 'pkg-apt', accion: 'Instalar un paquete (Debian/Ubuntu)', descripcion: 'Instala software con APT.', categoria: 'Instalación de paquetes', sameInAllOS: false, linux: 'sudo apt install <paquete>', etiquetas: ['apt', 'debian', 'ubuntu', 'instalar'] },
  { id: 'pkg-yum', accion: 'Instalar un paquete (RHEL/CentOS)', descripcion: 'Instala software con YUM.', categoria: 'Instalación de paquetes', sameInAllOS: false, linux: 'sudo yum install <paquete>', etiquetas: ['yum', 'rhel', 'centos', 'instalar'] },

  // ============================= Búsqueda =============================
  { id: 'busq-grep', accion: 'Buscar texto en archivos', descripcion: 'Busca una cadena de texto dentro de archivos.', categoria: 'Búsqueda', sameInAllOS: false, windows: { cmd: 'findstr /s "<texto>" *', powershell: 'Select-String "<texto>" *' }, macos: 'grep -r "<texto>" <dir>', linux: 'grep -r "<texto>" <dir>', etiquetas: ['grep', 'findstr', 'buscar'] },
  { id: 'busq-find', accion: 'Buscar archivos por nombre', descripcion: 'Encuentra archivos que coinciden con un patrón.', categoria: 'Búsqueda', sameInAllOS: false, windows: { cmd: 'dir /s <archivo>', powershell: 'Get-ChildItem -Recurse -Filter <patron>' }, macos: 'find <dir> -name "<patron>"', linux: 'find <dir> -name "<patron>"', etiquetas: ['find', 'buscar', 'archivos'] },
  { id: 'busq-which', accion: 'Ubicar un ejecutable en el PATH', descripcion: 'Muestra la ruta de un programa instalado.', categoria: 'Búsqueda', sameInAllOS: false, windows: { cmd: 'where <programa>', powershell: 'Get-Command <programa>' }, macos: 'which <programa>', linux: 'which <programa>', etiquetas: ['which', 'where', 'path'] },

  // ===================== Variables de entorno =====================
  { id: 'env-export', accion: 'Definir una variable de entorno', descripcion: 'Crea una variable de entorno en la sesión actual.', categoria: 'Variables de entorno', sameInAllOS: false, windows: { cmd: 'set NOMBRE=valor', powershell: '$env:NOMBRE = "valor"' }, macos: 'export NOMBRE=valor', linux: 'export NOMBRE=valor', etiquetas: ['export', 'set', 'variable', 'env'] },
  { id: 'env-mostrar', accion: 'Mostrar las variables de entorno', descripcion: 'Lista todas las variables de entorno definidas.', categoria: 'Variables de entorno', sameInAllOS: false, windows: { cmd: 'set', powershell: 'Get-ChildItem Env:' }, macos: 'env', linux: 'env', etiquetas: ['env', 'printenv', 'variables'] },

  // ==================== Redirecciones y pipes ====================
  { id: 'redir-overwrite', accion: 'Redirigir la salida a un archivo (sobrescribir)', descripcion: 'Guarda la salida de un comando en un archivo.', categoria: 'Redirecciones y pipes', sameInAllOS: true, comando: '<comando> > <archivo>', etiquetas: ['>', 'redireccion', 'salida'] },
  { id: 'redir-append', accion: 'Añadir la salida a un archivo', descripcion: 'Agrega la salida al final de un archivo existente.', categoria: 'Redirecciones y pipes', sameInAllOS: true, comando: '<comando> >> <archivo>', etiquetas: ['>>', 'append', 'redireccion'] },
  { id: 'redir-pipe', accion: 'Pasar la salida de un comando a otro', descripcion: 'Encadena dos comandos enviando la salida del primero al segundo.', categoria: 'Redirecciones y pipes', sameInAllOS: true, comando: '<comando1> | <comando2>', etiquetas: ['|', 'pipe', 'encadenar'] },
  { id: 'redir-and', accion: 'Ejecutar el siguiente comando si el anterior fue exitoso', descripcion: 'Encadena comandos condicionados al éxito del primero.', categoria: 'Redirecciones y pipes', sameInAllOS: false, windows: { cmd: '<comando1> && <comando2>', powershell: '<comando1>; if ($?) { <comando2> }' }, macos: '<comando1> && <comando2>', linux: '<comando1> && <comando2>', etiquetas: ['&&', 'encadenar', 'condicion'] }
]

/** Variantes a mostrar para un sistema operativo concreto. */
export function comandosPara(c: ComandoCatalogado, so: CatalogoSO): { label: string; texto: string }[] {
  if (c.sameInAllOS && c.comando) return [{ label: 'Igual en todos', texto: c.comando }]
  if (so === 'windows') {
    if (!c.windows) return []
    const res = [{ label: 'Windows (CMD)', texto: c.windows.cmd }]
    if (c.windows.powershell && c.windows.powershell !== c.windows.cmd) {
      res.push({ label: 'Windows (PowerShell)', texto: c.windows.powershell })
    }
    return res
  }
  if (so === 'macos') return c.macos ? [{ label: 'macOS', texto: c.macos }] : []
  if (so === 'linux') return c.linux ? [{ label: 'Linux', texto: c.linux }] : []
  return []
}

/** Todas las variantes disponibles (para el filtro "Todos"). */
export function todasLasVariantes(c: ComandoCatalogado): { label: string; texto: string }[] {
  if (c.sameInAllOS && c.comando) return [{ label: 'Igual en todos', texto: c.comando }]
  const res: { label: string; texto: string }[] = []
  if (c.windows) {
    res.push({ label: 'Windows (CMD)', texto: c.windows.cmd })
    if (c.windows.powershell && c.windows.powershell !== c.windows.cmd) {
      res.push({ label: 'Windows (PowerShell)', texto: c.windows.powershell })
    }
  }
  if (c.macos) res.push({ label: 'macOS', texto: c.macos })
  if (c.linux) res.push({ label: 'Linux', texto: c.linux })
  return res
}

/** Indica si un comando aplica a un sistema operativo. */
export function aplicaASO(c: ComandoCatalogado, so: CatalogoSO): boolean {
  if (c.sameInAllOS) return true
  if (so === 'windows') return !!c.windows
  if (so === 'macos') return !!c.macos
  if (so === 'linux') return !!c.linux
  return false
}

/** Texto usado por el buscador. */
export function textoBuscable(c: ComandoCatalogado): string {
  const partes = [c.accion, c.descripcion, c.categoria, ...(c.etiquetas ?? [])]
  if (c.comando) partes.push(c.comando)
  if (c.windows) {
    partes.push(c.windows.cmd)
    if (c.windows.powershell) partes.push(c.windows.powershell)
  }
  if (c.macos) partes.push(c.macos)
  if (c.linux) partes.push(c.linux)
  return partes.join(' ').toLowerCase()
}
