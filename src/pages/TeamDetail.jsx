import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, Plus, Trash2, BookOpen, ArrowLeft, Settings2, Grid3X3, BarChart3, AlertTriangle, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import MetricCard from '@/components/MetricCard';
import RAGBar from '@/components/RAGBar';
import AddMemberModal from '@/components/AddMemberModal';
import AddEmployeeModal from '@/components/AddEmployeeModal';
import ManageRequiredSkillsModal from '@/components/ManageRequiredSkillsModal';
import { getRAGStatus } from '@/lib/ragUtils';

// Inline confirmation modal (replaces browser confirm())
function ConfirmRemoveModal({ memberName, onConfirm, onClose }) {
  const [removing, setRemoving] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h2 className="text-base font-semibold">Remove Team Member</h2>
          <button className="ml-auto" onClick={onClose} disabled={removing}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Remove <span className="font-medium text-foreground">{memberName}</span> from this team?
            Their account and skill assessments will not be deleted.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={removing}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={removing}
              onClick={async () => {
                setRemoving(true);
                await onConfirm();
              }}
            >
              {removing
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Removing…</>
                : 'Remove from Team'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeamDetail() {
  const { teamId } = useParams();
  const { org, user } = useOrganisation();
  const [team, setTeam]             = useState(null);
  const [members, setMembers]       = useState([]);
  const [reqSkills, setReqSkills]   = useState([]);
  const [skills, setSkills]         = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [allUsers, setAllUsers]     = useState([]);
  const [teams, setTeams]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAddMember, setShowAddMember]   = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showReqSkills, setShowReqSkills]   = useState(false);
  const [removingMember, setRemovingMember] = useState(null);

  useEffect(() => {
    if (org) loadData();
  }, [org, teamId]);

  async function loadData() {
    const [allTeams, tm, trs, s, a, u] = await Promise.all([
      base44.entities.Team.filter({ organisation_id: org.id }),
      base44.entities.TeamMember.filter({ team_id: teamId }),
      base44.entities.TeamRequiredSkill.filter({ team_id: teamId }),
      base44.entities.Skill.filter({ organisation_id: org.id, status: 'active' }),
      base44.entities.SkillAssessment.filter({ organisation_id: org.id }),
      base44.entities.User.filter({ organisation_id: org.id }),
    ]);
    setTeam(allTeams.find(t => t.id === teamId) || null);
    setTeams(allTeams);
    setMembers(tm);
    setReqSkills(trs);
    setSkills(s);
    setAssessments(a);
    setAllUsers(u);
    setLoading(false);
  }

  const handleRemoveMember = async (memberId, memberName) => {
    await base44.entities.TeamMember.delete(memberId);
    await base44.entities.AuditLogEntry.create({
      organisation_id: org.id,
      actor_user_id: user?.id,
      actor_display: user?.full_name,
      action: 'team.member_removed',
      target_type: 'team',
      target_id: teamId,
      target_display: team?.name || teamId,
      detail: JSON.stringify({ member_name: memberName }),
    }).catch(() => {});
    setRemovingMember(null);
    loadData();
  };

  if (loading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />;
  if (!team)   return <p className="text-muted-foreground p-4">Team not found.</p>;

  const currentAssessments = {};
  assessments.forEach(a => {
    const key = `${a.user_id}-${a.skill_id}`;
    if (!currentAssessments[key] || a.assessed_date > currentAssessments[key].assessed_date) {
      currentAssessments[key] = a;
    }
  });

  const required = reqSkills.filter(r => r.is_required);
  let totalGreen = 0, totalAmber = 0, totalRed = 0, totalGrey = 0;
  members.forEach(m => {
    required.forEach(req => {
      const assessment = currentAssessments[`${m.user_id}-${req.skill_id}`];
      const skill = skills.find(s => s.id === req.skill_id);
      const status = getRAGStatus(assessment, skill, req);
      if (status === 'green') totalGreen++;
      else if (status === 'amber') totalAmber++;
      else if (status === 'red') totalRed++;
      else totalGrey++;
    });
  });
  const totalSlots   = totalGreen + totalAmber + totalRed + totalGrey;
  const compliance   = totalSlots > 0 ? Math.round((totalGreen / totalSlots) * 100) : 0;

  const isManagerOfThisTeam = user?.role === 'manager' && team.manager_ids?.includes(user.id);
  const isAdmin = user?.role === 'admin';
  const canManage = isAdmin || isManagerOfThisTeam;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/teams" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Teams
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{team.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
          {team.description && <p className="text-sm text-muted-foreground mt-0.5">{team.description}</p>}
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowReqSkills(true)}>
              <Settings2 className="w-4 h-4 mr-1.5" /> Required Skills
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAddEmployee(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Employee
            </Button>
            <Button size="sm" onClick={() => setShowAddMember(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Existing User
            </Button>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Users}    label="Members"         value={members.length} />
        <MetricCard icon={BookOpen} label="Required Skills" value={required.length} />
        <MetricCard               label="Compliance"       value={`${compliance}%`} />
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">RAG Summary</p>
          <RAGBar green={totalGreen} amber={totalAmber} red={totalRed} grey={totalGrey} showLabels />
        </div>
      </div>

      {/* Quick links to matrix and gap analysis for this team */}
      <div className="flex flex-wrap gap-3">
        <Link
          to={`/matrix?team=${teamId}`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-sm font-medium"
        >
          <Grid3X3 className="w-4 h-4 text-primary" />
          View Team Matrix
        </Link>
        <Link
          to={`/gap-analysis?team=${teamId}`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-sm font-medium"
        >
          <BarChart3 className="w-4 h-4 text-primary" />
          Team Gap Analysis
        </Link>
      </div>

      {/* Members list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold">Team Members</h2>
          <span className="text-xs text-muted-foreground">{members.length} members</span>
        </div>
        {members.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No members yet.{canManage && ' Add your first team member above.'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map(m => {
              const memberUser = allUsers.find(u => u.id === m.user_id);
              let mGreen = 0, mRed = 0, mAmber = 0, mGrey = 0;
              required.forEach(req => {
                const assessment = currentAssessments[`${m.user_id}-${req.skill_id}`];
                const skill = skills.find(s => s.id === req.skill_id);
                const status = getRAGStatus(assessment, skill, req);
                if (status === 'green') mGreen++;
                else if (status === 'amber') mAmber++;
                else if (status === 'red') mRed++;
                else mGrey++;
              });
              const mTotal = mGreen + mAmber + mRed + mGrey;
              const mComp  = mTotal > 0 ? Math.round((mGreen / mTotal) * 100) : 0;

              return (
                <div
                  key={m.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                    {(m.user_name || memberUser?.full_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/users/${m.user_id}`}
                      className="text-sm font-medium text-foreground hover:text-primary"
                    >
                      {m.user_name || memberUser?.full_name || m.user_email}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {m.user_email || memberUser?.email}
                      {m.is_managed_member && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 rounded px-1 py-0.5">Managed</span>
                      )}
                    </p>
                  </div>
                  <div className="w-24 hidden sm:block">
                    <RAGBar green={mGreen} amber={mAmber} red={mRed} grey={mGrey} />
                  </div>
                  <span className="text-sm font-semibold w-10 text-right shrink-0">{mComp}%</span>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => setRemovingMember(m)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddMember && (
        <AddMemberModal
          teamId={teamId}
          orgId={org.id}
          existingMemberIds={members.map(m => m.user_id)}
          onClose={() => setShowAddMember(false)}
          onSaved={loadData}
        />
      )}
      {showAddEmployee && (
        <AddEmployeeModal
          orgId={org.id}
          teams={teams}
          preselectedTeamId={teamId}
          onClose={() => setShowAddEmployee(false)}
          onSaved={loadData}
        />
      )}
      {showReqSkills && (
        <ManageRequiredSkillsModal
          teamId={teamId}
          orgId={org.id}
          existingReqSkills={reqSkills}
          onClose={() => setShowReqSkills(false)}
          onSaved={loadData}
        />
      )}
      {removingMember && (
        <ConfirmRemoveModal
          memberName={removingMember.user_name || 'this member'}
          onConfirm={() => handleRemoveMember(removingMember.id, removingMember.user_name)}
          onClose={() => setRemovingMember(null)}
        />
      )}
    </div>
  );
}
