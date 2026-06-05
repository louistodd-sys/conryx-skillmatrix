import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { corsHeaders } from '../_shared/cors.ts'
import { getUser, adminClient } from '../_shared/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const BRC_PRICE_ID = Deno.env.get('STRIPE_PRICE_BRC_MONTHLY')

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

    const { success_url, cancel_url } = await req.json()

    if (!BRC_PRICE_ID) {
      return new Response(JSON.stringify({ error: 'Missing Stripe price ID for BRC' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = adminClient()
    const { data: org, error: orgError } = await admin
      .from('organisations')
      .select('*')
      .eq('id', user.organisation_id)
      .single()

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: 'Organisation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Reuse existing Stripe customer (shared with Skills Matrix subscription)
    let customerId = org.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: { organisation_id: org.id, user_id: user.id },
      })
      customerId = customer.id
      await admin.from('organisations').update({ stripe_customer_id: customerId }).eq('id', org.id)
    }

    // Direct payment — no trial, pay from day one
    // Sharing a Stripe customer means both SM and BRC charges appear on one invoice automatically
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: BRC_PRICE_ID, quantity: 1 }],
      automatic_tax: { enabled: true },
      subscription_data: {
        metadata: { organisation_id: org.id, product: 'brc_compliance', billing_interval: 'monthly' },
      },
      success_url: success_url || `${req.headers.get('origin')}/settings?tab=general&brc=success`,
      cancel_url:  cancel_url  || `${req.headers.get('origin')}/upgrade-brc?cancelled=1`,
      metadata: { organisation_id: org.id, product: 'brc_compliance', billing_interval: 'monthly' },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
