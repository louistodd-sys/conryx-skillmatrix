import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, BarChart2, Users2, AlertTriangle, Calendar, Lock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell,
} from 'recharts';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { getRAGStatus } from '@/lib/ragUtils';
import { getLatestAssessments } from '@/utils/assessmentUtils';
import { isFeatureAvailable } from '@/lib/tierConfig';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { parseISO, format, addMonths, startOfMonth, isWithinInterval } from 'date-fns';

// ─── Upgrade gate ─────────────────────────────────────────────────────────────
function AnalyticsUpgradeGate() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <Lock className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Advanced Analytics</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        Compliance trends, team comparisons, skill gap analysis, assessor activity, and expiry forecasting — available on the Professional plan.
      </p>
      <Button asChild>
        <Link to="/settings?tab=billing">Upgrade to Professional</Link>
      </Button>
    </div>
  );
}

// ─── Chart card wrapper ───────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Analytics() {
  const { org, user } = useOrganisation();
  const tier = org?.subscription_tier || 'free';
  const canAccess = isFeatureAvailable(tier, 'advanced_analytics');

  const [loading, setLoading] = useState(true);
  const [skills, setSkills]       = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [teams, setTeams]         = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [reqSkills, setReqSkills] = useState([]);

  useEffect(() => {
    if (org && canAccess) loadData();
    else if (org) setLoading(false);
  }, [org?.id, canAccess]);

  async function loadData() {
    const [sk, as, te, tm, rs] = await Promise.all([
      apiClient.entities.Skill.filter({ organisation_id: org.id, status: 'active' }),
      apiClient.entities.SkillAssessment.filter({ organisation_id: org.id }),
      apiClient.entities.Team.filter({ organisation_id: org.id }),
      apiClient.entities.TeamMember.filter({ organisation_id: org.id }),
      apiClient.entities.TeamRequiredSkill.filter({ organisation_id: org.id }),
    ]);
    setSkills(sk);
    setAssessments(as);
    setTeams(te);
    setTeamMembers(tm);
    setReqSkills(rs);
    setLoading(false);
  }

  // ── Assessment activity over time (last 12 months) ────────────────────────
  const activityData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const monthStart = startOfMonth(addMonths(now, -(11 - i)));
      const label = MONTH_LABELS[monthStart.getMonth()];
      const count = assessments.filter(a => {
        if (!a.assessed_date) return false;
        try {
          const d = parseISO(a.assessed_date);
          return format(d, 'yyyy-MM') === format(monthStart, 'yyyy-MM');
        } catch { return false; }
      }).length;
      return { month: label, count };
    });
  }, [assessments]);

  // ── Top skill gaps (required skills most frequently missing) ──────────────
  const topGapsData = useMemo(() => {
    const latest = getLatestAssessments(assessments);
    const gapCount = {};
    for (const req of reqSkills.filter(r => r.is_required)) {
      const members = teamMembers.filter(m => m.team_id === req.team_id);
      for (const member of members) {
        const assessment = latest[`${member.user_id}-${req.skill_id}`] || null;
        const skill = skills.find(s => s.id === req.skill_id);
        if (!skill) continue;
        const rag = getRAGStatus(assessment, skill, req);
        if (rag === 'red' || rag === 'grey') {
          gapCount[req.skill_id] = (gapCount[req.skill_id] || 0) + 1;
        }
      }
    }
    return Object.entries(gapCount)
      .map(([id, gaps]) => ({ name: skills.find(s => s.id === id)?.name || 'Unknown', gaps }))
      .sort((a, b) => b.gaps - a.gaps)
      .slice(0, 10);
  }, [assessments, reqSkills, teamMembers, skills]);

  // ── Team compliance comparison ────────────────────────────────────────────
  const teamComplianceData = useMemo(() => {
    const latest = getLatestAssessments(assessments);
    return teams.map(team => {
      const members = teamMembers.filter(m => m.team_id === team.id);
      const reqs = reqSkills.filter(r => r.team_id === team.id && r.is_required);
      if (!reqs.length) return null;
      let green = 0, total = 0;
      for (const member of members) {
        for (const req of reqs) {
          const assessment = latest[`${member.user_id}-${req.skill_id}`] || null;
          const skill = skills.find(s => s.id === req.skill_id);
          total++;
          if (getRAGStatus(assessment, skill, req) === 'green') green++;
        }
      }
      return { name: team.name, compliance: total > 0 ? Math.round((green / total) * 100) : 0 };
    }).filter(Boolean).sort((a, b) => b.compliance - a.compliance);
  }, [assessments, teams, teamMembers, reqSkills, skills]);

  // ── Assessor activity (last 30 days) ─────────────────────────────────────
  const assessorData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const count = {};
    for (const a of assessments) {
      if (!a.assessed_date) continue;
      try {
        if (parseISO(a.assessed_date) < cutoff) continue;
      } catch { continue; }
      const name = a.assessed_by_name || 'Unknown';
      count[name] = (count[name] || 0) + 1;
    }
    return Object.entries(count)
      .map(([name, assessments]) => ({ name, assessments }))
      .sort((a, b) => b.assessments - a.assessments)
      .slice(0, 8);
  }, [assessments]);

  // ── Expiry forecast (next 6 months) ──────────────────────────────────────
  const expiryForecast = useMemo(() => {
    const latest = getLatestAssessments(assessments);
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const monthStart = startOfMonth(addMonths(now, i + 1));
      const monthEnd   = startOfMonth(addMonths(now, i + 2));
      const label = MONTH_LABELS[monthStart.getMonth()];
      const count = Object.values(latest).filter(a => {
        if (!a.expiry_date) return false;
        try {
          const d = parseISO(a.expiry_date);
          return isWithinInterval(d, { start: monthStart, end: monthEnd });
        } catch { return false; }
      }).length;
      return { month: label, expiring: count };
    });
  }, [assessments]);

  if (!canAccess) return (
    <div className="max-w-2xl mx-auto">
      <AnalyticsUpgradeGate />
    </div>
  );

  if (loading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-56 rounded-xl bg-muted animate-pulse" />)}
    </div>
  );

  const totalAssessments = assessments.length;
  const latestMap = getLatestAssessments(assessments);
  let totalReq = 0, totalGreen = 0;
  for (const req of reqSkills.filter(r => r.is_required)) {
    const members = teamMembers.filter(m => m.team_id === req.team_id);
    for (const member of members) {
      totalReq++;
      const a = latestMap[`${member.user_id}-${req.skill_id}`] || null;
      const sk = skills.find(s => s.id === req.skill_id);
      if (getRAGStatus(a, sk, req) === 'green') totalGreen++;
    }
  }
  const overallCompliance = totalReq > 0 ? Math.round((totalGreen / totalReq) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" /> Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Organisation-wide skills & compliance insights</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Overall Compliance', value: `${overallCompliance}%`, color: overallCompliance >= 80 ? 'text-green-600' : overallCompliance >= 50 ? 'text-amber-600' : 'text-red-600' },
          { label: 'Total Assessments', value: totalAssessments, color: 'text-foreground' },
          { label: 'Skill Gaps', value: topGapsData.reduce((s, g) => s + g.gaps, 0), color: 'text-red-600' },
          { label: 'Expiring (6mo)', value: expiryForecast.reduce((s, m) => s + m.expiring, 0), color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Assessment activity + Team compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Assessment Activity" subtitle="Assessments recorded per month (last 12 months)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activityData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar dataKey="count" name="Assessments" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Team Compliance" subtitle="% of required skills current per team">
          {teamComplianceData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No team required skills configured yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={teamComplianceData} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} width={80} />
                <Tooltip
                  formatter={v => [`${v}%`, 'Compliance']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="compliance" name="Compliance" radius={[0, 3, 3, 0]}>
                  {teamComplianceData.map((entry, i) => (
                    <Cell key={i} fill={entry.compliance >= 80 ? '#22c55e' : entry.compliance >= 50 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Top skill gaps + Expiry forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Skill Gaps" subtitle="Skills most frequently missing or unassessed (required)">
          {topGapsData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No skill gaps detected — great work!</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topGapsData} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} width={90} />
                <Tooltip
                  formatter={v => [v, 'People with gap']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="gaps" name="Gaps" fill="#ef4444" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Expiry Forecast" subtitle="Assessments due for renewal in the next 6 months">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={expiryForecast} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip
                formatter={v => [v, 'Expiring']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar dataKey="expiring" name="Expiring" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Assessor activity */}
      <ChartCard title="Assessor Activity" subtitle="Assessments recorded per manager / assessor (last 30 days)">
        {assessorData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No assessments recorded in the last 30 days</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={assessorData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip
                formatter={v => [v, 'Assessments']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar dataKey="assessments" name="Assessments" fill="#8b5cf6" radius={[3, 3, 0, 0]}>
                {assessorData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
