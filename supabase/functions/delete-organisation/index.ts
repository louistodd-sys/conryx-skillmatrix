import { corsHeaders } from '../_shared/cors.ts'
import { getUser, adminClient } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const user = await getUser(req)
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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

    // 1. Cancel & delete Stripe subscription and customer (skipped if no key)
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (stripeKey && (org.stripe_subscription_id || org.stripe_customer_id)) {
      try {
        const { default: Stripe } = await import('https://esm.sh/stripe@14?target=deno')
        const stripe = new Stripe(stripeKey)
        if (org.stripe_subscription_id) {
          try { await stripe.subscriptions.cancel(org.stripe_subscription_id) } catch (_) {}
        }
        if (org.stripe_customer_id) {
          try { await stripe.customers.del(org.stripe_customer_id) } catch (_) {}
        }
      } catch (_) {}
    }

    // 2. Cascade delete all entity data for this organisation
    await Promise.all([
      admin.from('skill_assessments').delete().eq('organisation_id', orgId),
      admin.from('team_members').delete().eq('organisation_id', orgId),
      admin.from('teams').delete().eq('organisation_id', orgId),
      admin.from('skills').delete().eq('organisation_id', orgId),
      admin.from('skill_categories').delete().eq('organisation_id', orgId),
      admin.from('team_required_skills').delete().eq('organisation_id', orgId),
      admin.from('notifications').delete().eq('organisation_id', orgId),
      admin.from('invitations').delete().eq('organisation_id', orgId),
    ])

    // 3. Anonymise audit log entries (retain for compliance but remove PII)
    const { data: auditLogs } = await admin
      .from('audit_log_entries')
      .select('id, action')
      .eq('organisation_id', orgId)

    if (auditLogs && auditLogs.length > 0) {
      await Promise.all(auditLogs.map((r: any) =>
        admin.from('audit_log_entries').update({
          actor_display: '[deleted]',
          target_display: '[deleted]',
          detail: JSON.stringify({ anonymised: true, original_action: r.action }),
        }).eq('id', r.id)
      ))
    }

    // 4. Delete the organisation record itself
    await admin.from('organisations').delete().eq('id', orgId)

    return new Response(JSON.stringify({ deleted: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
