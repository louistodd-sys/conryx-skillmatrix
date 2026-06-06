import { useState, useEffect } from 'react';
import { BookOpen, Download } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RAGBadge from '@/components/RAGBadge';
import { getRAGStatus, getProficiencyLabel } from '@/lib/ragUtils';

export default function MyProfile() {
  const { org, user } = useOrganisation();
  const [skills, setSkills]         = useState([]);
  const [categories, setCategories] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teams, setTeams]           = useState([]);
  const [reqSkills, setReqSkills]   = useState([]);
  const [loading, setLoading]       = useState(true);

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
    setLoading(false);
  }

  // GDPR Subject Access Request export — includes ALL data held about the user
  const exportData = async () => {
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const toCSV  = (rows) => rows.map(r => r.map(escape).join(',')).join('\n');

    const userTeamIds = teamMembers.map(m => m.team_id);
    const userTeams   = teams.filter(t => userTeamIds.includes(t.id));

    // Sheet 1: Profile
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

    // Sheet 2: Assessments
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
      link.href     = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    };

    download(profileRows,    `${name}-profile-${date}.csv`);
    download(assessmentRows, `${name}-assessments-${date}.csv`);

    // GDPR Article 15 — audit log entry for every personal data export
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

  // Summary counts
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

      {/* Skills by category */}
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
                  <RAGBadge status={status} />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-xs text-muted-foreground text-center">
        Your skill assessments are recorded by your manager or HR. Contact your administrator if you believe any data is incorrect.
        Use "Export My Data" above to download a copy of all data held about you (GDPR Subject Access Request).
      </p>
    </div>
  );
}