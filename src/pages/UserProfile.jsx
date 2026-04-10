import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, CheckCircle2, Clock, AlertTriangle, Circle, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AssessmentModal from '@/components/AssessmentModal';
import EditUserModal from '@/components/EditUserModal';
import RAGBadge from '@/components/RAGBadge';
import { getRAGStatus, getProficiencyLabel, getRAGColors } from '@/lib/ragUtils';
import { differenceInDays, parseISO, format } from 'date-fns';

const ROLE_COLORS = {
  admin:   'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  viewer:  'bg-gray-100 text-gray-600',
};

function SkillRow({ skill, assessment, isRequired, reqSkill, canAssess, onAssess }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const status = getRAGStatus(assessment, skill, reqSkill);
  const colors = getRAGColors(status);

  const daysToExpiry = assessment?.expiry_date
    ? differenceInDays(parseISO(assessment.expiry_date), new Date())
    : null;

  const StatusIcon = status === 'green' ? CheckCircle2
    : status === 'amber' ? Clock
    : status === 'red' ? AlertTriangle
    : Circle;

  return (
    <div className="border-b border-border last:border-0">
      <div className="flex items-center gap-3 px-5 py-3">
        {/* Status icon */}
        <StatusIcon className={`w-4 h-4 shrink-0 ${colors.dot.replace('bg-', 'text-').replace('-500', '-600').replace('-400', '-500')}`} />

        {/* Skill info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{skill.name}</span>
            {isRequired && (
              <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded border border-border text-muted-foreground">Required</span>
            )}
          </div>
          {assessment ? (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
              <span>Level: <span className="text-foreground font-medium">{getProficiencyLabel(assessment.proficiency_level, skill.scale_type)}</span></span>
              <span>Assessed: <span className="text-foreground">{assessment.assessed_date}</span></span>
              {assessment.expiry_date && (
                <span className={daysToExpiry !== null && daysToExpiry < 0 ? 'text-red-600 font-medium' : daysToExpiry !== null && daysToExpiry <= 30 ? 'text-amber-600 font-medium' : ''}>
                  {daysToExpiry !== null && daysToExpiry < 0 ? 'EXPIRED' : `Expires: ${assessment.expiry_date}`}
                  {daysToExpiry !== null && daysToExpiry >= 0 && ` (${daysToExpiry}d)`}
                </span>
              )}
              {assessment.assessed_by_name && (
                <span>By: <span className="text-foreground">{assessment.assessed_by_name}</span></span>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">Not yet assessed</p>
          )}
        </div>

        {/* RAG badge */}
        <RAGBadge status={status} />

        {/* Assess button */}
        {canAssess && (
          <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs px-2.5" onClick={() => onAssess(skill, assessment)}>
            Assess
          </Button>
        )}
      </div>
    </div>
  );
}

