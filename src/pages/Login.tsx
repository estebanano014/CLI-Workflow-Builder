import { useState, type FormEvent } from 'react'
import { useApp } from '@/context/AppContext'
import { mensajeDeError } from '@/lib/api'
import { PasswordInput } from '@/components/PasswordInput'

interface LoginProps {
  irARegistro: () => void
  initialUsername?: string
}

export default function Login({ irARegistro, initialUsername = '' }: LoginProps) {
  const { iniciarSesion } = useApp()
  const [username, setUsername] = useState(initialUsername)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const errorId = 'login-error'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (enviando) return
    setError(null)
    if (!username.trim()) {
      setError('Escribe tu usuario.')
      return
    }
    if (!password) {
      setError('Escribe tu contraseña.')
      return
    }
    setEnviando(true)
    try {
      await iniciarSesion(username, password)
      // En caso de éxito, el gate de App.tsx muestra el shell.
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="card auth-card" aria-labelledby="login-titulo">
        <header>
          <h1 id="login-titulo">
            <i className="fa-solid fa-terminal" aria-hidden="true" /> CLI Flow
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Accede a tus flujos. Cuenta local, sin conexión.
          </p>
        </header>

        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="login-usuario">Usuario</label>
            <input
              id="login-usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              aria-describedby={error ? errorId : undefined}
            />
          </div>

          <PasswordInput
            id="login-password"
            label="Contraseña"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            describedBy={error ? errorId : undefined}
          />

          {error && (
            <p id={errorId} className="auth-error" role="alert" aria-live="assertive">
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <footer className="auth-alt">
          ¿No tienes cuenta?{' '}
          <button type="button" className="btn-link" onClick={irARegistro}>
            Crear cuenta
          </button>
        </footer>
      </section>
    </main>
  )
}
