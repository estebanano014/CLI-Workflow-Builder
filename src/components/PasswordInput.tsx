import { useState } from 'react'

interface PasswordInputProps {
  id: string
  label?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  placeholder?: string
  describedBy?: string
}

/**
 * Campo de contraseña con botón mostrar/ocultar accesible (aria-pressed).
 * El botón es independiente del input, por lo que no impide pegar.
 */
export function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  describedBy
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      <div className="password-wrap">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className="toggle-pass"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <i className={visible ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
