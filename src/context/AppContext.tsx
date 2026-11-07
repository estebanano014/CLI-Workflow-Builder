import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import Swal from 'sweetalert2'
import { getApi, ApiError } from '@/lib/api'
import type { Ajustes, Ruta, Receta, Vista } from '@/lib/types'
import { ajustesDefault } from '@/lib/utils'

interface AppContextValue {
  rutas: Ruta[]
  recetas: Receta[]
  ajustes: Ajustes
  cargando: boolean
  error: string | null
  vista: Vista
  navegar: (vista: Vista) => void
  recargar: () => Promise<void>
  guardarRuta: (ruta: Ruta) => Promise<Ruta>
  eliminarRuta: (id: string) => Promise<void>
  duplicarRuta: (id: string) => Promise<void>
  guardarReceta: (receta: Receta) => Promise<Receta>
  eliminarReceta: (id: string) => Promise<void>
  duplicarReceta: (id: string) => Promise<void>
  guardarAjustes: (ajustes: Ajustes) => Promise<void>
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [ajustes, setAjustes] = useState<Ajustes>(ajustesDefault())
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vista, setVista] = useState<Vista>({ nombre: 'dashboard' })
  const cargadoRef = useRef(false)

  const navegar = useCallback((v: Vista) => setVista(v), [])

  const recargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const api = await getApi()
      const [resR, resRec, resA] = await Promise.all([
        api.listRutas(),
        api.listRecetas(),
        api.getAjustes()
      ])
      setRutas(resR.rutas)
      setRecetas(resRec.recetas)
      setAjustes(resA.ajustes)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (cargadoRef.current) return
    cargadoRef.current = true
    void recargar()
  }, [recargar])

  const guardarRuta = useCallback(
    async (ruta: Ruta): Promise<Ruta> => {
      const api = await getApi()
      const ahora = new Date().toISOString()
      const payload = { ...ruta, updatedAt: ahora }
      const existe = rutas.some((r) => r.id === ruta.id)
      const res = existe ? await api.updateRuta(ruta.id, payload) : await api.createRuta(payload)
      setRutas((prev) => {
        const idx = prev.findIndex((r) => r.id === res.ruta.id)
        if (idx >= 0) return prev.map((r) => (r.id === res.ruta.id ? res.ruta : r))
        return [...prev, res.ruta]
      })
      return res.ruta
    },
    [rutas]
  )

  const eliminarRuta = useCallback(async (id: string) => {
    const api = await getApi()
    await api.deleteRuta(id)
    setRutas((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const duplicarRuta = useCallback(async (id: string) => {
    const api = await getApi()
    const { ruta } = await api.getRuta(id)
    const copia: Ruta = {
      ...ruta,
      id: crypto.randomUUID(),
      nombre: `${ruta.nombre} (copia)`,
      favorito: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRunAt: null
    }
    const res = await api.createRuta(copia)
    setRutas((prev) => [...prev, res.ruta])
  }, [])

  const guardarReceta = useCallback(
    async (receta: Receta): Promise<Receta> => {
      const api = await getApi()
      const payload = { ...receta, updatedAt: new Date().toISOString() }
      const existe = recetas.some((r) => r.id === receta.id)
      const res = existe
        ? await api.updateReceta(receta.id, payload)
        : await api.createReceta(payload)
      setRecetas((prev) => {
        const idx = prev.findIndex((r) => r.id === res.receta.id)
        if (idx >= 0) return prev.map((r) => (r.id === res.receta.id ? res.receta : r))
        return [...prev, res.receta]
      })
      return res.receta
    },
    [recetas]
  )

  const eliminarReceta = useCallback(async (id: string) => {
    const api = await getApi()
    await api.deleteReceta(id)
    setRecetas((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const duplicarReceta = useCallback(async (id: string) => {
    const api = await getApi()
    const { receta } = await api.getReceta(id)
    const copia: Receta = {
      ...receta,
      id: crypto.randomUUID(),
      titulo: `${receta.titulo} (copia)`,
      favorito: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRunAt: null
    }
    const res = await api.createReceta(copia)
    setRecetas((prev) => [...prev, res.receta])
  }, [])

  const guardarAjustes = useCallback(async (a: Ajustes) => {
    const api = await getApi()
    const res = await api.updateAjustes(a)
    setAjustes(res.ajustes)
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      rutas,
      recetas,
      ajustes,
      cargando,
      error,
      vista,
      navegar,
      recargar,
      guardarRuta,
      eliminarRuta,
      duplicarRuta,
      guardarReceta,
      eliminarReceta,
      duplicarReceta,
      guardarAjustes
    }),
    [
      rutas,
      recetas,
      ajustes,
      cargando,
      error,
      vista,
      navegar,
      recargar,
      guardarRuta,
      eliminarRuta,
      duplicarRuta,
      guardarReceta,
      eliminarReceta,
      duplicarReceta,
      guardarAjustes
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}

/** Confirmación de eliminación con SweetAlert2 (icono redundante para daltonismo). */
export async function confirmarEliminacion(nombre: string): Promise<boolean> {
  const res = await Swal.fire({
    title: 'Eliminar',
    text: `¿Seguro que quieres eliminar "${nombre}"? Esta acción no se puede deshacer.`,
    icon: 'warning',
    iconColor: 'var(--color-error)',
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: 'var(--color-error)',
    reverseButtons: true
  })
  return res.isConfirmed
}

export function mostrarError(error: unknown): void {
  const mensaje = error instanceof ApiError ? error.message : error instanceof Error ? error.message : String(error)
  void Swal.fire({ title: 'Error', text: mensaje, icon: 'error' })
}
