import { useState, useEffect } from 'react';
import { ShieldCheck, TrendingUp, AlertTriangle, Clock, CheckCircle2, RefreshCw, Bell, ChevronRight, Link2, BookOpen, ArrowRight, Settings, FileText, ClipboardCheck, XCircle } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import BrcModuleGuard from '@/components/BrcModuleGuard';
import useOrganisation from '@/lib/useOrganisation';
import { BRC_STANDARD_LABELS, hasMultipleModules } from '@/lib/brcModuleGuard';
import ReadinessScoreRing from '@/components/brc/ReadinessScoreRing';
import UrgentItems from '@/components/brc/UrgentItems';
import TeamCertStatus from '@/components/brc/TeamCertStatus';
import SectionReadiness from '@/components/brc/SectionReadiness';
import AuditCountdown from '@/components/brc/AuditCountdown';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

// ── Journey stage definitions ─────────────────────────────────────────────────
const STAGES = [
  { num: 1, label: 'Setup',         short: 'Setup'        },
  { num: 2, label: 'Map Clauses',   short: 'Clauses'      },
  { num: 3, label: 'Add Evidence',  short: 'Evidence'     },
  { num: 4, label: 'Close Gaps',    short: 'Close Gaps'   },
  { num: 5, label: 'Verify',        short: 'Verify'       },
  { num: 6, label: 'Audit Ready',   short: 'Ready'        },
];

function computeStage({ org, clauses, statuses, capas, ncs }) {
  if (!org?.brc_standard || !org?.brc_audit_target_date) return 1;
  const statusMap = Object.fromEntries(statuses.map(s => [s.clause_id, s]));
  const totalClauses = clauses.length;
  if (totalClauses === 0) return 2;
  const notStarted = clauses.filter(c => !statusMap[c.id] || statusMap[c.id].status === 'not_started').length;
  if (notStarted > 0) return 2;
  const noEvidence = clauses.filter(c => !(statusMap[c.id]?.evidence_count > 0)).length;
  if (noEvidence > 0) return 3;
  const today = new Date();
  const overdueCapas = capas.filter(c => c.status === 'overdue' || (c.due_date && new Date(c.due_date) < today && c.status !== 'completed' && c.status !== 'verified')).length;
  const overdueNcs   = ncs.filter(n => (n.status === 'open' || n.status === 'under_investigation') && n.due_date && new Date(n.due_date) < today).length;
  if (overdueCapas > 0 || overdueNcs > 0) return 4;
  const score = org?.brc_readiness_score;
  const fundamentals = clauses.filter(c => c.is_fundamental);
  const fundamentalsReady = fundamentals.every(c => statusMap[c.id]?.status === 'ready');
  if (!fundamentalsReady || (score?.overall_percent ?? 0) < 80) return 5;
  return 6;
}

