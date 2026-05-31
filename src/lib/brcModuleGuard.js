/**
 * Client-side BRC module guard.
 * NOTE: This is UX-only. Every BRC backend function enforces server-side.
 * Returns true if the organisation has the brc_compliance module enabled.
 */
export function hasBrcModule(org) {
  if (!org) return false;
  return Array.isArray(org.modules) && org.modules.includes('brc_compliance');
}

export function hasSkillsMatrixModule(org) {
  if (!org) return false;
  // Default to true for backwards compatibility (pre-backfill orgs)
  if (!Array.isArray(org.modules) || org.modules.length === 0) return true;
  return org.modules.includes('skills_matrix');
}

export function hasMultipleModules(org) {
  if (!org) return false;
  return Array.isArray(org.modules) && org.modules.length > 1;
}

// Returns true if the org has a paid/active BRC entitlement
export function hasBrcEntitlement(org) {
  if (!org) return false;
  return org.brc_subscription_status === 'active' || org.brc_subscription_status === 'trialing';
}

export const MODULE_SKILLS_MATRIX  = 'skills_matrix';
export const MODULE_BRC_COMPLIANCE = 'brc_compliance';

export const BRC_STANDARD_LABELS = {
  brcgs_packaging:         'BRCGS Packaging',
  brcgs_food:              'BRCGS Food Safety',
  brcgs_storage:           'BRCGS Storage & Distribution',
  brcgs_agents_brokers:    'BRCGS Agents & Brokers',
  brcgs_consumer_products: 'BRCGS Consumer Products',
};