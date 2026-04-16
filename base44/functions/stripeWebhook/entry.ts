import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature error: ${err.message}`, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  const getOrgFromSub = async (subscription) => {
    const orgId = subscription.metadata?.organisation_id;
    if (!orgId) return null;
    const orgs = await base44.asServiceRole.entities.Organisation.filter({ id: orgId });
    return orgs[0] || null;
  };

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orgId = session.metadata?.organisation_id;
    const tier  = session.metadata?.tier;
    const interval = session.metadata?.billing_interval;

    if (orgId && tier) {
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

      await base44.asServiceRole.entities.Organisation.update(orgId, {
        subscription_tier: tier,
        billing_interval: interval,
        stripe_subscription_id: sub.id,
        stripe_subscription_status: sub.status,
        current_period_end: periodEnd,
        trial_end_date: trialEnd,
      });
    }
  }

  else if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object;
    const org = await getOrgFromSub(sub);
    if (!org) return new Response('OK', { status: 200 });

    const tier = sub.metadata?.tier || org.subscription_tier;
    const interval = sub.metadata?.billing_interval || org.billing_interval;
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

    await base44.asServiceRole.entities.Organisation.update(org.id, {
      subscription_tier: sub.status === 'active' || sub.status === 'trialing' ? tier : 'free',
      stripe_subscription_status: sub.status,
      billing_interval: interval,
      current_period_end: periodEnd,
    });
  }

  // Only downgrade after ALL retries exhausted — triggered by invoice.payment_failed
  // with next_payment_attempt === null (Stripe sets this after final retry)
  else if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    // next_payment_attempt is null only when Stripe has given up all retries
    if (invoice.next_payment_attempt === null && invoice.subscription) {
      const sub = await stripe.subscriptions.retrieve(invoice.subscription);
      const orgId = sub.metadata?.organisation_id;
      if (orgId) {
        await base44.asServiceRole.entities.Organisation.update(orgId, {
          subscription_tier: 'free',
          stripe_subscription_status: 'past_due',
        });
      }
    }
  }

  else if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const org = await getOrgFromSub(sub);
    if (org) {
      await base44.asServiceRole.entities.Organisation.update(org.id, {
        subscription_tier: 'free',
        stripe_subscription_status: 'canceled',
        stripe_subscription_id: null,
        current_period_end: null,
      });
    }
  }

  return new Response('OK', { status: 200 });
});