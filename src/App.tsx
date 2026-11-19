import { useEffect, useState } from 'react'
import { AppProvider, useApp } from '@/context/AppContext'
import { Sidebar } from '@/components/Sidebar'
import { CommandPalette } from '@/components/CommandPalette'
import Dashboard from '@/pages/Dashboard'
import Biblioteca from '@/pages/Biblioteca'
import Progreso from '@/pages/Progreso'
import Terminal from '@/pages/Terminal'
import RutaEditor from '@/pages/RutaEditor'
import Ejecucion from '@/pages/Ejecucion'
import RecetaEditor from '@/pages/RecetaEditor'
import RecetaDetalle from '@/pages/RecetaDetalle'
import Ajustes from '@/pages/Ajustes'
import Login from '@/pages/Login'
import Registro from '@/pages/Registro'
import type { Vista } from '@/lib/types'

function tituloDe(vista: Vista): string {
  switch (vista.nombre) {
    case 'dashboard':
      return 'Dashboard'
    case 'biblioteca':
      return 'Biblioteca de comandos'
    case 'progreso':
      return 'Progreso'
    case 'terminal':
      return 'Terminal'
    case 'ruta-editor':
      return vista.id ? 'Editar ruta' : 'Nueva ruta'
    case 'ejecucion':
      return 'Modo ejecución'
    case 'receta-editor':
      return vista.id ? 'Editar receta' : 'Nueva receta'
    case 'receta-detalle':
      return 'Receta'
    case 'ajustes':
      return 'Ajustes'
  }
}

function Shell() {
  const { vista } = useApp()
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  let contenido: React.ReactNode
  switch (vista.nombre) {
    case 'dashboard':
      contenido = <Dashboard />
      break
    case 'biblioteca':
      contenido = <Biblioteca />
      break
    case 'progreso':
      contenido = <Progreso />
      break
    case 'terminal':
      contenido = <Terminal />
      break
    case 'ruta-editor':
      contenido = <RutaEditor rutaId={vista.id} />
      break
    case 'ejecucion':
      contenido = <Ejecucion rutaId={vista.id} />
      break
    case 'receta-editor':
      contenido = <RecetaEditor recetaId={vista.id} />
      break
    case 'receta-detalle':
      contenido = <RecetaDetalle recetaId={vista.id} />
      break
    case 'ajustes':
      contenido = <Ajustes />
      break
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <header className="app-header">
        <h1 style={{ flex: 1 }}>{tituloDe(vista)}</h1>
      </header>
      <main className="app-main">{contenido}</main>
      <footer className="app-footer">CLI Workflow Builder · funciona sin conexión</footer>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}

function AuthGate() {
  const { comprobando, autenticado } = useApp()
  const [pantalla, setPantalla] = useState<'login' | 'registro'>('login')
  const [usuarioPrefill, setUsuarioPrefill] = useState('')

  if (comprobando) {
    return (
      <main className="auth-screen">
        <p className="muted" role="status">
          <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Comprobando sesión…
        </p>
      </main>
    )
  }

  if (!autenticado) {
    return pantalla === 'login' ? (
      <Login
        irARegistro={() => setPantalla('registro')}
        initialUsername={usuarioPrefill}
      />
    ) : (
      <Registro
        irALogin={(username) => {
          if (username) setUsuarioPrefill(username)
          setPantalla('login')
        }}
      />
    )
  }

  return <Shell />
}

export default function App() {
  return (
    <AppProvider>
      <AuthGate />
    </AppProvider>
  )
}
