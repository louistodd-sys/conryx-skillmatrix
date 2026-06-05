import { supabase } from '@/lib/supabaseClient'

export async function invokeFn(name, payload = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body: payload })
  if (error) throw error
  return { data }
}
