import { useTheme } from '@/context/ThemeContext'
import { TEMAS } from '@/lib/themes'

export function ThemeSelector() {
  const { temaActual, cambiarTema, modo, cambiarModo } = useTheme()

  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label htmlFor="selector-tema">
        <i className="fa-solid fa-palette" aria-hidden="true" /> Tema
      </label>
      <select
        id="selector-tema"
        value={temaActual}
        onChange={(e) => cambiarTema(e.target.value)}
        aria-label="Seleccionar tema"
      >
        {TEMAS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nombre}
            {t.daltonismo ? ' (accesible)' : ''}
          </option>
        ))}
      </select>
      <div className="row" style={{ marginTop: 8 }}>
        <span className="muted" style={{ fontSize: 13 }}>
          Modo: {modo === 'claro' ? 'Claro' : 'Oscuro'}
        </span>
        <button
          type="button"
          className="btn btn-sm grow"
          onClick={cambiarModo}
          aria-label={modo === 'claro' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
        >
          <i
            className={modo === 'claro' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'}
            aria-hidden="true"
          />
          {modo === 'claro' ? 'Oscuro' : 'Claro'}
        </button>
      </div>
    </div>
  )
}
