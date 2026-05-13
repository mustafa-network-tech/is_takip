import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  /** E-posta/şifre olmadan misafir oturumu (Supabase’de anonim giriş açık olmalı). */
  signInAnonymously: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setSession(null)
      setLoading(false)
      return
    }

    let cancelled = false

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!cancelled) {
        setSession(s)
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase yapılandırılmadı.' }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    return { error: error?.message ?? null }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase yapılandırılmadı.' }
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })
    return { error: error?.message ?? null }
  }, [])

  const signInAnonymously = useCallback(async () => {
    if (!supabase) return { error: 'Supabase yapılandırılmadı.' }
    const { error } = await supabase.auth.signInAnonymously()
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signUp,
      signInAnonymously,
      signOut,
    }),
    [session, loading, signIn, signUp, signInAnonymously, signOut],
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth yalnızca AuthProvider içinde kullanılmalıdır.')
  }
  return ctx
}
