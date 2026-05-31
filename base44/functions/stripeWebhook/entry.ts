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
    const orgId   = session.metadata?.organisation_id;
    const product  = session.metadata?.product;
    const tier     = session.metadata?.tier;
    const interval = session.metadata?.billing_interval;

    if (orgId && product === 'brc_compliance') {
      // BRC module checkout
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      const trialEnd  = sub.trial_end           ? new Date(sub.trial_end           * 1000).toISOString() : null;
      const periodEnd = sub.current_period_end  ? new Date(sub.current_period_end  * 1000).toISOString() : null;

      const orgs = await base44.asServiceRole.entities.Organisation.filter({ id: orgId });
      const org = orgs[0];
      const existingModules = Array.isArray(org?.modules) ? org.modules : ['skills_matrix'];
      const modules = [...new Set([...existingModules, 'brc_compliance'])];

      await base44.asServiceRole.entities.Organisation.update(orgId, {
        brc_subscription_status:    sub.status,
        brc_stripe_subscription_id: sub.id,
        brc_billing_interval:       interval,
        brc_current_period_end:     periodEnd,
        brc_trial_end_date:         trialEnd,
        brc_module_enabled_at:      new Date().toISOString(),
        modules,
      });
    } else if (orgId && tier) {
      // Skills Matrix tier checkout
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      const trialEnd  = sub.trial_end           ? new Date(sub.trial_end           * 1000).toISOString() : null;
      const periodEnd = sub.current_period_end  ? new Date(sub.current_period_end  * 1000).toISOString() : null;

      await base44.asServiceRole.entities.Organisation.update(orgId, {
        subscription_tier:          tier,
        billing_interval:           interval,
        stripe_subscription_id:     sub.id,
        stripe_subscription_status: sub.status,
        current_period_end:         periodEnd,
        trial_end_date:             trialEnd,
      });
    }
  }

  else if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object;
    const org = await getOrgFromSub(sub);
    if (!org) return new Response('OK', { status: 200 });

    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

    if (sub.metadata?.product === 'brc_compliance') {
      // BRC subscription update
      const isActive = sub.status === 'active' || sub.status === 'trialing';
      const existingModules = Array.isArray(org.modules) ? org.modules : ['skills_matrix'];
      const modules = isActive
        ? [...new Set([...existingModules, 'brc_compliance'])]
        : existingModules.filter(m => m !== 'brc_compliance');

      await base44.asServiceRole.entities.Organisation.update(org.id, {
        brc_subscription_status:    sub.status,
        brc_billing_interval:       sub.metadata?.billing_interval || org.brc_billing_interval,
        brc_current_period_end:     periodEnd,
        modules,
      });
    } else {
      // Skills Matrix tier update
      const tier     = sub.metadata?.tier     || org.subscription_tier;
      const interval = sub.metadata?.billing_interval || org.billing_interval;

      await base44.asServiceRole.entities.Organisation.update(org.id, {
        subscription_tier:          sub.status === 'active' || sub.status === 'trialing' ? tier : 'free',
        stripe_subscription_status: sub.status,
        billing_interval:           interval,
        current_period_end:         periodEnd,
      });
    }
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
        if (sub.metadata?.product === 'brc_compliance') {
          await base44.asServiceRole.entities.Organisation.update(orgId, {
            brc_subscription_status: 'past_due',
          });
        } else {
          await base44.asServiceRole.entities.Organisation.update(orgId, {
            subscription_tier: 'free',
            stripe_subscription_status: 'past_due',
          });
        }
      }
    }
  }

  else if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const org = await getOrgFromSub(sub);
    if (org) {
      if (sub.metadata?.product === 'brc_compliance') {
        const modules = (org.modules || ['skills_matrix']).filter(m => m !== 'brc_compliance');
        await base44.asServiceRole.entities.Organisation.update(org.id, {
          brc_subscription_status:    'canceled',
          brc_stripe_subscription_id: null,
          brc_current_period_end:     null,
          modules,
        });
      } else {
        await base44.asServiceRole.entities.Organisation.update(org.id, {
          subscription_tier:          'free',
          stripe_subscription_status: 'canceled',
          stripe_subscription_id:     null,
          current_period_end:         null,
        });
      }
    }
  }

  else if (event.type === 'customer.subscription.trial_will_end') {
    // Fires 3 days before trial ends
    const sub = event.data.object;
    const org = await getOrgFromSub(sub);
    if (!org) return new Response('OK', { status: 200 });

    const users = await base44.asServiceRole.entities.User.filter({ organisation_id: org.id, role: 'admin' });
    if (!users.length) return new Response('OK', { status: 200 });

    const adminUser = users[0];
    const trialEndDate = sub.trial_end ? new Date(sub.trial_end * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'soon';

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminUser.email,
      from_name: 'Skills Matrix App',
      subject: 'Your Skills Matrix App trial ends in 3 days',
      body: `
Hi ${adminUser.full_name},

Your free trial of Skills Matrix App ends on ${trialEndDate}.

To continue without interruption, add your payment details before your trial expires.

Manage your subscription: https://skillsmatrixapp.com/settings?tab=billing

If you have any questions, just reply to this email.

Best,
The Skills Matrix App Team
      `.trim(),
    });
  }

  else if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const orgId = invoice.subscription ? 
      (await stripe.subscriptions.retrieve(invoice.subscription))?.metadata?.organisation_id : null;
    if (!orgId) return new Response('OK', { status: 200 });

    const orgs = await base44.asServiceRole.entities.Organisation.filter({ id: orgId });
    if (!orgs.length) return new Response('OK', { status: 200 });
    const org = orgs[0];

    const users = await base44.asServiceRole.entities.User.filter({ organisation_id: orgId, role: 'admin' });
    if (!users.length) return new Response('OK', { status: 200 });

    const adminUser = users[0];
    const amount = invoice.amount_paid ? `£${(invoice.amount_paid / 100).toFixed(2)}` : 'your subscription';
    const invoiceUrl = invoice.hosted_invoice_url || null;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminUser.email,
      from_name: 'Skills Matrix App',
      subject: 'Payment confirmed — Skills Matrix App',
      body: `
Hi ${adminUser.full_name},

Your payment of ${amount} for Skills Matrix App has been received. Thank you!

${invoiceUrl ? `View your invoice: ${invoiceUrl}` : ''}

Your subscription is active and your team's access continues uninterrupted.

If you have any billing questions, reply to this email.

Best,
The Skills Matrix App Team
      `.trim(),
    });
  }

  return new Response('OK', { status: 200 });
});