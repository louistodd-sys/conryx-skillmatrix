import { corsHeaders } from '../_shared/cors.ts'
import { getUser, adminClient } from '../_shared/auth.ts'

const TIER_LIMITS: Record<string, Record<string, number | null>> = {
  free:         { employees: 10,  skills: 10,  categories: 3,    admin_seats: 1,    manager_seats: 0    },
  essential:    { employees: 50,  skills: 30,  categories: null, admin_seats: 2,    manager_seats: null },
  professional: { employees: 500, skills: null, categories: null, admin_seats: null, manager_seats: null },
}

const UPGRADE_PROMPTS: Record<string, Record<string, { target: string; message: string; unlocks: string[] }>> = {
  employee_limit: {
    free:      { target: 'Essential',    message: "You've reached the limit of 10 tracked employees on Free. Upgrade to Essential to track up to 50 employees.",      unlocks: ['Track up to 50 employees', '30 skills', 'Gap analysis reports', 'CSV export', 'Employee portal', 'Unlimited managers'] },
    essential: { target: 'Professional', message: "You've reached the limit of 50 tracked employees. Upgrade to Professional to track up to 500 employees.",           unlocks: ['Track up to 500 employees', 'Unlimited skills', 'PDF reports', 'Advanced analytics', 'Site-level views', 'Unlimited admin logins'] },
  },
  skill_limit: {
    free:      { target: 'Essential',    message: "You've reached the 10-skill limit on Free. Upgrade to Essential to track up to 30 skills.",          unlocks: ['Up to 30 skills', 'Track up to 50 employees', 'Gap analysis reports', 'CSV export', 'Employee portal'] },
    essential: { target: 'Professional', message: "You've reached the 30-skill limit. Upgrade to Professional for unlimited skills.",                   unlocks: ['Unlimited skills', 'Track up to 500 employees', 'PDF reports', 'Advanced analytics'] },
  },
  category_limit: {
    free:      { target: 'Essential',    message: "You've used all 3 categories. Upgrade to Essential for unlimited categories.",                       unlocks: ['Unlimited categories', 'Track up to 50 employees', 'Gap analysis reports', 'CSV export'] },
  },
  manager_seat_limit: {
    free:      { target: 'Essential',    message: "Manager logins are not available on Free. Upgrade to Essential for unlimited manager logins.",       unlocks: ['Unlimited manager logins', 'Gap analysis reports', 'CSV export', 'Employee portal'] },
  },
  admin_seat_limit: {
    free:      { target: 'Essential',    message: "Free includes 1 admin login. Upgrade to Essential for 2 admin logins.",                             unlocks: ['2 admin logins', 'Unlimited manager logins', 'Track up to 50 employees', 'Gap analysis reports'] },
    essential: { target: 'Professional', message: "Essential includes 2 admin logins. Upgrade to Professional for unlimited admin logins.",             unlocks: ['Unlimited admin logins', 'Track up to 500 employees', 'PDF reports', 'Advanced analytics'] },
  },
  csv_export: {
    free:      { target: 'Essential',    message: "CSV export is available on Essential and above.",                                                   unlocks: ['CSV export', 'Gap analysis reports', 'Employee portal', 'Up to 50 members'] },
  },
  pdf_export: {
    free:      { target: 'Professional', message: "PDF reports are available on Professional.",                                                        unlocks: ['PDF reports', 'Advanced analytics', 'Site-level views', 'Up to 500 members'] },
    essential: { target: 'Professional', message: "PDF reports are available on Professional.",                                                        unlocks: ['PDF reports', 'Advanced analytics', 'Site-level views', 'Unlimited admin seats'] },
  },
  site_level_views: {
    free:      { target: 'Professional', message: "Site-level views are available on Professional.",                                                   unlocks: ['Site-level views', 'Advanced analytics', 'PDF reports', 'Up to 500 members'] },
    essential: { target: 'Professional', message: "Site-level views are available on Professional.",                                                   unlocks: ['Site-level views', 'Advanced analytics', 'PDF reports', 'Unlimited admin seats'] },
  },
}

