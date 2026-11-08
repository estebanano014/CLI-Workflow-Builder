import { useApp } from '@/context/AppContext'
import { ThemeSelector } from '@/components/ThemeSelector'

export function Sidebar() {
  const { vista, navegar } = useApp()

  return (
    <aside className="app-sidebar" aria-label="Navegación principal">
      <h1 className="sidebar-title">
        <i className="fa-solid fa-terminal" aria-hidden="true" /> CLI Flow
      </h1>

      <nav aria-label="Secciones">
        <button
          type="button"
          className={`nav-link ${vista.nombre === 'dashboard' ? 'active' : ''}`}
          onClick={() => navegar({ nombre: 'dashboard' })}
        >
          <i className="fa-solid fa-gauge-high" aria-hidden="true" /> Dashboard
        </button>
        <button
          type="button"
          className={`nav-link ${vista.nombre === 'biblioteca' ? 'active' : ''}`}
          onClick={() => navegar({ nombre: 'biblioteca' })}
        >
          <i className="fa-solid fa-book" aria-hidden="true" /> Biblioteca
        </button>
        <button
          type="button"
          className={`nav-link ${vista.nombre === 'ajustes' ? 'active' : ''}`}
          onClick={() => navegar({ nombre: 'ajustes' })}
        >
          <i className="fa-solid fa-gear" aria-hidden="true" /> Ajustes
        </button>
      </nav>

      <section className="sidebar-section" aria-label="Apariencia">
        <h2>Apariencia</h2>
        <ThemeSelector />
      </section>
    </aside>
  )
}
