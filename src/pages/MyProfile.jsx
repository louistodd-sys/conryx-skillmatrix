import { useState, useEffect } from 'react';
import { BookOpen, Download, ListChecks, Paperclip, Clock, Lock } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RAGBadge from '@/components/RAGBadge';
import EvidenceSection from '@/components/EvidenceSection';
import SelfAssessmentRequest from '@/components/SelfAssessmentRequest';
import { getRAGStatus, getProficiencyLabel } from '@/lib/ragUtils';
import { isFeatureAvailable } from '@/lib/tierConfig';
import { Link } from 'react-router-dom';
import { parseISO, format, isValid } from 'date-fns';

const TABS = ['skills', 'training', 'evidence', 'timeline'];
const TAB_LABELS = { skills: 'Skills', training: 'Training', evidence: 'Evidence', timeline: 'History' };
const TAB_ICONS = { skills: BookOpen, training: ListChecks, evidence: Paperclip, timeline: Clock };

export default function MyProfile() {
  const { org, user } = useOrganisation();
  const [skills, setSkills]         = useState([]);
  const [categories, setCategories] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teams, setTeams]           = useState([]);
  const [reqSkills, setReqSkills]   = useState([]);
  const [trainingModules, setTrainingModules] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('skills');

  const tier = org?.subscription_tier || 'free';
  const hasEmployeePortal = isFeatureAvailable(tier, 'employee_portal');

  useEffect(() => {
    if (org && user) loadData();
  }, [org, user]);

  async function loadData() {
    const [s, c, a, tm, t, trs] = await Promise.all([
      apiClient.entities.Skill.filter({ organisation_id: org.id, status: 'active' }),
      apiClient.entities.SkillCategory.filter({ organisation_id: org.id }),
      apiClient.entities.SkillAssessment.filter({ organisation_id: org.id, user_id: user.id }),
      apiClient.entities.TeamMember.filter({ organisation_id: org.id, user_id: user.id }),
      apiClient.entities.Team.filter({ organisation_id: org.id }),
      apiClient.entities.TeamRequiredSkill.filter({ organisation_id: org.id }),
    ]);
    setSkills(s);
    setCategories(c.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    setAssessments(a);
    setTeamMembers(tm);
    setTeams(t);
    setReqSkills(trs);

    if (hasEmployeePortal) {
      try {
        const res = await apiClient.functions.invoke('getTrainingModules', {});
        setTrainingModules(res.data?.modules || []);
      } catch { /* non-fatal */ }
    }

    setLoading(false);
  }

  // GDPR Subject Access Request export
  const exportData = async () => {
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const toCSV  = (rows) => rows.map(r => r.map(escape).join(',')).join('\n');

    const userTeamIds = teamMembers.map(m => m.team_id);
    const userTeams   = teams.filter(t => userTeamIds.includes(t.id));

    const profileRows = toCSV([
      ['Field', 'Value'],
      ['Full Name',     user.full_name || ''],
      ['Email',         user.email || ''],
      ['Role',          user.role || ''],
      ['Status',        user.status || 'active'],
      ['Teams',         userTeams.map(t => t.name).join('; ')],
      ['Account Created', user.created_at || ''],
      ['Last Login',    user.last_login_at || ''],
    ]);

    const assessmentRows = toCSV([
      ['Skill', 'Category', 'Proficiency', 'Proficiency Level (numeric)', 'Assessed Date', 'Expiry Date', 'Assessed By', 'Notes'],
      ...assessments.map(a => {
        const skill = skills.find(s => s.id === a.skill_id);
        const cat   = categories.find(c => c.id === skill?.category_id);
        return [
          a.skill_name || skill?.name || '',
          cat?.name || '',
          getProficiencyLabel(a.proficiency_level, skill?.scale_type),
          a.proficiency_level ?? '',
          a.assessed_date || '',
          a.expiry_date || '',
          a.assessed_by_name || '',
          a.notes || '',
        ];
      }),
    ]);

    const name = user.full_name?.replace(/\s+/g, '-') || 'user';
    const date = new Date().toISOString().split('T')[0];

    const download = (content, filename) => {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = filename; link.click();
      URL.revokeObjectURL(url);
    };

    download(profileRows,    `${name}-profile-${date}.csv`);
    download(assessmentRows, `${name}-assessments-${date}.csv`);

    await apiClient.entities.AuditLogEntry.create({
      organisation_id: org.id,
      actor_user_id: user.id,
      actor_display: user.full_name,
      action: 'data.subject_access_export',
      target_type: 'user',
      target_id: user.id,
      target_display: user.full_name,
      detail: JSON.stringify({ files: [`${name}-profile-${date}.csv`, `${name}-assessments-${date}.csv`] }),
    }).catch(() => {});
  };

  if (loading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />;

  const currentAssessments = {};
  [...assessments]
    .sort((a, b) => (a.assessed_date || '').localeCompare(b.assessed_date || ''))
    .forEach(a => { currentAssessments[a.skill_id] = a; });

  const userTeamIds    = teamMembers.map(m => m.team_id);
  const userTeams      = teams.filter(t => userTeamIds.includes(t.id));
  const userReqSkillIds = new Set(
    reqSkills.filter(r => userTeamIds.includes(r.team_id) && r.is_required).map(r => r.skill_id)
  );

  let green = 0, amber = 0, red = 0, grey = 0;
  skills.forEach(skill => {
    if (!userReqSkillIds.has(skill.id)) return;
    const req = reqSkills.find(r => r.skill_id === skill.id && r.is_required);
    const status = getRAGStatus(currentAssessments[skill.id], skill, req);
    if (status === 'green') green++;
    else if (status === 'amber') amber++;
    else if (status === 'red') red++;
    else grey++;
  });

  const groupedSkills = categories
    .map(cat => ({ ...cat, skills: skills.filter(s => s.category_id === cat.id) }))
    .filter(g => g.skills.length > 0);

  // Timeline: all assessments sorted newest first
  const timeline = [...assessments]
    .sort((a, b) => (b.assessed_date || '').localeCompare(a.assessed_date || ''))
    .slice(0, 20);

  // Training modules relevant to user's skills
  const mySkillIds = new Set(skills.map(s => s.id));
  const myModules = trainingModules.filter(m => mySkillIds.has(m.skill_id));

  const LockedTabContent = ({ feature }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Lock className="w-5 h-5 text-primary" />
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">{feature} — Essential & above</p>
      <p className="text-xs text-muted-foreground max-w-xs mb-4">
        Upgrade your plan to access this feature.
      </p>
      <Button asChild size="sm" variant="outline">
        <Link to="/settings?tab=billing">View plans</Link>
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Skills Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{user?.full_name} — {user?.email}</p>
        </div>
        <Button variant="outline" onClick={exportData} title="Download all personal data (GDPR Subject Access Request)">
          <Download className="w-4 h-4 mr-1.5" /> Export My Data
        </Button>
      </div>

      {/* Teams & summary */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          {userTeams.length > 0
            ? userTeams.map(t => <Badge key={t.id} variant="outline">{t.name}</Badge>)
            : <p className="text-sm text-muted-foreground">Not assigned to any team</p>
          }
        </div>
        <div className="flex gap-4">
          {[
            { label: 'Current', count: green, color: 'text-green-600' },
            { label: 'Expiring', count: amber, color: 'text-amber-600' },
            { label: 'Missing', count: red + grey, color: 'text-red-600' },
          ].map(({ label, count, color }) => (
            <div key={label} className="text-center">
              <p className={`text-lg font-bold ${color}`}>{count}</p>
              <p className="text-xs text-muted-foreground uppercase">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1" aria-label="Profile sections">
          {TABS.map(tab => {
            const Icon = TAB_ICONS[tab];
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab: Skills */}
      {activeTab === 'skills' && (
        <div className="space-y-4">
          {groupedSkills.map(cat => (
            <div key={cat.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.colour || '#6B7280' }} />
                <h2 className="text-sm font-semibold">{cat.name}</h2>
              </div>
              <div className="divide-y divide-border">
                {cat.skills.map(skill => {
                  const assessment = currentAssessments[skill.id];
                  const isRequired = userReqSkillIds.has(skill.id);
                  const req        = reqSkills.find(r => r.skill_id === skill.id && r.is_required);
                  const status     = getRAGStatus(assessment, skill, req);
                  return (
                    <div key={skill.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{skill.name}</span>
                          {isRequired && <Badge variant="outline" className="text-[11px]">Required</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {assessment
                            ? getProficiencyLabel(assessment.proficiency_level, skill.scale_type)
                            : 'Not Assessed'}
                          {assessment?.assessed_date && ` — ${assessment.assessed_date}`}
                          {assessment?.expiry_date && ` — Expires ${assessment.expiry_date}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <SelfAssessmentRequest skill={skill} org={org} user={user} />
                        <RAGBadge status={status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {groupedSkills.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No skills in the library yet.</p>
          )}
        </div>
      )}

      {/* Tab: Training */}
      {activeTab === 'training' && (
        hasEmployeePortal ? (
          <div className="space-y-3">
            {myModules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No training modules linked to your skills yet.
              </p>
            ) : myModules.map(mod => {
              const completion = mod.user_completion;
              const tasks = mod.tasks || [];
              const doneTasks = completion?.completed_tasks?.length || 0;
              const pct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;
              const skill = skills.find(s => s.id === mod.skill_id);
              return (
                <div key={mod.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{mod.name}</p>
                      {skill && <p className="text-xs text-muted-foreground mt-0.5">Skill: {skill.name}</p>}
                      {mod.description && <p className="text-xs text-muted-foreground">{mod.description}</p>}
                    </div>
                    {doneTasks === tasks.length && tasks.length > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">Complete</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{doneTasks}/{tasks.length} tasks complete</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <Link to="/training-modules" className="text-xs text-primary hover:underline font-medium">
                    Go to training →
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <LockedTabContent feature="Training Materials" />
        )
      )}

      {/* Tab: Evidence */}
      {activeTab === 'evidence' && (
        hasEmployeePortal ? (
          <div className="space-y-4">
            {assessments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No assessments yet — evidence is attached to assessments.</p>
            ) : assessments.map(a => {
              const skill = skills.find(s => s.id === a.skill_id);
              if (!skill) return null;
              return (
                <div key={a.id} className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{skill.name}</p>
                  <EvidenceSection
                    entityType="skill_assessment"
                    entityId={a.id}
                    orgId={org.id}
                    canUpload={false}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <LockedTabContent feature="Evidence Upload" />
        )
      )}

      {/* Tab: History */}
      {activeTab === 'timeline' && (
        hasEmployeePortal ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No assessment history yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {timeline.map((a, i) => {
                  const skill = skills.find(s => s.id === a.skill_id);
                  let dateStr = a.assessed_date;
                  try {
                    const d = parseISO(a.assessed_date);
                    if (isValid(d)) dateStr = format(d, 'd MMM yyyy');
                  } catch {}
                  return (
                    <div key={i} className="flex items-center gap-4 px-5 py-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{skill?.name || a.skill_name || 'Unknown skill'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {getProficiencyLabel(a.proficiency_level, skill?.scale_type)}
                          {a.assessed_by_name ? ` · Assessed by ${a.assessed_by_name}` : ''}
                          {a.notes ? ` · "${a.notes}"` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{dateStr}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <LockedTabContent feature="Skills History" />
        )
      )}

      <p className="text-xs text-muted-foreground text-center">
        Your skill assessments are recorded by your manager or HR. Contact your administrator if you believe any data is incorrect.
        Use "Export My Data" above to download a copy of all data held about you (GDPR Subject Access Request).
      </p>
    </div>
  );
}
