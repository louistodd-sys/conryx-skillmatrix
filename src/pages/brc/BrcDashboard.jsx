import { useState, useEffect } from 'react';
import { ShieldCheck, TrendingUp, AlertTriangle, Clock, CheckCircle2, RefreshCw, Bell, ChevronRight, CheckSquare, Link2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
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

function StatCard({ label, value, icon: Icon, colorClass, bgClass }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bgClass}`}>
        <Icon className={`w-5 h-5 ${colorClass}`} />
      </div>
      <div>
        <p className={`text-2xl font-bold font-jakarta ${colorClass}`}>{value}</p>
        <p className="text-xs text-muted-foreground font-medium mt-0.5 leading-tight">{label}</p>
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
      const [cls, sts, tms, mbs, ass, skl, capas, ncs, cals] = await Promise.all([
        base44.entities.BRCClause.filter({ standard: org.brc_standard }, 'display_order', 500),
        base44.entities.BRCClauseStatus.filter({ organisation_id: orgId }, '-updated_date', 500),
        base44.entities.Team.filter({ organisation_id: orgId }),
        base44.entities.TeamMember.filter({ organisation_id: orgId }),
        base44.entities.SkillAssessment.filter({ organisation_id: orgId }),
        base44.entities.Skill.filter({ organisation_id: orgId }),
        base44.entities.BRCCAPA.filter({ organisation_id: orgId }),
        base44.entities.BRCNonConformance.filter({ organisation_id: orgId }),
        base44.entities.BRCCalibrationRecord.filter({ organisation_id: orgId }),
      ]);
      setClauses(cls);
      setStatuses(sts);
      setTeams(tms);
      setMembers(mbs);
      setAssessments(ass);
      setSkills(skl);

      // Compute action centre quick summary
      const today2 = new Date();
      const isOverdue = (dateStr) => dateStr && new Date(dateStr) < today2;
      const criticalCount =
        capas.filter(c => c.status === 'overdue' || (isOverdue(c.due_date) && c.status !== 'completed' && c.status !== 'verified')).length +
        ncs.filter(n => (n.status === 'open' || n.status === 'under_investigation') && isOverdue(n.due_date)).length +
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
    await base44.functions.invoke('recomputeReadinessScore', { organisation_id: orgId });
    await refreshOrg();
    setRecomputing(false);
    setRecomputeDone(true);
    setTimeout(() => setRecomputeDone(false), 2500);
  };

  const standardLabel = org?.brc_standard ? BRC_STANDARD_LABELS[org.brc_standard] || org.brc_standard : null;
  const scoreColor = overallPct >= 80 ? 'text-rag-green-text' : overallPct >= 50 ? 'text-rag-amber-text' : 'text-rag-red-text';
  const scoreBg    = overallPct >= 80 ? 'bg-rag-green-light' : overallPct >= 50 ? 'bg-rag-amber-light' : 'bg-rag-red-light';

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

      {/* Audit countdown banner */}
      <AuditCountdown org={org} />

      {/* Connected banner — shown when both modules are active */}
      {hasMultipleModules(org) && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15">
          <Link2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Skills Matrix connected.</span>
            {' '}Your Training Register auto-populates from assessments, and the Action Centre aggregates expired skills alongside compliance items.{' '}
            <a href="/brc/training" className="text-primary underline">View Training Register →</a>
          </p>
        </div>
      )}

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Overall Readiness"
          value={`${overallPct}%`}
          icon={TrendingUp}
          colorClass={scoreColor}
          bgClass={scoreBg}
        />
        <StatCard
          label="Clauses Not Started"
          value={score?.red_count   ?? '—'}
          icon={AlertTriangle}
          colorClass="text-rag-red-text"
          bgClass="bg-rag-red-light"
        />
        <StatCard
          label="Clauses In Progress"
          value={score?.amber_count ?? '—'}
          icon={Clock}
          colorClass="text-rag-amber-text"
          bgClass="bg-rag-amber-light"
        />
        <StatCard
          label="Clauses Ready"
          value={score?.green_count ?? '—'}
          icon={CheckCircle2}
          colorClass="text-rag-green-text"
          bgClass="bg-rag-green-light"
        />
      </div>

      {/* Score ring + section breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: overall score ring */}
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

        {/* Right: section-level readiness */}
        <div className="lg:col-span-2">
          <SectionReadiness bySection={score?.by_section} />
        </div>
      </div>

      {/* Action Centre quick summary */}
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

      {/* Shortcut cards to new pages */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Action Centre', desc: 'Overdue tasks & expiring records', path: '/brc/action-centre', icon: Bell, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
          { label: 'Analytics', desc: 'NC rates, CAPA closure & trends', path: '/brc/analytics', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Audit Checklist', desc: 'Pre-audit readiness check', path: '/brc/audit-checklist', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
        ].map(({ label, desc, path, icon: Icon, color, bg }) => (
          <Link key={path} to={path} className={`border rounded-xl p-4 flex items-center gap-3 hover:opacity-80 transition-opacity ${bg}`}>
            <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center shrink-0">
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-auto" />
          </Link>
        ))}
      </div>

      {/* Urgent items + team cert status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <UrgentItems
          clauses={clauses}
          statuses={statuses}
          auditTargetDate={org?.brc_audit_target_date}
        />
        <TeamCertStatus
          teams={teams}
          members={members}
          assessments={assessments}
          skills={skills}
        />
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