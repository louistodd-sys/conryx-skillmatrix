import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Users, Mail, RefreshCw, XCircle, UserPlus,
  Pencil, Trash2, AlertTriangle, X, Loader2, UserCog,
} from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/EmptyState';
import InviteUserModal from '@/components/InviteUserModal';
import AddEmployeeModal from '@/components/AddEmployeeModal';
import EditEmployeeModal from '@/components/EditEmployeeModal';
import { format, parseISO } from 'date-fns';

const STATUS_COLORS = {
  active:   'bg-green-100 text-green-700',
  pending:  'bg-amber-100 text-amber-700',
  inactive: 'bg-gray-100 text-gray-600',
};

// ─── Confirm delete modal (inline) ────────────────────────────────────────
function ConfirmDeleteModal({ name, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h2 className="text-base font-semibold">Delete Employee</h2>
          <button className="ml-auto" onClick={onClose} disabled={deleting}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Permanently delete{' '}
            <span className="font-medium text-foreground">{name}</span>{' '}
            and all their skill assessments? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                await onConfirm();
              }}
            >
              {deleting
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Deleting…</>
                : 'Delete Employee'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { org, user } = useOrganisation();
  const [users, setUsers]               = useState([]);
  const [invitations, setInvitations]   = useState([]);
  const [teamMembers, setTeamMembers]   = useState([]);
  const [teams, setTeams]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterRole, setFilterRole]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showInvite, setShowInvite]     = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);   // { userId, name, email }
  const [deletingEmployee, setDeletingEmployee] = useState(null); // { userId, name }
  const [tab, setTab]                   = useState('users');
  const [revoking, setRevoking]         = useState(null);
  const [resending, setResending]       = useState(null);

  useEffect(() => { if (org) loadData(); }, [org]);

  async function loadData() {
    const [u, inv, tm, t] = await Promise.all([
      apiClient.entities.User.filter({ organisation_id: org.id }),
      apiClient.entities.Invitation.filter({ organisation_id: org.id }),
      apiClient.entities.TeamMember.filter({ organisation_id: org.id }),
      apiClient.entities.Team.filter({ organisation_id: org.id }),
    ]);
    setUsers(u);
    setInvitations(inv);
    setTeamMembers(tm);
    setTeams(t);
    setLoading(false);
  }

  // ── Registered users (filtered) ──────────────────────────────────────────
  const filteredUsers = users
    .filter(u => filterRole === 'all' || u.role === filterRole)
    .filter(u => filterStatus === 'all' || (u.status || 'active') === filterStatus)
    .filter(u =>
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    );

  const getUserTeams = (userId) =>
    teamMembers
      .filter(m => m.user_id === userId && !m.is_managed_member)
      .map(m => teams.find(t => t.id === m.team_id)?.name)
      .filter(Boolean);

  // ── Managed employees (deduplicated from TeamMember) ──────────────────────
  // Include members who are either flagged as managed OR whose user_id is not an app user
  const appUserIds = new Set(users.map(u => u.id));
  const employeeMap = {};
  teamMembers.forEach(m => {
    // Include if explicitly managed OR if not a registered app user
    if (!m.is_managed_member && appUserIds.has(m.user_id)) return;
    if (!employeeMap[m.user_id]) employeeMap[m.user_id] = m;
  });
  const allEmployees = Object.values(employeeMap);

  const filteredEmployees = allEmployees.filter(e =>
    !search ||
    (e.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.user_email || '').toLowerCase().includes(search.toLowerCase())
  );

  const getEmployeeTeams = (userId) =>
    teamMembers
      .filter(m => m.user_id === userId && m.is_managed_member)
      .map(m => teams.find(t => t.id === m.team_id)?.name)
      .filter(Boolean);

  // ── Delete managed employee ───────────────────────────────────────────────
  const handleDeleteEmployee = async () => {
    if (!deletingEmployee) return;
    const { userId, name } = deletingEmployee;

    const [memberships, assessments] = await Promise.all([
      apiClient.entities.TeamMember.filter({ organisation_id: org.id, user_id: userId }),
      apiClient.entities.SkillAssessment.filter({ organisation_id: org.id, user_id: userId }),
    ]);
    await Promise.all([
      ...memberships.map(m => apiClient.entities.TeamMember.delete(m.id)),
      ...assessments.map(a => apiClient.entities.SkillAssessment.delete(a.id)),
    ]);

    await apiClient.entities.AuditLogEntry.create({
      organisation_id: org.id,
      actor_user_id:   user?.id,
      actor_display:   user?.full_name,
      action:          'member.deleted',
      target_type:     'member',
      target_id:       userId,
      target_display:  `Deleted [${userId.slice(0, 8)}]`,
      detail: JSON.stringify({ name_at_deletion: name }),
    }).catch(() => {});

    setDeletingEmployee(null);
    loadData();
  };

  // ── Invitation actions ────────────────────────────────────────────────────
  const pendingInvitations = invitations.filter(i => i.status === 'pending');

  const handleRevoke = async (inv) => {
    setRevoking(inv.id);
    await apiClient.entities.Invitation.update(inv.id, { status: 'revoked' });
    await apiClient.entities.AuditLogEntry.create({
      organisation_id: org.id,
      actor_user_id: user?.id,
      actor_display: user?.full_name,
      action: 'invitation.revoked',
      target_type: 'invitation',
      target_id: inv.id,
      target_display: inv.email,
      detail: JSON.stringify({ role: inv.role }),
    });
    setRevoking(null);
    loadData();
  };

  const handleResend = async (inv) => {
    setResending(inv.id);
    const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    await apiClient.entities.Invitation.update(inv.id, { expires_at: newExpiry, status: 'pending' });
    try { await apiClient.users.inviteUser(inv.email, inv.role === 'admin' ? 'admin' : 'user'); } catch (_) {}
    await apiClient.entities.AuditLogEntry.create({
      organisation_id: org.id,
      actor_user_id: user?.id,
      actor_display: user?.full_name,
      action: 'invitation.resent',
      target_type: 'invitation',
      target_id: inv.id,
      target_display: inv.email,
      detail: JSON.stringify({}),
    });
    setResending(null);
    loadData();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try { return format(parseISO(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
  };

  if (loading) return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {users.length} app user{users.length !== 1 ? 's' : ''} · {allEmployees.length} managed employee{allEmployees.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddEmployee(true)}>
            <UserCog className="w-4 h-4 mr-1.5" /> Add Employee
          </Button>
          <Button onClick={() => setShowInvite(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Invite User
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'users',       label: `App Users (${users.length})` },
          { key: 'employees',   label: `Employees (${allEmployees.length})` },
          { key: 'invitations', label: `Invitations (${pendingInvitations.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Search (shared between users + employees tabs) ── */}
      {(tab === 'users' || tab === 'employees') && (
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {tab === 'users' && (
            <>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="viewer">Viewer</option>
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </>
          )}
        </div>
      )}

      {/* ── Tab: App Users ── */}
      {tab === 'users' && (
        filteredUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description="Invite users to give them access to the platform."
            actionLabel="Invite User"
            onAction={() => setShowInvite(true)}
          />
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Email</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Role</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Teams</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden xl:table-cell">Last Login</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden xl:table-cell">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map(u => {
                    const status = u.status || 'active';
                    return (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link to={`/users/${u.id}`} className="flex items-center gap-3 group">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                              {(u.full_name || 'U')[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                              {u.full_name || 'Unnamed'}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{u.email}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs capitalize">{u.role || 'viewer'}</Badge>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] || STATUS_COLORS.inactive}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex gap-1 flex-wrap">
                            {getUserTeams(u.id).map((t, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell">
                          {formatDate(u.last_login_at)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell">
                          {formatDate(u.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── Tab: Managed Employees ── */}
      {tab === 'employees' && (
        filteredEmployees.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="No managed employees yet"
            description="Add employees who are tracked in the skills matrix but don't need app logins."
            actionLabel="Add Employee"
            onAction={() => setShowAddEmployee(true)}
          />
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Email</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Teams</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEmployees.map(e => {
                    const empTeams = getEmployeeTeams(e.user_id);
                    return (
                      <tr key={e.user_id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link to="/people" className="flex items-center gap-3 group">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-semibold shrink-0">
                              {(e.user_name || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                {e.user_name || 'Unnamed'}
                              </span>
                              <span className="ml-2 text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                                Managed
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                          {e.user_email || <span className="italic text-muted-foreground/50">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex gap-1 flex-wrap">
                            {empTeams.map((t, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setEditingEmployee({
                                userId:  e.user_id,
                                name:    e.user_name  || '',
                                email:   e.user_email || '',
                              })}
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                              onClick={() => setDeletingEmployee({ userId: e.user_id, name: e.user_name || 'this employee' })}
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── Tab: Invitations ── */}
      {tab === 'invitations' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {invitations.filter(i => i.status !== 'accepted').length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No pending invitations.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Email</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Role</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Invited By</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Expires</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invitations
                    .filter(i => i.status !== 'accepted')
                    .map(inv => (
                      <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium">{inv.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs capitalize">{inv.role}</Badge>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                            inv.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            inv.status === 'revoked' ? 'bg-red-100 text-red-700'    :
                            inv.status === 'expired' ? 'bg-gray-100 text-gray-600'  :
                            'bg-green-100 text-green-700'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                          {inv.invited_by_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                          {inv.expires_at ? formatDate(inv.expires_at) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {inv.status === 'pending' && (
                              <>
                                <Button
                                  size="sm" variant="outline" className="h-7 text-xs"
                                  disabled={resending === inv.id}
                                  onClick={() => handleResend(inv)}
                                >
                                  {resending === inv.id
                                    ? <span className="animate-pulse">Sending…</span>
                                    : <><RefreshCw className="w-3 h-3 mr-1" /> Resend</>}
                                </Button>
                                <Button
                                  size="sm" variant="outline"
                                  className="h-7 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                                  disabled={revoking === inv.id}
                                  onClick={() => handleRevoke(inv)}
                                >
                                  {revoking === inv.id
                                    ? <span className="animate-pulse">Revoking…</span>
                                    : <><XCircle className="w-3 h-3 mr-1" /> Revoke</>}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {showInvite && (
        <InviteUserModal orgId={org.id} teams={teams} onClose={() => setShowInvite(false)} onSaved={loadData} />
      )}
      {showAddEmployee && (
        <AddEmployeeModal
          orgId={org.id} teams={teams}
          onClose={() => setShowAddEmployee(false)}
          onSaved={() => { loadData(); setTab('employees'); }}
        />
      )}
      {editingEmployee && (
        <EditEmployeeModal
          userId={editingEmployee.userId}
          currentName={editingEmployee.name}
          currentEmail={editingEmployee.email}
          orgId={org.id}
          onClose={() => setEditingEmployee(null)}
          onSaved={loadData}
        />
      )}
      {deletingEmployee && (
        <ConfirmDeleteModal
          name={deletingEmployee.name}
          onConfirm={handleDeleteEmployee}
          onClose={() => setDeletingEmployee(null)}
        />
      )}
    </div>
  );
}