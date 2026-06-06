/**
 * onboarding
 * Handles new org creation atomically:
 * - Receives: { org_name, user_full_name }
 * - Creates organisation record
 * - Updates public.users with organisation_id, full_name, role='admin'
 * - Creates Stripe customer
 * - Returns the new org
 */
import { corsHeaders } from '../_shared/cors.ts'
import { getUser, adminClient } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const user = await getUser(req)

    const { org_name, user_full_name } = await req.json()

    if (!org_name || !org_name.trim()) {
      return new Response(JSON.stringify({ error: 'org_name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = adminClient()

    // Check if user already belongs to an org
    if (user.organisation_id) {
      return new Response(JSON.stringify({ error: 'User already belongs to an organisation' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create the organisation record
    const { data: org, error: orgError } = await admin
      .from('organisations')
      .insert({
        name: org_name.trim(),
        subscription_tier: 'free',
        modules: ['skills_matrix'],
      })
      .select()
      .single()

    if (orgError || !org) {
      throw new Error(orgError?.message || 'Failed to create organisation')
    }

    // Create Stripe customer (skipped if STRIPE_SECRET_KEY not configured)
    let stripeCustomerId: string | null = null
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    try {
      if (stripeKey) {
        const { default: Stripe } = await import('https://esm.sh/stripe@14?target=deno')
        const stripe = new Stripe(stripeKey)
        const customer = await stripe.customers.create({
          email: user.email,
          name: org_name.trim(),
          metadata: { organisation_id: org.id, user_id: user.id },
        })
        stripeCustomerId = customer.id
      }
      if (stripeCustomerId) {
      // Store stripe_customer_id on the org
      await admin
        .from('organisations')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', org.id)

        org.stripe_customer_id = stripeCustomerId
      }
    } catch (stripeErr) {
      // Don't fail onboarding if Stripe fails — can be retried
      console.error('Stripe customer creation failed:', stripeErr)
    }

    // Upsert user profile: handles case where signup trigger didn't create the row
    const { error: userError } = await admin
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        organisation_id: org.id,
        full_name: user_full_name || user.full_name || null,
        role: 'admin',
      }, { onConflict: 'id' })

    if (userError) {
      // Roll back org creation
      await admin.from('organisations').delete().eq('id', org.id)
      throw new Error(`Failed to update user profile: ${userError.message}`)
    }

    return new Response(JSON.stringify({ organisation: org }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
