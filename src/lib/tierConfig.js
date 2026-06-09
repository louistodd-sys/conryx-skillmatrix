// ── Tier definitions ─────────────────────────────────────────────────────────

export const TIERS = {
  free:         'free',
  essential:    'essential',
  professional: 'professional',
};

export const TIER_LABELS = {
  free:         'Free',
  essential:    'Essential',
  professional: 'Professional',
};

// ── Hard limits per tier ──────────────────────────────────────────────────────
// null = unlimited

export const TIER_LIMITS = {
  free: {
    employees:      10,
    skills:         10,
    categories:     3,
    admin_seats:    1,
    manager_seats:  0,
  },
  essential: {
    employees:      50,
    skills:         30,
    categories:     null,
    admin_seats:    2,
    manager_seats:  null,
  },
  professional: {
    employees:      500,
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
    training_materials:       false,
  },
  essential: {
    core_matrix:              true,
    basic_gap_identification: true,
    gap_analysis_reports:     true,
    csv_export:               true,
    employee_portal:          true,
    pdf_reports:              false,
    site_level_views:         false,
    advanced_analytics:       false,
    training_materials:       true,
  },
  professional: {
    core_matrix:              true,
    basic_gap_identification: true,
    gap_analysis_reports:     true,
    csv_export:               true,
    employee_portal:          true,
    pdf_reports:              true,
    site_level_views:         true,
    advanced_analytics:       true,
    training_materials:       true,
  },
};

// ── Pricing (monthly only) ────────────────────────────────────────────────────

export const TIER_PRICING = {
  free:         { monthly: 0   },
  essential:    { monthly: 50  },
  professional: { monthly: 150 },
};

// ── Upgrade prompt scenarios ──────────────────────────────────────────────────

export function getUpgradePrompt(scenario, currentTier) {
  const prompts = {
    employee_limit: {
      free: {
        target: 'Essential',
        message: "You've reached the 10-member limit on Free. Upgrade to Essential to track up to 50 members.",
        unlocks: ['Up to 50 members', '30 skills', 'Gap analysis reports', 'CSV export', 'Employee portal', 'Unlimited managers'],
      },
      essential: {
        target: 'Professional',
        message: "You've reached the 50-member limit. Upgrade to Professional to track up to 500 members.",
        unlocks: ['Up to 500 members', 'Unlimited skills', 'PDF reports', 'Advanced analytics', 'Site-level views', 'Unlimited admin seats'],
      },
    },
    skill_limit: {
      free: {
        target: 'Essential',
        message: "You've reached the 10-skill limit on Free. Upgrade to Essential to track up to 30 skills.",
        unlocks: ['Up to 30 skills', 'Up to 50 members', 'Gap analysis reports', 'CSV export', 'Employee portal'],
      },
      essential: {
        target: 'Professional',
        message: "You've reached the 30-skill limit. Upgrade to Professional for unlimited skills.",
        unlocks: ['Unlimited skills', 'Unlimited members (up to 500)', 'PDF reports', 'Advanced analytics'],
      },
    },
    category_limit: {
      free: {
        target: 'Essential',
        message: "You've used all 3 categories. Upgrade to Essential for unlimited categories.",
        unlocks: ['Unlimited categories', 'Up to 50 members', 'Gap analysis reports', 'CSV export'],
      },
    },
    manager_seat_limit: {
      free: {
        target: 'Essential',
        message: "Manager seats are not available on Free. Upgrade to Essential for unlimited managers.",
        unlocks: ['Unlimited manager seats', 'Gap analysis reports', 'CSV export', 'Employee portal'],
      },
    },
    admin_seat_limit: {
      free: {
        target: 'Essential',
        message: "Free includes 1 admin seat. Upgrade to Essential for 2 admin seats.",
        unlocks: ['2 admin seats', 'Unlimited managers', 'Up to 50 members', 'Gap analysis reports'],
      },
      essential: {
        target: 'Professional',
        message: "Essential includes 2 admin seats. Upgrade to Professional for unlimited admin seats.",
        unlocks: ['Unlimited admin seats', 'Up to 500 members', 'PDF reports', 'Advanced analytics'],
      },
    },
    csv_export: {
      free: {
        target: 'Essential',
        message: "CSV export is available on Essential and above.",
        unlocks: ['CSV export', 'Gap analysis reports', 'Employee portal', 'Up to 50 members'],
      },
    },
    pdf_export: {
      free: {
        target: 'Professional',
        message: "PDF reports are available on Professional.",
        unlocks: ['PDF reports', 'Advanced analytics', 'Site-level views', 'Up to 500 members'],
      },
      essential: {
        target: 'Professional',
        message: "PDF reports are available on Professional.",
        unlocks: ['PDF reports', 'Advanced analytics', 'Site-level views', 'Unlimited admin seats'],
      },
    },
    site_level_views: {
      free: {
        target: 'Professional',
        message: "Site-level views are available on Professional.",
        unlocks: ['Site-level views', 'Advanced analytics', 'PDF reports', 'Up to 500 members'],
      },
      essential: {
        target: 'Professional',
        message: "Site-level views are available on Professional.",
        unlocks: ['Site-level views', 'Advanced analytics', 'PDF reports', 'Unlimited admin seats'],
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
  monthly: 50,
};

// ── Next tier up ──────────────────────────────────────────────────────────────

export function getNextTier(currentTier) {
  const order = ['free', 'essential', 'professional'];
  const idx = order.indexOf(currentTier);
  return idx < order.length - 1 ? order[idx + 1] : null;
}
