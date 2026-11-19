import { useMemo, useState } from 'react'
import { copiarAlPortapapeles } from '@/lib/clipboard'
import {
  aplicaASO,
  CATEGORIAS,
  comandosPara,
  COMANDOS,
  todasLasVariantes,
  textoBuscable,
  type CatalogoSO,
  type ComandoCatalogado
} from '@/lib/catalogo'

type FiltroSO = 'todos' | CatalogoSO

/** Comandos que se muestran destacados en la cabecera de la Biblioteca. */
const DESTACADOS_IDS = ['git-push-all', 'git-status', 'nav-listar', 'red-ping', 'busq-grep', 'proc-ps']

/** Variante principal (la más representativa) de un comando, para la tarjeta destacada. */
function variantePrincipal(c: ComandoCatalogado): { label: string; texto: string } {
  if (c.sameInAllOS && c.comando) return { label: 'Todos los sistemas', texto: c.comando }
  if (c.windows) return { label: 'Windows (CMD)', texto: c.windows.cmd }
  if (c.macos) return { label: 'macOS', texto: c.macos }
  if (c.linux) return { label: 'Linux', texto: c.linux }
  return { label: '', texto: '' }
}

function TarjetaComando({ comando, so }: { comando: ComandoCatalogado; so: FiltroSO }) {
  const [copiado, setCopiado] = useState<string | null>(null)

  const variantes = so === 'todos' ? todasLasVariantes(comando) : comandosPara(comando, so)

  const copiar = async (texto: string) => {
    const ok = await copiarAlPortapapeles(texto)
    if (ok) {
      setCopiado(texto)
      setTimeout(() => setCopiado(null), 1500)
    }
  }

  return (
    <article className="card" style={{ marginBottom: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>{comando.accion}</strong>
        <span className="badge">{comando.categoria}</span>
      </div>
      <p className="muted" style={{ margin: '4px 0 10px', fontSize: 14 }}>
        {comando.descripcion}
      </p>

      {variantes.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>
          <i className="fa-solid fa-circle-info" aria-hidden="true" /> No aplica a este sistema operativo.
        </p>
      ) : (
        variantes.map((v) => (
          <div key={v.label + v.texto} style={{ marginBottom: 8 }}>
            <div className="row" style={{ marginBottom: 4 }}>
              <span className="badge">{v.label}</span>
              <span className="grow" />
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => void copiar(v.texto)}
                aria-label={`Copiar comando ${v.label}`}
                style={copiado === v.texto ? { borderColor: 'var(--color-success)', color: 'var(--color-success)' } : undefined}
              >
                <i className={copiado === v.texto ? 'fa-solid fa-check' : 'fa-solid fa-copy'} aria-hidden="true" />
                {copiado === v.texto ? ' Copiado' : ' Copiar'}
              </button>
            </div>
            <pre className="command-block" aria-label={`Comando ${v.label}`}>
              {v.texto}
            </pre>
          </div>
        ))
      )}
    </article>
  )
}

function TarjetaDestacado({ comando }: { comando: ComandoCatalogado }) {
  const [copiado, setCopiado] = useState(false)
  const principal = variantePrincipal(comando)

  const copiar = async () => {
    const ok = await copiarAlPortapapeles(principal.texto)
    if (ok) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    }
  }

  return (
    <article className="card featured-card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="badge">{comando.categoria}</span>
        <span className="muted" style={{ fontSize: 12 }}>
          <i className="fa-solid fa-globe" aria-hidden="true" /> {principal.label}
        </span>
      </div>
      <strong className="featured-title">{comando.accion}</strong>
      <pre className="command-block featured-command" aria-label={`Comando ${principal.label}`}>
        {principal.texto}
      </pre>
      <button
        type="button"
        className="btn btn-sm grow"
        onClick={() => void copiar()}
        aria-label={`Copiar comando ${comando.accion}`}
        style={copiado ? { borderColor: 'var(--color-success)', color: 'var(--color-success)' } : undefined}
      >
        <i className={copiado ? 'fa-solid fa-check' : 'fa-solid fa-copy'} aria-hidden="true" />
        {copiado ? ' Copiado' : ' Copiar'}
      </button>
    </article>
  )
}

