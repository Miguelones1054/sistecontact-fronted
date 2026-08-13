import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { fetchAccessSettings } from '../services/api'
import { APP_STRINGS } from '../constants/strings'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapAuthError(code: string): string {
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
    default:
      return errors.generic
  }
}

function isSistecontactEnabled(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1'
}

async function assertSistecontactAccess(): Promise<void> {
  const access = await fetchAccessSettings()
  if (!isSistecontactEnabled(access.sistecontact_enabled)) {
    await signOut(auth)
    throw new Error(APP_STRINGS.login.errors.noAccess)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (next) => {
      void (async () => {
        if (!next) {
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
    return unsub
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
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
        throw new Error(mapAuthError(code))
      }
      if (err instanceof Error && err.message) {
        throw err
      }
      throw new Error(APP_STRINGS.login.errors.generic)
    }
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
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
