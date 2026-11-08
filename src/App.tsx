import { AppProvider, useApp } from '@/context/AppContext'
import { Sidebar } from '@/components/Sidebar'
import Dashboard from '@/pages/Dashboard'
import Biblioteca from '@/pages/Biblioteca'
import RutaEditor from '@/pages/RutaEditor'
import Ejecucion from '@/pages/Ejecucion'
import RecetaEditor from '@/pages/RecetaEditor'
import RecetaDetalle from '@/pages/RecetaDetalle'
import Ajustes from '@/pages/Ajustes'
import type { Vista } from '@/lib/types'

function tituloDe(vista: Vista): string {
  switch (vista.nombre) {
    case 'dashboard':
      return 'Dashboard'
    case 'biblioteca':
      return 'Biblioteca de comandos'
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

  let contenido: React.ReactNode
  switch (vista.nombre) {
    case 'dashboard':
      contenido = <Dashboard />
      break
    case 'biblioteca':
      contenido = <Biblioteca />
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
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
