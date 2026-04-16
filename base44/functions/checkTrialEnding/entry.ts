import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // This is a scheduled function — use service role
  const user = await base44.auth.me().catch(() => null);
  if (user && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const in4Days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
  const in10Days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  // Get all orgs with trials that haven't had reminder sent
  const orgs = await base44.asServiceRole.entities.Organisation.list();
  let sent = 0;

  for (const org of orgs) {
    if (!org.trial_end_date || org.trial_email_sent) continue;

    const trialEnd = new Date(org.trial_end_date);

    // Send at day 10 (4 days remaining)
    if (trialEnd >= now && trialEnd <= in4Days) {
      // Find admin user for this org
      const users = await base44.asServiceRole.entities.User.filter({ organisation_id: org.id, role: 'admin' });
      if (!users.length) continue;

      const adminUser = users[0];
      const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: adminUser.email,
        from_name: 'SkillsMatrix',
        subject: `Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
        body: `
Hi ${adminUser.full_name},

Your SkillsMatrix free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.

To keep access to all your data and continue using SkillsMatrix without interruption, add your payment details before your trial ends.

Choose a plan:
• Starter — £29/month (or £288/year) — Up to 30 employees, gap analysis, CSV export
• Growth — £59/month (or £588/year) — Up to 100 employees, employee portal, PDF reports
• Scale — £119/month (or £1,188/year) — Up to 250 employees, site views, advanced analytics

Upgrade now: ${org.slug ? `https://skillsmatrix.io` : 'https://skillsmatrix.io'}/settings

If you decide not to continue, your account will downgrade to the Free plan automatically.

Questions? Just reply to this email.

Best,
The SkillsMatrix Team
        `.trim(),
      });

      await base44.asServiceRole.entities.Organisation.update(org.id, { trial_email_sent: true });
      sent++;
    }
  }

  return Response.json({ checked: orgs.length, sent });
});