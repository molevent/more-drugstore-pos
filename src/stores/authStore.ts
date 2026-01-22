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
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()
      
      set({ user: userData, loading: false })
    }
  },
  
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },
  
  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      set({ user: userData, loading: false })
    } else {
      set({ loading: false })
    }
    
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        set({ user: userData })
      } else {
        set({ user: null })
      }
    })
  },
}))
