import { getApi } from '@/lib/api'
import Swal from 'sweetalert2'
import type { StoreData } from '@/lib/types'

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

export async function importarDatos(archivo: File): Promise<void> {
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
  if (!confirm.isConfirmed) return

  const api = await getApi()
  const res = await api.importData(data)
  await Swal.fire({
    title: 'Importación completada',
    text: `Se importaron ${res.importados.rutas} rutas y ${res.importados.recetas} recetas.`,
    icon: 'success'
  })
}
