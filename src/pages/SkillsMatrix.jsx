import { useState, useEffect } from 'react';
import { Grid3X3, Search, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Input } from '@/components/ui/input';
import EmptyState from '@/components/EmptyState';
import AssessmentModal from '@/components/AssessmentModal';
import BulkAssessmentModal from '@/components/BulkAssessmentModal';
import { getRAGStatus, getProficiencyLabel, getRAGLabel } from '@/lib/ragUtils';
import { getLatestAssessments } from '@/utils/assessmentUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ─── Layout constants ──────────────────────────────────────────────────────
const CELL  = 44;  // skill cell px (width + height)
const NAME  = 180; // name column width px
const COL   = 52;  // skill column width px
const CAT_H = 36;  // category header row height px

// ─── Status colour palette ─────────────────────────────────────────────────
const S = {
  green: { bg: '#16a34a', fg: '#ffffff' },
  amber: { bg: '#d97706', fg: '#ffffff' },
  red:   { bg: '#dc2626', fg: '#ffffff' },
  grey:  { bg: '#f1f5f9', fg: '#64748b' },
};

// Symbol shown inside each cell
function getCellSymbol(assessment, skill) {
  if (!assessment) return '—';
  if (skill.scale_type === 'binary') return assessment.proficiency_level >= 1 ? '✓' : '✗';
  return String(assessment.proficiency_level);
}

// Coverage % → colour style
function pctStyle(pct) {
  if (pct >= 80) return { bg: '#dcfce7', fg: '#15803d' };
  if (pct >= 50) return { bg: '#fef3c7', fg: '#92400e' };
  return { bg: '#fee2e2', fg: '#991b1b' };
}

