/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { login as loginRequest } from '../api/mockApi'
import type { LoginPayload, Session, SessionState } from '../types'

const SESSION_KEY = 'taskboard-session'

interface AuthContextValue {
  session: Session | null
  sessionState: SessionState
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readSession(): Session | null {
  try {
    const stored = window.localStorage.getItem(SESSION_KEY)
    if (!stored) return null
    return JSON.parse(stored) as Session
  } catch {
    window.localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession())
  const [sessionState, setSessionState] = useState<SessionState>('active')

  useEffect(() => {
    if (!session) {
      return
    }

    const checkExpiry = () => {
      if (new Date(session.expiresAt).getTime() <= Date.now()) {
        window.localStorage.removeItem(SESSION_KEY)
        setSession(null)
        setSessionState('expired')
      }
    }

    checkExpiry()
    const timer = window.setInterval(checkExpiry, 30000)
    return () => window.clearInterval(timer)
  }, [session])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      sessionState,
      async login(payload) {
        const nextSession = await loginRequest(payload)
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
        setSession(nextSession)
        setSessionState('active')
      },
      logout() {
        window.localStorage.removeItem(SESSION_KEY)
        setSession(null)
      },
    }),
    [session, sessionState],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
