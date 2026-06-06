import { supabase } from '@/lib/supabaseClient'

function toKebab(name) {
  return name.replace(/([A-Z])/g, (c) => `-${c.toLowerCase()}`)
}

export async function invokeFn(name, payload = {}) {
  const { data, error } = await supabase.functions.invoke(toKebab(name), { body: payload })
  if (error) throw error
  return { data }
}
