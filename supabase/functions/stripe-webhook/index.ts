import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { corsHeaders } from '../_shared/cors.ts'
import { adminClient } from '../_shared/auth.ts'
import { sendEmail } from '../_shared/email.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret)
  } catch (err) {
    return new Response(`Webhook signature error: ${err.message}`, { status: 400 })
  }

  const admin = adminClient()

  const getOrgFromSub = async (subscription: Stripe.Subscription) => {
    const orgId = subscription.metadata?.organisation_id
    if (!orgId) return null
    const { data: org } = await admin.from('organisations').select('*').eq('id', orgId).single()
    return org || null
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const orgId   = session.metadata?.organisation_id
    const product = session.metadata?.product
    const tier    = session.metadata?.tier

    if (orgId && product === 'brc_compliance') {
      // BRC module checkout
      const sub = await stripe.subscriptions.retrieve(session.subscription as string)
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null

      const { data: org } = await admin.from('organisations').select('modules').eq('id', orgId).single()
      const existingModules = Array.isArray(org?.modules) ? org.modules : ['skills_matrix']
      const modules = [...new Set([...existingModules, 'brc_compliance'])]

      await admin.from('organisations').update({
        brc_subscription_status:    sub.status,
        brc_stripe_subscription_id: sub.id,
        brc_billing_interval:       'monthly',
        brc_current_period_end:     periodEnd,
        brc_module_enabled_at:      new Date().toISOString(),
        modules,
      }).eq('id', orgId)
    } else if (orgId && tier) {
      // Skills Matrix tier checkout
      const sub = await stripe.subscriptions.retrieve(session.subscription as string)
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null

      await admin.from('organisations').update({
        subscription_tier:          tier,
        billing_interval:           'monthly',
        stripe_subscription_id:     sub.id,
        stripe_subscription_status: sub.status,
        current_period_end:         periodEnd,
      }).eq('id', orgId)
    }
  }

  else if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const org = await getOrgFromSub(sub)
    if (!org) return new Response('OK', { status: 200 })

    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null

    if (sub.metadata?.product === 'brc_compliance') {
      const isActive = sub.status === 'active'
      const existingModules = Array.isArray(org.modules) ? org.modules : ['skills_matrix']
      const modules = isActive
        ? [...new Set([...existingModules, 'brc_compliance'])]
        : existingModules.filter((m: string) => m !== 'brc_compliance')

      await admin.from('organisations').update({
        brc_subscription_status: sub.status,
        brc_current_period_end:  periodEnd,
        modules,
      }).eq('id', org.id)
    } else {
      const tier = sub.metadata?.tier || org.subscription_tier

      await admin.from('organisations').update({
        subscription_tier:          sub.status === 'active' ? tier : 'free',
        stripe_subscription_status: sub.status,
        current_period_end:         periodEnd,
      }).eq('id', org.id)
    }
  }

  // Only downgrade after ALL retries exhausted
  else if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    if (invoice.next_payment_attempt === null && invoice.subscription) {
      const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
      const orgId = sub.metadata?.organisation_id
      if (orgId) {
        if (sub.metadata?.product === 'brc_compliance') {
          await admin.from('organisations').update({
            brc_subscription_status: 'past_due',
          }).eq('id', orgId)
        } else {
          await admin.from('organisations').update({
            subscription_tier:          'free',
            stripe_subscription_status: 'past_due',
          }).eq('id', orgId)
        }
      }
    }
  }

  else if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const org = await getOrgFromSub(sub)
    if (org) {
      if (sub.metadata?.product === 'brc_compliance') {
        const modules = (org.modules || ['skills_matrix']).filter((m: string) => m !== 'brc_compliance')
        await admin.from('organisations').update({
          brc_subscription_status:    'canceled',
          brc_stripe_subscription_id: null,
          brc_current_period_end:     null,
          modules,
        }).eq('id', org.id)
      } else {
        await admin.from('organisations').update({
          subscription_tier:          'free',
          stripe_subscription_status: 'canceled',
          stripe_subscription_id:     null,
          current_period_end:         null,
        }).eq('id', org.id)
      }
    }
  }

  else if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice
    const orgId = invoice.subscription
      ? (await stripe.subscriptions.retrieve(invoice.subscription as string))?.metadata?.organisation_id
      : null
    if (!orgId) return new Response('OK', { status: 200 })

    const { data: org } = await admin.from('organisations').select('*').eq('id', orgId).single()
    if (!org) return new Response('OK', { status: 200 })

    const { data: adminUsers } = await admin
      .from('users')
      .select('*')
      .eq('organisation_id', orgId)
      .eq('role', 'admin')
      .limit(1)

    if (!adminUsers?.length) return new Response('OK', { status: 200 })

    const adminUser = adminUsers[0]
    const amount = invoice.amount_paid ? `£${(invoice.amount_paid / 100).toFixed(2)}` : 'your subscription'
    const invoiceUrl = invoice.hosted_invoice_url || null

    await sendEmail({
      to: adminUser.email,
      subject: 'Payment confirmed — Skills Matrix App',
      text: `Hi ${adminUser.full_name},

Your payment of ${amount} for Skills Matrix App has been received. Thank you!

${invoiceUrl ? `View your invoice: ${invoiceUrl}` : ''}

Your subscription is active and your team's access continues uninterrupted.

If you have any billing questions, reply to this email.

Best,
The Skills Matrix App Team`.trim(),
    }).catch(() => {})
  }

  return new Response('OK', { status: 200 })
})
