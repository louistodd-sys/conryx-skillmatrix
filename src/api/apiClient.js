import { supabase } from '@/lib/supabaseClient'
import { entities } from './entities'
import { invokeFn } from './functions'

const auth = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    if (!user) throw { type: 'auth_required' }
    // Fetch profile from public.users
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    if (profileError) throw profileError
    return { ...user, ...profile }
  },
  async logout() {
    await supabase.auth.signOut()
  },
  async redirectToLogin() {
    // No-op: AuthContext handles sign-in UI directly
  },
}

export const apiClient = {
  entities,
  auth,
  functions: { invoke: invokeFn },
}

export default apiClient
