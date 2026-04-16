import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

  const orgs = await base44.entities.Organisation.filter({ id: user.organisation_id });
  if (!orgs.length) return Response.json({ invoices: [] });

  const org = orgs[0];
  if (!org.stripe_customer_id) return Response.json({ invoices: [] });

  const { data: invoices } = await stripe.invoices.list({
    customer: org.stripe_customer_id,
    limit: 24,
  });

  const result = invoices.map(inv => ({
    id: inv.id,
    date: new Date(inv.created * 1000).toISOString(),
    amount: inv.amount_paid,
    currency: inv.currency,
    status: inv.status,
    pdf_url: inv.invoice_pdf,
    hosted_url: inv.hosted_invoice_url,
    description: inv.lines?.data?.[0]?.description || '',
  }));

  return Response.json({ invoices: result });
});