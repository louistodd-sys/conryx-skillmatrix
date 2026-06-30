import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, BookOpen, ClipboardCheck, AlertTriangle, TrendingUp, Clock,
  CheckCircle2, Circle, X, ArrowRight, ChevronRight, Link2, ShieldCheck,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { hasBrcModule, hasMultipleModules } from '@/lib/brcModuleGuard';
import MetricCard from '@/components/MetricCard';
import RAGBar from '@/components/RAGBar';
import EmptyState from '@/components/EmptyState';
import { getRAGStatus } from '@/lib/ragUtils';
import { parseISO, differenceInDays, endOfWeek, endOfMonth, isBefore } from 'date-fns';

import { getLatestAssessments } from '@/utils/assessmentUtils';
import WelcomeTour, { TOUR_KEY } from '@/components/WelcomeTour';

// ─── Onboarding Checklist ──────────────────────────────────────────────────
function OnboardingChecklist({ org, assessmentCount, teamCount, skillCount, hasRequiredSkills, onDismiss }) {
  const items = [
    { label: 'Skills added to library',            done: skillCount > 0,      href: '/skills-library' },
    { label: 'First team created',                 done: teamCount > 0,       href: '/teams'          },
    { label: 'First assessment completed',         done: assessmentCount > 0, href: '/matrix'         },
    { label: 'Required skills assigned to a team', done: hasRequiredSkills,   href: '/teams'          },
  ];
  const doneCount = items.filter(i => i.done).length;
  const allDone = doneCount === items.length;
  if (allDone) return null;

  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <div className="bg-card border border-primary/20 rounded-xl p-5 shadow-card">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-jakarta font-700 text-base text-foreground">Getting started</p>
          <p className="text-sm text-muted-foreground mt-0.5">Complete these steps to set up your organisation</p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-md hover:bg-muted transition-colors shrink-0"
          aria-label="Dismiss checklist"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-muted-foreground">{doneCount} of {items.length} complete</span>
          <span className="text-xs font-bold text-primary">{pct}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.label} className="flex items-center gap-3">
            {item.done
              ? <CheckCircle2 className="w-4 h-4 text-rag-green shrink-0" />
              : <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
            <span className={`text-sm flex-1 ${item.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {item.label}
            </span>
            {!item.done && item.href && (
              <Link to={item.href} className="text-xs font-medium text-primary hover:underline shrink-0">
                Start →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Expiry bucket helpers ─────────────────────────────────────────────────
function bucketExpiries(expiries) {
  const today    = new Date();
  const weekEnd  = endOfWeek(today, { weekStartsOn: 1 });
  const monthEnd = endOfMonth(today);

  return {
    thisWeek:  expiries.filter(e => e.daysLeft >= 0 && isBefore(parseISO(e.expiry_date), weekEnd)),
    thisMonth: expiries.filter(e => e.daysLeft >= 0 && !isBefore(parseISO(e.expiry_date), weekEnd) && isBefore(parseISO(e.expiry_date), monthEnd)),
    next30_60: expiries.filter(e => e.daysLeft > 30 && e.daysLeft <= 60),
    next60_90: expiries.filter(e => e.daysLeft > 60 && e.daysLeft <= 90),
  };
}

const urgencyConfig = {
  critical: { ring: 'border-red-200',   bg: 'bg-red-50',    header: 'text-red-700',   badge: 'bg-red-100 text-red-700' },
  high:     { ring: 'border-amber-200', bg: 'bg-amber-50',  header: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  medium:   { ring: 'border-amber-200', bg: 'bg-amber-50/50',header:'text-amber-600', badge: 'bg-amber-50 text-amber-600' },
  low:      { ring: 'border-blue-200',  bg: 'bg-blue-50/50',header: 'text-blue-700',  badge: 'bg-blue-100 text-blue-700' },
};

function ExpiryBucket({ label, items, urgency }) {
  const [open, setOpen] = useState(true);
  if (items.length === 0) return null;
  const u = urgencyConfig[urgency];

  return (
    <div className={`rounded-lg border ${u.ring} ${u.bg} overflow-hidden`}>
      <button
        className={`w-full flex items-center justify-between px-4 py-2.5 ${u.header}`}
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{label}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.badge}`}>{items.length}</span>
        </div>
        <ChevronRight className={`w-4 h-4 transition-transform duration-150 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="divide-y divide-current/10 border-t border-current/20">
          {items.slice(0, 8).map((exp, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-white/60 hover:bg-white/80 transition-colors">
              <div>
                <p className="text-sm font-semibold text-foreground">{exp.user_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{exp.skill_name}{exp.team_name ? ` · ${exp.team_name}` : ''}</p>
              </div>
              <span className={`text-xs font-mono font-bold shrink-0 ml-3 ${exp.daysLeft <= 0 ? 'text-rag-red' : 'text-muted-foreground'}`}>
                {exp.daysLeft <= 0 ? 'EXPIRED' : `${exp.daysLeft}d`}
              </span>
            </div>
          ))}
          {items.length > 8 && (
            <p className="px-4 py-2 text-xs text-muted-foreground text-center bg-white/40 font-medium">
              +{items.length - 8} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Recent Activity item ──────────────────────────────────────────────────
function ActivityItem({ a }) {
  const initials = (a.assessed_by_name || 'S')
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">
          <span className="font-semibold">{a.assessed_by_name || 'System'}</span>
          <span className="text-muted-foreground"> assessed </span>
          <span className="font-semibold">{a.user_name}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.skill_name}</p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{a.assessed_date}</span>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { org, user } = useOrganisation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checklistDismissed, setChecklistDismissed] = useState(
    () => localStorage.getItem(`checklist_dismissed_${org?.id}`) === 'true'
  );
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!org) return;
    loadData();
    if (org.onboarding_completed && localStorage.getItem(TOUR_KEY(org.id)) !== 'true') {
      setShowTour(true);
    }
  }, [org]);

  async function loadData() {
    const isManager = user?.role === 'manager';

    const [allUsers, skills, assessments, teams, teamMembers, teamReqSkills] = await Promise.all([
      apiClient.entities.User.filter({ organisation_id: org.id }),
      apiClient.entities.Skill.filter({ organisation_id: org.id, status: 'active' }),
      apiClient.entities.SkillAssessment.filter({ organisation_id: org.id }),
      apiClient.entities.Team.filter({ organisation_id: org.id }),
      apiClient.entities.TeamMember.filter({ organisation_id: org.id }),
      apiClient.entities.TeamRequiredSkill.filter({ organisation_id: org.id }),
    ]);

    const visibleTeams = isManager
      ? teams.filter(t => t.manager_ids?.includes(user.id))
      : teams;

    const currentAssessments = getLatestAssessments(assessments);
    const hasRequiredSkills = teamReqSkills.some(r => r.is_required);

    const today = new Date();
    let expired = 0;
    const allUpcomingExpiries = [];
    const visibleTeamIds = new Set(visibleTeams.map(t => t.id));
    const teamById = Object.fromEntries(teams.map(t => [t.id, t]));

    Object.values(currentAssessments).forEach(a => {
      if (!a.expiry_date) return;
      const memberTeams = teamMembers
        .filter(m => m.user_id === a.user_id && visibleTeamIds.has(m.team_id))
        .map(m => teamById[m.team_id]?.name)
        .filter(Boolean);
      if (!isManager || memberTeams.length > 0 || !isManager) {
        const expDate = parseISO(a.expiry_date);
        const daysLeft = differenceInDays(expDate, today);
        if (daysLeft < 0) expired++;
        else if (daysLeft <= 90) {
          allUpcomingExpiries.push({ ...a, daysLeft, team_name: memberTeams[0] || '' });
        }
      }
    });
    allUpcomingExpiries.sort((a, b) => a.daysLeft - b.daysLeft);

    const teamStats = visibleTeams.map(team => {
      const members = teamMembers.filter(m => m.team_id === team.id);
      const reqSkills = teamReqSkills.filter(r => r.team_id === team.id && r.is_required);
      let green = 0, amber = 0, red = 0, grey = 0;
      members.forEach(member => {
        reqSkills.forEach(req => {
          const assessment = currentAssessments[`${member.user_id}-${req.skill_id}`];
          const skill = skills.find(s => s.id === req.skill_id);
          const status = getRAGStatus(assessment, skill, req);
          if (status === 'green') green++;
          else if (status === 'amber') amber++;
          else if (status === 'red') red++;
          else grey++;
        });
      });
      const total = green + amber + red + grey;
      return {
        ...team,
        memberCount: members.length,
        green, amber, red, grey,
        compliance: total > 0 ? Math.round((green / total) * 100) : 0,
      };
    });

    let totalRequired = 0, totalGreen = 0;
    if (!isManager) {
      teamReqSkills.filter(r => r.is_required).forEach(req => {
        const members = teamMembers.filter(m => m.team_id === req.team_id);
        members.forEach(member => {
          totalRequired++;
          const assessment = currentAssessments[`${member.user_id}-${req.skill_id}`];
          const skill = skills.find(s => s.id === req.skill_id);
          if (getRAGStatus(assessment, skill, req) === 'green') totalGreen++;
        });
      });
    }

    const recentAssessments = [...assessments]
      .sort((a, b) => (b.assessed_date || '').localeCompare(a.assessed_date || ''))
      .slice(0, 8);

    // Site breakdown (Professional tier) — group users by site
    const siteMap = {};
    for (const u of allUsers) {
      const site = u.site || null;
      if (!site) continue;
      if (!siteMap[site]) siteMap[site] = { count: 0, userIds: [] };
      siteMap[site].count++;
      siteMap[site].userIds.push(u.id);
    }
    const siteBreakdown = Object.entries(siteMap).map(([name, { count, userIds }]) => {
      const userSet = new Set(userIds);
      let siteReq = 0, siteGreen = 0;
      teamReqSkills.filter(r => r.is_required).forEach(req => {
        const members = teamMembers.filter(m => userSet.has(m.user_id) && m.team_id === req.team_id);
        members.forEach(member => {
          siteReq++;
          const assessment = currentAssessments[`${member.user_id}-${req.skill_id}`];
          const skill = skills.find(s => s.id === req.skill_id);
          if (getRAGStatus(assessment, skill, req) === 'green') siteGreen++;
        });
      });
      return { name, count, compliance: siteReq > 0 ? Math.round((siteGreen / siteReq) * 100) : 0 };
    }).sort((a, b) => a.name.localeCompare(b.name));

    setData({
      userCount: allUsers.length,
      skillCount: skills.length,
      assessmentCount: assessments.length,
      teamCount: teams.length,
      compliancePercent: totalRequired > 0 ? Math.round((totalGreen / totalRequired) * 100) : 0,
      expired,
      expiringIn30: allUpcomingExpiries.filter(e => e.daysLeft <= 30).length,
      teamStats,
      expiries: allUpcomingExpiries,
      recentAssessments,
      hasRequiredSkills,
      assessmentsRaw: assessments,
      siteBreakdown,
    });
    setLoading(false);
  }

  const handleDismissChecklist = () => {
    localStorage.setItem(`checklist_dismissed_${org?.id}`, 'true');
    setChecklistDismissed(true);
  };

  const sparklineData = useMemo(() => {
    const raw = data?.assessmentsRaw ?? [];
    if (!raw.length) return [];
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (6 - i) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const weekAssessments = raw.filter(a => {
        const d = new Date(a.assessed_at || a.created_at);
        return d >= weekStart && d < weekEnd;
      });
      const green = weekAssessments.filter(a => a.rating === 'green').length;
      const total = weekAssessments.length;
      return { week: i + 1, value: total > 0 ? Math.round((green / total) * 100) : null };
    }).filter(d => d.value !== null);
  }, [data?.assessmentsRaw]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-xl bg-muted animate-pulse" />
          <div className="h-64 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Welcome to SkillsMatrix"
        description="Set up your organisation to start tracking workforce skills and compliance."
        actionLabel="Set Up Organisation"
        onAction={() => window.location.href = '/onboarding'}
      />
    );
  }

  const expiryBuckets = bucketExpiries(data.expiries);
  const hasExpiries = data.expiries.length > 0;
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <p className="text-sm text-muted-foreground">
          {user?.role === 'manager' ? 'Your team overview' : `${org.name} · skills compliance overview`}
        </p>
      </div>

      {/* BRC: connected banner (both modules active) */}
      {hasMultipleModules(org) && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15">
          <Link2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">BRC Compliance connected.</span>
            {' '}Assessments feed the BRC Training Register automatically and expired skills appear in the BRC Action Centre.{' '}
            <Link to="/brc" className="text-primary underline">Go to BRC Dashboard →</Link>
          </p>
        </div>
      )}

      {/* BRC: upsell nudge for admins (BRC not active) */}
      {isAdmin && !hasBrcModule(org) && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-muted/40 border border-border">
          <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Add BRC Compliance Readiness.</span>
            {' '}Track BRCGS clauses, documents, audits, and CAPAs alongside your skills data.{' '}
            <Link to="/upgrade-brc" className="text-primary underline font-medium">Learn more →</Link>
          </p>
        </div>
      )}

      {/* Onboarding checklist */}
      {!checklistDismissed && !org.onboarding_completed && (
        <OnboardingChecklist
          org={org}
          skillCount={data.skillCount}
          teamCount={data.teamCount}
          assessmentCount={data.assessmentCount}
          hasRequiredSkills={data.hasRequiredSkills}
          onDismiss={handleDismissChecklist}
        />
      )}

      {/* ── Metrics ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard icon={Users}          label="Active Users"   value={data.userCount} />
        <MetricCard icon={BookOpen}       label="Skills"         value={data.skillCount} />
        <MetricCard icon={ClipboardCheck} label="Assessments"    value={data.assessmentCount} />
        {isAdmin && (
          <div className="relative">
            <MetricCard
              icon={TrendingUp}
              label="Compliance"
              value={`${data.compliancePercent}%`}
              subtext="required skills current"
            />
            {sparklineData.length > 1 && (
              <div className="absolute bottom-3 right-3 w-16 h-8 opacity-50">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
        <MetricCard
          icon={AlertTriangle}
          label="Expired"
          value={data.expired}
          className={data.expired > 0 ? 'border-red-200 bg-red-50/40' : ''}
        />
        <MetricCard
          icon={Clock}
          label="Expiring ≤30d"
          value={data.expiringIn30}
          className={data.expiringIn30 > 0 ? 'border-amber-200 bg-amber-50/40' : ''}
        />
      </div>

      {/* ── Team Health + Expiry Timeline ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Health */}
        <div className="bg-card border border-border rounded-xl shadow-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-jakarta font-700 text-base text-foreground">Team Health</h2>
            <Link
              to="/teams"
              className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {data.teamStats.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">No teams yet — create one to get started</p>
            ) : (
              data.teamStats.map(team => (
                <Link
                  key={team.id}
                  to={`/teams/${team.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {team.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}</p>
                  </div>
                  <div className="w-28 hidden sm:block">
                    <RAGBar green={team.green} amber={team.amber} red={team.red} grey={team.grey} showLabels />
                  </div>
                  <span className={`text-sm font-bold w-10 text-right shrink-0 tabular-nums ${
                    team.compliance >= 80 ? 'text-rag-green' :
                    team.compliance >= 50 ? 'text-rag-amber' :
                    'text-rag-red'
                  }`}>
                    {team.compliance}%
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Expiry Timeline */}
        <div className="bg-card border border-border rounded-xl shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-jakarta font-700 text-base text-foreground">Expiry Timeline</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Skills expiring in the next 90 days</p>
          </div>
          <div className="p-4 space-y-2">
            {!hasExpiries ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-rag-green mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">All clear</p>
                <p className="text-xs text-muted-foreground mt-0.5">No upcoming expiries in the next 90 days</p>
              </div>
            ) : (
              <>
                <ExpiryBucket label="This week"    items={expiryBuckets.thisWeek}  urgency="critical" />
                <ExpiryBucket label="This month"   items={expiryBuckets.thisMonth} urgency="high" />
                <ExpiryBucket label="30 – 60 days" items={expiryBuckets.next30_60} urgency="medium" />
                <ExpiryBucket label="60 – 90 days" items={expiryBuckets.next60_90} urgency="low" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Activity ─────────────────────────────────────────────── */}
      {data.recentAssessments.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-jakarta font-700 text-base text-foreground">Recent Activity</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Latest skill assessments recorded</p>
          </div>
          <div className="divide-y divide-border">
            {data.recentAssessments.map((a, i) => (
              <ActivityItem key={i} a={a} />
            ))}
          </div>
        </div>
      )}

      {/* ── Site Breakdown (Professional only) ─────────────────────────── */}
      {isAdmin && org?.subscription_tier === 'professional' && data.siteBreakdown?.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-jakarta font-700 text-base text-foreground">Site Breakdown</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Compliance by site / location</p>
          </div>
          <div className="divide-y divide-border">
            {data.siteBreakdown.map(site => (
              <div key={site.name} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{site.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{site.count} user{site.count !== 1 ? 's' : ''}</p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${
                  site.compliance >= 80 ? 'text-rag-green' :
                  site.compliance >= 50 ? 'text-rag-amber' :
                  'text-rag-red'
                }`}>{site.compliance}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTour && <WelcomeTour onClose={() => setShowTour(false)} />}
    </div>
  );
}