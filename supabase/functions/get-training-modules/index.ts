/**
 * get-training-modules
 * Returns training modules for the org, optionally filtered by skill_id.
 * Also returns task_completions for the current user keyed by module_id.
 */
import { corsHeaders } from '../_shared/cors.ts'
import { getUser, adminClient } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const user = await getUser(req)
    const orgId = user.organisation_id
    if (!orgId) {
      return new Response(JSON.stringify({ error: 'No organisation' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const skillId = url.searchParams.get('skill_id')

    const admin = adminClient()

    // Load modules
    let query = admin
      .from('training_modules')
      .select('*')
      .eq('organisation_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (skillId) {
      query = query.eq('skill_id', skillId)
    }

    const { data: modules, error: modulesError } = await query

    if (modulesError) throw new Error(modulesError.message)

    const moduleIds = (modules || []).map((m: any) => m.id)

    // Load completions for this user for those modules
    let completionsMap: Record<string, any> = {}
    if (moduleIds.length > 0) {
      const { data: completions } = await admin
        .from('task_completions')
        .select('*')
        .eq('user_id', user.id)
        .in('module_id', moduleIds)

      for (const c of completions || []) {
        completionsMap[c.module_id] = c
      }
    }

    return new Response(
      JSON.stringify({ modules: modules || [], completions: completionsMap }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
