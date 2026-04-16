import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TIER_LIMITS = {
  free:    { employees: 5,   skills: 15,  categories: 3,  admin_seats: 1,  manager_seats: 0   },
  starter: { employees: 30,  skills: 50,  categories: 5,  admin_seats: 2,  manager_seats: 3   },
  growth:  { employees: 100, skills: null, categories: null, admin_seats: 3, manager_seats: null },
  scale:   { employees: 250, skills: null, categories: null, admin_seats: null, manager_seats: null },
};

const UPGRADE_PROMPTS = {
  employee_limit: {
    free:    { target: 'Starter', message: "You've reached the 5-employee limit. Upgrade to Starter to track up to 30 employees.", unlocks: ['Up to 30 employees', '50 skills', 'Gap analysis reports', 'CSV export', '3 manager seats'] },
    starter: { target: 'Growth',  message: "You've reached the 30-employee limit. Upgrade to Growth to track up to 100 employees.", unlocks: ['Up to 100 employees', 'Unlimited skills & categories', 'Employee self-assessment portal', 'Audit-ready PDF reports', 'Unlimited managers'] },
    growth:  { target: 'Scale',   message: "You've reached the 100-employee limit. Upgrade to Scale to track up to 250 employees.", unlocks: ['Up to 250 employees', 'Department & site level views', 'Advanced analytics dashboard', 'Unlimited admin seats'] },
  },
  category_limit: {
    free:    { target: 'Starter', message: "You've used all 3 categories. Upgrade to Starter to unlock 5 categories.", unlocks: ['Up to 5 categories', 'Up to 30 employees', 'Gap analysis reports', 'CSV export'] },
    starter: { target: 'Growth',  message: "You've used all 5 categories. Upgrade to Growth for unlimited categories.", unlocks: ['Unlimited categories', 'Unlimited skills', 'Employee portal', 'PDF reports'] },
  },
  manager_seat_limit: {
    free:    { target: 'Starter', message: "Manager seats are not available on Free. Upgrade to Starter to add up to 3 managers.", unlocks: ['3 manager seats', 'Gap analysis reports', 'CSV export', 'Up to 30 employees'] },
    starter: { target: 'Growth',  message: "Starter includes 3 manager seats. Upgrade to Growth for unlimited managers.", unlocks: ['Unlimited manager seats', 'Employee self-assessment portal', 'Audit-ready PDF reports', 'Unlimited skills & categories'] },
  },
  pdf_export: {
    free:    { target: 'Growth', message: "Audit-ready PDF reports are available on Growth and above.", unlocks: ['Audit-ready PDF reports', 'Employee self-assessment portal', 'Unlimited skills & categories', 'Unlimited managers'] },
    starter: { target: 'Growth', message: "Audit-ready PDF reports are available on Growth and above.", unlocks: ['Audit-ready PDF reports', 'Employee self-assessment portal', 'Unlimited skills & categories', 'Unlimited managers'] },
  },
  site_level_views: {
    free:    { target: 'Scale', message: "Department and site views are available on Scale.", unlocks: ['Department & site level views', 'Advanced analytics dashboard', 'Unlimited admin seats', 'Up to 250 employees'] },
    starter: { target: 'Scale', message: "Department and site views are available on Scale.", unlocks: ['Department & site level views', 'Advanced analytics dashboard', 'Unlimited admin seats'] },
    growth:  { target: 'Scale', message: "Department and site views are available on Scale.", unlocks: ['Department & site level views', 'Advanced analytics dashboard', 'Unlimited admin seats', 'Up to 250 employees'] },
  },
  csv_export: {
    free: { target: 'Starter', message: "CSV export is available on Starter and above.", unlocks: ['CSV export', 'Gap analysis reports', 'Up to 30 employees', '3 manager seats'] },
  },
  skill_limit: {
    free:    { target: 'Starter', message: "You've reached the 15-skill limit. Upgrade to Starter to track up to 50 skills.", unlocks: ['Up to 50 skills', 'Up to 30 employees', 'Gap analysis reports', 'CSV export'] },
    starter: { target: 'Growth',  message: "You've reached the 50-skill limit. Upgrade to Growth for unlimited skills.", unlocks: ['Unlimited skills', 'Unlimited categories', 'Employee portal', 'PDF reports'] },
  },
  admin_seat_limit: {
    free:    { target: 'Starter', message: "Free includes 1 admin seat. Upgrade to Starter for 2 admin seats.", unlocks: ['2 admin seats', '3 manager seats', 'Up to 30 employees', 'Gap analysis reports'] },
    starter: { target: 'Growth',  message: "Starter includes 2 admin seats. Upgrade to Growth for 3 admin seats.", unlocks: ['3 admin seats', 'Unlimited managers', 'Employee portal', 'PDF reports'] },
    growth:  { target: 'Scale',   message: "Growth includes 3 admin seats. Upgrade to Scale for unlimited admin seats.", unlocks: ['Unlimited admin seats', 'Department & site views', 'Advanced analytics', 'Up to 250 employees'] },
  },
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { resource, organisation_id } = await req.json();
  const orgId = organisation_id || user.organisation_id;
  if (!orgId) return Response.json({ error: 'No organisation' }, { status: 400 });

  const orgs = await base44.entities.Organisation.filter({ id: orgId });
  if (!orgs.length) return Response.json({ error: 'Organisation not found' }, { status: 404 });

  const org = orgs[0];
  const tier = org.subscription_tier || 'free';
  const limits = TIER_LIMITS[tier];

  // Count the relevant resource
  let currentCount = 0;
  let scenario = null;

  if (resource === 'employee') {
    const members = await base44.entities.TeamMember.filter({ organisation_id: orgId, is_managed_member: true });
    const unique = new Set(members.map(m => m.user_id));
    currentCount = unique.size;
    scenario = 'employee_limit';
  } else if (resource === 'skill') {
    const skills = await base44.entities.Skill.filter({ organisation_id: orgId, status: 'active' });
    currentCount = skills.length;
    scenario = 'skill_limit';
  } else if (resource === 'category') {
    const cats = await base44.entities.SkillCategory.filter({ organisation_id: orgId });
    currentCount = cats.length;
    scenario = 'category_limit';
  } else if (resource === 'manager_seat') {
    const invitations = await base44.entities.Invitation.filter({ organisation_id: orgId, role: 'manager', status: 'accepted' });
    currentCount = invitations.length;
    scenario = 'manager_seat_limit';
  } else if (resource === 'admin_seat') {
    const invitations = await base44.entities.Invitation.filter({ organisation_id: orgId, role: 'admin', status: 'accepted' });
    currentCount = invitations.length;
    scenario = 'admin_seat_limit';
  } else if (resource === 'pdf_export') {
    const tierFeatures = { free: false, starter: false, growth: true, scale: true };
    if (!tierFeatures[tier]) {
      return Response.json({ allowed: false, upgrade_prompt: UPGRADE_PROMPTS.pdf_export[tier] || null });
    }
    return Response.json({ allowed: true });
  } else if (resource === 'csv_export') {
    const tierFeatures = { free: false, starter: true, growth: true, scale: true };
    if (!tierFeatures[tier]) {
      return Response.json({ allowed: false, upgrade_prompt: UPGRADE_PROMPTS.csv_export[tier] || null });
    }
    return Response.json({ allowed: true });
  } else if (resource === 'site_level_views') {
    const tierFeatures = { free: false, starter: false, growth: false, scale: true };
    if (!tierFeatures[tier]) {
      return Response.json({ allowed: false, upgrade_prompt: UPGRADE_PROMPTS.site_level_views[tier] || null });
    }
    return Response.json({ allowed: true });
  }

  const limit = limits[resource === 'employee' ? 'employees' : resource === 'skill' ? 'skills' : resource === 'category' ? 'categories' : resource === 'manager_seat' ? 'manager_seats' : 'admin_seats'];

  if (limit === null) return Response.json({ allowed: true, current: currentCount, limit: null });

  if (currentCount >= limit) {
    const prompt = UPGRADE_PROMPTS[scenario]?.[tier] || null;
    return Response.json({ allowed: false, current: currentCount, limit, upgrade_prompt: prompt });
  }

  return Response.json({ allowed: true, current: currentCount, limit });
});