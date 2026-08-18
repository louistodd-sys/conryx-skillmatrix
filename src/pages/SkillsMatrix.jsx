import { useState, useEffect, useMemo } from 'react';
import {
  Grid3X3, Search, Download, Printer, Rows3, AlignJustify, X,
  AlertTriangle, Clock, CheckCircle2, ChevronDown,
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import AssessmentModal from '@/components/AssessmentModal';
import BulkAssessmentModal from '@/components/BulkAssessmentModal';
import SkillsMatrixGrid from '@/components/matrix/SkillsMatrixGrid';
import MatrixLegend from '@/components/matrix/MatrixLegend';
import { getRAGStatus, getProficiencyLabel, getRAGLabel } from '@/lib/ragUtils';
import { getLatestAssessments } from '@/utils/assessmentUtils';
import { RAG_THEME, coverageStyle } from '@/lib/ragTheme';
import { buildMatrixCSV, downloadCSV } from '@/lib/matrixExport';

const DENSITY_KEY = 'matrix_density';

const fmtDate = (d) => {
  if (!d) return null;
  const parsed = parseISO(d);
  return isValid(parsed) ? format(parsed, 'd MMM yyyy') : d;
};

/** The glyph inside a cell. Pass/fail skills read ✓ / ✕; levelled skills read 0–4. */
function cellSymbol(assessment, skill) {
  if (!assessment) return '–';
  if (skill.scale_type === 'binary') return Number(assessment.proficiency_level) >= 1 ? '✓' : '✕';
  return String(assessment.proficiency_level ?? '–');
}

const SORTS = {
  name:   { label: 'Name (A–Z)' },
  risk:   { label: 'Least ready first' },
  gaps:   { label: 'Most gaps first' },
};

export default function SkillsMatrix() {
  const { org, user } = useOrganisation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [teams, setTeams]             = useState([]);
  const [members, setMembers]         = useState([]);
  const [skills, setSkills]           = useState([]);
  const [categories, setCategories]   = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [reqSkills, setReqSkills]     = useState([]);
  const [loading, setLoading]         = useState(true);

  const [selectedTeam, setSelectedTeam]     = useState(searchParams.get('team') || 'all');
  const [selectedCategory, setSelectedCat]  = useState('all');
  const [searchMember, setSearchMember]     = useState('');
  const [showOnlyRequired, setOnlyRequired] = useState(false);
  const [showOnlyIssues, setOnlyIssues]     = useState(false);
  const [sortBy, setSortBy]                 = useState('name');
  const [density, setDensity]               = useState(
    () => localStorage.getItem(DENSITY_KEY) || 'comfortable'
  );

  const [assessingCell, setAssessingCell] = useState(null);
  const [bulkSkill, setBulkSkill]         = useState(null);

  useEffect(() => { if (org) loadData(); }, [org]);
  useEffect(() => { localStorage.setItem(DENSITY_KEY, density); }, [density]);

  async function loadData() {
    const [t, tm, s, c, a, trs] = await Promise.all([
      apiClient.entities.Team.filter({ organisation_id: org.id }),
      apiClient.entities.TeamMember.filter({ organisation_id: org.id }),
      apiClient.entities.Skill.filter({ organisation_id: org.id, status: 'active' }),
      apiClient.entities.SkillCategory.filter({ organisation_id: org.id }),
      apiClient.entities.SkillAssessment.filter({ organisation_id: org.id }),
      apiClient.entities.TeamRequiredSkill.filter({ organisation_id: org.id }),
    ]);
    setTeams(t);
    setMembers(tm);
    setSkills(s);
    setCategories(c.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    setAssessments(a);
    setReqSkills(trs);
    setLoading(false);

    if (user?.role === 'manager' && t.length > 0) {
      const myTeam = t.find(team => team.manager_ids?.includes(user.id));
      if (myTeam) setSelectedTeam(myTeam.id);
    }
  }

  const currentAssessments = useMemo(() => getLatestAssessments(assessments), [assessments]);

  // ── People in scope ────────────────────────────────────────────────────────
  const peopleInScope = useMemo(() => {
    let scoped = members;
    if (selectedTeam !== 'all') {
      const ids = new Set(members.filter(m => m.team_id === selectedTeam).map(m => m.user_id));
      scoped = members.filter(m => ids.has(m.user_id));
    }
    const byUser = {};
    scoped.forEach(m => { if (!byUser[m.user_id]) byUser[m.user_id] = m; });
    return Object.values(byUser);
  }, [members, selectedTeam]);

  // Requirement lookup for a person × skill
  const getReq = (userId, skillId) => {
    if (selectedTeam !== 'all')
      return reqSkills.find(r => r.team_id === selectedTeam && r.skill_id === skillId);
    const memberships = members.filter(m => m.user_id === userId).map(m => m.team_id);
    const matches = memberships
      .map(tid => reqSkills.find(r => r.team_id === tid && r.skill_id === skillId))
      .filter(Boolean);
    // If someone sits in several teams, the strictest requirement wins.
    return matches.sort((a, b) => (b.minimum_proficiency ?? 1) - (a.minimum_proficiency ?? 1))[0];
  };

  // ── Cell builder (memoised map: one entry per person × skill) ──────────────
  const cellMap = useMemo(() => {
    const map = {};
    for (const m of peopleInScope) {
      for (const skill of skills) {
        const assessment = currentAssessments[`${m.user_id}-${skill.id}`];
        const req = getReq(m.user_id, skill.id);
        const status = getRAGStatus(assessment, skill, req);
        map[`${m.user_id}-${skill.id}`] = {
          status,
          symbol: cellSymbol(assessment, skill),
          label: getRAGLabel(status, assessment, skill, req),
          levelLabel: assessment
            ? getProficiencyLabel(assessment.proficiency_level, skill.scale_type)
            : 'Not assessed',
          requiredLabel: req?.is_required
            ? `at least ${getProficiencyLabel(req.minimum_proficiency ?? 1, skill.scale_type)}`
            : null,
          assessedDate: fmtDate(assessment?.assessed_date),
          expiryDate: fmtDate(assessment?.expiry_date),
          assessedBy: assessment?.assessed_by_name || null,
          notes: assessment?.notes || null,
          assessment,
        };
      }
    }
    return map;
  }, [peopleInScope, skills, currentAssessments, reqSkills, selectedTeam, members]);

  const getCell = (userId, skillId) =>
    cellMap[`${userId}-${skillId}`] || { status: 'grey', symbol: '–', label: 'Not required', levelLabel: 'Not assessed' };

  // ── Two levels of filtering ───────────────────────────────────────────────
  // Scope = what the user is looking at (team + category). Percentages and per-person
  // scores are always measured against the scope, never against the reduced view — so
  // switching on "gaps only" narrows what you see without making everybody's readiness
  // score collapse to 0%.
  const scopeSkills = useMemo(
    () => selectedCategory === 'all' ? skills : skills.filter(s => s.category_id === selectedCategory),
    [skills, selectedCategory]
  );

  // ── Visible skills (scope, then the reducing filters) ─────────────────────
  const visibleSkills = useMemo(() => {
    let list = scopeSkills;
    if (showOnlyRequired && selectedTeam !== 'all') {
      const reqIds = new Set(
        reqSkills.filter(r => r.team_id === selectedTeam && r.is_required).map(r => r.skill_id)
      );
      list = list.filter(s => reqIds.has(s.id));
    }
    if (showOnlyIssues) {
      list = list.filter(s =>
        peopleInScope.some(m => {
          const st = getCell(m.user_id, s.id).status;
          return st === 'red' || st === 'amber';
        })
      );
    }
    return list;
  }, [scopeSkills, showOnlyRequired, showOnlyIssues, selectedTeam, reqSkills, peopleInScope, cellMap]);

  const groupedSkills = useMemo(() => {
    const known = categories
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        colour: cat.colour || '#64748b',
        skills: visibleSkills.filter(s => s.category_id === cat.id),
      }))
      .filter(g => g.skills.length > 0);
    // Never silently drop a skill just because its category was deleted.
    const orphans = visibleSkills.filter(s => !categories.some(c => c.id === s.category_id));
    if (orphans.length) {
      known.push({ id: '__uncategorised', name: 'Uncategorised', colour: '#94a3b8', skills: orphans });
    }
    return known;
  }, [categories, visibleSkills]);

  const flatSkills = useMemo(() => groupedSkills.flatMap(g => g.skills), [groupedSkills]);

  // ── Rows, with per-person readiness ───────────────────────────────────────
  const rows = useMemo(() => {
    let list = peopleInScope.map(m => {
      const counts = { green: 0, amber: 0, red: 0, grey: 0 };
      // Counted over the scope, not the reduced view: a person's readiness is a fact
      // about them, not about which columns happen to be on screen.
      scopeSkills.forEach(s => { counts[getCell(m.user_id, s.id).status]++; });
      // Readiness counts only the skills that actually apply to this person.
      const tracked = counts.green + counts.amber + counts.red;
      return {
        id: m.user_id,
        name: m.user_name || 'Unknown',
        badge: m.is_managed_member ? 'Managed' : null,
        counts,
        requiredTotal: tracked,
        score: tracked > 0 ? Math.round((counts.green / tracked) * 100) : null,
      };
    });

    if (searchMember.trim()) {
      const q = searchMember.trim().toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q));
    }
    if (showOnlyIssues) {
      list = list.filter(r => r.counts.red > 0 || r.counts.amber > 0);
    }

    const byName = (a, b) => a.name.localeCompare(b.name);
    if (sortBy === 'risk') {
      list.sort((a, b) => (a.score ?? 101) - (b.score ?? 101) || byName(a, b));
    } else if (sortBy === 'gaps') {
      list.sort((a, b) => b.counts.red - a.counts.red || b.counts.amber - a.counts.amber || byName(a, b));
    } else {
      list.sort(byName);
    }
    return list;
  }, [peopleInScope, scopeSkills, cellMap, searchMember, showOnlyIssues, sortBy]);

  // ── Per-skill coverage (of the people the skill applies to) ───────────────
  const coverage = useMemo(() => {
    const out = {};
    flatSkills.forEach(skill => {
      let green = 0, tracked = 0;
      // Over everyone in scope, not just the rows on screen — otherwise "gaps only"
      // would report 0% coverage for skills the rest of the team is current on.
      peopleInScope.forEach(m => {
        const st = getCell(m.user_id, skill.id).status;
        if (st === 'grey') return;
        tracked++;
        if (st === 'green') green++;
      });
      // null rather than 0: nobody in view needs this skill, so there is nothing to score.
      out[skill.id] = tracked > 0 ? Math.round((green / tracked) * 100) : null;
    });
    return out;
  }, [flatSkills, peopleInScope, cellMap]);

  // Headline numbers describe the whole selected team + category, so they stay stable
  // (and quotable in a management meeting) while the user filters the grid below.
  const totals = useMemo(() => {
    const t = { green: 0, amber: 0, red: 0, grey: 0 };
    peopleInScope.forEach(m => {
      scopeSkills.forEach(s => { t[getCell(m.user_id, s.id).status]++; });
    });
    const tracked = t.green + t.amber + t.red;
    return { ...t, tracked, overall: tracked > 0 ? Math.round((t.green / tracked) * 100) : null };
  }, [peopleInScope, scopeSkills, cellMap]);

  const visibleTeams = teams.filter(t => user?.role === 'admin' || t.manager_ids?.includes(user?.id));
  const teamLabel = selectedTeam === 'all'
    ? 'All teams'
    : (teams.find(t => t.id === selectedTeam)?.name || 'Team');

  const filtersActive =
    selectedCategory !== 'all' || showOnlyRequired || showOnlyIssues || searchMember.trim() !== '';

  const clearFilters = () => {
    setSelectedCat('all');
    setOnlyRequired(false);
    setOnlyIssues(false);
    setSearchMember('');
  };

  const handleExport = () => {
    const csv = buildMatrixCSV({
      orgName: org?.name,
      teamLabel,
      members: rows,
      categories: groupedSkills,
      getCell,
      coverage,
    });
    const slug = (org?.name || 'skills').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    downloadCSV(csv, `${slug}-skills-matrix-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const openAssessment = (member, skill, cell) => setAssessingCell({
    userId: member.id, userName: member.name, skill, assessment: cell.assessment,
  });

  // ── Loading / empty ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-11 rounded-xl bg-muted animate-pulse" />
        <div className="h-9 w-2/3 rounded-lg bg-muted animate-pulse" />
        <div className="h-96 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <EmptyState
        icon={Grid3X3}
        title="Your matrix is waiting on a skills list"
        description="Add the skills you track — or import a ready-made set for your industry — and every person you add will appear here automatically."
        actionLabel="Set up skills"
        onAction={() => navigate('/skills-library')}
      />
    );
  }

  if (members.length === 0) {
    return (
      <EmptyState
        icon={Grid3X3}
        title="Add people to see your matrix"
        description="You have a skills list ready. Create a team and add your people — you do not need to give them logins to track their training."
        actionLabel="Create a team"
        onAction={() => navigate('/teams')}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Summary strip ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-stretch gap-3">
        <SummaryTile
          label="Overall readiness"
          value={totals.overall === null ? '—' : `${totals.overall}%`}
          hint={`${totals.green} of ${totals.tracked} tracked assessments current · ${teamLabel}`}
          tone={totals.overall === null ? null : coverageStyle(totals.overall)}
          wide
        />
        <SummaryTile
          label="Gaps"
          value={totals.red}
          hint="Expired, below level, or required but unassessed"
          icon={AlertTriangle}
          tone={totals.red > 0 ? { bg: RAG_THEME.red.chipBg, fg: RAG_THEME.red.chipFg } : null}
        />
        <SummaryTile
          label="Expiring soon"
          value={totals.amber}
          hint="Inside the renewal warning window"
          icon={Clock}
          tone={totals.amber > 0 ? { bg: RAG_THEME.amber.chipBg, fg: RAG_THEME.amber.chipFg } : null}
        />
        <SummaryTile
          label="Current"
          value={totals.green}
          hint="At or above the required level"
          icon={CheckCircle2}
          tone={{ bg: RAG_THEME.green.chipBg, fg: RAG_THEME.green.chipFg }}
        />
      </div>

      <MatrixLegend />

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="no-print space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Field label="Team">
            <select
              className="h-9 rounded-md border border-input bg-background pl-2.5 pr-7 text-sm font-medium"
              value={selectedTeam}
              onChange={e => { setSelectedTeam(e.target.value); setOnlyRequired(false); }}
            >
              {user?.role === 'admin' && <option value="all">All teams</option>}
              {visibleTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>

          <Field label="Category">
            <select
              className="h-9 rounded-md border border-input bg-background pl-2.5 pr-7 text-sm font-medium"
              value={selectedCategory}
              onChange={e => setSelectedCat(e.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <Field label="Sort people by">
            <select
              className="h-9 rounded-md border border-input bg-background pl-2.5 pr-7 text-sm font-medium"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>

          <Field label="Find a person">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search name…"
                value={searchMember}
                onChange={e => setSearchMember(e.target.value)}
                className="pl-8 h-9 w-44 text-sm"
              />
            </div>
          </Field>

          <div className="flex items-center gap-2 ml-auto self-end">
            <div className="flex rounded-md border border-input overflow-hidden" role="group" aria-label="Row density">
              {[['comfortable', Rows3, 'Comfortable rows'], ['compact', AlignJustify, 'Compact rows']].map(([key, Icon, title]) => (
                <button
                  key={key}
                  type="button"
                  title={title}
                  aria-pressed={density === key}
                  onClick={() => setDensity(key)}
                  className={`h-9 w-9 flex items-center justify-center transition-colors ${
                    density === key ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="h-9" onClick={handleExport}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
            </Button>
          </div>
        </div>

        {/* Toggles + active-filter summary */}
        <div className="flex flex-wrap items-center gap-2">
          <Toggle active={showOnlyIssues} onClick={() => setOnlyIssues(v => !v)} icon={AlertTriangle}>
            Gaps &amp; expiring only
          </Toggle>
          {selectedTeam !== 'all' && (
            <Toggle active={showOnlyRequired} onClick={() => setOnlyRequired(v => !v)}>
              Required skills only
            </Toggle>
          )}

          <span className="text-xs text-muted-foreground ml-auto">
            Showing <span className="font-semibold text-foreground">{rows.length}</span> of {peopleInScope.length} people
            {' · '}
            <span className="font-semibold text-foreground">{flatSkills.length}</span> of {skills.length} skills
          </span>
          {filtersActive && (
            <button onClick={clearFilters} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── The grid ────────────────────────────────────────────────────────── */}
      {flatSkills.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-3" style={{ color: RAG_THEME.green.bg }} />
          <p className="text-sm font-semibold text-foreground">
            {showOnlyIssues ? 'Nothing needs attention' : 'No skills match these filters'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {showOnlyIssues
              ? 'No gaps or upcoming expiries in this selection.'
              : 'Try widening the category or required-skills filters.'}
          </p>
          {filtersActive && (
            <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>Clear filters</Button>
          )}
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <SkillsMatrixGrid
              members={rows}
              categories={groupedSkills}
              getCell={getCell}
              coverage={coverage}
              density={density}
              onCellClick={openAssessment}
              onSkillClick={setBulkSkill}
            />
          </div>

          <p className="hidden md:block text-xs text-muted-foreground no-print">
            Click a cell to record an assessment · click a skill heading to assess everyone at once ·
            use the arrow keys to move around the grid
          </p>

          {/* ── Mobile: one card per person ───────────────────────────────── */}
          <div className="md:hidden space-y-3">
            {rows.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">No people match your filters.</p>
            )}
            {rows.map(row => (
              <MobilePersonCard
                key={row.id}
                row={row}
                groupedSkills={groupedSkills}
                getCell={getCell}
                onCellClick={openAssessment}
              />
            ))}
          </div>
        </>
      )}

      {assessingCell && (
        <AssessmentModal
          userId={assessingCell.userId}
          userName={assessingCell.userName}
          skill={assessingCell.skill}
          existingAssessment={assessingCell.assessment}
          orgId={org.id}
          onClose={() => setAssessingCell(null)}
          onSaved={(saved) => {
            setAssessments(prev => {
              const without = prev.filter(a =>
                !(a.user_id === assessingCell.userId && a.skill_id === assessingCell.skill.id)
              );
              return saved === null ? without : [...without, saved];
            });
            setAssessingCell(null);
            loadData();
          }}
        />
      )}

      {bulkSkill && (
        <BulkAssessmentModal
          skill={bulkSkill}
          members={rows.map(r => ({ user_id: r.id, user_name: r.name }))}
          orgId={org.id}
          onClose={() => setBulkSkill(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}

// ─── Small building blocks ──────────────────────────────────────────────────
function SummaryTile({ label, value, hint, icon: Icon, tone, wide }) {
  return (
    <div className={`rounded-xl border border-border bg-card shadow-card px-4 py-3 ${wide ? 'min-w-[184px]' : 'min-w-[140px]'} flex-1`}>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p
        className="font-jakarta text-2xl font-bold leading-none mt-1.5 tabular-nums inline-block rounded-md"
        style={tone ? { background: tone.bg, color: tone.fg, padding: '2px 8px' } : undefined}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{hint}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-8 inline-flex items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-muted-foreground border-input hover:bg-muted hover:text-foreground'
      }`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </button>
  );
}

function MobilePersonCard({ row, groupedSkills, getCell, onCellClick }) {
  const [open, setOpen] = useState(false);
  const cs = coverageStyle(row.score ?? 0);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-foreground leading-tight truncate">{row.name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {row.counts.red > 0 && (
              <span className="text-[10px] font-bold rounded px-1.5 py-px" style={{ background: RAG_THEME.red.chipBg, color: RAG_THEME.red.chipFg }}>
                {row.counts.red} gap{row.counts.red === 1 ? '' : 's'}
              </span>
            )}
            {row.counts.amber > 0 && (
              <span className="text-[10px] font-bold rounded px-1.5 py-px" style={{ background: RAG_THEME.amber.chipBg, color: RAG_THEME.amber.chipFg }}>
                {row.counts.amber} expiring
              </span>
            )}
            {row.counts.red === 0 && row.counts.amber === 0 && (
              <span className="text-[10px] font-bold rounded px-1.5 py-px" style={{ background: RAG_THEME.green.chipBg, color: RAG_THEME.green.chipFg }}>
                All current
              </span>
            )}
          </div>
        </div>
        <span
          className="rounded-md font-bold text-xs tabular-nums shrink-0"
          style={{ background: cs.bg, color: cs.fg, padding: '4px 7px' }}
        >
          {row.score === null ? '—' : `${row.score}%`}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border">
          {groupedSkills.map(cat => (
            <div key={cat.id} className="px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: cat.colour }}>
                {cat.name}
              </p>
              <div className="space-y-1.5">
                {cat.skills.map(skill => {
                  const cell = getCell(row.id, skill.id);
                  const theme = RAG_THEME[cell.status];
                  const quiet = cell.status === 'grey';
                  return (
                    <button
                      key={skill.id}
                      className="w-full flex items-center gap-3 py-1 text-left"
                      onClick={() => onCellClick({ id: row.id, name: row.name }, skill, cell)}
                    >
                      <span
                        className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base shrink-0 relative"
                        style={{
                          background: quiet ? 'transparent' : theme.bg,
                          color: theme.fg,
                          border: quiet ? '1px dashed hsl(var(--border))' : 'none',
                        }}
                      >
                        {cell.symbol}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-foreground truncate">{skill.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {cell.label}
                          {cell.expiryDate ? ` · expires ${cell.expiryDate}` : ''}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
