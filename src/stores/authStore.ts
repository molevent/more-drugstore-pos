import { create } from 'zustand'
import { supabase } from '../services/supabase'
import { User } from '../types'

// Helper function to log activity
async function logActivity(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, any>
) {
  try {
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_details: details
    })
  } catch (err) {
    console.error('Failed to log activity:', err)
  }
}

// Export helper functions
export function getCurrentUser(): User | null {
  return useAuthStore.getState().user
}

export function isAuthenticated(): boolean {
  return useAuthStore.getState().user !== null
}

export function getCurrentUserRole(): string | null {
  return useAuthStore.getState().user?.role || null
}

export function getCurrentUserDisplayName(): string {
  const user = useAuthStore.getState().user
  return user?.full_name || user?.username || user?.email?.split('@')[0] || 'ผู้ใช้'
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  setUser: (user: User | null) => void
  signIn: (identifier: string, password: string) => Promise<void>
  signInWithUsername: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  hasError: () => boolean
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,
  
  setUser: (user) => set({ user, loading: false, error: null }),
  
  hasError: () => get().error !== null,
  clearError: () => set({ error: null }),
  
  signIn: async (identifier: string, password: string) => {
    set({ loading: true, error: null })
    
    try {
      // Check if identifier looks like an email or username
      const isEmail = identifier.includes('@')
      
      let email = identifier
      
      // If it's a username, look up the email from the database
      if (!isEmail) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('username', identifier)
          .eq('is_active', true)
          .single()
        
        if (userError || !userData) {
          throw new Error('ไม่พบชื่อผู้ใช้นี้ในระบบ หรือบัญชีถูกระงับ')
        }
        
        email = userData.email
      }
      
      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง')
        }
        throw error
      }
      
      if (data.user) {
        // Fetch user profile
        const { data: userData, error: _userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()
        
        if (userData) {
          // Check if user is active
          if (!userData.is_active) {
            await supabase.auth.signOut()
            throw new Error('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ')
          }
          
          set({ user: userData, loading: false, error: null })
          
          // Log the login activity
          await logActivity(userData.id, 'login', 'user', userData.id, {
            method: isEmail ? 'email' : 'username',
            role: userData.role
          })
        } else {
          throw new Error('ไม่พบข้อมูลผู้ใช้ในระบบ')
        }
      }
    } catch (err: any) {
      console.error('Login error:', err)
      set({ 
        user: null, 
        loading: false, 
        error: err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' 
      })
      throw err
    }
  },
  
  signInWithUsername: async (username: string, password: string) => {
    return get().signIn(username, password)
  },
  
  signOut: async () => {
    const currentUser = get().user
    
    // Log logout activity before signing out
    if (currentUser) {
      await logActivity(currentUser.id, 'logout', 'user', currentUser.id, {
        role: currentUser.role
      })
    }
    
    await supabase.auth.signOut()
    set({ user: null, error: null })
  },
  
  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const { data: userData, error: _userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (userData && userData.is_active) {
          set({ user: userData, loading: false, error: null })
        } else {
          // User not found or inactive
          await supabase.auth.signOut()
          set({ user: null, loading: false, error: null })
        }
      } else {
        set({ loading: false, error: null })
      }
    } catch (err: any) {
      // Handle Supabase AbortError (lock acquisition issue)
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        console.log('Supabase auth initialization aborted, retrying...')
        setTimeout(() => {
          useAuthStore.getState().initialize()
        }, 500)
        return
      }
      console.error('Error during auth initialization:', err)
      set({ loading: false, error: null })
    }
    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (userData && userData.is_active) {
          set({ user: userData })
        } else {
          await supabase.auth.signOut()
          set({ user: null })
        }
      } else {
        set({ user: null })
      }
    })
  },
}))
