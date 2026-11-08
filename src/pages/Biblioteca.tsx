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

export default function Biblioteca() {
  const [busqueda, setBusqueda] = useState('')
  const [so, setSo] = useState<FiltroSO>('todos')
  const [categoria, setCategoria] = useState('')

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

  return (
    <div>
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

      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        {filtrados.length} comando{filtrados.length !== 1 ? 's' : ''}
        {so !== 'todos' ? ` · sistema: ${so}` : ''}
      </p>

      {filtrados.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <p>No se encontraron comandos para esa búsqueda o filtro.</p>
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
