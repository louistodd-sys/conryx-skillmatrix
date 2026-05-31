// ── Tier definitions ─────────────────────────────────────────────────────────

export const TIERS = {
  free:    'free',
  starter: 'starter',
  growth:  'growth',
  scale:   'scale',
};

export const TIER_LABELS = {
  free:    'Free',
  starter: 'Starter',
  growth:  'Growth',
  scale:   'Scale',
};

// ── Hard limits per tier ──────────────────────────────────────────────────────
// null = unlimited

export const TIER_LIMITS = {
  free: {
    employees:      5,
    skills:         15,
    categories:     3,
    admin_seats:    1,
    manager_seats:  0,
  },
  starter: {
    employees:      30,
    skills:         50,
    categories:     5,
    admin_seats:    2,
    manager_seats:  3,
  },
  growth: {
    employees:      100,
    skills:         null,
    categories:     null,
    admin_seats:    3,
    manager_seats:  null,
  },
  scale: {
    employees:      250,
    skills:         null,
    categories:     null,
    admin_seats:    null,
    manager_seats:  null,
  },
};

// ── Feature gates ─────────────────────────────────────────────────────────────

export const TIER_FEATURES = {
  free: {
    core_matrix:              true,
    basic_gap_identification: true,
    gap_analysis_reports:     false,
    csv_export:               false,
    employee_portal:          false,
    pdf_reports:              false,
    site_level_views:         false,
    advanced_analytics:       false,
  },
  starter: {
    core_matrix:              true,
    basic_gap_identification: true,
    gap_analysis_reports:     true,
    csv_export:               true,
    employee_portal:          false,
    pdf_reports:              false,
    site_level_views:         false,
    advanced_analytics:       false,
  },
  growth: {
    core_matrix:              true,
    basic_gap_identification: true,
    gap_analysis_reports:     true,
    csv_export:               true,
    employee_portal:          true,
    pdf_reports:              true,
    site_level_views:         false,
    advanced_analytics:       false,
  },
  scale: {
    core_matrix:              true,
    basic_gap_identification: true,
    gap_analysis_reports:     true,
    csv_export:               true,
    employee_portal:          true,
    pdf_reports:              true,
    site_level_views:         true,
    advanced_analytics:       true,
  },
};

// ── Pricing ───────────────────────────────────────────────────────────────────

export const TIER_PRICING = {
  free:    { monthly: 0,   annual: 0    },
  starter: { monthly: 39,  annual: 390  },
  growth:  { monthly: 79,  annual: 790  },
  scale:   { monthly: 149, annual: 1490 },
};

// ── Upgrade prompt scenarios (Section 5 of spec) ──────────────────────────────

