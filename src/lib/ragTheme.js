/**
 * Single source of truth for how RAG status looks and reads across the app.
 *
 * Design notes (visual management):
 *  - Fills are chosen so the four states also separate by LIGHTNESS, not just hue.
 *    Green (L≈32%) < Red (L≈48%) < Amber (L≈60%) < Not-required (L≈96%). That keeps
 *    the grid readable in greyscale, on a photocopied audit pack, and for the ~8% of
 *    men with red/green colour vision deficiency.
 *  - Every state also carries a non-colour `marker` cue drawn in the cell corner,
 *    so status is never communicated by colour alone (WCAG 1.4.1).
 *  - "Not required" is deliberately recessive: the eye should land on red and amber.
 */

export const RAG_THEME = {
  green: {
    key: 'green',
    label: 'Current',
    short: 'Current',
    description: 'Assessed, at or above the required level, and not near expiry.',
    bg: '#15803d',
    fg: '#ffffff',
    marker: 'none',
    chipBg: '#dcfce7',
    chipFg: '#14532d',
    dot: '#15803d',
  },
  amber: {
    key: 'amber',
    label: 'Expiring soon',
    short: 'Expiring',
    description: 'Still valid, but inside the renewal warning window — book the refresher.',
    bg: '#f59e0b',
    fg: '#3f2100',
    marker: 'flag',
    chipBg: '#fef3c7',
    chipFg: '#78350f',
    dot: '#f59e0b',
  },
  red: {
    key: 'red',
    label: 'Gap',
    short: 'Gap',
    description: 'Expired, below the required level, or required but never assessed.',
    bg: '#dc2626',
    fg: '#ffffff',
    marker: 'bar',
    chipBg: '#fee2e2',
    chipFg: '#7f1d1d',
    dot: '#dc2626',
  },
  grey: {
    key: 'grey',
    label: 'Not required',
    short: 'Not required',
    description: 'Not a requirement for this person’s team, and not assessed.',
    bg: '#f1f5f9',
    fg: '#64748b',
    marker: 'dashed',
    chipBg: '#f1f5f9',
    chipFg: '#475569',
    dot: '#cbd5e1',
  },
};

export const RAG_ORDER = ['red', 'amber', 'green', 'grey'];

/** Coverage / compliance percentage → chip colours. Shared by every % badge. */
export function coverageStyle(pct) {
  if (pct >= 90) return { bg: '#dcfce7', fg: '#14532d', band: 'Strong' };
  if (pct >= 70) return { bg: '#ecfccb', fg: '#3f6212', band: 'Adequate' };
  if (pct >= 40) return { bg: '#fef3c7', fg: '#78350f', band: 'At risk' };
  return { bg: '#fee2e2', fg: '#7f1d1d', band: 'Critical' };
}

/** The 0–4 proficiency scale, described once. */
export const PROFICIENCY_SCALE = [
  { level: 0, name: 'Not trained',       hint: 'No exposure to the task yet.' },
  { level: 1, name: 'Awareness',         hint: 'Understands the task, cannot yet perform it unsupervised.' },
  { level: 2, name: 'Working knowledge', hint: 'Can perform the task with supervision or support.' },
  { level: 3, name: 'Competent',         hint: 'Performs the task unsupervised to standard.' },
  { level: 4, name: 'Expert',            hint: 'Performs to standard and can train and sign off others.' },
];
