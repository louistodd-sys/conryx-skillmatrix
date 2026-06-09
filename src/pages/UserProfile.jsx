import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Trash2, UserCog, Pencil, Loader2, Clock, AlertTriangle } from 'lucide-react';
import PrintReportWrapper from '@/components/PrintReportWrapper';
import { isFeatureAvailable } from '@/lib/tierConfig';
import Breadcrumb from '@/components/Breadcrumb';
import { differenceInDays, parseISO } from 'date-fns';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RAGBadge from '@/components/RAGBadge';
import AssessmentModal from '@/components/AssessmentModal';
import DeleteUserModal from '@/components/DeleteUserModal';
import EditEmployeeModal from '@/components/EditEmployeeModal';
import { getRAGStatus, getProficiencyLabel } from '@/lib/ragUtils';
import { getLatestAssessmentsForUser } from '@/utils/assessmentUtils';

// ─── Compliance ring ───────────────────────────────────────────────────────
function ComplianceRing({ pct }) {
  const r     = 30;
  const circ  = 2 * Math.PI * r;
  const dash  = Math.max(0, Math.min(pct / 100, 1)) * circ;
  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={74} height={74} viewBox="0 0 74 74">
        <circle cx={37} cy={37} r={r} fill="none" stroke="#f1f5f9" strokeWidth={7} />
        <circle
          cx={37} cy={37} r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 37 37)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text
          x={37} y={37}
          textAnchor="middle"
          dy="0.35em"
          fontSize={14}
          fontWeight={700}
          fill={color}
        >
          {pct}%
        </text>
      </svg>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Compliance
      </p>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function UserProfile() {
  const { userId }                    = useParams();
  const navigate                      = useNavigate();
  const { org, user: currentUser }    = useOrganisation();
  const [profileUser, setProfileUser] = useState(null);
  const [isManagedMember, setIsManagedMember] = useState(false);
  const [skills, setSkills]           = useState([]);
  const [categories, setCategories]   = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [myManagedTeamIds, setMyManagedTeamIds] = useState([]);
  const [teams, setTeams]             = useState([]);
  const [reqSkills, setReqSkills]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [assessingSkill, setAssessingSkill] = useState(null);
  const [expandedSkill, setExpandedSkill]   = useState(null);
  const [showDeleteModal, setShowDeleteModal]   = useState(false);
  const [showEditEmployee, setShowEditEmployee] = useState(false);
  const [changingRole, setChangingRole]         = useState(false);

  useEffect(() => { if (org) loadData(); }, [org, userId]);

  async function loadData() {
    const [s, c, a, tm, t, trs] = await Promise.all([
      apiClient.entities.Skill.filter({ organisation_id: org.id, status: 'active' }),
      apiClient.entities.SkillCategory.filter({ organisation_id: org.id }),
      apiClient.entities.SkillAssessment.filter({ organisation_id: org.id, user_id: userId }),
      apiClient.entities.TeamMember.filter({ organisation_id: org.id, user_id: userId }),
      apiClient.entities.Team.filter({ organisation_id: org.id }),
      apiClient.entities.TeamRequiredSkill.filter({ organisation_id: org.id }),
    ]);

    // Resolve: registered User or managed employee?
    let resolved = null;
    try {
      const users = await apiClient.entities.User.filter({ id: userId });
      resolved = users[0] || null;
    } catch (_) {}
    let managed  = false;

    if (!resolved) {
      const managedTm = tm.find(m => m.is_managed_member);
      if (managedTm) {
        resolved = {
          id:        userId,
          full_name: managedTm.user_name  || `Employee ${userId.slice(0, 8)}`,
          email:     managedTm.user_email || '(no email)',
          role:      'managed employee',
          job_title: null,
        };
        managed = true;
      }
    }

    let managedTeamIds = [];
    if (currentUser?.role === 'manager') {
      managedTeamIds = t
        .filter(team => team.manager_ids?.includes(currentUser.id))
        .map(team => team.id);
    }

    setProfileUser(resolved);
    setIsManagedMember(managed);
    setSkills(s);
    setCategories(c.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    setAssessments(a);
    setTeamMembers(tm);
    setMyManagedTeamIds(managedTeamIds);
    setTeams(t);
    setReqSkills(trs);
    setLoading(false);
  }

  // ── Role change ────────────────────────────────────────────────────────────
  const handleRoleChange = async (newRole) => {
    if (!profileUser || changingRole) return;
    setChangingRole(true);
    await apiClient.entities.User.update(userId, { role: newRole });
    await apiClient.entities.AuditLogEntry.create({
      organisation_id: org.id,
      actor_user_id:   currentUser?.id,
      actor_display:   currentUser?.full_name,
      action:          'user.role_changed',
      target_type:     'user',
      target_id:       userId,
      target_display:  profileUser.full_name,
      detail: JSON.stringify({ previous_role: profileUser.role, new_role: newRole }),
    }).catch(() => {});
    setChangingRole(false);
    loadData();
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    const [userAssessments, userMemberships] = await Promise.all([
      apiClient.entities.SkillAssessment.filter({ organisation_id: org.id, user_id: userId }),
      apiClient.entities.TeamMember.filter({ organisation_id: org.id, user_id: userId }),
    ]);
    await Promise.all([
      ...userAssessments.map(a  => apiClient.entities.SkillAssessment.delete(a.id)),
      ...userMemberships.map(m => apiClient.entities.TeamMember.delete(m.id)),
    ]);
    if (!isManagedMember) {
      try { await apiClient.entities.User.delete(userId); } catch (_) {}
    }
    await apiClient.entities.AuditLogEntry.create({
      organisation_id: org.id,
      actor_user_id:   currentUser?.id,
      actor_display:   currentUser?.full_name,
      action:          'user.deleted',
      target_type:     'user',
      target_id:       userId,
      target_display:  `Deleted User [${userId.slice(0, 8)}]`,
      detail: JSON.stringify({ name_at_deletion: profileUser?.full_name }),
    });
    setShowDeleteModal(false);
    navigate('/users');
  };

  if (loading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />;
  if (!profileUser) return <p className="text-muted-foreground p-4">Person not found.</p>;

  // ── Computed values ────────────────────────────────────────────────────────
  const currentAssessments = getLatestAssessmentsForUser(assessments, userId);

  const assessmentHistory = {};
  const sortedByDate = [...assessments].sort((a, b) => (a.assessed_date || '').localeCompare(b.assessed_date || ''));
  sortedByDate.forEach(a => {
    if (!assessmentHistory[a.skill_id]) assessmentHistory[a.skill_id] = [];
    assessmentHistory[a.skill_id].push(a);
  });

  const userTeamIds = teamMembers.map(m => m.team_id);
  const userTeams   = teams.filter(t => userTeamIds.includes(t.id));

  const canAssess =
    currentUser?.role === 'admin' ||
    (currentUser?.role === 'manager' && userTeamIds.some(id => myManagedTeamIds.includes(id)));
  const canDelete = currentUser?.role === 'admin';
  // Admin can change the role of any OTHER registered user
  const canChangeRole = currentUser?.role === 'admin' && !isManagedMember && profileUser.id !== currentUser.id;
  const canEditEmployee = currentUser?.role === 'admin' && isManagedMember;

  // Required skill IDs for this person
  const userReqSkillIds = new Set(
    reqSkills
      .filter(r => userTeamIds.includes(r.team_id) && r.is_required)
      .map(r => r.skill_id)
  );

  let greenCount = 0, amberCount = 0, redCount = 0, greyCount = 0;
  skills.forEach(skill => {
    if (!userReqSkillIds.has(skill.id)) return;
    const req    = reqSkills.find(r => r.skill_id === skill.id && userTeamIds.includes(r.team_id));
    const status = getRAGStatus(currentAssessments[skill.id], skill, req);
    if (status === 'green') greenCount++;
    else if (status === 'amber') amberCount++;
    else if (status === 'red') redCount++;
    else greyCount++;
  });
  const totalRequired = userReqSkillIds.size;
  const compliancePct = totalRequired > 0 ? Math.round((greenCount / totalRequired) * 100) : 0;

  // Upcoming / overdue renewals (expirations within next 90 days OR already expired)
  const expiryItems = skills
    .flatMap(skill => {
      const a = currentAssessments[skill.id];
      if (!a?.expiry_date) return [];
      const daysUntil = differenceInDays(parseISO(a.expiry_date), new Date());
      if (daysUntil > 90) return [];
      return [{ skill, assessment: a, daysUntil }];
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 6);

  // Skills grouped by category (sorted: red → amber → grey → green within each group)
  const STATUS_ORDER = { red: 0, amber: 1, grey: 2, green: 3 };
  const groupedSkills = categories
    .map(cat => ({
      ...cat,
      skills: skills
        .filter(s => s.category_id === cat.id)
        .map(s => {
          const req    = reqSkills.find(r => r.skill_id === s.id && userTeamIds.includes(r.team_id));
          const status = getRAGStatus(currentAssessments[s.id], s, req);
          return { ...s, _status: status, _req: req };
        })
        .sort((a, b) => (STATUS_ORDER[a._status] ?? 4) - (STATUS_ORDER[b._status] ?? 4)),
    }))
    .filter(g => g.skills.length > 0);

  const tier = org?.subscription_tier || 'free';

  return (
    <PrintReportWrapper orgName={org?.name} reportTitle={`Skills Report — ${profileUser.full_name}`} tier={tier}>
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Users', href: '/users' }, { label: profileUser.full_name }]} />

      {/* ── Profile Header ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0">
            {(profileUser.full_name || 'U')[0].toUpperCase()}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{profileUser.full_name}</h1>
              {isManagedMember && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <UserCog className="w-3 h-3" /> Managed
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mt-0.5">{profileUser.email}</p>

            {profileUser.job_title && (
              <p className="text-xs text-muted-foreground">{profileUser.job_title}</p>
            )}

            {/* Role badge / role selector */}
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {!isManagedMember && (
                canChangeRole ? (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={profileUser.role || 'viewer'}
                      onChange={e => handleRoleChange(e.target.value)}
                      disabled={changingRole}
                      className="h-7 rounded-md border border-input bg-background px-2 text-xs font-medium capitalize focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                    {changingRole && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                  </div>
                ) : (
                  <Badge variant="secondary" className="capitalize">{profileUser.role || 'viewer'}</Badge>
                )
              )}
              {userTeams.map(t => <Badge key={t.id} variant="outline">{t.name}</Badge>)}
            </div>
          </div>

          {/* Right side: compliance ring + stat counts + actions */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            {/* Compliance ring — only when there are required skills */}
            {totalRequired > 0 && (
              <ComplianceRing pct={compliancePct} />
            )}

            {/* Counts */}
            <div className="hidden sm:flex gap-4">
              {[
                { value: greenCount, label: 'Current', color: 'text-green-600' },
                { value: amberCount, label: 'Expiring', color: 'text-amber-600' },
                { value: redCount + greyCount, label: 'Missing', color: 'text-red-600' },
              ].map(({ value, label, color }) => (
                <div key={label} className="text-center">
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {canEditEmployee && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowEditEmployee(true)}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Upcoming renewals / overdue panel ── */}
      {expiryItems.length > 0 && (
        <div className="bg-card border border-amber-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-200 bg-amber-50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-800">
              Renewal Alerts — {expiryItems.length} skill{expiryItems.length !== 1 ? 's' : ''} need attention
            </h2>
          </div>
          <div className="divide-y divide-border">
            {expiryItems.map(({ skill, assessment, daysUntil }) => {
              const overdue  = daysUntil < 0;
              const urgent   = daysUntil >= 0 && daysUntil <= 30;
              const expColor = overdue ? 'text-red-600' : urgent ? 'text-amber-600' : 'text-muted-foreground';
              const expLabel = overdue
                ? `Expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`
                : daysUntil === 0
                ? 'Expires today'
                : `Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;

              return (
                <div key={skill.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {overdue
                      ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      : <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{skill.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getProficiencyLabel(assessment.proficiency_level, skill.scale_type)}
                        {assessment.assessed_date && ` — Assessed ${assessment.assessed_date}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-semibold ${expColor}`}>{expLabel}</span>
                    {canAssess && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setAssessingSkill(skill)}
                      >
                        Renew
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Skills by Category ── */}
      {groupedSkills.map(cat => (
        <div key={cat.id} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: cat.colour || '#6B7280' }}
            />
            <h2 className="text-sm font-semibold">{cat.name}</h2>
            <span className="ml-auto text-xs text-muted-foreground">{cat.skills.length} skills</span>
          </div>
          <div className="divide-y divide-border">
            {cat.skills.map(skill => {
              const assessment = currentAssessments[skill.id];
              const isRequired = userReqSkillIds.has(skill.id);
              const status     = skill._status;
              const history    = assessmentHistory[skill.id] || [];

              return (
                <div key={skill.id}>
                  <div
                    className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setExpandedSkill(expandedSkill === skill.id ? null : skill.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{skill.name}</span>
                        {isRequired && (
                          <Badge variant="outline" className="text-[11px]">Required</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {assessment
                          ? getProficiencyLabel(assessment.proficiency_level, skill.scale_type)
                          : 'Not Assessed'}
                        {assessment?.assessed_date && ` — Assessed ${assessment.assessed_date}`}
                        {assessment?.expiry_date   && ` — Expires ${assessment.expiry_date}`}
                        {assessment?.assessed_by_name && ` — by ${assessment.assessed_by_name}`}
                      </p>
                    </div>
                    <RAGBadge status={status} />
                    {canAssess && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={e => { e.stopPropagation(); setAssessingSkill(skill); }}
                      >
                        Assess
                      </Button>
                    )}
                  </div>

                  {/* Assessment history (expandable) */}
                  {expandedSkill === skill.id && history.length > 0 && (
                    <div className="px-5 pb-3 ml-5 border-l-2 border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Assessment History</p>
                      {[...history].reverse().map((h, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs text-muted-foreground py-1">
                          <span className="font-mono">{h.assessed_date}</span>
                          <span className="font-medium text-foreground">
                            {getProficiencyLabel(h.proficiency_level, skill.scale_type)}
                          </span>
                          {h.expiry_date && <span>Expires {h.expiry_date}</span>}
                          {h.notes && <span className="italic">"{h.notes}"</span>}
                          <span>by {h.assessed_by_name || 'System'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {groupedSkills.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          No skills in your library yet.{' '}
          {currentUser?.role === 'admin' && (
            <Link to="/skills-library" className="text-primary hover:underline">Add skills →</Link>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {assessingSkill && (
        <AssessmentModal
          userId={userId}
          userName={profileUser.full_name}
          skill={assessingSkill}
          existingAssessment={currentAssessments[assessingSkill.id]}
          orgId={org.id}
          onClose={() => setAssessingSkill(null)}
          onSaved={loadData}
        />
      )}

      {showDeleteModal && (
        <DeleteUserModal
          user={profileUser}
          onConfirm={handleDelete}
          onClose={() => setShowDeleteModal(false)}
        />
      )}

      {showEditEmployee && (
        <EditEmployeeModal
          userId={userId}
          currentName={profileUser.full_name}
          currentEmail={(!profileUser.email || profileUser.email === '(no email)') ? '' : profileUser.email}
          orgId={org.id}
          onClose={() => setShowEditEmployee(false)}
          onSaved={loadData}
        />
      )}
    </div>
    </PrintReportWrapper>
  );
}