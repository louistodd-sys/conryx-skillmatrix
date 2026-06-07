import { useState } from 'react';
import {
  Sparkles, LayoutDashboard, Grid3X3, Users, TrendingDown,
  Building2, Trash2, ArrowRight, ArrowLeft, X, Loader2, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { removeSeedData, EXAMPLE_MEMBER_KEY } from '@/lib/createSeedData';
import useOrganisation from '@/lib/useOrganisation';

export const TOUR_KEY = (orgId) => `tour_completed_${orgId}`;

const STEPS = [
  {
    icon: Sparkles,
    iconClass: 'text-primary',
    bgClass: 'bg-primary/10',
    title: 'Welcome to your skills matrix!',
    body: "You're all set up. We've added Example Employee with sample assessments so you can see the app fully populated before you add real people.",
    highlights: [
      'Green = current and compliant',
      'Amber = expiring within the warning period',
      'Red = skill gap, expired, or below minimum level',
      'Grey = not yet assessed',
    ],
  },
  {
    icon: LayoutDashboard,
    iconClass: 'text-blue-600',
    bgClass: 'bg-blue-50',
    title: 'Dashboard',
    body: 'Real-time compliance overview — your daily starting point.',
    highlights: [
      'Metrics: active people, skills, assessments, and compliance %',
      'Team Health: RAG breakdown per team with click-through',
      'Expiry Timeline: upcoming renewals flagged by urgency (next 90 days)',
    ],
  },
  {
    icon: Grid3X3,
    iconClass: 'text-violet-600',
    bgClass: 'bg-violet-50',
    title: 'Skills Matrix',
    body: 'Every employee × every skill on one page. Click any cell to record or update an assessment.',
    highlights: [
      'Filter by team or skill category',
      'Colour-coded cells show RAG status instantly',
      'Export the full matrix to CSV',
    ],
  },
  {
    icon: Users,
    iconClass: 'text-emerald-600',
    bgClass: 'bg-emerald-50',
    title: 'People',
    body: "Each person's full profile: compliance ring, skill-by-skill breakdown, and expiry dates.",
    highlights: [
      'Example Employee shows a mix of green, amber, and red statuses',
      'Required skills are labelled and tracked separately',
      'Filter by team, search by name, or sort by compliance level',
    ],
  },
  {
    icon: TrendingDown,
    iconClass: 'text-amber-600',
    bgClass: 'bg-amber-50',
    title: 'Gap Analysis',
    body: 'Surfaces training needs across your organisation, ranked by urgency.',
    highlights: [
      'Aggregates gaps and expiries by skill',
      'Filter by team to focus on specific groups',
      'Helps you plan and prioritise training schedules',
    ],
  },
  {
    icon: Building2,
    iconClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50',
    title: 'Teams',
    body: 'Group your people into teams, set required skills, and let the system calculate compliance automatically.',
    highlights: [
      'Add employees without giving them app accounts',
      'Set required skills and minimum proficiency per team',
      'Managers are restricted to see only their own team',
    ],
  },
  {
    icon: Trash2,
    iconClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
    title: 'Remove Example Data',
    body: "Example Employee is purely illustrative. Remove them in one click when you're done exploring — their assessments are deleted too.",
    highlights: [
      'Manual removal: Teams → your team → hover Example Employee → Remove',
      'Or use the button below to delete them right now',
    ],
    isCleanup: true,
  },
];

export default function WelcomeTour({ onClose }) {
  const { org } = useOrganisation();
  const [step, setStep] = useState(0);
  const [removing, setRemoving] = useState(false);

  const total = STEPS.length;
  const current = STEPS[step];
  const hasMember = org ? !!localStorage.getItem(EXAMPLE_MEMBER_KEY(org.id)) : false;

  function finish() {
    if (org) localStorage.setItem(TOUR_KEY(org.id), 'true');
    onClose();
  }

  async function handleRemove() {
    if (!org) { finish(); return; }
    setRemoving(true);
    try {
      await removeSeedData(org.id);
      toast.success('Example Employee removed.');
      finish();
      window.location.reload();
    } catch {
      toast.error('Could not remove example data — please try again.');
      setRemoving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Quick Tour
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {step + 1} / {total}
            </span>
          </div>
          <button
            onClick={finish}
            className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4 space-y-4 flex-1">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl ${current.bgClass} flex items-center justify-center mx-auto`}>
            <current.icon className={`w-7 h-7 ${current.iconClass}`} />
          </div>

          {/* Title + body */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-foreground">{current.title}</h3>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{current.body}</p>
          </div>

          {/* Highlights */}
          {current.highlights?.length > 0 && (
            <ul className="space-y-2">
              {current.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Already removed notice */}
          {current.isCleanup && !hasMember && (
            <p className="text-xs text-center text-muted-foreground italic">
              Example Employee has already been removed.
            </p>
          )}
        </div>

        {/* ── Progress dots ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-1.5 py-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-200 ${
                i === step
                  ? 'w-4 h-2 bg-primary'
                  : i < step
                    ? 'w-2 h-2 bg-primary/35'
                    : 'w-2 h-2 bg-muted'
              }`}
            />
          ))}
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div className="px-5 pb-5 shrink-0">
          {current.isCleanup ? (
            <div className="space-y-2">
              {hasMember && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleRemove}
                  disabled={removing}
                >
                  {removing
                    ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Removing…</>
                    : <><Trash2 className="w-4 h-4 mr-1.5" />Remove Example Employee Now</>}
                </Button>
              )}
              <Button
                variant={hasMember ? 'outline' : 'default'}
                className="w-full"
                onClick={finish}
                disabled={removing}
              >
                {hasMember ? "Keep for Now — I'll remove them later" : 'Finish Tour'}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {step > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(s => s - 1)}
                  className="shrink-0"
                  aria-label="Previous step"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={() => setStep(s => s + 1)}
              >
                {step === total - 2 ? 'Almost done' : 'Next'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