export function getUpgradePrompt(scenario, currentTier) {
  const prompts = {
    employee_limit: {
      free: {
        target: 'Starter',
        message: "You've reached the 5-employee limit. Upgrade to Starter to track up to 30 employees.",
        unlocks: ['Up to 30 employees', '50 skills', 'Gap analysis reports', 'CSV export', '3 manager seats'],
      },
      starter: {
        target: 'Growth',
        message: "You've reached the 30-employee limit. Upgrade to Growth to track up to 100 employees.",
        unlocks: ['Up to 100 employees', 'Unlimited skills & categories', 'Employee self-assessment portal', 'Audit-ready PDF reports', 'Unlimited managers'],
      },
      growth: {
        target: 'Scale',
        message: "You've reached the 100-employee limit. Upgrade to Scale to track up to 250 employees.",
        unlocks: ['Up to 250 employees', 'Department & site level views', 'Advanced analytics dashboard', 'Unlimited admin seats'],
      },
    },
    category_limit: {
      free: {
        target: 'Starter',
        message: "You've used all 3 categories. Upgrade to Starter to unlock 5 categories.",
        unlocks: ['Up to 5 categories', 'Up to 30 employees', 'Gap analysis reports', 'CSV export'],
      },
      starter: {
        target: 'Growth',
        message: "You've used all 5 categories. Upgrade to Growth for unlimited categories.",
        unlocks: ['Unlimited categories', 'Unlimited skills', 'Employee portal', 'PDF reports'],
      },
    },
    manager_seat_limit: {
      free: {
        target: 'Starter',
        message: "Manager seats are not available on Free. Upgrade to Starter to add up to 3 managers.",
        unlocks: ['3 manager seats', 'Gap analysis reports', 'CSV export', 'Up to 30 employees'],
      },
      starter: {
        target: 'Growth',
        message: "Starter includes 3 manager seats. Upgrade to Growth for unlimited managers.",
        unlocks: ['Unlimited manager seats', 'Employee self-assessment portal', 'Audit-ready PDF reports', 'Unlimited skills & categories'],
      },
    },
    pdf_export: {
      free: {
        target: 'Growth',
        message: "Audit-ready PDF reports are available on Growth and above.",
        unlocks: ['Audit-ready PDF reports', 'Employee self-assessment portal', 'Unlimited skills & categories', 'Unlimited managers'],
      },
      starter: {
        target: 'Growth',
        message: "Audit-ready PDF reports are available on Growth and above.",
        unlocks: ['Audit-ready PDF reports', 'Employee self-assessment portal', 'Unlimited skills & categories', 'Unlimited managers'],
      },
    },
    site_level_views: {
      free: {
        target: 'Scale',
        message: "Department and site views are available on Scale.",
        unlocks: ['Department & site level views', 'Advanced analytics dashboard', 'Unlimited admin seats', 'Up to 250 employees'],
      },
      starter: {
        target: 'Scale',
        message: "Department and site views are available on Scale.",
        unlocks: ['Department & site level views', 'Advanced analytics dashboard', 'Unlimited admin seats'],
      },
      growth: {
        target: 'Scale',
        message: "Department and site views are available on Scale.",
        unlocks: ['Department & site level views', 'Advanced analytics dashboard', 'Unlimited admin seats', 'Up to 250 employees'],
      },
    },
    csv_export: {
      free: {
        target: 'Starter',
        message: "CSV export is available on Starter and above.",
        unlocks: ['CSV export', 'Gap analysis reports', 'Up to 30 employees', '3 manager seats'],
      },
    },
    skill_limit: {
      free: {
        target: 'Starter',
        message: "You've reached the 15-skill limit. Upgrade to Starter to track up to 50 skills.",
        unlocks: ['Up to 50 skills', 'Up to 30 employees', 'Gap analysis reports', 'CSV export'],
      },
      starter: {
        target: 'Growth',
        message: "You've reached the 50-skill limit. Upgrade to Growth for unlimited skills.",
        unlocks: ['Unlimited skills', 'Unlimited categories', 'Employee portal', 'PDF reports'],
      },
    },
    admin_seat_limit: {
      free: {
        target: 'Starter',
        message: "Free includes 1 admin seat. Upgrade to Starter for 2 admin seats.",
        unlocks: ['2 admin seats', '3 manager seats', 'Up to 30 employees', 'Gap analysis reports'],
      },
      starter: {
        target: 'Growth',
        message: "Starter includes 2 admin seats. Upgrade to Growth for 3 admin seats.",
        unlocks: ['3 admin seats', 'Unlimited managers', 'Employee portal', 'PDF reports'],
      },
      growth: {
        target: 'Scale',
        message: "Growth includes 3 admin seats. Upgrade to Scale for unlimited admin seats.",
        unlocks: ['Unlimited admin seats', 'Department & site views', 'Advanced analytics', 'Up to 250 employees'],
      },
    },
  };

  return prompts[scenario]?.[currentTier] || null;
}

// ── Helper: check if a feature is available for a tier ───────────────────────

export function isFeatureAvailable(tier, feature) {
  return TIER_FEATURES[tier]?.[feature] ?? false;
}

// ── Helper: check if a limit is reached ──────────────────────────────────────

export function isAtLimit(tier, resource, currentCount) {
  const limit = TIER_LIMITS[tier]?.[resource];
  if (limit === null) return false; // unlimited
  return currentCount >= limit;
}

// ── BRC module pricing (add-on, independent of Skills Matrix tier) ────────────

export const BRC_PRICING = {
  monthly: 49,
  annual: 490, // ~17% saving vs monthly
};

// ── Next tier up ──────────────────────────────────────────────────────────────

export function getNextTier(currentTier) {
  const order = ['free', 'starter', 'growth', 'scale'];
  const idx = order.indexOf(currentTier);
  return idx < order.length - 1 ? order[idx + 1] : null;
}