// ─── Status key legend ─────────────────────────────────────────────────────
function MatrixLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <button
        className="w-full flex items-center justify-between px-5 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-4 flex-wrap">
          {[['green','Current','#16a34a'],['amber','Expiring','#d97706'],['red','Gap','#dc2626'],['grey','Unassessed','#f1f5f9']].map(([s,label,bg]) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded" style={{ background: bg, boxShadow: s === 'grey' ? 'inset 0 0 0 1.5px #cbd5e1' : 'none' }} />
              <span className="text-xs font-medium text-foreground">{label}</span>
            </div>
          ))}
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 ml-4">
          {open ? <><ChevronUp className="w-3.5 h-3.5" /> Hide guide</> : <><ChevronDown className="w-3.5 h-3.5" /> Show guide</>}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4 pt-1 border-t border-border space-y-2">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span><span className="font-semibold text-foreground">✓ / ✗</span> = Pass / Fail (binary skills)</span>
            <span><span className="font-semibold text-foreground">0–4</span> = Proficiency level (levelled skills)</span>
            <span><span className="font-semibold text-foreground">—</span> = Not yet assessed</span>
          </div>
          <div className="text-xs text-muted-foreground">Levels: 0 Not trained · 1 Awareness · 2 Working knowledge · 3 Competent · 4 Expert</div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function SkillsMatrix() {
  const { org, user } = useOrganisation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [teams, setTeams]                   = useState([]);
  const [selectedTeam, setSelectedTeam]     = useState(searchParams.get('team') || 'all');
  const [members, setMembers]               = useState([]);
  const [skills, setSkills]                 = useState([]);
  const [categories, setCategories]         = useState([]);
  const [assessments, setAssessments]       = useState([]);
  const [reqSkills, setReqSkills]           = useState([]);
  const [loading, setLoading]               = useState(true);

  const [searchMember, setSearchMember]         = useState('');
  const [showOnlyRequired, setShowOnlyRequired] = useState(false);
  const [showOnlyExpiring, setShowOnlyExpiring] = useState(false);
  const [assessingCell, setAssessingCell]       = useState(null);
  const [bulkSkill, setBulkSkill]               = useState(null);

  useEffect(() => { if (org) loadData(); }, [org]);

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

  if (loading) return <div className="h-96 rounded-xl bg-muted animate-pulse" />;

  // Latest assessment per user+skill
  const currentAssessments = getLatestAssessments(assessments);

  // Filter + deduplicate members
  let filteredMembers = members;
  if (selectedTeam !== 'all') {
    const ids = new Set(members.filter(m => m.team_id === selectedTeam).map(m => m.user_id));
    filteredMembers = members.filter(m => ids.has(m.user_id));
  }
  const memberMap = {};
  filteredMembers.forEach(m => { if (!memberMap[m.user_id]) memberMap[m.user_id] = m; });
  let uniqueMembers = Object.values(memberMap);
  uniqueMembers.sort((a, b) => (a.user_name || '').localeCompare(b.user_name || ''));
  if (searchMember) {
    uniqueMembers = uniqueMembers.filter(m =>
      (m.user_name || '').toLowerCase().includes(searchMember.toLowerCase())
    );
  }

  // Requirement lookup
  const getReq = (userId, skillId) => {
    if (selectedTeam !== 'all')
      return reqSkills.find(r => r.team_id === selectedTeam && r.skill_id === skillId);
    const tm = members.find(m => m.user_id === userId);
    return tm ? reqSkills.find(r => r.team_id === tm.team_id && r.skill_id === skillId) : undefined;
  };

  // Skill visibility filters
  let visibleSkills = skills;
  if (showOnlyRequired && selectedTeam !== 'all') {
    const reqIds = new Set(
      reqSkills.filter(r => r.team_id === selectedTeam && r.is_required).map(r => r.skill_id)
    );
    visibleSkills = visibleSkills.filter(s => reqIds.has(s.id));
  }
  if (showOnlyExpiring) {
    visibleSkills = visibleSkills.filter(s =>
      uniqueMembers.some(m => {
        const st = getRAGStatus(currentAssessments[`${m.user_id}-${s.id}`], s, getReq(m.user_id, s.id));
        return st === 'amber' || st === 'red';
      })
    );
  }

  const groupedSkills = categories
    .map(cat => ({ ...cat, skills: visibleSkills.filter(s => s.category_id === cat.id) }))
    .filter(g => g.skills.length > 0);
  const allVisibleSkills = groupedSkills.flatMap(g => g.skills);

  if (skills.length === 0) {
    return (
      <EmptyState
        icon={Grid3X3}
        title="Skills Matrix"
        description="Add skills to your library first to see the matrix view."
        actionLabel="Go to Skills Library"
        onAction={() => navigate('/skills-library')}
      />
    );
  }

  // Per-skill coverage %
  const skillCompliance = {};
  allVisibleSkills.forEach(skill => {
    let green = 0;
    uniqueMembers.forEach(m => {
      if (getRAGStatus(currentAssessments[`${m.user_id}-${skill.id}`], skill, getReq(m.user_id, skill.id)) === 'green')
        green++;
    });
    skillCompliance[skill.id] = uniqueMembers.length > 0
      ? Math.round((green / uniqueMembers.length) * 100)
      : 0;
  });

  // Overall coverage across all visible skills
  const overallCoverage = allVisibleSkills.length > 0 && uniqueMembers.length > 0
    ? Math.round(allVisibleSkills.reduce((sum, s) => sum + (skillCompliance[s.id] ?? 0), 0) / allVisibleSkills.length)
    : null;

  // Shared border styles
  const catBorder = (ci) => ci > 0 ? '3px solid white' : '1px solid hsl(var(--border))';
  const cellBorder = (si, ci) =>
    si === 0 && ci > 0 ? '3px solid white' : '1px solid hsl(var(--border))';

  return (
    <div className="space-y-5">
      {/* ── Title ── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Skills Matrix</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {uniqueMembers.length} member{uniqueMembers.length !== 1 ? 's' : ''} ·{' '}
          {allVisibleSkills.length} skill{allVisibleSkills.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Legend ── */}
      <MatrixLegend />

      {/* ── Controls ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm font-medium"
          value={selectedTeam}
          onChange={e => setSelectedTeam(e.target.value)}
        >
          {user?.role === 'admin' && <option value="all">All Teams</option>}
          {teams
            .filter(t => user?.role === 'admin' || t.manager_ids?.includes(user?.id))
            .map(t => <option key={t.id} value={t.id}>{t.name}</option>)
          }
        </select>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search members…"
            value={searchMember}
            onChange={e => setSearchMember(e.target.value)}
            className="pl-8 h-9 w-48 text-sm"
          />
        </div>

        {selectedTeam !== 'all' && (
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOnlyRequired}
              onChange={e => setShowOnlyRequired(e.target.checked)}
              className="rounded border-border"
            />
            Required only
          </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showOnlyExpiring}
            onChange={e => setShowOnlyExpiring(e.target.checked)}
            className="rounded border-border"
          />
          Gaps / expiring only
        </label>

        {overallCoverage !== null && (
          <span
            className="ml-auto text-sm font-semibold px-3 py-1 rounded-full"
            style={pctStyle(overallCoverage)}
          >
            {overallCoverage}% overall coverage
          </span>
        )}
      </div>

      {/* ── Desktop matrix ── */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <TooltipProvider delayDuration={100}>
            <table
              style={{
                borderCollapse: 'separate',
                borderSpacing: 0,
                width: 'max-content',
              }}
            >
              <thead>
                {/* ── Row 1: Category colour bands ── */}
                <tr>
                  <th
                    style={{
                      position: 'sticky',
                      left: 0,
                      top: 0,
                      zIndex: 40,
                      width: NAME,
                      minWidth: NAME,
                      maxWidth: NAME,
                      height: CAT_H,
                      padding: '0 16px',
                      background: 'hsl(var(--muted) / 0.6)',
                      borderBottom: '1px solid hsl(var(--border))',
                      borderRight: '2px solid hsl(var(--border))',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))' }}>
                      Team Member
                    </span>
                  </th>
                  {groupedSkills.map((cat, ci) => (
                    <th
                      key={cat.id}
                      colSpan={cat.skills.length}
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 20,
                        background: cat.colour || '#6B7280',
                        color: '#ffffff',
                        height: CAT_H,
                        padding: '0 8px',
                        fontSize: 13,
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        borderBottom: '2px solid white',
                        borderLeft: catBorder(ci),
                      }}
                    >
                      {cat.name}
                    </th>
                  ))}
                </tr>

                {/* ── Row 2: Skill names (vertical) ── */}
                <tr>
                  <th
                    style={{
                      position: 'sticky',
                      left: 0,
                      top: CAT_H,
                      zIndex: 40,
                      width: NAME,
                      minWidth: NAME,
                      maxWidth: NAME,
                      background: 'hsl(var(--muted) / 0.6)',
                      borderBottom: '2px solid hsl(var(--border))',
                      borderRight: '2px solid hsl(var(--border))',
                    }}
                  />
                  {groupedSkills.map((cat, ci) =>
                    cat.skills.map((skill, si) => (
                      <th
                        key={skill.id}
                        className="hover:bg-slate-100 transition-colors"
                        style={{
                          position: 'sticky',
                          top: CAT_H,
                          zIndex: 10,
                          width: COL,
                          minWidth: COL,
                          height: 110,
                          background: '#f8fafc',
                          borderBottom: '2px solid hsl(var(--border))',
                          borderLeft: cellBorder(si, ci),
                          padding: '8px 4px 10px',
                          verticalAlign: 'bottom',
                        }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="group flex flex-col items-center w-full"
                              style={{ height: 98 }}
                              onClick={() => setBulkSkill(skill)}
                            >
                              <div
                                style={{
                                  writingMode: 'vertical-lr',
                                  transform: 'rotate(180deg)',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: 'hsl(var(--foreground))',
                                  flex: 1,
                                  overflow: 'hidden',
                                  lineHeight: 1.35,
                                  maxHeight: 78,
                                  paddingBottom: 2,
                                }}
                              >
                                {skill.name}
                              </div>
                              <Users
                                style={{ width: 13, height: 13, color: 'hsl(var(--muted-foreground))', marginTop: 4, flexShrink: 0 }}
                                className="opacity-30 group-hover:opacity-100 transition-opacity"
                              />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p className="font-semibold">{skill.name}</p>
                            <p className="text-xs text-muted-foreground">{cat.name}</p>
                            <p className="text-xs mt-1 text-primary">Click to bulk-assess all members</p>
                          </TooltipContent>
                        </Tooltip>
                      </th>
                    ))
                  )}
                </tr>
              </thead>

              <tbody>
                {uniqueMembers.length === 0 && (
                  <tr>
                    <td
                      colSpan={allVisibleSkills.length + 1}
                      style={{ padding: '48px 16px', textAlign: 'center', fontSize: 14, color: 'hsl(var(--muted-foreground))' }}
                    >
                      No members match your filters.
                    </td>
                  </tr>
                )}

                {uniqueMembers.map((member, ri) => {
                  const rowBg = ri % 2 === 0 ? 'hsl(var(--card))' : 'hsl(var(--muted) / 0.12)';
                  // RAG summary counts for this member
                  let mg = 0, ma = 0, mr = 0;
                  allVisibleSkills.forEach(s => {
                    const st = getRAGStatus(currentAssessments[`${member.user_id}-${s.id}`], s, getReq(member.user_id, s.id));
                    if (st === 'green') mg++;
                    else if (st === 'amber') ma++;
                    else if (st === 'red') mr++;
                  });
                  return (
                    <tr key={member.user_id}>
                      {/* Sticky name */}
                      <td
                        style={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 10,
                          width: NAME,
                          minWidth: NAME,
                          maxWidth: NAME,
                          padding: '6px 16px',
                          backgroundColor: rowBg,
                          borderBottom: '1px solid hsl(var(--border))',
                          borderRight: '2px solid hsl(var(--border))',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                          {member.user_name || 'Unknown'}
                        </span>
                        <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                          {mg > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#15803d', background: '#dcfce7', borderRadius: 4, padding: '1px 5px' }}>{mg}✓</span>}
                          {ma > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fef3c7', borderRadius: 4, padding: '1px 5px' }}>{ma}!</span>}
                          {mr > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', background: '#fee2e2', borderRadius: 4, padding: '1px 5px' }}>{mr}✗</span>}
                          {member.is_managed_member && (
                            <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', fontWeight: 400 }}>Managed</span>
                          )}
                        </div>
                      </td>

                      {/* Skill cells */}
                      {groupedSkills.map((cat, ci) =>
                        cat.skills.map((skill, si) => {
                          const assessment = currentAssessments[`${member.user_id}-${skill.id}`];
                          const req        = getReq(member.user_id, skill.id);
                          const status     = getRAGStatus(assessment, skill, req);
                          const sym        = getCellSymbol(assessment, skill);
                          const label      = getRAGLabel(status, assessment, skill, req);
                          const profLabel  = getProficiencyLabel(assessment?.proficiency_level, skill.scale_type);

                          return (
                            <td
                              key={skill.id}
                              style={{
                                padding: '3px 5px',
                                backgroundColor: rowBg,
                                borderBottom: '1px solid hsl(var(--border))',
                                borderLeft: cellBorder(si, ci),
                                textAlign: 'center',
                              }}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className="rounded-md transition-all hover:scale-110 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary active:scale-95"
                                    style={{
                                      width: CELL,
                                      height: CELL,
                                      background: S[status].bg,
                                      color: S[status].fg,
                                      fontSize: 17,
                                      fontWeight: 800,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      lineHeight: 1,
                                      boxShadow: status === 'grey' ? 'inset 0 0 0 1.5px #cbd5e1' : 'none',
                                    }}
                                    onClick={() => setAssessingCell({ userId: member.user_id, userName: member.user_name, skill, assessment })}
                                    aria-label={`${member.user_name} — ${skill.name}: ${label}`}
                                  >
                                    {sym}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="w-56">
                                  <p className="font-semibold text-sm">{member.user_name}</p>
                                  <p className="text-xs text-muted-foreground mb-2">{skill.name}</p>
                                  <div className="space-y-0.5 text-xs">
                                    <p><span className="font-medium">Status:</span> {label}</p>
                                    <p><span className="font-medium">Level:</span> {profLabel}</p>
                                    {assessment?.assessed_date && (
                                      <p><span className="font-medium">Assessed:</span> {assessment.assessed_date}</p>
                                    )}
                                    {assessment?.expiry_date && (
                                      <p><span className="font-medium">Expires:</span> {assessment.expiry_date}</p>
                                    )}
                                    {assessment?.assessed_by_name && (
                                      <p><span className="font-medium">By:</span> {assessment.assessed_by_name}</p>
                                    )}
                                    {assessment?.notes && (
                                      <p className="italic text-muted-foreground">"{assessment.notes}"</p>
                                    )}
                                  </div>
                                  <p className="text-xs text-primary mt-2">Click to assess</p>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })}

                {/* ── Coverage % footer ── */}
                {uniqueMembers.length > 0 && (
                  <tr style={{ borderTop: '2px solid hsl(var(--border))' }}>
                    <td
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 10,
                        width: NAME,
                        minWidth: NAME,
                        maxWidth: NAME,
                        padding: '8px 16px',
                        background: 'hsl(var(--muted) / 0.5)',
                        borderRight: '2px solid hsl(var(--border))',
                        fontSize: 11,
                        fontWeight: 800,
                        color: 'hsl(var(--muted-foreground))',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Coverage %
                    </td>
                    {groupedSkills.map((cat, ci) =>
                      cat.skills.map((skill, si) => {
                        const pct = skillCompliance[skill.id] ?? 0;
                        const ps  = pctStyle(pct);
                        return (
                          <td
                            key={skill.id}
                            style={{
                              textAlign: 'center',
                              padding: '6px 5px',
                              background: 'hsl(var(--muted) / 0.5)',
                              borderLeft: cellBorder(si, ci),
                            }}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="rounded font-bold cursor-default"
                                  style={{
                                    background: ps.bg,
                                    color: ps.fg,
                                    fontSize: 13,
                                    padding: '4px 2px',
                                    textAlign: 'center',
                                  }}
                                >
                                  {pct}%
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{skill.name}: {pct}% current</p>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        );
                      })
                    )}
                  </tr>
                )}
              </tbody>
            </table>
          </TooltipProvider>
        </div>
      </div>

      {/* ── Mobile: card per person ── */}
      <div className="md:hidden space-y-3">
        {uniqueMembers.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No members match your filters.
          </p>
        )}
        {uniqueMembers.map(member => {
          let g = 0, a = 0, r = 0, gr = 0;
          allVisibleSkills.forEach(skill => {
            const st = getRAGStatus(
              currentAssessments[`${member.user_id}-${skill.id}`],
              skill,
              getReq(member.user_id, skill.id)
            );
            if (st === 'green') g++;
            else if (st === 'amber') a++;
            else if (st === 'red') r++;
            else gr++;
          });

          return (
            <div key={member.user_id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Member row header */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border">
                <div>
                  <p className="text-[15px] font-bold text-foreground leading-tight">
                    {member.user_name || 'Unknown'}
                  </p>
                  {member.is_managed_member && (
                    <span className="text-xs text-muted-foreground">Managed</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {[['green', '✓', g], ['amber', '!', a], ['red', '✗', r], ['grey', '—', gr]].map(
                    ([st, sym, cnt]) => cnt > 0 && (
                      <span
                        key={st}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold"
                        style={{
                          background: S[st].bg,
                          color: S[st].fg,
                          boxShadow: st === 'grey' ? 'inset 0 0 0 1.5px #cbd5e1' : 'none',
                        }}
                      >
                        {cnt}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Skills grid */}
              <div className="p-3 space-y-4">
                {groupedSkills.map(cat => (
                  <div key={cat.id}>
                    <p
                      className="text-[11px] font-bold uppercase tracking-wider mb-2"
                      style={{ color: cat.colour || '#6B7280' }}
                    >
                      {cat.name}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cat.skills.map(skill => {
                        const assessment = currentAssessments[`${member.user_id}-${skill.id}`];
                        const status     = getRAGStatus(assessment, skill, getReq(member.user_id, skill.id));
                        const sym        = getCellSymbol(assessment, skill);
                        return (
                          <button
                            key={skill.id}
                            className="flex flex-col items-center gap-1 group"
                            onClick={() => setAssessingCell({ userId: member.user_id, userName: member.user_name, skill, assessment })}
                          >
                            <div
                              className="w-11 h-11 rounded-lg flex items-center justify-center font-bold text-xl transition-all group-hover:scale-110"
                              style={{
                                background: S[status].bg,
                                color: S[status].fg,
                                boxShadow: status === 'grey' ? 'inset 0 0 0 1.5px #cbd5e1' : 'none',
                              }}
                            >
                              {sym}
                            </div>
                            <span className="text-[11px] text-muted-foreground max-w-[44px] text-center leading-tight line-clamp-2">
                              {skill.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk assess hint */}
      {selectedTeam !== 'all' && uniqueMembers.length > 0 && (
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span>Click any skill column header to bulk-assess all team members at once.</span>
        </div>
      )}

      {assessingCell && (
        <AssessmentModal
          userId={assessingCell.userId}
          userName={assessingCell.userName}
          skill={assessingCell.skill}
          existingAssessment={assessingCell.assessment}
          orgId={org.id}
          onClose={() => setAssessingCell(null)}
          onSaved={(savedAssessment) => {
            // Optimistically update the local assessments state so the cell reflects
            // the change immediately, before the background reload completes
            setAssessments(prev => {
              const without = prev.filter(a =>
                !(a.user_id === savedAssessment.user_id && a.skill_id === savedAssessment.skill_id)
              );
              return [...without, savedAssessment];
            });
            setAssessingCell(null);
            loadData(); // background refresh to stay in sync
          }}
        />
      )}

      {bulkSkill && (
        <BulkAssessmentModal
          skill={bulkSkill}
          members={uniqueMembers}
          orgId={org.id}
          onClose={() => setBulkSkill(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}