/**
 * Generadores de Markdown para exportar/cheatsheet.
 *
 * Los comandos se exportan con sus placeholders `{{variable}}` intactos (nunca
 * resueltos), en cumplimiento de RNF-009: los valores reales pueden contener
 * tokens o contraseñas y no deben salir en texto plano.
 */
import { comandosPara, COMANDOS, type CatalogoSO, type ComandoCatalogado } from '@/lib/catalogo'
import { SO_LABEL, type Ajustes, type Receta, type Ruta } from '@/lib/types'
import { varianteParaSO } from '@/lib/utils'

function codigo(texto: string, lang = ''): string {
  const t = texto.trimEnd()
  return '```' + lang + '\n' + t + '\n```'
}

function tagsDe(etiquetas: string[]): string {
  if (etiquetas.length === 0) return ''
  return `- Etiquetas: ${etiquetas.map((t) => `\`${t}\``).join(', ')}\n`
}

/** Convierte una Ruta a Markdown usando la variante del SO preferido. */
export function rutaAMarkdown(ruta: Ruta, soPreferido: Ajustes['soPreferido']): string {
  const lineas: string[] = [`# ${ruta.nombre}`]
  if (ruta.descripcion) lineas.push('', ruta.descripcion)
  lineas.push('', tagsDe(ruta.etiquetas).trimEnd())
  lineas.push('', '## Pasos', '')

  ruta.pasos.forEach((paso, i) => {
    lineas.push(`### ${i + 1}. ${paso.titulo || '(sin título)'}`)
    if (paso.descripcion) lineas.push('', paso.descripcion)
    const variante = varianteParaSO(paso, soPreferido) ?? paso.variantes[0]
    if (variante) {
      const lang = variante.so === 'windows' ? 'powershell' : 'bash'
      lineas.push('', codigo(variante.comando, lang))
      if (variante.nota) lineas.push('', `Nota: ${variante.nota}`)
    }
    if (paso.esDestructivo) lineas.push('', '> ⚠️ Paso destructivo.')
    lineas.push('')
  })

  return lineas.join('\n').trim() + '\n'
}

/** Convierte una Receta a Markdown. */
export function recetaAMarkdown(receta: Receta): string {
  const lineas: string[] = [`# ${receta.titulo}`]
  if (receta.descripcion) lineas.push('', receta.descripcion)
  if (receta.entrada) lineas.push('', `- Entrada: ${receta.entrada}`)
  if (receta.salida) lineas.push(`- Salida: ${receta.salida}`)
  lineas.push('', tagsDe(receta.etiquetas).trimEnd())
  lineas.push('', '## Pasos', '')
  receta.pasos.forEach((p, i) => lineas.push(`${i + 1}. ${p.texto || '(paso vacío)'}`))
  return lineas.join('\n').trim() + '\n'
}

/** Variante principal de un comando del catálogo para un SO. */
function variantePrincipal(c: ComandoCatalogado, so: CatalogoSO): string {
  const variantes = comandosPara(c, so)
  if (variantes.length > 0) return variantes[0].texto
  return c.comando ?? ''
}

/** Convierte el catálogo completo a un cheatsheet Markdown (agrupado por categoría). */
export function bibliotecaAMarkdown(soPreferido: Ajustes['soPreferido']): string {
  const so: CatalogoSO = soPreferido === 'any' ? 'windows' : soPreferido
  const categorias = new Map<string, ComandoCatalogado[]>()
  for (const c of COMANDOS) {
    if (!categorias.has(c.categoria)) categorias.set(c.categoria, [])
    categorias.get(c.categoria)!.push(c)
  }

  const lineas: string[] = [`# Biblioteca de comandos (${SO_LABEL[soPreferido]})`, '']
  for (const [categoria, comandos] of categorias) {
    lineas.push(`## ${categoria}`, '')
    for (const c of comandos) {
      const cmd = variantePrincipal(c, so)
      lineas.push(`- **${c.accion}** — ${cmd ? `\`${cmd}\`` : '—'}`)
    }
    lineas.push('')
  }
  return lineas.join('\n').trim() + '\n'
}

/** Cheatsheet completo: biblioteca + rutas + recetas. */
export function cheatsheetCompleto(
  rutas: Ruta[],
  recetas: Receta[],
  ajustes: Ajustes
): string {
  const partes: string[] = [
    '# CLI Workflow Builder — Cheatsheet',
    '',
    `Sistema operativo preferido: **${SO_LABEL[ajustes.soPreferido]}**`,
    '',
    bibliotecaAMarkdown(ajustes.soPreferido)
  ]

  if (rutas.length > 0) {
    partes.push('# Rutas', '')
    rutas.forEach((r) => partes.push(rutaAMarkdown(r, ajustes.soPreferido)))
  }
  if (recetas.length > 0) {
    partes.push('# Recetas', '')
    recetas.forEach((r) => partes.push(recetaAMarkdown(r)))
  }

  return partes.join('\n').trim() + '\n'
}
