'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
    }
  }

  useEffect(() => {
    // Get initial session and set user state.
    // fetchProfile is intentionally NOT called here — it runs in the separate
    // user?.id effect below, which executes outside the auth-js lock.
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        if (!session?.user) setProfile(null)
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes.
    //
    // IMPORTANT: Do NOT make any Supabase calls inside this callback.
    // @supabase/auth-js calls _notifyAllSubscribers() while holding its
    // internal JS mutex (lockAcquired = true). Any Supabase data query
    // inside this handler calls fetchWithAuth → getSession() → _acquireLock(),
    // which queues in pendingInLock. But pendingInLock only drains after the
    // current locked work finishes — creating a deadlock that hangs all
    // subsequent Supabase calls until a hard page refresh.
    //
    // Profile fetching is handled by the separate user?.id effect below,
    // which runs after React re-renders (outside the lock).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setProfile(null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Fetch the profile whenever the logged-in user changes.
  // This effect runs outside the auth-js lock (after React re-render),
  // so it never deadlocks — even if a token refresh is in progress.
  useEffect(() => {
    if (!user) return
    fetchProfile(user.id).then(setProfile)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
