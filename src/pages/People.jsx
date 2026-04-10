import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users2, Search, ChevronDown, ChevronUp, ExternalLink,
  AlertTriangle, Clock, CheckCircle2, MinusCircle,
} from 'lucide-react';
import { differenceInDays, parseISO, isValid, format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import { getRAGStatus, getProficiencyLabel, getRAGLabel } from '@/lib/ragUtils';

// ─── Status dot ────────────────────────────────────────────────────────────
const STATUS_DOT = {
  green: { color: '#16a34a', icon: CheckCircle2 },
  amber: { color: '#d97706', icon: Clock },
  red:   { color: '#dc2626', icon: AlertTriangle },
  grey:  { color: '#94a3b8', icon: MinusCircle },
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function expiryText(dateStr) {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  if (!isValid(d)) return dateStr;
  const days = differenceInDays(d, new Date());
  if (days < 0) return { text: `Expired ${Math.abs(days)}d ago`, urgent: true };
  if (days === 0) return { text: 'Expires today', urgent: true };
  return { text: `${days}d`, urgent: days <= 30 };
}

function compliancePct(personSkills) {
  if (!personSkills.length) return 100;
  const green = personSkills.filter(ps => ps.rag === 'green' || ps.rag === 'amber').length;
  return Math.round((green / personSkills.length) * 100);
}

// Compliance colour
function pctColor(pct) {
  if (pct >= 80) return '#16a34a';
  if (pct >= 50) return '#d97706';
  return '#dc2626';
}

// ─── Expanded person detail ─────────────────────────────────────────────────
function PersonSkillsDetail({ personSkills, categories, skills }) {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
  const skillMap = Object.fromEntries(skills.map(s => [s.id, s]));

  // Group by category
  const grouped = {};
  for (const ps of personSkills) {
    const skill = skillMap[ps.skill_id];
    if (!skill) continue;
    const catName = catMap[skill.category_id] || 'Uncategorised';
    if (!grouped[catName]) grouped[catName] = [];
    grouped[catName].push({ ...ps, skill });
  }

  const sortedCats = Object.keys(grouped).sort();

  if (!sortedCats.length) {
    return (
      <p className="text-sm text-muted-foreground px-4 pb-4">
        No skills are assigned to any team containing this person.
      </p>
    );
  }

  return (
    <div className="border-t border-border">
      {sortedCats.map(cat => (
        <div key={cat}>
          <div className="px-4 py-2 bg-muted/40 border-b border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium w-6"></th>
                  <th className="text-left px-4 py-2 font-medium">Skill</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Level</th>
                  <th className="text-left px-4 py-2 font-medium">Assessed</th>
                  <th className="text-left px-4 py-2 font-medium">Expires</th>
                  <th className="text-left px-4 py-2 font-medium">Assessed by</th>
                </tr>
              </thead>
              <tbody>
                {grouped[cat].map(ps => {
                  const dotCfg = STATUS_DOT[ps.rag];
                  const DotIcon = dotCfg.icon;
                  const exp = ps.assessment?.expiry_date ? expiryText(ps.assessment.expiry_date) : null;
                  return (
                    <tr key={ps.skill_id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5">
                        <DotIcon className="w-4 h-4 shrink-0" style={{ color: dotCfg.color }} />
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-foreground">{ps.skill.name}</span>
                        {ps.isRequired && (
                          <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1.5 border-primary/40 text-primary">
                            Required
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-medium" style={{ color: dotCfg.color }}>
                          {getRAGLabel(ps.rag, ps.assessment, ps.skill, ps.req)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {ps.assessment
                          ? getProficiencyLabel(ps.assessment.proficiency_level, ps.skill.scale_type)
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {ps.assessment?.assessed_date
                          ? format(parseISO(ps.assessment.assessed_date), 'd MMM yyyy')
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {exp ? (
                          <span className={`text-xs font-medium ${exp.urgent ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {exp.text}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {ps.assessment?.assessed_by_name || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <div className="px-4 py-3 border-t border-border flex justify-end">
        <Link
          to={`/users/${personSkills[0]?.user_id}`}
          className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
        >
          View full profile &amp; assess <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── Person card ────────────────────────────────────────────────────────────
function PersonCard({ person, personSkills, categories, skills, teamNames }) {
  const [expanded, setExpanded] = useState(false);
  const pct = compliancePct(personSkills);
  const ragCounts = { green: 0, amber: 0, red: 0, grey: 0 };
  for (const ps of personSkills) ragCounts[ps.rag]++;
  const hasGaps = ragCounts.red > 0 || ragCounts.amber > 0;
  const initials = (person.name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Card header — always visible */}
      <button
        className="w-full text-left px-4 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
          {initials}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">{person.name}</span>
            {person.isManaged ? (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Managed</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">App user</Badge>
            )}
            {teamNames.map(t => (
              <Badge key={t} variant="outline" className="text-[10px] py-0 px-1.5 border-muted-foreground/30">
                {t}
              </Badge>
            ))}
          </div>
          {person.email && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{person.email}</p>
          )}
        </div>

        {/* RAG chips */}
        <div className="flex items-center gap-2 shrink-0">
          {ragCounts.red > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {ragCounts.red} gap{ragCounts.red > 1 ? 's' : ''}
            </span>
          )}
          {ragCounts.amber > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {ragCounts.amber} expiring
            </span>
          )}
        </div>

        {/* Compliance % */}
        <div className="text-right shrink-0 w-16">
          <p className="text-xl font-bold" style={{ color: pctColor(pct) }}>{pct}%</p>
          <p className="text-[10px] text-muted-foreground">compliant</p>
        </div>

        {/* Full profile link */}
        <Link
          to={`/users/${person.userId}`}
          className="shrink-0 text-primary hover:text-primary/80 transition-colors"
          onClick={e => e.stopPropagation()}
          title="Full profile"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>

        {/* Chevron */}
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded skill detail */}
      {expanded && (
        <PersonSkillsDetail
          personSkills={personSkills}
          categories={categories}
          skills={skills}
        />
      )}
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
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
    try {
      const role = user?.role || 'viewer';
      const [tm, au, sk, ca, as, te, rs] = await Promise.all([
        base44.entities.TeamMember.filter({ organisation_id: org.id }),
        base44.auth.me().then(me => base44.entities.User.filter({ organisation_id: org.id })).catch(() => []),
        base44.entities.Skill.filter({ organisation_id: org.id }),
        base44.entities.SkillCategory.filter({ organisation_id: org.id }),
        base44.entities.SkillAssessment.filter({ organisation_id: org.id }),
        base44.entities.Team.filter({ organisation_id: org.id }),
        base44.entities.TeamRequiredSkill.filter({ organisation_id: org.id }),
      ]);

      // Managers only see their own teams' members
      let filteredTM = tm;
      if (role === 'manager') {
        const myTeams = te.filter(t => Array.isArray(t.manager_ids) ? t.manager_ids.includes(user.id) : t.manager_user_id === user.id).map(t => t.id);
        filteredTM = tm.filter(m => myTeams.includes(m.team_id));
      }

      setTeamMembers(filteredTM);
      setAppUsers(au);
      setSkills(sk);
      setCategories(ca);
      setAssessments(as);
      setTeams(te);
      setReqSkills(rs);
    } catch (_) {}
    setLoading(false);
  }

  // Build deduplicated person list keyed by user_id
  const people = useMemo(() => {
    const map = {};
    for (const tm of teamMembers) {
      if (!map[tm.user_id]) {
        // Try to merge app user data
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

  // Build assessment lookup: user_id-skill_id → latest assessment
  const assessmentMap = useMemo(() => {
    const m = {};
    for (const a of assessments) {
      const key = `${a.user_id}-${a.skill_id}`;
      if (!m[key] || a.assessed_date > m[key].assessed_date) m[key] = a;
    }
    return m;
  }, [assessments]);

  // Build required skill lookup: team_id-skill_id → RequiredSkill
  const reqMap = useMemo(() => {
    const m = {};
    for (const r of reqSkills) m[`${r.team_id}-${r.skill_id}`] = r;
    return m;
  }, [reqSkills]);

  // Team name lookup
  const teamNameMap = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t.name])), [teams]);

  // Build per-person skill rows: all skills that appear in any of their teams
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

      // If no required skills, show all org skills
      const skillIds = teamSkillIds.size > 0 ? [...teamSkillIds] : skills.map(s => s.id);

      m[person.userId] = skillIds.map(skillId => {
        const skill = skills.find(s => s.id === skillId);
        if (!skill) return null;
        const assessment = assessmentMap[`${person.userId}-${skillId}`] || null;
        // Use team requirement from any team; prefer most restrictive (highest min proficiency)
        const reqs = person.teamIds.map(tid => reqMap[`${tid}-${skillId}`]).filter(Boolean);
        const req = reqs.sort((a, b) => (b.minimum_proficiency ?? 1) - (a.minimum_proficiency ?? 1))[0] || null;
        const rag = getRAGStatus(assessment, skill, req);
        return { skill_id: skillId, user_id: person.userId, skill, assessment, req, rag, isRequired: !!req };
      }).filter(Boolean);
    }
    return m;
  }, [people, skills, assessmentMap, reqSkills, reqMap]);

  // Sort people: by compliance % ascending (worst first)
  const sortedPeople = useMemo(() => {
    return [...people].sort((a, b) => {
      const pA = compliancePct(personSkillsMap[a.userId] || []);
      const pB = compliancePct(personSkillsMap[b.userId] || []);
      return pA - pB;
    });
  }, [people, personSkillsMap]);

  // Filtered people
  const filteredPeople = useMemo(() => {
    return sortedPeople.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterTeam !== 'all' && !p.teamIds.includes(filterTeam)) return false;
      if (showGapsOnly) {
        const ps = personSkillsMap[p.userId] || [];
        const hasGap = ps.some(s => s.rag === 'red' || s.rag === 'amber');
        if (!hasGap) return false;
      }
      return true;
    });
  }, [sortedPeople, search, filterTeam, showGapsOnly, personSkillsMap]);

  // Summary stats
  const totalWithGaps = people.filter(p => {
    const ps = personSkillsMap[p.userId] || [];
    return ps.some(s => s.rag === 'red' || s.rag === 'amber');
  }).length;

  // Visible teams (only teams that have people in them)
  const activeTeamIds = new Set(teamMembers.map(m => m.team_id));
  const visibleTeams = teams.filter(t => activeTeamIds.has(t.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!people.length) {
    return (
      <EmptyState
        icon={Users2}
        title="No people yet"
        description="Add employees to teams via the Skills Matrix or Teams page to see their training profiles here."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users2 className="w-6 h-6 text-primary" />
            People
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Training profiles for all employees tracked in the skills matrix
          </p>
        </div>
        {/* Summary chips */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{people.length}</span> people
          </span>
          {totalWithGaps > 0 && (
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-red-100 text-red-700">
              {totalWithGaps} with gaps or expiring
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="rounded-md border border-input bg-background text-sm px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={filterTeam}
          onChange={e => setFilterTeam(e.target.value)}
        >
          <option value="all">All teams</option>
          {visibleTeams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <Button
          variant={showGapsOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowGapsOnly(g => !g)}
        >
          <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
          Gaps &amp; expiring only
        </Button>
      </div>

      {/* People list */}
      {filteredPeople.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No people match your current filters.
        </div>
      ) : (
        <div className="space-y-3">
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