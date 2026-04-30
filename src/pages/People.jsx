import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users2, Search, ChevronDown, ChevronUp, ExternalLink,
  AlertTriangle, Clock, CheckCircle2, MinusCircle, Shield,
  TrendingDown,
} from 'lucide-react';
import { differenceInDays, parseISO, isValid, format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import { getRAGStatus, getProficiencyLabel } from '@/lib/ragUtils';
import { getLatestAssessments } from '@/utils/assessmentUtils';

// ─── RAG config ─────────────────────────────────────────────────────────────
const RAG = {
  green: { label: 'Current',    bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300',  dot: 'bg-green-500',  Icon: CheckCircle2 },
  amber: { label: 'Expiring',   bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300',  dot: 'bg-amber-500',  Icon: Clock },
  red:   { label: 'Gap',        bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300',    dot: 'bg-red-500',    Icon: AlertTriangle },
  grey:  { label: 'Unassessed', bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-300',   dot: 'bg-gray-400',   Icon: MinusCircle },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function expiryText(dateStr) {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  if (!isValid(d)) return { text: dateStr, urgent: false };
  const days = differenceInDays(d, new Date());
  if (days < 0) return { text: `Expired ${Math.abs(days)}d ago`, urgent: true };
  if (days === 0) return { text: 'Expires today', urgent: true };
  return { text: `${format(d, 'd MMM yyyy')} (${days}d)`, urgent: days <= 30 };
}

function compliancePct(personSkills) {
  const required = personSkills.filter(ps => ps.isRequired);
  if (!required.length) return null;
  const green = required.filter(ps => ps.rag === 'green').length;
  return Math.round((green / required.length) * 100);
}

// ─── Compliance ring ─────────────────────────────────────────────────────────
function ComplianceRing({ pct }) {
  if (pct === null) return (
    <div className="text-center w-16">
      <p className="text-xs text-muted-foreground">N/A</p>
    </div>
  );
  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  const r = 18, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-0.5 w-16 shrink-0">
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4} strokeLinecap="round" />
        <text x="22" y="26" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{pct}%</text>
      </svg>
      <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Compliant</p>
    </div>
  );
}

// ─── Skill row ───────────────────────────────────────────────────────────────
function SkillRow({ ps }) {
  const rag = RAG[ps.rag] || RAG.grey;
  const Icon = rag.Icon;
  const exp = ps.assessment?.expiry_date ? expiryText(ps.assessment.expiry_date) : null;
  return (
    <tr className="border-b border-border/40 hover:bg-muted/20 transition-colors">
      <td className="py-2.5 pl-4 pr-2 w-10 align-middle">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${rag.bg}`}>
          <Icon className={`w-3.5 h-3.5 ${rag.text}`} />
        </div>
      </td>
      <td className="py-2.5 px-3 align-middle">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{ps.skill.name}</span>
          {ps.isRequired && (
            <span className="text-[11px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">Required</span>
          )}
        </div>
      </td>
      <td className="py-2.5 px-3 w-28 align-middle">
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${rag.bg} ${rag.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${rag.dot}`} />
          {rag.label}
        </span>
      </td>
      <td className="py-2.5 px-3 w-36 text-xs text-muted-foreground align-middle">
        {ps.assessment ? getProficiencyLabel(ps.assessment.proficiency_level, ps.skill.scale_type) : <span className="italic text-muted-foreground/60">Not assessed</span>}
      </td>
      <td className="py-2.5 px-3 w-32 text-xs text-muted-foreground hidden sm:table-cell align-middle">
        {ps.assessment?.assessed_date ? format(parseISO(ps.assessment.assessed_date), 'd MMM yyyy') : '—'}
      </td>
      <td className="py-2.5 px-3 w-40 hidden md:table-cell align-middle">
        {exp ? (
          <span className={`text-xs font-medium ${exp.urgent ? 'text-red-600' : 'text-muted-foreground'}`}>{exp.text}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-2.5 px-3 pr-4 w-36 hidden lg:table-cell align-middle">
        {ps.assessment?.assessed_by_name ? (
          <span className="text-xs text-muted-foreground">{ps.assessment.assessed_by_name}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

// ─── Summary chips ────────────────────────────────────────────────────────────
function SummaryChips({ ragCounts }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {ragCounts.red > 0 && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
          <AlertTriangle className="w-2.5 h-2.5" /> {ragCounts.red} gap{ragCounts.red > 1 ? 's' : ''}
        </span>
      )}
      {ragCounts.amber > 0 && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
          <Clock className="w-2.5 h-2.5" /> {ragCounts.amber} expiring
        </span>
      )}
      {ragCounts.red === 0 && ragCounts.amber === 0 && ragCounts.green > 0 && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
          <CheckCircle2 className="w-2.5 h-2.5" /> Fully compliant
        </span>
      )}
      {ragCounts.grey > 0 && ragCounts.red === 0 && ragCounts.amber === 0 && ragCounts.green === 0 && (
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
          <MinusCircle className="w-2.5 h-2.5" /> Not yet assessed
        </span>
      )}
    </div>
  );
}

// ─── Person card ──────────────────────────────────────────────────────────────
function PersonCard({ person, personSkills, categories, skills, teamNames }) {
  const [expanded, setExpanded] = useState(false);
  const pct = compliancePct(personSkills);
  const ragCounts = { green: 0, amber: 0, red: 0, grey: 0 };
  for (const ps of personSkills) if (ps.isRequired) ragCounts[ps.rag] = (ragCounts[ps.rag] || 0) + 1;
  const initials = (person.name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  // Group by category
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
  const skillMap = Object.fromEntries(skills.map(s => [s.id, s]));
  const grouped = {};
  for (const ps of personSkills) {
    const skill = skillMap[ps.skill_id];
    if (!skill) continue;
    const cat = catMap[skill.category_id];
    const catKey = cat?.id || 'other';
    const catName = cat?.name || 'Uncategorised';
    if (!grouped[catKey]) grouped[catKey] = { name: catName, colour: cat?.colour, skills: [] };
    grouped[catKey].skills.push(ps);
  }
  const sortOrder = { red: 0, amber: 1, grey: 2, green: 3 };
  const sortedCats = Object.values(grouped).sort((a, b) => {
    const worstA = Math.min(...a.skills.map(s => sortOrder[s.rag] ?? 4));
    const worstB = Math.min(...b.skills.map(s => sortOrder[s.rag] ?? 4));
    return worstA - worstB;
  });

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0 ring-2 ring-primary/10">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm">{person.name}</span>
            <Badge variant={person.isManaged ? 'secondary' : 'outline'} className="text-[11px] py-0 px-1.5 h-4">
              {person.isManaged ? 'Managed' : 'App User'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {person.email && (
              <span className="text-xs text-muted-foreground truncate max-w-xs">{person.email}</span>
            )}
            {teamNames.map(t => (
              <span key={t} className="text-xs text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-muted">{t}</span>
            ))}
          </div>
          <div className="mt-1.5">
            <SummaryChips ragCounts={ragCounts} />
          </div>
        </div>

        {/* Compliance ring */}
        <ComplianceRing pct={pct} />

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Link
            to={`/users/${person.userId}`}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
            onClick={e => e.stopPropagation()}
            title="Full profile"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            onClick={() => setExpanded(e => !e)}
            aria-label={expanded ? 'Collapse' : 'Expand skills'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded skills */}
      {expanded && (
        <div className="border-t border-border">
          {sortedCats.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">No required skills assigned to this person's teams.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="w-10 pl-4" />
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5 px-3">Skill</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5 px-3 w-28">Status</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5 px-3 w-36">Level</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5 px-3 w-32 hidden sm:table-cell">Assessed</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5 px-3 w-40 hidden md:table-cell">Expires</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5 px-3 pr-4 w-36 hidden lg:table-cell">Assessed By</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCats.map(cat => (
                    <React.Fragment key={cat.name}>
                      {/* Category separator row */}
                      <tr className="bg-muted/20 border-y border-border/50">
                        <td colSpan={7} className="py-1.5 pl-4 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.colour || '#94a3b8' }} />
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{cat.name}</span>
                            <span className="text-xs text-muted-foreground/60 ml-1">({cat.skills.length})</span>
                          </div>
                        </td>
                      </tr>
                      {cat.skills
                        .sort((a, b) => (sortOrder[a.rag] ?? 4) - (sortOrder[b.rag] ?? 4))
                        .map(ps => <SkillRow key={ps.skill_id} ps={ps} />)}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function People() {
  const { org, user } = useOrganisation();

  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers]     = useState([]);
  const [appUsers, setAppUsers]           = useState([]);
  const [skills, setSkills]               = useState([]);
  const [categories, setCategories]       = useState([]);
  const [assessments, setAssessments]     = useState([]);
  const [teams, setTeams]                 = useState([]);
  const [reqSkills, setReqSkills]         = useState([]);

  const [search, setSearch]               = useState('');
  const [filterTeam, setFilterTeam]       = useState('all');
  const [showGapsOnly, setShowGapsOnly]   = useState(false);

  useEffect(() => { if (org) loadData(); }, [org?.id]);

  async function loadData() {
    setLoading(true);
    const [tm, sk, ca, as, te, rs] = await Promise.all([
      base44.entities.TeamMember.filter({ organisation_id: org.id }),
      base44.entities.Skill.filter({ organisation_id: org.id }),
      base44.entities.SkillCategory.filter({ organisation_id: org.id }),
      base44.entities.SkillAssessment.filter({ organisation_id: org.id }),
      base44.entities.Team.filter({ organisation_id: org.id }),
      base44.entities.TeamRequiredSkill.filter({ organisation_id: org.id }),
    ]);
    let au = [];
    try { au = await base44.entities.User.filter({ organisation_id: org.id }); } catch (_) {}

    const role = user?.role || 'viewer';
    let filteredTM = tm;
    if (role === 'manager') {
      const myTeams = te.filter(t =>
        Array.isArray(t.manager_ids) ? t.manager_ids.includes(user.id) : t.manager_user_id === user.id
      ).map(t => t.id);
      filteredTM = tm.filter(m => myTeams.includes(m.team_id));
    }

    setTeamMembers(filteredTM);
    setAppUsers(au);
    setSkills(sk);
    setCategories(ca.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    setAssessments(as);
    setTeams(te);
    setReqSkills(rs);
    setLoading(false);
  }

  const people = useMemo(() => {
    const map = {};
    for (const tm of teamMembers) {
      if (!map[tm.user_id]) {
        const appUser = appUsers.find(u => u.id === tm.user_id);
        map[tm.user_id] = {
          userId: tm.user_id,
          name: tm.user_name || appUser?.full_name || 'Unknown',
          email: tm.user_email || appUser?.email || null,
          isManaged: !!tm.is_managed_member,
          teamIds: [],
        };
      }
      map[tm.user_id].teamIds.push(tm.team_id);
    }
    return Object.values(map);
  }, [teamMembers, appUsers]);

  const assessmentMap = useMemo(() => getLatestAssessments(assessments), [assessments]);

  const reqMap = useMemo(() => {
    const m = {};
    for (const r of reqSkills) m[`${r.team_id}-${r.skill_id}`] = r;
    return m;
  }, [reqSkills]);

  const teamNameMap = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t.name])), [teams]);

  const personSkillsMap = useMemo(() => {
    const m = {};
    for (const person of people) {
      const teamSkillIds = new Set();
      const personReqs = {};
      for (const teamId of person.teamIds) {
        for (const req of reqSkills.filter(r => r.team_id === teamId)) {
          teamSkillIds.add(req.skill_id);
          personReqs[req.skill_id] = req;
        }
      }
      const skillIds = teamSkillIds.size > 0 ? [...teamSkillIds] : skills.map(s => s.id);
      m[person.userId] = skillIds.map(skillId => {
        const skill = skills.find(s => s.id === skillId);
        if (!skill) return null;
        const assessment = assessmentMap[`${person.userId}-${skillId}`] || null;
        const reqs = person.teamIds.map(tid => reqMap[`${tid}-${skillId}`]).filter(Boolean);
        const req = reqs.sort((a, b) => (b.minimum_proficiency ?? 1) - (a.minimum_proficiency ?? 1))[0] || null;
        const rag = getRAGStatus(assessment, skill, req);
        return { skill_id: skillId, user_id: person.userId, skill, assessment, req, rag, isRequired: !!req };
      }).filter(Boolean);
    }
    return m;
  }, [people, skills, assessmentMap, reqSkills, reqMap]);

  const sortedPeople = useMemo(() => {
    return [...people].sort((a, b) => {
      const pA = compliancePct(personSkillsMap[a.userId] || []) ?? 100;
      const pB = compliancePct(personSkillsMap[b.userId] || []) ?? 100;
      return pA - pB;
    });
  }, [people, personSkillsMap]);

  const filteredPeople = useMemo(() => {
    return sortedPeople.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.email || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (filterTeam !== 'all' && !p.teamIds.includes(filterTeam)) return false;
      if (showGapsOnly) {
        const ps = personSkillsMap[p.userId] || [];
        if (!ps.some(s => s.rag === 'red' || s.rag === 'amber')) return false;
      }
      return true;
    });
  }, [sortedPeople, search, filterTeam, showGapsOnly, personSkillsMap]);

  // Stats
  const stats = useMemo(() => {
    const withGaps = people.filter(p => (personSkillsMap[p.userId] || []).some(s => s.rag === 'red')).length;
    const withExpiring = people.filter(p => (personSkillsMap[p.userId] || []).some(s => s.rag === 'amber')).length;
    const avgPct = people.length === 0 ? 0 : Math.round(
      people.reduce((sum, p) => sum + (compliancePct(personSkillsMap[p.userId] || []) ?? 100), 0) / people.length
    );
    return { withGaps, withExpiring, avgPct };
  }, [people, personSkillsMap]);

  const activeTeamIds = new Set(teamMembers.map(m => m.team_id));
  const visibleTeams = teams.filter(t => activeTeamIds.has(t.id));

  if (loading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  );

  if (!people.length) return (
    <EmptyState
      icon={Users2}
      title="No people yet"
      description="Add employees to teams via the Skills Matrix or Teams page to see their training profiles here."
    />
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users2 className="w-6 h-6 text-primary" /> People
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Training records directory — sorted by lowest compliance first</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total People',    value: people.length,      icon: Users2,        color: 'text-foreground' },
          { label: 'Avg Compliance',  value: `${stats.avgPct}%`, icon: Shield,        color: stats.avgPct >= 80 ? 'text-green-600' : stats.avgPct >= 50 ? 'text-amber-600' : 'text-red-600' },
          { label: 'With Skill Gaps', value: stats.withGaps,     icon: TrendingDown,  color: stats.withGaps > 0 ? 'text-red-600' : 'text-green-600' },
          { label: 'Expiring Soon',   value: stats.withExpiring, icon: Clock,         color: stats.withExpiring > 0 ? 'text-amber-600' : 'text-green-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Icon className={`w-4.5 h-4.5 ${color}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative min-w-52 flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-9 text-sm"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          value={filterTeam}
          onChange={e => setFilterTeam(e.target.value)}
        >
          <option value="all">All Teams</option>
          {visibleTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <Button
          variant={showGapsOnly ? 'default' : 'outline'}
          size="sm"
          className="h-9"
          onClick={() => setShowGapsOnly(g => !g)}
        >
          <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
          Gaps &amp; expiring only
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {filteredPeople.length} of {people.length} people
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 items-center px-1">
        {Object.entries(RAG).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        ))}
        <span className="text-[11px] text-muted-foreground/60 ml-2">· Compliance counts required skills only</span>
      </div>

      {/* People list */}
      {filteredPeople.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No people match your current filters.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredPeople.map(person => (
            <PersonCard
              key={person.userId}
              person={person}
              personSkills={personSkillsMap[person.userId] || []}
              categories={categories}
              skills={skills}
              teamNames={person.teamIds.map(id => teamNameMap[id]).filter(Boolean)}
            />
          ))}
        </div>
      )}
    </div>
  );
}