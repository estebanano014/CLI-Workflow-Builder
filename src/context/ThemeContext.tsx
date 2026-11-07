import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { LS_MODO, LS_TEMA, MODO_DEFAULT, TEMA_DEFAULT, type Modo } from '@/lib/themes'

interface ThemeContextValue {
  temaActual: string
  cambiarTema: (nombre: string) => void
  modo: Modo
  cambiarModo: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function readLS(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [temaActual, setTemaActual] = useState<string>(() => readLS(LS_TEMA, TEMA_DEFAULT))
  const [modo, setModo] = useState<Modo>(() => readLS(LS_MODO, MODO_DEFAULT) as Modo)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', temaActual)
    try {
      localStorage.setItem(LS_TEMA, temaActual)
    } catch {
      /* almacenamiento no disponible */
    }
  }, [temaActual])

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', modo)
    try {
      localStorage.setItem(LS_MODO, modo)
    } catch {
      /* almacenamiento no disponible */
    }
  }, [modo])

  const cambiarTema = useCallback((nombre: string) => {
    setTemaActual(nombre)
  }, [])

  const cambiarModo = useCallback(() => {
    setModo((m) => (m === 'claro' ? 'oscuro' : 'claro'))
  }, [])

  const value = useMemo(
    () => ({ temaActual, cambiarTema, modo, cambiarModo }),
    [temaActual, cambiarTema, modo, cambiarModo]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return ctx
}