export default function Biblioteca() {
  const [busqueda, setBusqueda] = useState('')
  const [so, setSo] = useState<FiltroSO>('todos')
  const [categoria, setCategoria] = useState('')

  const hayFiltros = busqueda.trim() !== '' || so !== 'todos' || categoria !== ''

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return COMANDOS.filter((c) => {
      if (categoria && c.categoria !== categoria) return false
      if (so !== 'todos' && !aplicaASO(c, so)) return false
      if (q && !textoBuscable(c).includes(q)) return false
      return true
    })
  }, [busqueda, so, categoria])

  const porCategoria = useMemo(() => {
    return CATEGORIAS.map((cat) => ({
      categoria: cat,
      comandos: filtrados.filter((c) => c.categoria === cat)
    })).filter((g) => g.comandos.length > 0)
  }, [filtrados])

  const destacados = useMemo(
    () => DESTACADOS_IDS.map((id) => COMANDOS.find((c) => c.id === id)).filter(Boolean) as ComandoCatalogado[],
    []
  )

  return (
    <div>
      <section className="biblioteca-hero" aria-label="Resumen de la biblioteca">
        <p className="hero-lead">
          Referencia offline de los comandos de consola más usados, con variantes para{' '}
          <strong>Windows</strong> (CMD y PowerShell), <strong>macOS</strong> y <strong>Linux</strong>. Busca
          por acción, copia el comando y pégalo en tu terminal.
        </p>
        <div className="stat-row">
          <div className="stat">
            <i className="fa-solid fa-terminal" aria-hidden="true" />
            <span className="stat-value">{COMANDOS.length}</span>
            <span className="stat-label">comandos</span>
          </div>
          <div className="stat">
            <i className="fa-solid fa-folder-open" aria-hidden="true" />
            <span className="stat-value">{CATEGORIAS.length}</span>
            <span className="stat-label">categorías</span>
          </div>
          <div className="stat">
            <i className="fa-solid fa-laptop" aria-hidden="true" />
            <span className="stat-value">3</span>
            <span className="stat-label">sistemas</span>
          </div>
        </div>
      </section>

      <div className="toolbar">
        <div className="search-field">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por acción, comando o palabra clave…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar comandos"
          />
        </div>

        <select value={so} onChange={(e) => setSo(e.target.value as FiltroSO)} aria-label="Filtrar por sistema operativo">
          <option value="todos">Todos los sistemas</option>
          <option value="windows">Windows</option>
          <option value="macos">macOS</option>
          <option value="linux">Linux</option>
        </select>

        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Filtrar por categoría">
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <nav className="category-chips" aria-label="Filtrar por categoría">
        <button
          type="button"
          className={`chip ${categoria === '' ? 'chip-active' : ''}`}
          onClick={() => setCategoria('')}
          aria-pressed={categoria === ''}
        >
          Todas
        </button>
        {CATEGORIAS.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`chip ${categoria === cat ? 'chip-active' : ''}`}
            onClick={() => setCategoria(cat)}
            aria-pressed={categoria === cat}
          >
            {cat}
          </button>
        ))}
      </nav>

      {!hayFiltros && (
        <section aria-label="Comandos destacados">
          <h2 className="section-title" style={{ fontSize: 18, marginTop: 20 }}>
            <i className="fa-solid fa-star" aria-hidden="true" /> Destacados
          </h2>
          <div className="featured-grid">
            {destacados.map((c) => (
              <TarjetaDestacado key={c.id} comando={c} />
            ))}
          </div>
        </section>
      )}

      <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>
        {filtrados.length} comando{filtrados.length !== 1 ? 's' : ''}
        {so !== 'todos' ? ` · sistema: ${so}` : ''}
        {categoria ? ` · categoría: ${categoria}` : ''}
      </p>

      {filtrados.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <p>No se encontraron comandos para esa búsqueda o filtro.</p>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setBusqueda('')
              setSo('todos')
              setCategoria('')
            }}
          >
            <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Limpiar filtros
          </button>
        </div>
      ) : (
        porCategoria.map((grupo) => (
          <section key={grupo.categoria} aria-label={grupo.categoria}>
            <h2 className="section-title" style={{ fontSize: 18, marginTop: 20 }}>
              <i className="fa-solid fa-folder-open" aria-hidden="true" /> {grupo.categoria}
            </h2>
            {grupo.comandos.map((c) => (
              <TarjetaComando key={c.id} comando={c} so={so} />
            ))}
          </section>
        ))
      )}
    </div>
  )
}
