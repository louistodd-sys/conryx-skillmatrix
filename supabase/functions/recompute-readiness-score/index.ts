/**
 * recompute-readiness-score
 * Computes BRC audit-readiness score for one or all orgs.
 * - Called by scheduled automation nightly for all BRC orgs.
 * - Called server-side after any BRC entity state change.
 *
 * Input: { organisation_id? } — omit to run for all BRC orgs (scheduler use).
 */
import { corsHeaders } from '../_shared/cors.ts'
import { adminClient } from '../_shared/auth.ts'

const STATUS_RAG: Record<string, string> = {
  not_started:       'red',
  in_progress:       'amber',
  evidence_attached: 'amber',
  needs_review:      'amber',
  ready:             'green',
}

async function computeForOrg(admin: ReturnType<typeof adminClient>, orgId: string) {
  const [{ data: clauseStatuses }, { data: allClauses }, { data: orgs }] = await Promise.all([
    admin.from('brc_clause_statuses').select('*').eq('organisation_id', orgId),
    admin.from('brc_clauses').select('*').order('display_order').limit(500),
    admin.from('organisations').select('brc_standard').eq('id', orgId).limit(1),
  ])

  const org = orgs?.[0]
  if (!org || !org.brc_standard) return null

  const statusMap = Object.fromEntries((clauseStatuses || []).map((s: any) => [s.clause_id, s]))

  let red = 0, amber = 0, green = 0
  const bySection: Record<string, { red: number; amber: number; green: number }> = {}

  const filteredClauses = (allClauses || []).filter((c: any) => c.standard === org.brc_standard)

  for (const clause of filteredClauses) {
    const st = statusMap[clause.id]
    const rag = st ? (STATUS_RAG[st.status] || 'red') : 'red'
    if (rag === 'red')   red++
    if (rag === 'amber') amber++
    if (rag === 'green') green++

    // Group by issue_number (top section)
    const section = clause.issue_number || 'unknown'
    if (!bySection[section]) bySection[section] = { red: 0, amber: 0, green: 0 }
    bySection[section][rag as 'red' | 'amber' | 'green']++
  }

  const total = red + amber + green
  const overallPercent = total > 0 ? Math.round((green / total) * 100) : 0

  const score = {
    overall_percent: overallPercent,
    red_count:   red,
    amber_count: amber,
    green_count: green,
    by_section:  bySection,
    computed_at: new Date().toISOString(),
  }

  await admin
    .from('organisations')
    .update({ brc_readiness_score: score })
    .eq('id', orgId)

  return score
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const admin = adminClient()
    const body = await req.json().catch(() => ({}))
    const { organisation_id } = body

    // Determine if this is an authenticated user request
    let userId: string | null = null
    try {
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        // Validate token to get user context (optional for scheduler calls)
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
        const anonClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
        )
        const token = authHeader.replace('Bearer ', '')
        const { data: { user } } = await anonClient.auth.getUser(token)
        userId = user?.id || null
      }
    } catch (_) {}

    // If a specific org is requested, require authentication
    if (organisation_id && !userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get user's org if authenticated but no org specified
    let targetOrgId = organisation_id
    if (!targetOrgId && userId) {
      const { data: profile } = await admin
        .from('users')
        .select('organisation_id')
        .eq('id', userId)
        .single()
      targetOrgId = profile?.organisation_id || null
    }

    if (targetOrgId) {
      // Single org
      const score = await computeForOrg(admin, targetOrgId)
      return new Response(JSON.stringify({ success: true, organisation_id: targetOrgId, score }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Scheduler: all orgs with brc_compliance module
    const { data: allOrgs } = await admin.from('organisations').select('id, modules')
    const brcOrgs = (allOrgs || []).filter((o: any) => Array.isArray(o.modules) && o.modules.includes('brc_compliance'))

    const results = []
    for (const org of brcOrgs) {
      const score = await computeForOrg(admin, org.id)
      results.push({ organisation_id: org.id, score })
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