function getNextStepCard(stage, { notStartedCount, noEvidenceCount, overdueCapasCount, overdueNcsCount, score, fundamentalsNotReady }) {
  switch (stage) {
    case 1: return {
      title: 'Start here: Configure your BRC standard',
      body: 'Choose which BRCGS standard applies to your site and set your target audit date. This unlocks clause mapping and the readiness score.',
      cta: 'Go to BRC Settings', href: '/brc/settings', color: 'border-blue-200 bg-blue-50', ctaColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    };
    case 2: return {
      title: `${notStartedCount} clause${notStartedCount !== 1 ? 's' : ''} not yet started`,
      body: 'Work through each section of the Clause Mapping page. Click a clause to open it, read the evidence requirement, and update its status. Start with Section 1 and work through each section in order.',
      cta: 'Open Clause Mapping', href: '/brc/clauses', color: 'border-amber-200 bg-amber-50', ctaColor: 'bg-amber-600 hover:bg-amber-700 text-white',
    };
    case 3: return {
      title: `${noEvidenceCount} clause${noEvidenceCount !== 1 ? 's' : ''} need evidence attached`,
      body: 'All clauses are mapped — now attach evidence. Open each clause and use the "Add Evidence" button to link documents, audits, calibration records, or any other relevant records.',
      cta: 'View Clause Mapping', href: '/brc/clauses', color: 'border-blue-200 bg-blue-50', ctaColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    };
    case 4: return {
      title: `${overdueCapasCount + overdueNcsCount} overdue item${overdueCapasCount + overdueNcsCount !== 1 ? 's' : ''} require attention`,
      body: 'Evidence is attached — but you have overdue CAPAs or Non-Conformances that must be resolved before your audit. Resolve or close these in the Action Centre.',
      cta: 'Open Action Centre', href: '/brc/action-centre', color: 'border-red-200 bg-red-50', ctaColor: 'bg-red-600 hover:bg-red-700 text-white',
    };
    case 5: return {
      title: fundamentalsNotReady > 0 ? `${fundamentalsNotReady} fundamental clause${fundamentalsNotReady !== 1 ? 's' : ''} not ready` : `Score is ${score?.overall_percent ?? 0}% — target is 80%`,
      body: fundamentalsNotReady > 0
        ? 'Fundamental clauses are inspected first by the auditor. Ensure all ★ Fundamental clauses are marked Ready with evidence attached before your audit.'
        : 'Your fundamentals are green. Continue marking remaining clauses as Ready until the score reaches 80%, then run the pre-audit checklist to confirm.',
      cta: 'Run Pre-Audit Checklist', href: '/brc/audit-checklist', color: 'border-purple-200 bg-purple-50', ctaColor: 'bg-purple-600 hover:bg-purple-700 text-white',
    };
    case 6: return {
      title: '✓ Audit Ready',
      body: 'All fundamentals are green, your score is ≥ 80%, and no overdue items remain. Schedule your internal audit to confirm readiness before the certification audit.',
      cta: 'View Internal Audits', href: '/brc/audits', color: 'border-green-200 bg-green-50', ctaColor: 'bg-green-600 hover:bg-green-700 text-white',
    };
    default: return null;
  }
}

