import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function getUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('Missing authorization header')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  )

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Unauthorized')

  // Get or create profile
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data: profile } = await admin
    .from('users')
    .upsert({ id: user.id, email: user.email }, { onConflict: 'id', ignoreDuplicates: true })
    .select()
    .single()

  if (!profile) {
    // upsert with ignoreDuplicates won't return existing rows — fetch separately
    const { data: existing } = await admin.from('users').select('*').eq('id', user.id).single()
    return { ...user, ...existing }
  }

  return { ...user, ...profile }
}

export function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}
