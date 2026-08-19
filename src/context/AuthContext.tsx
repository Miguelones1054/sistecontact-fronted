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
import { FirebaseError } from 'firebase/app'
import { auth } from '../lib/firebase'
import { completeGoogleAuth, completeGoogleAuthWithIDToken, fetchAccessSettings } from '../services/api'
import { APP_STRINGS } from '../constants/strings'

interface AuthContextValue {
  user: User | null
  loading: boolean
  membershipEnabled: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  loginWithGoogle: (intent?: 'login' | 'register') => Promise<void>
  logout: () => Promise<void>
  refreshMembership: () => Promise<void>
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

async function loadMembership(): Promise<boolean> {
  try {
    const access = await fetchAccessSettings()
    return isSistecontactEnabled(access.sistecontact_enabled)
  } catch {
    return false
  }
}

async function wrapAuthAction(action: AuthAction, run: () => Promise<void>): Promise<void> {
  try {
    await run()
  } catch (err) {
    if (err instanceof Error && err.message === APP_STRINGS.login.errors.noAccess) {
      throw err
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
  const [membershipEnabled, setMembershipEnabled] = useState(false)
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
          setMembershipEnabled(false)
          setLoading(false)
          return
        }
        setLoading(true)
        const enabled = await loadMembership()
        setMembershipEnabled(enabled)
        setUser(next)
        setLoading(false)
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
          setMembershipEnabled(false)
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

  const loginWithGoogle = useCallback(async (_intent: 'login' | 'register' = 'login') => {
    await wrapAuthAction('google', async () => {
      try {
        await signInWithPopup(auth, googleProvider)
      } catch (err) {
        if (
          !(err instanceof FirebaseError) ||
          err.code !== 'auth/account-exists-with-different-credential'
        ) {
          throw err
        }
        const cred = GoogleAuthProvider.credentialFromError(err)
        const idToken = cred?.idToken
        if (!idToken) {
          throw err
        }
        const { custom_token: customToken } = await completeGoogleAuthWithIDToken(idToken)
        await signInWithCustomToken(auth, customToken)
      }
    })
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
  }, [])

  const refreshMembership = useCallback(async () => {
    if (!auth.currentUser) {
      setMembershipEnabled(false)
      return
    }
    const enabled = await loadMembership()
    setMembershipEnabled(enabled)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      membershipEnabled,
      login,
      register,
      loginWithGoogle,
      logout,
      refreshMembership,
    }),
    [
      user,
      loading,
      membershipEnabled,
      login,
      register,
      loginWithGoogle,
      logout,
      refreshMembership,
    ],
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
