import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { APP_STRINGS } from '../../constants/strings'
import './Login.css'

function Login() {
  const { user, loading, login } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!loading && user) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError(APP_STRINGS.login.emailRequired)
      return
    }
    if (!password) {
      setError(APP_STRINGS.login.passwordRequired)
      return
    }

    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : APP_STRINGS.login.errors.generic)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login">
      <section className="login__panel">
        <header className="login__header">
          <h1 className="login__brand">{APP_STRINGS.app.name}</h1>
          <p className="login__product">{APP_STRINGS.app.subtitle}</p>
          <p className="login__subtitle">{APP_STRINGS.login.subtitle}</p>
        </header>

        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <div className="login__field">
            <label className="login__label" htmlFor="login-email">
              {APP_STRINGS.login.emailLabel}
            </label>
            <input
              id="login-email"
              className="login__input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={APP_STRINGS.login.emailPlaceholder}
              disabled={submitting || loading}
            />
          </div>

          <div className="login__field">
            <label className="login__label" htmlFor="login-password">
              {APP_STRINGS.login.passwordLabel}
            </label>
            <input
              id="login-password"
              className="login__input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={APP_STRINGS.login.passwordPlaceholder}
              disabled={submitting || loading}
            />
          </div>

          {error && <p className="login__error">{error}</p>}

          <button
            className="login__submit"
            type="submit"
            disabled={submitting || loading}
          >
            {submitting ? APP_STRINGS.login.submitting : APP_STRINGS.login.submit}
          </button>
        </form>

        <p className="login__hint">{APP_STRINGS.login.noRegisterHint}</p>
      </section>
    </main>
  )
}

export default Login
