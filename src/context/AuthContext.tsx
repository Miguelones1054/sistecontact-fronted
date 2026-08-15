import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { completeGoogleAuth, fetchAccessSettings, fetchGoogleAuthURL } from '../services/api'
import { APP_STRINGS } from '../constants/strings'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

type AuthAction = 'login' | 'register' | 'google'

const AuthContext = createContext<AuthContextValue | null>(null)
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

function mapAuthError(code: string, action: AuthAction): string {
  const errors = APP_STRINGS.login.errors
  switch (code) {
    case 'auth/invalid-email':
      return errors.invalidEmail
    case 'auth/user-disabled':
      return errors.userDisabled
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return errors.invalidCredential
    case 'auth/too-many-requests':
      return errors.tooManyRequests
    case 'auth/network-request-failed':
      return errors.network
    case 'auth/email-already-in-use':
      return errors.emailAlreadyInUse
    case 'auth/weak-password':
      return errors.weakPassword
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return errors.popupClosed
    case 'auth/popup-blocked':
      return errors.popupBlocked
    case 'auth/account-exists-with-different-credential':
      return errors.accountExistsDifferent
    default:
      if (action === 'register') return errors.genericRegister
      if (action === 'google') return errors.genericGoogle
      return errors.generic
  }
}

function isSistecontactEnabled(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function clearGoogleLoginParam() {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('google_login')) return
  params.delete('google_login')
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`
  window.history.replaceState({}, '', next)
}

async function assertSistecontactAccess(): Promise<void> {
  const access = await fetchAccessSettings()
  if (!isSistecontactEnabled(access.sistecontact_enabled)) {
    await signOut(auth)
    throw new Error(APP_STRINGS.login.errors.noAccess)
  }
}

async function wrapAuthAction(action: AuthAction, run: () => Promise<void>): Promise<void> {
  try {
    await run()
    await assertSistecontactAccess()
  } catch (err) {
    if (auth.currentUser) {
      await signOut(auth).catch(() => undefined)
    }
    if (err instanceof Error && err.message === APP_STRINGS.login.errors.noAccess) {
      throw err
    }
    if (err instanceof Error && err.message.includes('membresía activa')) {
      throw new Error(APP_STRINGS.login.errors.noAccess)
    }
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code: string }).code)
        : ''
    if (code) {
      throw new Error(mapAuthError(code, action))
    }
    if (err instanceof Error && err.message) {
      throw err
    }
    throw new Error(mapAuthError('', action))
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const completingGoogleRef = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ticket = params.get('google_login')
    const hasTicket = Boolean(ticket && ticket !== 'error')
    completingGoogleRef.current = hasTicket

    const unsub = onAuthStateChanged(auth, (next) => {
      void (async () => {
        if (!next) {
          if (completingGoogleRef.current) return
          setUser(null)
          setLoading(false)
          return
        }
        setLoading(true)
        try {
          await assertSistecontactAccess()
          setUser(next)
        } catch {
          setUser(null)
        } finally {
          setLoading(false)
        }
      })()
    })

    if (hasTicket && ticket) {
      void (async () => {
        try {
          const { custom_token: customToken } = await completeGoogleAuth(ticket)
          clearGoogleLoginParam()
          await signInWithCustomToken(auth, customToken)
        } catch {
          clearGoogleLoginParam()
          await signOut(auth).catch(() => undefined)
          sessionStorage.setItem('sistecontact.googleLoginError', '1')
          setUser(null)
          setLoading(false)
        } finally {
          completingGoogleRef.current = false
        }
      })()
    }

    return unsub
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    await wrapAuthAction('login', () =>
      signInWithEmailAndPassword(auth, email.trim(), password).then(() => undefined),
    )
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    await wrapAuthAction('register', () =>
      createUserWithEmailAndPassword(auth, email.trim(), password).then(() => undefined),
    )
  }, [])

  const loginWithGoogle = useCallback(async () => {
    try {
      const { auth_url: authURL } = await fetchGoogleAuthURL()
      window.location.assign(authURL)
    } catch {
      await wrapAuthAction('google', () =>
        signInWithPopup(auth, googleProvider).then(() => undefined),
      )
    }
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, loginWithGoogle, logout }),
    [user, loading, login, register, loginWithGoogle, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return ctx
}
