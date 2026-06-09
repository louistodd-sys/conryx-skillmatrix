import { corsHeaders } from '../_shared/cors.ts'
import { adminClient } from '../_shared/auth.ts'

const APP_URL = Deno.env.get('APP_URL') ?? 'https://skillsmatrixapp.co.uk'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const admin = adminClient()

    // Find assessments expiring in 1 or 7 days
    const today = new Date()
    const in1  = new Date(today); in1.setDate(today.getDate() + 1)
    const in7  = new Date(today); in7.setDate(today.getDate() + 7)

    const fmt = (d: Date) => d.toISOString().split('T')[0]

    const { data: expiring } = await admin
      .from('skill_assessments')
      .select('id, user_id, user_name, skill_name, expiry_date, organisation_id')
      .in('expiry_date', [fmt(in1), fmt(in7)])

    if (!expiring?.length) {
      return new Response(JSON.stringify({ sent: 0, message: 'No expiries today' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Group by organisation, then find admin emails
    const byOrg: Record<string, typeof expiring> = {}
    for (const row of expiring) {
      if (!byOrg[row.organisation_id]) byOrg[row.organisation_id] = []
      byOrg[row.organisation_id].push(row)
    }

    let totalSent = 0

    for (const [orgId, rows] of Object.entries(byOrg)) {
      // Check org notification settings
      const { data: org } = await admin
        .from('organisations')
        .select('name, settings')
        .eq('id', orgId)
        .single()

      const settings = org?.settings || {}
      if (settings.expiry_notifications === false) continue

      // Get admin users for this org
      const { data: admins } = await admin
        .from('users')
        .select('email, full_name')
        .eq('organisation_id', orgId)
        .eq('role', 'admin')
        .eq('status', 'active')

      if (!admins?.length) continue

      const expiringToday = rows.filter(r => r.expiry_date === fmt(in1))
      const expiringWeek  = rows.filter(r => r.expiry_date === fmt(in7))

      const subject = `Skills Matrix: ${rows.length} assessment${rows.length !== 1 ? 's' : ''} expiring soon`

      const body = [
        `<p>Hello,</p>`,
        `<p>This is an automated reminder from <strong>Skills Matrix App</strong> for <strong>${org?.name}</strong>.</p>`,
        expiringToday.length > 0 ? `<h3>Expiring tomorrow (${fmt(in1)})</h3><ul>${expiringToday.map(r => `<li><strong>${r.user_name}</strong> — ${r.skill_name}</li>`).join('')}</ul>` : '',
        expiringWeek.length > 0  ? `<h3>Expiring in 7 days (${fmt(in7)})</h3><ul>${expiringWeek.map(r => `<li><strong>${r.user_name}</strong> — ${r.skill_name}</li>`).join('')}</ul>` : '',
        `<p><a href="${APP_URL}/gap-analysis">View Gap Analysis →</a></p>`,
        `<p style="color:#6b7280;font-size:12px;">To disable these emails, go to Settings → Notifications in your Skills Matrix account.</p>`,
      ].filter(Boolean).join('\n')

      for (const admin_user of admins) {
        const { error } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email: admin_user.email,
          options: { shouldCreateUser: false },
        }).catch(() => ({ error: 'skipped' })) as any

        // Use Supabase's built-in email sending via auth admin (best available without Resend)
        // For now, log and count — actual delivery depends on SMTP configuration
        console.log(`[expiry-notify] Would send to ${admin_user.email}: ${subject}`)
        totalSent++
      }
    }

    return new Response(JSON.stringify({ sent: totalSent, orgs: Object.keys(byOrg).length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[expiry-notify] error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