function JourneyBanner({ currentStage }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Audit Preparation Journey</p>
        <Link to="/brc/guide" className="text-xs text-primary hover:underline flex items-center gap-1">
          <BookOpen className="w-3 h-3" /> How this works
        </Link>
      </div>
      <div className="flex items-center gap-0">
        {STAGES.map((stage, i) => {
          const isDone = stage.num < currentStage;
          const isCurrent = stage.num === currentStage;
          const isLast = i === STAGES.length - 1;
          return (
            <div key={stage.num} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  isDone    ? 'bg-green-500 border-green-500 text-white' :
                  isCurrent ? 'bg-primary border-primary text-primary-foreground ring-2 ring-primary/30' :
                              'bg-muted border-border text-muted-foreground'
                }`}>
                  {isDone ? '✓' : stage.num}
                </div>
                <span className={`text-[10px] font-medium text-center leading-tight hidden sm:block ${isCurrent ? 'text-primary' : isDone ? 'text-green-700' : 'text-muted-foreground'}`}>
                  {stage.short}
                </span>
              </div>
              {!isLast && (
                <div className={`h-0.5 flex-1 mx-1 rounded-full ${isDone ? 'bg-green-400' : 'bg-border'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BrcDashboardContent() {
  const { org, refreshOrg } = useOrganisation();
  const [clauses,     setClauses]     = useState([]);
  const [statuses,    setStatuses]    = useState([]);
  const [teams,       setTeams]       = useState([]);
  const [members,     setMembers]     = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [skills,      setSkills]      = useState([]);
  const [capas,       setCapas]       = useState([]);
  const [ncs,         setNcs]         = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeDone, setRecomputeDone] = useState(false);
  const [actionSummary, setActionSummary] = useState({ critical: 0, warning: 0 });

  const orgId  = org?.id;
  const score  = org?.brc_readiness_score || null;
  const overallPct = score?.overall_percent ?? 0;

  useEffect(() => {
    if (!orgId || !org?.brc_standard) { setLoading(false); return; }

    async function load() {
      setLoading(true);
      const [cls, sts, tms, mbs, ass, skl, capasData, ncsData, cals] = await Promise.all([
        apiClient.entities.BRCClause.filter({ standard: org.brc_standard }, 'display_order', 500),
        apiClient.entities.BRCClauseStatus.filter({ organisation_id: orgId }, '-updated_date', 500),
        apiClient.entities.Team.filter({ organisation_id: orgId }),
        apiClient.entities.TeamMember.filter({ organisation_id: orgId }),
        apiClient.entities.SkillAssessment.filter({ organisation_id: orgId }),
        apiClient.entities.Skill.filter({ organisation_id: orgId }),
        apiClient.entities.BRCCAPA.filter({ organisation_id: orgId }),
        apiClient.entities.BRCNonConformance.filter({ organisation_id: orgId }),
        apiClient.entities.BRCCalibrationRecord.filter({ organisation_id: orgId }),
      ]);
      setClauses(cls); setStatuses(sts); setTeams(tms); setMembers(mbs);
      setAssessments(ass); setSkills(skl); setCapas(capasData); setNcs(ncsData);

      const today2 = new Date();
      const isOverdue = (dateStr) => dateStr && new Date(dateStr) < today2;
      const criticalCount =
        capasData.filter(c => c.status === 'overdue' || (isOverdue(c.due_date) && c.status !== 'completed' && c.status !== 'verified')).length +
        ncsData.filter(n => (n.status === 'open' || n.status === 'under_investigation') && isOverdue(n.due_date)).length +
        cals.filter(r => r.status === 'overdue').length +
        ass.filter(a => a.expiry_date && new Date(a.expiry_date) < today2).length;
      const warningCount =
        cals.filter(r => r.status === 'due_soon').length +
        ass.filter(a => { const d = a.expiry_date && Math.ceil((new Date(a.expiry_date) - today2) / 86400000); return d >= 0 && d <= 30; }).length;
      setActionSummary({ critical: criticalCount, warning: warningCount });
      setLoading(false);
    }
    load();
  }, [orgId, org?.brc_standard]);

  const handleRecompute = async () => {
    setRecomputing(true);
    setRecomputeDone(false);
    await apiClient.functions.invoke('recomputeReadinessScore', { organisation_id: orgId });
    await refreshOrg();
    setRecomputing(false);
    setRecomputeDone(true);
    setTimeout(() => setRecomputeDone(false), 2500);
  };

  const standardLabel = org?.brc_standard ? BRC_STANDARD_LABELS[org.brc_standard] || org.brc_standard : null;
  const scoreColor = overallPct >= 80 ? 'text-rag-green-text' : overallPct >= 50 ? 'text-rag-amber-text' : 'text-rag-red-text';
  const scoreBg    = overallPct >= 80 ? 'bg-rag-green-light' : overallPct >= 50 ? 'bg-rag-amber-light' : 'bg-rag-red-light';

  // Compute journey stage
  const currentStage = loading ? 1 : computeStage({ org, clauses, statuses, capas, ncs });
  const statusMap = Object.fromEntries(statuses.map(s => [s.clause_id, s]));
  const today = new Date();
  const notStartedCount = clauses.filter(c => !statusMap[c.id] || statusMap[c.id].status === 'not_started').length;
  const noEvidenceCount = clauses.filter(c => !(statusMap[c.id]?.evidence_count > 0)).length;
  const overdueCapasCount = capas.filter(c => c.status === 'overdue' || (c.due_date && new Date(c.due_date) < today && c.status !== 'completed' && c.status !== 'verified')).length;
  const overdueNcsCount   = ncs.filter(n => (n.status === 'open' || n.status === 'under_investigation') && n.due_date && new Date(n.due_date) < today).length;
  const fundamentals = clauses.filter(c => c.is_fundamental);
  const fundamentalsNotReady = fundamentals.filter(c => statusMap[c.id]?.status !== 'ready').length;

  const nextStep = !loading ? getNextStepCard(currentStage, {
    notStartedCount, noEvidenceCount, overdueCapasCount, overdueNcsCount, score, fundamentalsNotReady,
  }) : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-jakarta text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            BRC Compliance Readiness
          </h1>
          {standardLabel
            ? <p className="text-sm text-muted-foreground mt-0.5">{standardLabel}</p>
            : <p className="text-sm text-amber-600 mt-0.5">
                No standard selected — <a href="/brc/settings" className="underline">configure in BRC Settings</a>.
              </p>
          }
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 self-start"
          onClick={handleRecompute}
          disabled={recomputing || !orgId}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recomputing ? 'animate-spin' : ''}`} />
          {recomputing ? 'Recomputing…' : recomputeDone ? '✓ Score updated' : 'Recompute Score'}
        </Button>
      </div>

      {/* Audit countdown */}
      <AuditCountdown org={org} />

      {/* Journey stepper */}
      {!loading && <JourneyBanner currentStage={currentStage} />}

      {/* Next step card */}
      {nextStep && (
        <div className={`border rounded-xl p-5 space-y-3 ${nextStep.color}`}>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {currentStage < 6 ? `Step ${currentStage}: ` : ''}{nextStep.title}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{nextStep.body}</p>
            </div>
          </div>
          <Link to={nextStep.href}>
            <button className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${nextStep.ctaColor}`}>
              {nextStep.cta} <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      )}

      {/* Connected banner */}
      {hasMultipleModules(org) && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15">
          <Link2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Skills Matrix connected.</span>
            {' '}Training records auto-populate from assessments and expired skills appear in the Action Centre.{' '}
            <a href="/brc/training" className="text-primary underline">View Training Register →</a>
          </p>
        </div>
      )}

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Overall Readiness', value: `${overallPct}%`, icon: TrendingUp, colorClass: scoreColor, bgClass: scoreBg },
          { label: 'Not Started',  value: score?.red_count   ?? '—', icon: AlertTriangle, colorClass: 'text-rag-red-text',   bgClass: 'bg-rag-red-light'   },
          { label: 'In Progress',  value: score?.amber_count ?? '—', icon: Clock,         colorClass: 'text-rag-amber-text', bgClass: 'bg-rag-amber-light' },
          { label: 'Clauses Ready',value: score?.green_count ?? '—', icon: CheckCircle2,  colorClass: 'text-rag-green-text', bgClass: 'bg-rag-green-light' },
        ].map(({ label, value, icon: Icon, colorClass, bgClass }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bgClass}`}>
              <Icon className={`w-5 h-5 ${colorClass}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold font-jakarta ${colorClass}`}>{value}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Score ring + section breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center gap-4">
          <ReadinessScoreRing pct={overallPct} size={130} />
          <div className="text-center">
            <p className="font-semibold text-foreground">Audit Readiness Score</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {score
                ? <>Computed from {(score.red_count||0)+(score.amber_count||0)+(score.green_count||0)} clauses. Last updated {new Date(score.computed_at).toLocaleDateString('en-GB')}.</>
                : <>No score yet. Begin mapping <a href="/brc/clauses" className="underline text-primary">clauses</a> to get started.</>
              }
            </p>
          </div>
        </div>
        <div className="lg:col-span-2">
          <SectionReadiness bySection={score?.by_section} />
        </div>
      </div>

      {/* Action Centre summary */}
      {(actionSummary.critical > 0 || actionSummary.warning > 0) && (
        <Link to="/brc/action-centre" className="block">
          <div className={`border rounded-xl p-4 flex items-center gap-4 hover:opacity-90 transition-opacity ${
            actionSummary.critical > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${actionSummary.critical > 0 ? 'bg-red-100' : 'bg-amber-100'}`}>
              <Bell className={`w-4 h-4 ${actionSummary.critical > 0 ? 'text-red-600' : 'text-amber-600'}`} />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${actionSummary.critical > 0 ? 'text-red-800' : 'text-amber-800'}`}>
                {actionSummary.critical > 0
                  ? `${actionSummary.critical} critical action${actionSummary.critical !== 1 ? 's' : ''} require immediate attention`
                  : `${actionSummary.warning} item${actionSummary.warning !== 1 ? 's' : ''} require attention soon`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">View Action Centre for full details →</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        </Link>
      )}

      {/* Urgent items + team certs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <UrgentItems clauses={clauses} statuses={statuses} auditTargetDate={org?.brc_audit_target_date} />
        <TeamCertStatus teams={teams} members={members} assessments={assessments} skills={skills} />
      </div>

      {!org?.brc_standard && !loading && (
        <div className="bg-rag-amber-light border border-rag-amber/30 rounded-xl p-5 text-sm text-rag-amber-text">
          <strong>Setup required:</strong> Configure your BRC standard in{' '}
          <a href="/brc/settings" className="underline font-medium">BRC Settings</a>{' '}
          to unlock clause mapping and readiness scoring.
        </div>
      )}
    </div>
  );
}

export default function BrcDashboard() {
  return (
    <BrcModuleGuard>
      <BrcDashboardContent />
    </BrcModuleGuard>
  );
}
