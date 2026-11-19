/**
 * Guardarraíles del terminal integrado (Fase 5).
 *
 * - "Modo seguro": solo permite un subconjunto acotado de comandos de lectura /
 *   consulta (lista blanca).
 * - Detección heurística de comandos potencialmente destructivos, para pedir
 *   confirmación antes de ejecutarlos.
 *
 * Esta es una capa de UX sobre la ejecución real; el proceso principal de
 * Electron es quien ejecuta los comandos (con timeout y captura de salida).
 */

const PERMITIDOS: RegExp[] = [
  /^git\s+(status|log|diff|branch|show|remote\s+-v|--version|rev-parse|ls-files|tag)\b/,
  /^(dir|ls)(\s|$)/,
  /^(type|cat|more)\s+/,
  /^(echo|whoami|date|time|ver|hostname|printenv|set)\b/,
  /^(node|npm|python|py|git|java|pip)\s+(-v|--version)$/,
  /^(npm|node|python|py|git)\s+(-v|--version)\s*$/,
  /^(where|which|whereis)\s+/,
  /^(ping|tracert|pathping|nslookup|ipconfig|netstat|getmac|arp)\b/,
  /^(help|cls|clear|pwd|cd)(\s|$)/,
  /^python\s+(-c|-m\s+--version)\b/,
  /^git\s+help\b/
]

const PELIGROSOS: RegExp[] = [
  /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b/,
  /\bdel\s+(\/[sqf]+\s+)+/,
  /\brmdir\s+\/s\b/,
  /\brd\s+\/s\b/,
  /\bformat\b/,
  /\bdiskpart\b/,
  /\bfsutil\b/,
  /\bshutdown\b/,
  /\breboot\b/,
  /\bchkdsk\s+\/f\b/,
  /\bgit\s+(reset\s+--hard|clean\s+-[a-z]*f|push\s+--force|push\s+-f)\b/,
  /\bdrop\s+(table|database)\b/,
  /\btruncate\b/,
  /\bdd\s+if=/,
  /\bmkfs\b/,
  /\bdel\s+\/f\s+\/s\b/
]

/** Devuelve true si el comando está permitido en modo seguro. */
export function comandoPermitido(comando: string): boolean {
  const c = comando.trim().toLowerCase()
  if (!c) return false
  return PERMITIDOS.some((re) => re.test(c))
}

/** Devuelve true si el comando parece destructivo (heurística). */
export function esComandoPeligroso(comando: string): boolean {
  const c = comando.trim().toLowerCase()
  return PELIGROSOS.some((re) => re.test(c))
}

/** Ejemplos de comandos permitidos en modo seguro (para la UI). */
export const EJEMPLOS_SEGUROS = [
  'git status',
  'git log --oneline',
  'ls',
  'whoami',
  'ping google.com',
  'node --version'
]
