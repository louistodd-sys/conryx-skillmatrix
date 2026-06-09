import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BarChart3, Filter, ChevronRight } from 'lucide-react';
import PrintReportWrapper from '@/components/PrintReportWrapper';
import SkillDrillDown from '@/components/SkillDrillDown';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import EmptyState from '@/components/EmptyState';
import RAGBar from '@/components/RAGBar';
import RAGBadge from '@/components/RAGBadge';
import { getRAGStatus, getProficiencyLabel } from '@/lib/ragUtils';
import { Link } from 'react-router-dom';

export default function GapAnalysis() {
  const { org, user } = useOrganisation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [teams, setTeams]           = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(searchParams.get('team') || '');
  const [members, setMembers]       = useState([]);
  const [skills, setSkills]         = useState([]);
  const [categories, setCategories] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [reqSkills, setReqSkills]   = useState([]);
  const [loading, setLoading]       = useState(true);

  // Drill-down
  const [selectedSkillItem, setSelectedSkillItem] = useState(null);

  // Filters
  const [filterCategory, setFilterCategory]   = useState('all');
  const [showOnlyRed, setShowOnlyRed]         = useState(false);
  const [coverageThreshold, setCoverageThreshold] = useState('');

  useEffect(() => {
    if (org) loadData();
  }, [org]);

  async function loadData() {
    const [t, tm, s, c, a, trs] = await Promise.all([
      apiClient.entities.Team.filter({ organisation_id: org.id }),
      apiClient.entities.TeamMember.filter({ organisation_id: org.id }),
      apiClient.entities.Skill.filter({ organisation_id: org.id, status: 'active' }),
      apiClient.entities.SkillCategory.filter({ organisation_id: org.id }),
      apiClient.entities.SkillAssessment.filter({ organisation_id: org.id }),
      apiClient.entities.TeamRequiredSkill.filter({ organisation_id: org.id }),
    ]);
    const visible = user?.role === 'admin'
      ? t
      : t.filter(team => team.manager_ids?.includes(user?.id));
    setTeams(visible);
    setMembers(tm);
    setSkills(s);
    setCategories(c);
    setAssessments(a);
    setReqSkills(trs);
    if (visible.length > 0) {
      const urlTeam = searchParams.get('team');
      const valid = urlTeam && visible.some(t => t.id === urlTeam);
      setSelectedTeam(valid ? urlTeam : visible[0].id);
    }
    setLoading(false);
  }

  if (loading) return <div className="h-96 rounded-xl bg-muted animate-pulse" />;

  // Current assessment map
  const currentAssessments = {};
  [...assessments]
    .sort((a, b) => (a.assessed_date || '').localeCompare(b.assessed_date || ''))
    .forEach(a => { currentAssessments[`${a.user_id}-${a.skill_id}`] = a; });

  const teamMembers  = members.filter(m => m.team_id === selectedTeam);
  let teamReqSkills  = reqSkills.filter(r => r.team_id === selectedTeam && r.is_required);

  // Category filter
  if (filterCategory !== 'all') {
    const skillsInCat = new Set(skills.filter(s => s.category_id === filterCategory).map(s => s.id));
    teamReqSkills = teamReqSkills.filter(r => skillsInCat.has(r.skill_id));
  }

  // Skill coverage data
  let skillCoverage = teamReqSkills.map(req => {
    const skill = skills.find(s => s.id === req.skill_id);
    if (!skill) return null;
    const category = categories.find(c => c.id === skill.category_id);

    let green = 0, amber = 0, red = 0, grey = 0;
    // Proficiency breakdown for levelled skills
    const profCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    const total = teamMembers.length;

    teamMembers.forEach(m => {
      const assessment = currentAssessments[`${m.user_id}-${req.skill_id}`];
      const status = getRAGStatus(assessment, skill, req);
      if (status === 'green') green++;
      else if (status === 'amber') amber++;
      else if (status === 'red') red++;
      else grey++;

      if (skill.scale_type === 'levelled' && assessment != null) {
        profCounts[assessment.proficiency_level] = (profCounts[assessment.proficiency_level] || 0) + 1;
      }
    });

    const coveragePct = total > 0 ? Math.round((green / total) * 100) : 0;
    return {
      skill, category, req,
      green, amber, red, grey, total,
      coveragePct,
      profCounts,
      redPercent: total > 0 ? (red + grey) / total : 1,
    };
  }).filter(Boolean);

  // Coverage threshold filter
  if (coverageThreshold !== '') {
    const threshold = parseInt(coverageThreshold);
    if (!isNaN(threshold)) {
      skillCoverage = skillCoverage.filter(item => item.coveragePct < threshold);
    }
  }

  // Sort by most critical first
  skillCoverage.sort((a, b) => b.redPercent - a.redPercent);

  // Keep selected skill item in sync if data reloads
  const resolvedSelectedSkill = selectedSkillItem
    ? skillCoverage.find(i => i.skill.id === selectedSkillItem.skill.id) || selectedSkillItem
    : null;

  // Individual compliance
  let individualStats = teamMembers.map(m => {
    let green = 0, amber = 0, red = 0, grey = 0;
    teamReqSkills.forEach(req => {
      const skill = skills.find(s => s.id === req.skill_id);
      const assessment = currentAssessments[`${m.user_id}-${req.skill_id}`];
      const status = getRAGStatus(assessment, skill, req);
      if (status === 'green') green++;
      else if (status === 'amber') amber++;
      else if (status === 'red') red++;
      else grey++;
    });
    const total = green + amber + red + grey;
    return {
      ...m,
      green, amber, red, grey,
      compliance: total > 0 ? Math.round((green / total) * 100) : 0,
      hasRed: red > 0,
    };
  }).sort((a, b) => a.compliance - b.compliance);

  // Show only members with at least one red
  if (showOnlyRed) {
    individualStats = individualStats.filter(m => m.hasRed);
  }

  const categoriesInTeam = categories.filter(c =>
    teamReqSkills.some(r => {
      const skill = skills.find(s => s.id === r.skill_id);
      return skill?.category_id === c.id;
    })
  );

  const tier = org?.subscription_tier || 'free';

  return (
    <PrintReportWrapper orgName={org?.name} reportTitle="Gap Analysis Report" tier={tier}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gap Analysis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Identify skills gaps and training needs</p>
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm no-print"
          value={selectedTeam}
          onChange={e => setSelectedTeam(e.target.value)}
        >
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center p-3 bg-muted/40 rounded-lg border border-border">
        <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

        {/* Category filter */}
        <select
          className="h-8 rounded border border-input bg-background px-2 text-xs"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {categoriesInTeam.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Coverage below threshold */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Coverage below</span>
          <input
            type="number"
            min={0}
            max={100}
            value={coverageThreshold}
            onChange={e => setCoverageThreshold(e.target.value)}
            placeholder="100"
            className="h-8 w-16 rounded border border-input bg-background px-2 text-xs text-center"
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>

        {/* Red only toggle */}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showOnlyRed}
            onChange={e => setShowOnlyRed(e.target.checked)}
            className="rounded border-border"
          />
          Members with gaps only
        </label>

        {(filterCategory !== 'all' || coverageThreshold !== '' || showOnlyRed) && (
          <button
            className="text-xs text-primary hover:underline ml-auto"
            onClick={() => { setFilterCategory('all'); setCoverageThreshold(''); setShowOnlyRed(false); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {teamReqSkills.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No required skills set"
          description="Set required skills for this team to see gap analysis."
          actionLabel="Go to Teams"
          onAction={() => navigate('/teams')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Skill Coverage — always visible */}
          <div className="bg-card border border-border rounded-xl">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Skill Coverage</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Click a skill to drill down into who has/hasn't completed it</p>
            </div>
            {skillCoverage.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground text-center">No skills match the current filters.</p>
            ) : (
              <div className="divide-y divide-border">
                {skillCoverage.map(item => (
                  <button
                    key={item.skill.id}
                    onClick={() => setSelectedSkillItem(resolvedSelectedSkill?.skill.id === item.skill.id ? null : item)}
                    className={`w-full text-left px-5 py-3 hover:bg-muted/40 transition-colors ${
                      resolvedSelectedSkill?.skill.id === item.skill.id ? 'bg-primary/5 border-l-2 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.category && (
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.category.colour || '#6B7280' }} />
                        )}
                        <span className="text-sm font-medium truncate">{item.skill.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-xs text-muted-foreground">{item.green}/{item.total}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>
                    <RAGBar green={item.green} amber={item.amber} red={item.red} grey={item.grey} showLabels />
                    {item.skill.scale_type === 'levelled' && item.total > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {[0, 1, 2, 3, 4].map(level => {
                          const count = item.profCounts[level] || 0;
                          if (count === 0) return null;
                          return (
                            <span key={level} className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                              L{level}: {count}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right panel: Drill-Down OR Individual Status */}
          {resolvedSelectedSkill ? (
            <SkillDrillDown
              skillItem={resolvedSelectedSkill}
              teamMembers={teamMembers}
              currentAssessments={currentAssessments}
              onClose={() => setSelectedSkillItem(null)}
            />
          ) : (
          <div className="bg-card border border-border rounded-xl">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Individual Status</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {showOnlyRed ? 'Members with at least one gap' : 'All team member compliance scores'}
              </p>
            </div>
            {individualStats.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground text-center">
                {showOnlyRed ? 'All members are fully compliant.' : 'No members in this team.'}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {individualStats.map(m => (
                  <Link
                    key={m.user_id}
                    to={`/people`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                      {(m.user_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{m.user_name || 'Unknown'}</span>
                        {m.hasRed && (
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Has expired or missing skills" />
                        )}
                      </div>
                      <div className="flex gap-2 mt-0.5">
                        {m.green > 0 && <span className="text-xs text-green-700">{m.green} current</span>}
                        {m.amber > 0 && <span className="text-xs text-amber-700">{m.amber} expiring</span>}
                        {(m.red + m.grey) > 0 && <span className="text-xs text-red-700">{m.red + m.grey} missing/expired</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-sm font-bold ${m.compliance >= 80 ? 'text-green-700' : m.compliance >= 50 ? 'text-amber-700' : 'text-red-600'}`}>
                        {m.compliance}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      )}
    </div>
    </PrintReportWrapper>
  );
}