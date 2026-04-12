import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Users2, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Clock, AlertTriangle, MinusCircle,
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/EmptyState';
import { getRAGStatus, getProficiencyLabel } from '@/lib/ragUtils';

// ─── Status icon ───────────────────────────────────────────────────────────
function StatusIcon({ status }) {
  if (status === 'green') return <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />;
  if (status === 'amber') return <Clock className="w-4 h-4 text-amber-500 shrink-0" />;
  if (status === 'red')   return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
  return <MinusCircle className="w-4 h-4 text-muted-foreground/40 shrink-0" />;
}

// ─── Compliance badge colour ────────────────────────────────────────────────
function complianceColor(pct) {
  if (pct >= 80) return 'text-green-700';
  if (pct >= 50) return 'text-amber-600';
  return 'text-red-600';
}

// ─── Expiry countdown label ─────────────────────────────────────────────────
function expiryLabel(dateStr) {
  if (!dateStr) return '—';
  const days = differenceInDays(parseISO(dateStr), new Date());
  if (days < 0) return <span className="text-red-600 font-semibold">Expired {Math.abs(days)}d ago</span>;
  if (days === 0) return <span className="text-red-600 font-semibold">Expires today</span>;
  if (days <= 30) return <span className="text-amber-600 font-semibold">In {days}d</span>;
  return <span className="text-muted-foreground">{dateStr}</span>;
}

