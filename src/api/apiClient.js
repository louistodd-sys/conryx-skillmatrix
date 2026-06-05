import { supabase } from '@/lib/supabaseClient'
import { entities } from './entities'
import { invokeFn } from './functions'

const auth = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    if (!user) throw { type: 'auth_required' }
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    if (profileError) throw profileError
    return { ...user, ...profile }
  },
  async updateMe(fields) {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw error || new Error('Not authenticated')
    const { data, error: updateError } = await supabase
      .from('users')
      .update(fields)
      .eq('id', user.id)
      .select()
      .single()
    if (updateError) throw updateError
    return data
  },
  async logout() {
    await supabase.auth.signOut()
  },
  async redirectToLogin() {
    // No-op: AuthContext handles sign-in UI directly
  },
}

const users = {
  async inviteUser(email, _role) {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { email },
    })
    if (error) throw error
    return data
  },
}

const integrations = {
  Core: {
    async UploadFile({ file }) {
      const ext = file.name.split('.').pop()
      const path = `logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage
        .from('logos')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
      return { file_url: publicUrl }
    },
  },
}

export const apiClient = {
  entities,
  auth,
  users,
  integrations,
  functions: { invoke: invokeFn },
}

export default apiClient
