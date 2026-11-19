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
import type { Ajustes, EjecucionRegistro, Estadisticas, Ruta, Receta, Vista } from '@/lib/types'
import { ajustesDefault } from '@/lib/utils'

interface AppContextValue {
  rutas: Ruta[]
  recetas: Receta[]
  ajustes: Ajustes
  historial: EjecucionRegistro[]
  estadisticas: Estadisticas | null
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
  registrarEjecucion: (registro: Omit<EjecucionRegistro, 'id' | 'fecha'>) => Promise<void>
  limpiarHistorial: () => Promise<void>
  // Sesión local
  comprobando: boolean
  autenticado: boolean
  username: string | null
  iniciarSesion: (username: string, password: string) => Promise<void>
  registrar: (username: string, password: string) => Promise<void>
  cerrarSesion: () => Promise<void>
  cambiarPassword: (current: string, nueva: string) => Promise<void>
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [ajustes, setAjustes] = useState<Ajustes>(ajustesDefault())
  const [historial, setHistorial] = useState<EjecucionRegistro[]>([])
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vista, setVista] = useState<Vista>({ nombre: 'biblioteca' })
  const [comprobando, setComprobando] = useState(true)
  const [autenticado, setAutenticado] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const cargadoRef = useRef(false)

  const navegar = useCallback((v: Vista) => setVista(v), [])

  const recargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const api = await getApi()
      const [resR, resRec, resA, resH, resE] = await Promise.all([
        api.listRutas(),
        api.listRecetas(),
        api.getAjustes(),
        api.listHistorial(),
        api.getEstadisticas()
      ])
      setRutas(resR.rutas)
      setRecetas(resRec.recetas)
      setAjustes(resA.ajustes)
      setHistorial(resH.historial)
      setEstadisticas(resE.estadisticas)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCargando(false)
    }
  }, [])

  // Al arrancar se consulta la sesión; si no la hay, se muestra Login.
  useEffect(() => {
    if (cargadoRef.current) return
    cargadoRef.current = true
    void (async () => {
      try {
        const api = await getApi()
        const ses = await api.session()
        setUsername(ses.username)
        setAutenticado(true)
        await recargar()
      } catch {
        setAutenticado(false)
      } finally {
        setComprobando(false)
      }
    })()
  }, [recargar])

  const iniciarSesion = useCallback(
    async (user: string, pass: string) => {
      const api = await getApi()
      const res = await api.login(user, pass)
      api.setSessionToken(res.token)
      setUsername(res.username)
      setAutenticado(true)
      await recargar()
    },
    [recargar]
  )

  const registrar = useCallback(async (user: string, pass: string) => {
    const api = await getApi()
    await api.register(user, pass)
  }, [])

  const cerrarSesion = useCallback(async () => {
    const api = await getApi()
    try {
      await api.logout()
    } catch {
      // La sesión ya pudo expirar; se limpia igualmente en local.
    }
    api.setSessionToken(null)
    setAutenticado(false)
    setUsername(null)
    setRutas([])
    setRecetas([])
    setAjustes(ajustesDefault())
    setHistorial([])
    setEstadisticas(null)
    setVista({ nombre: 'biblioteca' })
  }, [])

  const cambiarPassword = useCallback(async (current: string, nueva: string) => {
    const api = await getApi()
    await api.changePassword(current, nueva)
    // La contraseña cambia: el núcleo invalida las sesiones.
    api.setSessionToken(null)
    setAutenticado(false)
    setUsername(null)
    setRutas([])
    setRecetas([])
    setAjustes(ajustesDefault())
    setHistorial([])
    setEstadisticas(null)
    setVista({ nombre: 'biblioteca' })
  }, [])

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

  const registrarEjecucion = useCallback(
    async (registro: Omit<EjecucionRegistro, 'id' | 'fecha'>) => {
      const api = await getApi()
      await api.addHistorial(registro)
      // Refrescar historial y estadísticas sin recargar todo.
      const [resH, resE] = await Promise.all([api.listHistorial(), api.getEstadisticas()])
      setHistorial(resH.historial)
      setEstadisticas(resE.estadisticas)
    },
    []
  )

  const limpiarHistorial = useCallback(async () => {
    const api = await getApi()
    await api.clearHistorial()
    setHistorial([])
    const resE = await api.getEstadisticas()
    setEstadisticas(resE.estadisticas)
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      rutas,
      recetas,
      ajustes,
      historial,
      estadisticas,
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
      guardarAjustes,
      registrarEjecucion,
      limpiarHistorial,
      comprobando,
      autenticado,
      username,
      iniciarSesion,
      registrar,
      cerrarSesion,
      cambiarPassword
    }),
    [
      rutas,
      recetas,
      ajustes,
      historial,
      estadisticas,
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
      guardarAjustes,
      registrarEjecucion,
      limpiarHistorial,
      comprobando,
      autenticado,
      username,
      iniciarSesion,
      registrar,
      cerrarSesion,
      cambiarPassword
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