// ─── Expanded skill table for one person ───────────────────────────────────
function PersonSkillTable({ groupedSkills, currentAssessments, reqSkillIds, reqSkillsMap }) {
  if (groupedSkills.length === 0) {
    return <p className="px-5 pb-4 text-xs text-muted-foreground">No skills in library.</p>;
  }
  return (
    <div className="border-t border-border overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40 border-b border-border">
            <th className="text-left px-4 py-2 font-medium text-muted-foreground w-5"></th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Skill</th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Status</th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">Level</th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden lg:table-cell">Assessed</th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden lg:table-cell">Expiry</th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden xl:table-cell">Assessed By</th>
          </tr>
        </thead>
        <tbody>
          {groupedSkills.map(cat => (
            <>
              <tr key={`cat-${cat.id}`} className="bg-muted/20">
                <td colSpan={7} className="px-4 py-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.colour || '#6B7280' }} />
                    <span className="font-semibold text-foreground uppercase tracking-wide text-xs">{cat.name}</span>
                  </span>
                </td>
              </tr>
              {cat.skills.map(skill => {
                const assessment = currentAssessments[skill.id];
                const req = reqSkillsMap[skill.id];
                const status = getRAGStatus(assessment, skill, req);
                const isRequired = reqSkillIds.has(skill.id);
                const labelMap = { green: 'Current', amber: 'Expiring', red: 'Gap', grey: 'Unassessed' };
                return (
                  <tr key={skill.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2"><StatusIcon status={status} /></td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-foreground">{skill.name}</span>
                      {isRequired && (
                        <Badge variant="outline" className="ml-1.5 text-[11px] px-1 py-0">Required</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 hidden sm:table-cell">
                      <span className={
                        status === 'green' ? 'text-green-700' :
                        status === 'amber' ? 'text-amber-600' :
                        status === 'red'   ? 'text-red-600'   :
                        'text-muted-foreground'
                      }>
                        {labelMap[status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
                      {assessment ? getProficiencyLabel(assessment.proficiency_level, skill.scale_type) : '—'}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground hidden lg:table-cell">
                      {assessment?.assessed_date || '—'}
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell">
                      {assessment?.expiry_date ? expiryLabel(assessment.expiry_date) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground hidden xl:table-cell">
                      {assessment?.assessed_by_name || '—'}
                    </td>
                  </tr>
                );
              })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function PeoplePage() {
  const { org, user } = useOrganisation();
  const [loading, setLoading]         = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teams, setTeams]             = useState([]);
  const [skills, setSkills]           = useState([]);
  const [categories, setCategories]   = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [reqSkills, setReqSkills]     = useState([]);
  const [appUsers, setAppUsers]       = useState([]);

  // Filters
  const [search, setSearch]           = useState('');
  const [filterTeam, setFilterTeam]   = useState('all');
  const [gapsOnly, setGapsOnly]       = useState(false);

  // Expand state
  const [expanded, setExpanded]       = useState(new Set());

  useEffect(() => { if (org) loadData(); }, [org]);

  async function loadData() {
    const [tm, t, s, c, a, trs] = await Promise.all([
      base44.entities.TeamMember.filter({ organisation_id: org.id }),
      base44.entities.Team.filter({ organisation_id: org.id }),
      base44.entities.Skill.filter({ organisation_id: org.id, status: 'active' }),
      base44.entities.SkillCategory.filter({ organisation_id: org.id }),
      base44.entities.SkillAssessment.filter({ organisation_id: org.id }),
      base44.entities.TeamRequiredSkill.filter({ organisation_id: org.id }),
    ]);
    let u = [];
    try { u = await base44.entities.User.filter({ organisation_id: org.id }); } catch (_) {}
    setTeamMembers(tm);
    setTeams(t);
    setSkills(s);
    setCategories(c.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    setAssessments(a);
    setReqSkills(trs);
    setAppUsers(u);
    setLoading(false);
  }

  if (loading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
    </div>
  );

  // Build current assessment map: user+skill → latest assessment
  const currentAssessments = {};
  [...assessments]
    .sort((a, b) => (a.assessed_date || '').localeCompare(b.assessed_date || ''))
    .forEach(a => { currentAssessments[`${a.user_id}-${a.skill_id}`] = a; });

  // Scope teams for managers
  const isManager = user?.role === 'manager';
  const myManagedTeamIds = isManager
    ? new Set(teams.filter(t => t.manager_ids?.includes(user.id)).map(t => t.id))
    : null;

  // Deduplicate all people from TeamMember
  const personMap = {};
  teamMembers.forEach(m => {
    if (isManager && !myManagedTeamIds.has(m.team_id)) return;
    if (!personMap[m.user_id]) {
      const appUser = appUsers.find(u => u.id === m.user_id);
      personMap[m.user_id] = {
        userId:     m.user_id,
        name:       m.user_name || appUser?.full_name || 'Unknown',
        email:      m.user_email || appUser?.email || '',
        isManaged:  !!m.is_managed_member,
        teamIds:    [],
      };
    }
    personMap[m.user_id].teamIds.push(m.team_id);
  });

  // Compute compliance & RAG for each person
  const people = Object.values(personMap).map(person => {
    const myTeamIds = person.teamIds;
    const myReqSkills = reqSkills.filter(r => myTeamIds.includes(r.team_id) && r.is_required);
    const reqSkillIds = new Set(myReqSkills.map(r => r.skill_id));

    let green = 0, amber = 0, red = 0, grey = 0;
    myReqSkills.forEach(req => {
      const skill = skills.find(s => s.id === req.skill_id);
      if (!skill) return;
      const assessment = currentAssessments[`${person.userId}-${req.skill_id}`];
      const status = getRAGStatus(assessment, skill, req);
      if (status === 'green') green++;
      else if (status === 'amber') amber++;
      else if (status === 'red') red++;
      else grey++;
    });
    const totalReq = green + amber + red + grey;
    const compliance = totalReq > 0 ? Math.round((green / totalReq) * 100) : null;
    const hasGaps = red > 0 || amber > 0;

    return { ...person, green, amber, red, grey, compliance, hasGaps, reqSkillIds };
  });

  // Apply filters
  let filtered = people;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    );
  }
  if (filterTeam !== 'all') {
    filtered = filtered.filter(p => p.teamIds.includes(filterTeam));
  }
  if (gapsOnly) {
    filtered = filtered.filter(p => p.hasGaps);
  }

  // Sort worst-first
  filtered.sort((a, b) => {
    if (a.compliance === null && b.compliance === null) return 0;
    if (a.compliance === null) return 1;
    if (b.compliance === null) return -1;
    return a.compliance - b.compliance;
  });

  // Teams available in filter (scoped for managers)
  const visibleTeams = isManager
    ? teams.filter(t => myManagedTeamIds.has(t.id))
    : teams;

  // Grouped skills for expanded view (per person)
  function buildGroupedSkills(userId, teamIds) {
    const myReqSkills = reqSkills.filter(r => teamIds.includes(r.team_id) && r.is_required);
    const reqSkillIds = new Set(myReqSkills.map(r => r.skill_id));
    // Map skillId → best req (for minimum_proficiency lookup)
    const reqSkillsMap = {};
    myReqSkills.forEach(r => { if (!reqSkillsMap[r.skill_id]) reqSkillsMap[r.skill_id] = r; });

    const assessmentsForUser = {};
    skills.forEach(s => {
      const a = currentAssessments[`${userId}-${s.id}`];
      if (a) assessmentsForUser[s.id] = a;
    });

    const grouped = categories
      .map(cat => ({
        ...cat,
        skills: skills
          .filter(s => s.category_id === cat.id)
          .map(s => {
            const req = reqSkillsMap[s.id];
            const status = getRAGStatus(assessmentsForUser[s.id], s, req);
            return { ...s, _status: status };
          })
          .sort((a, b) => {
            const order = { red: 0, amber: 1, grey: 2, green: 3 };
            return (order[a._status] ?? 4) - (order[b._status] ?? 4);
          }),
      }))
      .filter(g => g.skills.length > 0);

    return { grouped, reqSkillIds, reqSkillsMap, assessmentsForUser };
  }

  const toggleExpand = (userId) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">People</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Training records directory — {filtered.length} of {people.length} person{people.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search people…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 w-52 text-sm"
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={filterTeam}
          onChange={e => setFilterTeam(e.target.value)}
        >
          <option value="all">All Teams</option>
          {visibleTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={gapsOnly}
            onChange={e => setGapsOnly(e.target.checked)}
            className="rounded border-border"
          />
          Gaps & expiring only
        </label>
      </div>

      {/* People list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No people found"
          description={people.length === 0
            ? "Add team members to see their training records here."
            : "No people match your current filters."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(person => {
            const isOpen = expanded.has(person.userId);
            const { grouped, reqSkillIds, reqSkillsMap, assessmentsForUser } = isOpen
              ? buildGroupedSkills(person.userId, person.teamIds)
              : { grouped: [], reqSkillIds: new Set(), reqSkillsMap: {}, assessmentsForUser: {} };
            const personTeamNames = person.teamIds
              .map(id => teams.find(t => t.id === id)?.name)
              .filter(Boolean);

            return (
              <div key={person.userId} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                {/* Person row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Expand toggle */}
                  <button
                    onClick={() => toggleExpand(person.userId)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={isOpen ? 'Collapse' : 'Expand'}
                  >
                    {isOpen
                      ? <ChevronDown className="w-4 h-4" />
                      : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                    {person.name[0].toUpperCase()}
                  </div>

                  {/* Name + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/users/${person.userId}`}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {person.name}
                      </Link>
                      <Badge variant="outline" className={`text-[11px] px-1.5 ${person.isManaged ? 'text-muted-foreground' : 'text-primary border-primary/30'}`}>
                        {person.isManaged ? 'Managed' : 'App User'}
                      </Badge>
                      {personTeamNames.map(tn => (
                        <Badge key={tn} variant="secondary" className="text-[11px] px-1.5">{tn}</Badge>
                      ))}
                    </div>
                    {/* Gap / expiring chips */}
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {person.red > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                          <XCircle className="w-2.5 h-2.5" />
                          {person.red} gap{person.red !== 1 ? 's' : ''}
                        </span>
                      )}
                      {person.amber > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {person.amber} expiring
                        </span>
                      )}
                      {person.green > 0 && person.red === 0 && person.amber === 0 && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Fully compliant
                        </span>
                      )}
                      {person.compliance === null && (
                        <span className="text-xs text-muted-foreground">No required skills</span>
                      )}
                    </div>
                  </div>

                  {/* Compliance % */}
                  <div className="shrink-0 text-right">
                    {person.compliance !== null ? (
                      <span className={`text-lg font-bold ${complianceColor(person.compliance)}`}>
                        {person.compliance}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                    <p className="text-xs text-muted-foreground">compliance</p>
                  </div>

                  {/* Profile link */}
                  <Link
                    to={`/users/${person.userId}`}
                    className="shrink-0 text-xs text-primary hover:underline hidden sm:block"
                  >
                    Full profile →
                  </Link>
                </div>

                {/* Expandable skill table */}
                {isOpen && (
                  <PersonSkillTable
                    groupedSkills={grouped}
                    currentAssessments={assessmentsForUser}
                    reqSkillIds={reqSkillIds}
                    reqSkillsMap={reqSkillsMap}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}