import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../supabase'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }) {
  const [claims, setClaims] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return
    }

    let isMounted = true

    const syncAuth = async () => {
      const { data, error } = await supabase.auth.getClaims()
      if (!isMounted) return

      if (error || !data?.claims) {
        setClaims(null)
        setUser(null)
        setLoading(false)
        return
      }

      setClaims(data.claims)
      const { data: userData } = await supabase.auth.getUser()
      if (!isMounted) return
      setUser(userData?.user ?? null)
      setLoading(false)
    }

    syncAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      syncAuth()
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async ({ email, password }) => {
    if (!supabase) {
      return { data: null, error: new Error('Supabase is not configured.') }
    }
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signUp = async ({ email, password, fullName }) => {
    if (!supabase) {
      return { data: null, error: new Error('Supabase is not configured.') }
    }
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: fullName ? { full_name: fullName } : undefined,
      },
    })
  }

  const signOut = async () => {
    if (!supabase) {
      return { error: null }
    }
    return supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        claims,
        user,
        loading,
        isAuthenticated: Boolean(claims?.sub),
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
