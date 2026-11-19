import { getApi } from '@/lib/api'
import { copiarAlPortapapeles } from '@/lib/clipboard'
import Swal from 'sweetalert2'
import type { StoreData } from '@/lib/types'

/** Descarga un texto como archivo (Blob + ancla), sin dependencias. */
export function descargarArchivo(nombre: string, contenido: string, mime: string): void {
  const blob = new Blob([contenido], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Descarga un contenido Markdown con feedback SweetAlert2. */
export async function exportarMarkdown(nombre: string, contenido: string): Promise<void> {
  descargarArchivo(nombre, contenido, 'text/markdown;charset=utf-8')
  await Swal.fire({
    title: 'Exportado',
    text: 'El archivo Markdown se descargó correctamente.',
    icon: 'success',
    timer: 1800,
    showConfirmButton: false
  })
}

/** Copia un contenido Markdown al portapapeles con feedback SweetAlert2. */
export async function copiarComoMarkdown(contenido: string, descripcion: string): Promise<void> {
  const ok = await copiarAlPortapapeles(contenido)
  await Swal.fire({
    title: ok ? 'Copiado' : 'No se pudo copiar',
    text: ok ? `${descripcion} copiado como Markdown.` : 'Revisa el portapapeles e inténtalo de nuevo.',
    icon: ok ? 'success' : 'error',
    timer: 1600,
    showConfirmButton: false
  })
}

export async function exportarDatos(): Promise<void> {
  const api = await getApi()
  const data = await api.exportData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'datos_flujos.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  await Swal.fire({
    title: 'Exportado',
    text: 'Los datos se exportaron correctamente.',
    icon: 'success',
    timer: 1800,
    showConfirmButton: false
  })
}

export async function importarDatos(archivo: File): Promise<StoreData | null> {
  const texto = await archivo.text()
  let data: StoreData
  try {
    data = JSON.parse(texto) as StoreData
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.rutas) || !Array.isArray(data.recetas)) {
    throw new Error('El archivo no tiene la estructura esperada (rutas y recetas).')
  }

  const confirm = await Swal.fire({
    title: 'Importar datos',
    text: 'Se sobrescribirán todos los datos actuales con el contenido del archivo. ¿Continuar?',
    icon: 'warning',
    iconColor: 'var(--color-warning)',
    showCancelButton: true,
    confirmButtonText: 'Importar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: 'var(--color-warning)',
    reverseButtons: true
  })
  if (!confirm.isConfirmed) return null

  const api = await getApi()
  const res = await api.importData(data)
  await Swal.fire({
    title: 'Importación completada',
    text: `Se importaron ${res.importados.rutas} rutas y ${res.importados.recetas} recetas.`,
    icon: 'success'
  })
  return data
}
