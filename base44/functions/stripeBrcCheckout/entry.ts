import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const BRC_PRICE_IDS = {
  monthly: Deno.env.get('STRIPE_PRICE_BRC_MONTHLY'),
  annual:  Deno.env.get('STRIPE_PRICE_BRC_ANNUAL'),
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

  const { billing_interval, success_url, cancel_url } = await req.json();
  const interval = billing_interval === 'annual' ? 'annual' : 'monthly';
  const priceId = BRC_PRICE_IDS[interval];

  if (!priceId) {
    return Response.json({ error: `Missing Stripe price ID for BRC/${interval}` }, { status: 500 });
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

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    automatic_tax: { enabled: true },
    subscription_data: {
      trial_period_days: 14,
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
      metadata: { organisation_id: org.id, product: 'brc_compliance', billing_interval: interval },
    },
    payment_method_collection: 'if_required',
    success_url: success_url || `${req.headers.get('origin')}/settings?tab=general&brc=success`,
    cancel_url:  cancel_url  || `${req.headers.get('origin')}/upgrade-brc?cancelled=1`,
    metadata: { organisation_id: org.id, product: 'brc_compliance', billing_interval: interval },
  });

  return Response.json({ url: session.url });
});
