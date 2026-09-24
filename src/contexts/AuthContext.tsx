import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { ensureUserProfile } from '@/lib/profiles'
import type { Profile } from '@/types'

const demoProfile: Profile = {
  id: 'demo-user',
  full_name: 'Demo User',
  email: '',
  role: 'owner',
}

interface AuthContextValue {
  user: Profile | null
  loading: boolean
  isDemoMode: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signInWithGoogle: () => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const DEMO_SESSION_KEY = 'sanro_demo_session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const isDemoMode = !isSupabaseConfigured

  const syncProfile = useCallback(async (authUser: User) => {
    const profile = await ensureUserProfile(authUser)
    setUser(profile)
    return profile
  }, [])

  useEffect(() => {
    let mounted = true
    let unsubscribe: (() => void) | undefined

    async function init() {
      if (isDemoMode) {
        const saved = localStorage.getItem(DEMO_SESSION_KEY)
        if (saved === '1' && mounted) setUser(demoProfile)
        if (mounted) setLoading(false)
        return
      }

      const { data } = await supabase!.auth.getSession()
      if (!mounted) return

      if (data.session?.user) {
        await syncProfile(data.session.user)
      }
      if (mounted) setLoading(false)

      const { data: sub } = supabase!.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          // Avoid blocking the auth callback; still persist to profiles
          void syncProfile(session.user)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
      })

      unsubscribe = () => sub.subscription.unsubscribe()
    }

    void init()
    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [isDemoMode, syncProfile])

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (isDemoMode) {
        if (!email.trim() || !password.trim()) {
          return { error: 'Please enter email and password.' }
        }
        localStorage.setItem(DEMO_SESSION_KEY, '1')
        setUser({ ...demoProfile, email: email.trim() })
        return {}
      }

      const { data, error } = await supabase!.auth.signInWithPassword({
        email,
        password,
      })
      if (error) return { error: error.message }

      if (data.user) {
        await syncProfile(data.user)
      }
      return {}
    },
    [isDemoMode, syncProfile],
  )

  const signInWithGoogle = useCallback(async () => {
    if (isDemoMode || !supabase) {
      return {
        error:
          'Google sign-in requires Supabase. Add your project URL and anon key to .env.',
      }
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    })

    if (error) return { error: error.message }
    return {}
  }, [isDemoMode])

  const signOut = useCallback(async () => {
    if (isDemoMode) {
      localStorage.removeItem(DEMO_SESSION_KEY)
      setUser(null)
      return
    }
    await supabase!.auth.signOut()
    setUser(null)
  }, [isDemoMode])

  const value = useMemo(
    () => ({ user, loading, isDemoMode, signIn, signInWithGoogle, signOut }),
    [user, loading, isDemoMode, signIn, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
