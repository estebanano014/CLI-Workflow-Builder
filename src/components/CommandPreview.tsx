import type { ReactNode } from 'react'

const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

/** Divide un texto en segmentos, marcando las variables {{x}}. */
export function segmentarComando(texto: string): ReactNode[] {
  const partes: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  VAR_RE.lastIndex = 0
  while ((m = VAR_RE.exec(texto)) !== null) {
    if (m.index > last) partes.push(texto.slice(last, m.index))
    partes.push(
      <span key={`v-${i++}`} className="var-token">
        {'{{'}
        {m[1]}
        {'}}'}
      </span>
    )
    last = m.index + m[0].length
  }
  if (last < texto.length) partes.push(texto.slice(last))
  return partes.length > 0 ? partes : [texto]
}

/** Comando en monoespaciado con variables resaltadas. */
export function CommandPreview({ comando, ariaLabel }: { comando: string; ariaLabel?: string }) {
  return (
    <pre className="command-block" aria-label={ariaLabel}>
      {segmentarComando(comando)}
    </pre>
  )
}

/** Resalta los valores ya resueltos de un comando. */
export function ResolvedCommand({
  comando,
  valores,
  ariaLabel
}: {
  comando: string
  valores: Record<string, string>
  ariaLabel?: string
}) {
  return (
    <pre className="command-block" aria-label={ariaLabel}>
      {segmentarResuelto(comando, valores)}
    </pre>
  )
}

function segmentarResuelto(comando: string, valores: Record<string, string>): ReactNode[] {
  const partes: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  VAR_RE.lastIndex = 0
  while ((m = VAR_RE.exec(comando)) !== null) {
    if (m.index > last) partes.push(comando.slice(last, m.index))
    const nombre = m[1]
    const valor = valores[nombre]
    if (valor !== undefined && valor !== '') {
      partes.push(
        <span key={`r-${i++}`} className="var-token">
          {valor}
        </span>
      )
    } else {
      partes.push(
        <span key={`r-${i++}`} className="var-token" style={{ opacity: 0.6 }}>
          {'{{'}
          {nombre}
          {'}}'}
        </span>
      )
    }
    last = m.index + m[0].length
  }
  if (last < comando.length) partes.push(comando.slice(last))
  return partes.length > 0 ? partes : [comando]
}
