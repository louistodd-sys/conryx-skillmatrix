import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PRICE_IDS = {
  starter: { monthly: Deno.env.get('STRIPE_PRICE_STARTER_MONTHLY'), annual: Deno.env.get('STRIPE_PRICE_STARTER_ANNUAL') },
  growth:  { monthly: Deno.env.get('STRIPE_PRICE_GROWTH_MONTHLY'),  annual: Deno.env.get('STRIPE_PRICE_GROWTH_ANNUAL')  },
  scale:   { monthly: Deno.env.get('STRIPE_PRICE_SCALE_MONTHLY'),   annual: Deno.env.get('STRIPE_PRICE_SCALE_ANNUAL')   },
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

  const { tier, billing_interval, success_url, cancel_url } = await req.json();

  if (!['starter', 'growth', 'scale'].includes(tier)) {
    return Response.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const interval = billing_interval === 'annual' ? 'annual' : 'monthly';
  const priceId = PRICE_IDS[tier][interval];

  if (!priceId) {
    return Response.json({ error: `Missing Stripe price ID for ${tier}/${interval}` }, { status: 500 });
  }

  const orgs = await base44.entities.Organisation.filter({ id: user.organisation_id });
  if (!orgs.length) return Response.json({ error: 'Organisation not found' }, { status: 404 });
  const org = orgs[0];

  // Reuse existing Stripe customer if available
  let customerId = org.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: org.name,
      metadata: { organisation_id: org.id, user_id: user.id },
    });
    customerId = customer.id;
    await base44.entities.Organisation.update(org.id, { stripe_customer_id: customerId });
  }

  // 14-day free trial, no card required at signup
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
      metadata: { organisation_id: org.id, tier, billing_interval: interval },
    },
    payment_method_collection: 'if_required', // No card required during trial
    success_url: success_url || `${req.headers.get('origin')}/settings?billing=success`,
    cancel_url:  cancel_url  || `${req.headers.get('origin')}/settings?billing=cancelled`,
    metadata: { organisation_id: org.id, tier, billing_interval: interval },
  });

  return Response.json({ url: session.url });
});