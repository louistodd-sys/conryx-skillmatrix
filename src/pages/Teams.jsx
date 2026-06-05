import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, FolderKanban, ChevronRight } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import RAGBar from '@/components/RAGBar';
import TeamFormModal from '@/components/TeamFormModal';
import { getRAGStatus } from '@/lib/ragUtils';

export default function Teams() {
  const { org, user } = useOrganisation();
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamReqSkills, setTeamReqSkills] = useState([]);
  const [skills, setSkills] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (org) loadData();
  }, [org]);

  async function loadData() {
    const [t, tm, trs, s, a] = await Promise.all([
      apiClient.entities.Team.filter({ organisation_id: org.id }),
      apiClient.entities.TeamMember.filter({ organisation_id: org.id }),
      apiClient.entities.TeamRequiredSkill.filter({ organisation_id: org.id }),
      apiClient.entities.Skill.filter({ organisation_id: org.id, status: 'active' }),
      apiClient.entities.SkillAssessment.filter({ organisation_id: org.id }),
    ]);
    setTeams(t.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    setTeamMembers(tm);
    setTeamReqSkills(trs);
    setSkills(s);
    setAssessments(a);
    setLoading(false);
  }

  // Filter teams for managers
  const visibleTeams = user?.role === 'admin' ? teams : teams.filter(t => t.manager_ids?.includes(user?.id));

  const getTeamStats = (team) => {
    const members = teamMembers.filter(m => m.team_id === team.id);
    const reqSkills = teamReqSkills.filter(r => r.team_id === team.id && r.is_required);

    const currentAssessments = {};
    assessments.forEach(a => {
      const key = `${a.user_id}-${a.skill_id}`;
      if (!currentAssessments[key] || a.assessed_date > currentAssessments[key].assessed_date) {
        currentAssessments[key] = a;
      }
    });

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

    return { memberCount: members.length, reqSkillCount: reqSkills.length, green, amber, red, grey };
  };

  if (loading) {
    return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams</h1>
          <p className="text-sm text-muted-foreground mt-1">{visibleTeams.length} teams</p>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Create Team
          </Button>
        )}
      </div>

      {visibleTeams.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No teams yet"
          description="Create your first team to start organising your workforce."
          actionLabel={user?.role === 'admin' ? 'Create Team' : undefined}
          onAction={user?.role === 'admin' ? () => setShowForm(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleTeams.map(team => {
            const stats = getTeamStats(team);
            const total = stats.green + stats.amber + stats.red + stats.grey;
            const compliance = total > 0 ? Math.round((stats.green / total) * 100) : 0;
            return (
              <Link
                key={team.id}
                to={`/teams/${team.id}`}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">{team.name}</h3>
                    {team.description && <p className="text-xs text-muted-foreground mt-0.5">{team.description}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {stats.memberCount} members
                  </span>
                  <span>{stats.reqSkillCount} required skills</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <RAGBar green={stats.green} amber={stats.amber} red={stats.red} grey={stats.grey} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{compliance}%</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showForm && (
        <TeamFormModal orgId={org.id} onClose={() => setShowForm(false)} onSaved={loadData} />
      )}
    </div>
  );
}