// Storage quota in bytes per tier
const STORAGE_QUOTA_BYTES: Record<string, number> = {
  free:         100  * 1024 * 1024,
  essential:    5    * 1024 * 1024 * 1024,
  professional: 50   * 1024 * 1024 * 1024,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const user = await getUser(req)
    const { resource, module: requestedModule } = await req.json()
    const module = requestedModule || 'skills_matrix'

    const orgId = user.organisation_id
    if (!orgId) {
      return new Response(JSON.stringify({ error: 'No organisation' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = adminClient()
    const { data: org, error: orgError } = await admin
      .from('organisations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: 'Organisation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const tier = org.subscription_tier || 'free'

    // Module entitlement gate
    const orgModules = Array.isArray(org.modules) ? org.modules : ['skills_matrix']
    if (!orgModules.includes(module)) {
      return new Response(JSON.stringify({
        allowed: false,
        has_limit: true,
        current_limit: 0,
        exceeds: true,
        reason: 'module_not_entitled',
        upgrade_prompt: {
          target: 'BRC Compliance Module',
          message: `Your organisation does not have access to the ${module === 'brc_compliance' ? 'BRC Compliance' : module} module.`,
          unlocks: ['BRC Compliance Readiness module'],
        },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free

    let currentCount = 0
    let scenario: string | null = null

    if (resource === 'employee') {
      // Count every distinct person tracked in the skills matrix (any team_member
      // row), regardless of whether they have an app login or are managed-only.
      // A person on multiple teams counts once.
      const { data: members } = await admin
        .from('team_members')
        .select('user_id')
        .eq('organisation_id', orgId)
      const unique = new Set((members || []).map((m: any) => m.user_id))
      currentCount = unique.size
      scenario = 'employee_limit'
    } else if (resource === 'skill') {
      const { count } = await admin
        .from('skills')
        .select('*', { count: 'exact', head: true })
        .eq('organisation_id', orgId)
        .eq('status', 'active')
      currentCount = count || 0
      scenario = 'skill_limit'
    } else if (resource === 'category') {
      const { count } = await admin
        .from('skill_categories')
        .select('*', { count: 'exact', head: true })
        .eq('organisation_id', orgId)
      currentCount = count || 0
      scenario = 'category_limit'
    } else if (resource === 'manager_seat') {
      const { count } = await admin
        .from('invitations')
        .select('*', { count: 'exact', head: true })
        .eq('organisation_id', orgId)
        .eq('role', 'manager')
        .eq('status', 'accepted')
      currentCount = count || 0
      scenario = 'manager_seat_limit'
    } else if (resource === 'admin_seat') {
      const { count } = await admin
        .from('invitations')
        .select('*', { count: 'exact', head: true })
        .eq('organisation_id', orgId)
        .eq('role', 'admin')
        .eq('status', 'accepted')
      currentCount = count || 0
      scenario = 'admin_seat_limit'
    } else if (resource === 'pdf_export') {
      const allowed = tier === 'professional'
      if (!allowed) {
        return new Response(JSON.stringify({ allowed: false, upgrade_prompt: UPGRADE_PROMPTS.pdf_export[tier] || null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else if (resource === 'csv_export') {
      const allowed = tier === 'essential' || tier === 'professional'
      if (!allowed) {
        return new Response(JSON.stringify({ allowed: false, upgrade_prompt: UPGRADE_PROMPTS.csv_export[tier] || null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else if (resource === 'site_level_views') {
      const allowed = tier === 'professional'
      if (!allowed) {
        return new Response(JSON.stringify({ allowed: false, upgrade_prompt: UPGRADE_PROMPTS.site_level_views[tier] || null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else if (resource === 'evidence_storage_mb') {
      const quotaBytes = STORAGE_QUOTA_BYTES[tier] ?? STORAGE_QUOTA_BYTES.free
      const { data: existingFiles } = await admin
        .from('evidence_files')
        .select('size_bytes')
        .eq('organisation_id', orgId)
        .eq('is_redacted', false)
      const usedBytes = (existingFiles || []).reduce((sum: number, f: any) => sum + (f.size_bytes || 0), 0)
      const quotaMB = Math.round(quotaBytes / (1024 * 1024))
      const usedMB  = Math.round(usedBytes  / (1024 * 1024))
      const allowed = usedBytes < quotaBytes
      return new Response(JSON.stringify({ allowed, current: usedMB, limit: quotaMB, used_bytes: usedBytes, quota_bytes: quotaBytes }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const limitKey = resource === 'employee' ? 'employees'
      : resource === 'skill' ? 'skills'
      : resource === 'category' ? 'categories'
      : resource === 'manager_seat' ? 'manager_seats'
      : 'admin_seats'

    const limit = limits[limitKey]

    if (limit === null) {
      return new Response(JSON.stringify({ allowed: true, current: currentCount, limit: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (currentCount >= limit) {
      const prompt = scenario ? (UPGRADE_PROMPTS[scenario]?.[tier] || null) : null
      return new Response(JSON.stringify({ allowed: false, current: currentCount, limit, upgrade_prompt: prompt }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ allowed: true, current: currentCount, limit }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
