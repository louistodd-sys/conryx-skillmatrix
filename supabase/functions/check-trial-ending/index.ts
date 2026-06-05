import { corsHeaders } from '../_shared/cors.ts'
import { adminClient } from '../_shared/auth.ts'
import { sendEmail } from '../_shared/email.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // This is a scheduled function — use service role
    // Optionally validate caller is admin if authenticated
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
      const anonClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
      )
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await anonClient.auth.getUser(token)
      if (user) {
        const admin = adminClient()
        const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
        if (profile && profile.role !== 'admin') {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    const admin = adminClient()
    const now = new Date()
    const in4Days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)

    // Get all orgs with trials that haven't had reminder sent
    const { data: orgs } = await admin.from('organisations').select('*')
    let sent = 0

    for (const org of (orgs || [])) {
      if (!org.trial_end_date || org.trial_email_sent) continue

      const trialEnd = new Date(org.trial_end_date)

      // Send when 4 days or fewer remain
      if (trialEnd >= now && trialEnd <= in4Days) {
        // Find admin user for this org
        const { data: users } = await admin
          .from('users')
          .select('*')
          .eq('organisation_id', org.id)
          .eq('role', 'admin')
          .limit(1)

        if (!users || !users.length) continue

        const adminUser = users[0]
        const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        await sendEmail({
          to: adminUser.email,
          subject: `Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
          text: `Hi ${adminUser.full_name},

Your Skills Matrix App free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.

To keep access to all your data and continue using Skills Matrix App without interruption, add your payment details before your trial ends.

Choose a plan:
- Essential — from £39/month — Up to 50 members, gap analysis, CSV export
- Professional — from £79/month — Up to 500 members, employee portal, PDF reports, unlimited skills

Upgrade now: https://skillsmatrixapp.com/settings

If you decide not to continue, your account will downgrade to the Free plan automatically.

Questions? Just reply to this email.

Best,
The Skills Matrix App Team`,
        })

        await admin
          .from('organisations')
          .update({ trial_email_sent: true })
          .eq('id', org.id)

        sent++
      }
    }

    return new Response(JSON.stringify({ checked: (orgs || []).length, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
