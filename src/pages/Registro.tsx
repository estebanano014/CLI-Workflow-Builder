import { useState, type FormEvent } from 'react'
import Swal from 'sweetalert2'
import { useApp } from '@/context/AppContext'
import { mensajeDeError } from '@/lib/api'
import { PasswordInput } from '@/components/PasswordInput'

interface RegistroProps {
  irALogin: (username?: string) => void
}

function fuerza(password: string): { score: number; label: string } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password) || /[^a-zA-Z0-9]/.test(password)) score++
  const labels = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte']
  return { score, label: labels[score] }
}

export default function Registro({ irALogin }: RegistroProps) {
  const { registrar } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const errorId = 'registro-error'
  const f = fuerza(password)
  const barColor =
    f.score <= 1
      ? 'var(--color-error)'
      : f.score === 2
        ? 'var(--color-warning)'
        : f.score === 3
          ? 'var(--color-info)'
          : 'var(--color-success)'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (enviando) return
    setError(null)
    if (!username.trim()) {
      setError('Escribe un usuario.')
      return
    }
    if (!password) {
      setError('Escribe una contraseña.')
      return
    }
    if (password !== password.trim()) {
      setError('La contraseña no puede empezar ni terminar con espacios.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setEnviando(true)
    try {
      await registrar(username, password)
      await Swal.fire({
        title: 'Cuenta creada',
        text: 'Ya puedes iniciar sesión con tu cuenta local.',
        icon: 'success'
      })
      irALogin(username.trim())
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="card auth-card" aria-labelledby="registro-titulo">
        <header>
          <h1 id="registro-titulo">Crear cuenta</h1>
          <p className="muted" style={{ margin: 0 }}>
            Una única cuenta local en este equipo.
          </p>
        </header>

        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="registro-usuario">Usuario</label>
            <input
              id="registro-usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              aria-describedby={error ? errorId : undefined}
            />
          </div>

          <PasswordInput
            id="registro-password"
            label="Contraseña"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            describedBy={error ? errorId : undefined}
          />

          <p className="field-hint" style={{ marginTop: -8, marginBottom: 12 }}>
            Entre 8 y 128 caracteres, sin espacios al inicio ni al final.
          </p>

          {password.length > 0 && (
            <div
              className="strength"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={4}
              aria-valuenow={f.score}
              aria-valuetext={f.label}
            >
              <span className="muted" style={{ fontSize: 13 }}>
                Seguridad: <strong>{f.label}</strong>
              </span>
              <div className="strength-bar" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} style={{ background: i < f.score ? barColor : undefined }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <p id={errorId} className="auth-error" role="alert" aria-live="assertive">
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={enviando}>
            {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <footer className="auth-alt">
          ¿Ya tienes cuenta?{' '}
          <button type="button" className="btn-link" onClick={() => irALogin()}>
            Iniciar sesión
          </button>
        </footer>
      </section>
    </main>
  )
}
