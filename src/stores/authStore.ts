import { create } from 'zustand'
import { supabase } from '../services/supabase'
import { User } from '../types'

interface AuthState {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  
  setUser: (user) => set({ user, loading: false }),
  
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    
    if (data.user) {
      // Try to fetch user profile, but don't fail if it doesn't exist
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()
      
      if (userData) {
        set({ user: userData, loading: false })
      } else {
        // If no profile exists, create a basic user object from auth data
        console.error('User profile not found:', userError)
        const basicUser = {
          id: data.user.id,
          email: data.user.email || '',
          full_name: data.user.email?.split('@')[0] || 'User',
          role: 'cashier' as const,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        set({ user: basicUser, loading: false })
      }
    }
  },
  
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },
  
  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (userData) {
        set({ user: userData, loading: false })
      } else {
        console.error('User profile not found during init:', userError)
        const basicUser = {
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.email?.split('@')[0] || 'User',
          role: 'cashier' as const,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        set({ user: basicUser, loading: false })
      }
    } else {
      set({ loading: false })
    }
    
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (userData) {
          set({ user: userData })
        } else {
          console.error('User profile not found during auth change:', userError)
          const basicUser = {
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.email?.split('@')[0] || 'User',
            role: 'cashier' as const,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          set({ user: basicUser })
        }
      } else {
        set({ user: null })
      }
    })
  },
}))