export default function UserProfile() {
  const { userId } = useParams();
  const { org, user: currentUser } = useOrganisation();
  const [profileUser, setProfileUser] = useState(null);
  const [skills, setSkills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [reqSkills, setReqSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assessingCell, setAssessingCell] = useState(null);
  const [editingUser, setEditingUser] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState({});

  useEffect(() => { if (org) loadData(); }, [org, userId]);

  async function loadData() {
    const [usersRes, s, c, a, tm, t, trs] = await Promise.all([
      base44.entities.User.filter({ organisation_id: org.id }),
      base44.entities.Skill.filter({ organisation_id: org.id, status: 'active' }),
      base44.entities.SkillCategory.filter({ organisation_id: org.id }),
      base44.entities.SkillAssessment.filter({ organisation_id: org.id, user_id: userId }),
      base44.entities.TeamMember.filter({ organisation_id: org.id, user_id: userId }),
      base44.entities.Team.filter({ organisation_id: org.id }),
      base44.entities.TeamRequiredSkill.filter({ organisation_id: org.id }),
    ]);
    setProfileUser(usersRes.find(u => u.id === userId) || null);
    setSkills(s);
    setCategories(c.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    setAssessments(a.sort((a, b) => (a.assessed_date || '').localeCompare(b.assessed_date || '')));
    setTeamMembers(tm);
    setTeams(t);
    setReqSkills(trs);
    setLoading(false);
  }

  if (loading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />;
  if (!profileUser) return <p className="text-muted-foreground p-8">User not found.</p>;

  // Build current assessment map (latest per skill)
  const currentMap = {};
  assessments.forEach(a => { currentMap[a.skill_id] = a; });

  const userTeamIds = teamMembers.map(m => m.team_id);
  const userTeams = teams.filter(t => userTeamIds.includes(t.id));
  const userReqSkillIds = new Set(
    reqSkills.filter(r => userTeamIds.includes(r.team_id) && r.is_required).map(r => r.skill_id)
  );

  // Summary stats
  let green = 0, amber = 0, red = 0, grey = 0, totalRequired = 0;
  skills.forEach(skill => {
    if (!userReqSkillIds.has(skill.id)) return;
    totalRequired++;
    const assessment = currentMap[skill.id];
    const req = reqSkills.find(r => r.skill_id === skill.id && userTeamIds.includes(r.team_id));
    const s = getRAGStatus(assessment, skill, req);
    if (s === 'green') green++;
    else if (s === 'amber') amber++;
    else if (s === 'red') red++;
    else grey++;
  });
  const compliance = totalRequired > 0 ? Math.round((green / totalRequired) * 100) : null;

  const canAssess = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const canEdit = currentUser?.role === 'admin' && currentUser?.id !== profileUser.id;

  const groupedSkills = categories
    .map(cat => ({ ...cat, skills: skills.filter(s => s.category_id === cat.id) }))
    .filter(g => g.skills.length > 0);

  const exportCSV = () => {
    const rows = [['Skill', 'Category', 'Required', 'Status', 'Proficiency', 'Assessed Date', 'Expiry Date', 'Days to Expiry', 'Assessed By', 'Notes']];
    groupedSkills.forEach(cat => {
      cat.skills.forEach(skill => {
        const a = currentMap[skill.id];
        const req = reqSkills.find(r => r.skill_id === skill.id && userTeamIds.includes(r.team_id));
        const status = getRAGStatus(a, skill, req);
        const daysLeft = a?.expiry_date ? differenceInDays(parseISO(a.expiry_date), new Date()) : '';
        rows.push([
          skill.name, cat.name,
          userReqSkillIds.has(skill.id) ? 'Yes' : 'No',
          status,
          a ? getProficiencyLabel(a.proficiency_level, skill.scale_type) : 'Not Assessed',
          a?.assessed_date || '', a?.expiry_date || '', daysLeft,
          a?.assessed_by_name || '', a?.notes || '',
        ]);
      });
    });
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = `${(profileUser.full_name || 'user').replace(/\s/g, '-')}-skills.csv`;
    link.click();
  };

  const toggleCat = (catId) => setCollapsedCats(prev => ({ ...prev, [catId]: !prev[catId] }));

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/users" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Users
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{profileUser.full_name}</span>
      </div>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0">
            {(profileUser.full_name || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{profileUser.full_name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[profileUser.role] || ROLE_COLORS.viewer}`}>
                {profileUser.role || 'viewer'}
              </span>
              {canEdit && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingUser(true)}>
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{profileUser.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {userTeams.length === 0
                ? <span className="text-xs text-muted-foreground italic">No teams assigned</span>
                : userTeams.map(t => (
                  <Link key={t.id} to={`/teams/${t.id}`}>
                    <Badge variant="outline" className="hover:bg-muted cursor-pointer">{t.name}</Badge>
                  </Link>
                ))
              }
            </div>
          </div>

          {/* Compliance summary */}
          {compliance !== null && (
            <div className="flex gap-4 shrink-0">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{compliance}%</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Compliance</p>
              </div>
              <div className="flex gap-2">
                {[{ val: green, label: 'Current', color: 'text-green-600' }, { val: amber, label: 'Expiring', color: 'text-amber-600' }, { val: red + grey, label: 'Missing', color: 'text-red-600' }].map(s => (
                  <div key={s.label} className="text-center">
                    <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-1.5" /> Export Profile (CSV)
        </Button>
      </div>

      {/* Skills by category */}
      {groupedSkills.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground text-sm">No skills in the library yet.</p>
          <Link to="/skills-library" className="text-primary text-sm hover:underline mt-1 inline-block">Go to Skills Library →</Link>
        </div>
      ) : (
        groupedSkills.map(cat => (
          <div key={cat.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-5 py-3 border-b border-border hover:bg-muted/20 transition-colors"
              onClick={() => toggleCat(cat.id)}
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.colour || '#6B7280' }} />
              <span className="text-sm font-semibold flex-1 text-left">{cat.name}</span>
              <span className="text-xs text-muted-foreground">
                {cat.skills.filter(s => getRAGStatus(currentMap[s.id], s, reqSkills.find(r => r.skill_id === s.id && userTeamIds.includes(r.team_id))) === 'green').length}/{cat.skills.length} current
              </span>
              {collapsedCats[cat.id]
                ? <ChevronRight className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />
              }
            </button>
            {!collapsedCats[cat.id] && (
              <div>
                {cat.skills.map(skill => {
                  const req = reqSkills.find(r => r.skill_id === skill.id && userTeamIds.includes(r.team_id));
                  return (
                    <SkillRow
                      key={skill.id}
                      skill={skill}
                      assessment={currentMap[skill.id]}
                      isRequired={userReqSkillIds.has(skill.id)}
                      reqSkill={req}
                      canAssess={canAssess}
                      onAssess={(skill, assessment) => setAssessingCell({ skill, assessment })}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}

      {assessingCell && (
        <AssessmentModal
          userId={userId}
          userName={profileUser.full_name}
          skill={assessingCell.skill}
          existingAssessment={assessingCell.assessment}
          orgId={org.id}
          onClose={() => setAssessingCell(null)}
          onSaved={loadData}
        />
      )}

      {editingUser && (
        <EditUserModal
          targetUser={profileUser}
          currentUser={currentUser}
          orgId={org.id}
          onClose={() => setEditingUser(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}