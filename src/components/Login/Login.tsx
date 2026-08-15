import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { APP_STRINGS } from '../../constants/strings'
import './Login.css'

const REMEMBER_KEY = 'sistecontact.rememberCredentials'
const MIN_PASSWORD_LENGTH = 6

type RememberedCredentials = {
  email: string
  password: string
}

function loadRemembered(): RememberedCredentials | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<RememberedCredentials>
    if (typeof parsed.email !== 'string' || typeof parsed.password !== 'string') {
      return null
    }
    return { email: parsed.email, password: parsed.password }
  } catch {
    return null
  }
}

function saveRemembered(email: string, password: string) {
  localStorage.setItem(
    REMEMBER_KEY,
    JSON.stringify({ email: email.trim(), password }),
  )
}

function clearRemembered() {
  localStorage.removeItem(REMEMBER_KEY)
}

function Login() {
  const { user, loading, login, register, loginWithGoogle } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const remembered = loadRemembered()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState(remembered?.email ?? '')
  const [password, setPassword] = useState(remembered?.password ?? '')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [remember, setRemember] = useState(Boolean(remembered))
  const [pending, setPending] = useState<'form' | 'google' | null>(null)
  const [error, setError] = useState(() => {
    if (typeof window === 'undefined') return ''
    const params = new URLSearchParams(window.location.search)
    if (params.get('google_login') === 'error') {
      params.delete('google_login')
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`
      window.history.replaceState({}, '', next)
      return APP_STRINGS.login.errors.googleCallback
    }
    if (sessionStorage.getItem('sistecontact.googleLoginError') === '1') {
      sessionStorage.removeItem('sistecontact.googleLoginError')
      return APP_STRINGS.login.errors.googleCallback
    }
    return ''
  })

  const busy = pending !== null || loading
  const isRegister = mode === 'register'

  if (!loading && user) {
    return <Navigate to={from} replace />
  }

  function switchMode(next: 'login' | 'register') {
    setMode(next)
    setError('')
    setConfirmPassword('')
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

    if (isRegister) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(APP_STRINGS.login.passwordTooShort)
        return
      }
      if (!confirmPassword) {
        setError(APP_STRINGS.login.confirmPasswordRequired)
        return
      }
      if (password !== confirmPassword) {
        setError(APP_STRINGS.login.passwordMismatch)
        return
      }
    }

    setPending('form')
    try {
      if (isRegister) {
        await register(email, password)
        clearRemembered()
      } else {
        await login(email, password)
        if (remember) {
          saveRemembered(email, password)
        } else {
          clearRemembered()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : APP_STRINGS.login.errors.generic)
    } finally {
      setPending(null)
    }
  }

  async function handleGoogle() {
    setError('')
    setPending('google')
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : APP_STRINGS.login.errors.genericGoogle)
    } finally {
      setPending(null)
    }
  }

  return (
    <main className="login">
      <section className="login__panel">
        <header className="login__header">
          <h1 className="login__brand">{APP_STRINGS.app.name}</h1>
          <p className="login__product">{APP_STRINGS.app.subtitle}</p>
          <p className="login__subtitle">
            {isRegister
              ? APP_STRINGS.login.registerSubtitle
              : APP_STRINGS.login.subtitle}
          </p>
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
              disabled={busy}
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
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={APP_STRINGS.login.passwordPlaceholder}
              disabled={busy}
            />
          </div>

          {isRegister && (
            <div className="login__field">
              <label className="login__label" htmlFor="login-confirm-password">
                {APP_STRINGS.login.confirmPasswordLabel}
              </label>
              <input
                id="login-confirm-password"
                className="login__input"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={APP_STRINGS.login.passwordPlaceholder}
                disabled={busy}
              />
            </div>
          )}

          {!isRegister && (
            <label className="login__remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => {
                  const next = e.target.checked
                  setRemember(next)
                  if (!next) clearRemembered()
                }}
                disabled={busy}
              />
              <span>{APP_STRINGS.login.rememberCredentials}</span>
            </label>
          )}

          {error && <p className="login__error">{error}</p>}

          <button
            className="login__submit"
            type="submit"
            disabled={busy}
          >
            {isRegister
              ? pending === 'form'
                ? APP_STRINGS.login.registering
                : APP_STRINGS.login.registerSubmit
              : pending === 'form'
                ? APP_STRINGS.login.submitting
                : APP_STRINGS.login.submit}
          </button>
        </form>

        <div className="login__divider" role="separator">
          <span>{APP_STRINGS.login.orDivider}</span>
        </div>

        <button
          type="button"
          className="login__google"
          onClick={() => void handleGoogle()}
          disabled={busy}
        >
          <GoogleMark />
          <span>
            {pending === 'google'
              ? APP_STRINGS.login.googleSubmitting
              : APP_STRINGS.login.googleSubmit}
          </span>
        </button>

        <button
          type="button"
          className="login__switch"
          onClick={() => switchMode(isRegister ? 'login' : 'register')}
          disabled={busy}
        >
          {isRegister
            ? APP_STRINGS.login.switchToLogin
            : APP_STRINGS.login.switchToRegister}
        </button>

        <p className="login__hint">{APP_STRINGS.login.noRegisterHint}</p>
      </section>
    </main>
  )
}

function GoogleMark() {
  return (
    <svg
      className="login__google-icon"
      viewBox="0 0 18 18"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.6.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96L3.97 7.29C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}

export default Login
