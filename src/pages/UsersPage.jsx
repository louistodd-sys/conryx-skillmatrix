import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Mail, Pencil, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/EmptyState';
import InviteUserModal from '@/components/InviteUserModal';
import EditUserModal from '@/components/EditUserModal';

const ROLE_COLORS = {
  admin:   'bg-purple-100 text-purple-700 border-purple-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  viewer:  'bg-gray-100 text-gray-600 border-gray-200',
};

export default function UsersPage() {
  const { org, user: currentUser } = useOrganisation();
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showInvite, setShowInvite] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [tab, setTab] = useState('users');

  useEffect(() => {
    if (org) loadData();
  }, [org]);

  async function loadData() {
    const [u, inv, tm, t] = await Promise.all([
      base44.entities.User.filter({ organisation_id: org.id }),
      base44.entities.Invitation.filter({ organisation_id: org.id }),
      base44.entities.TeamMember.filter({ organisation_id: org.id }),
      base44.entities.Team.filter({ organisation_id: org.id }),
    ]);
    setUsers(u);
    setInvitations(inv);
    setTeamMembers(tm);
    setTeams(t);
    setLoading(false);
  }

  const filteredUsers = users
    .filter(u => filterRole === 'all' || u.role === filterRole)
    .filter(u => !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    );

  const getUserTeams = (userId) =>
    teamMembers
      .filter(m => m.user_id === userId)
      .map(m => teams.find(t => t.id === m.team_id)?.name)
      .filter(Boolean);

  const pendingInvitations = invitations.filter(i => i.status === 'pending');

  // Compliance score per user
  const getComplianceBadge = (userId) => {
    // Lightweight badge - just show team membership count
    const teamCount = getUserTeams(userId).length;
    return teamCount;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} user{users.length !== 1 ? 's' : ''} · {teams.length} team{teams.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowInvite(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Invite User
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'users', label: `Active Users (${users.length})` },
          { key: 'invitations', label: `Pending Invitations (${pendingInvitations.length})` },
        ].map(t => (
          <button
            key={t.key}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
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
          </div>

          {/* Role legend */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Admin — full access</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Manager — assess teams</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> Viewer — read-only</span>
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users found"
              description="Invite your first team member to get started."
              actionLabel="Invite User"
              onAction={() => setShowInvite(true)}
            />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wide">Name</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wide hidden sm:table-cell">Email</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wide">Role</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wide hidden md:table-cell">Teams</th>
                      <th className="w-20 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map(u => {
                      const userTeams = getUserTeams(u.id);
                      const isCurrentUser = u.id === currentUser?.id;
                      return (
                        <tr key={u.id} className="hover:bg-muted/20 transition-colors group">
                          <td className="px-4 py-3">
                            <Link to={`/users/${u.id}`} className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                {(u.full_name || u.email || 'U')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                  {u.full_name || 'Unnamed'}
                                  {isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
                                </p>
                                <p className="text-xs text-muted-foreground sm:hidden">{u.email}</p>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${ROLE_COLORS[u.role] || ROLE_COLORS.viewer}`}>
                              {u.role || 'viewer'}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="flex gap-1 flex-wrap">
                              {userTeams.length === 0
                                ? <span className="text-xs text-muted-foreground italic">No teams</span>
                                : userTeams.map((t, i) => (
                                  <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] bg-muted text-muted-foreground border border-border">{t}</span>
                                ))
                              }
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                onClick={() => setEditingUser(u)}
                                title="Edit user"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Link to={`/users/${u.id}`}>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground" title="View profile">
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'invitations' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {pendingInvitations.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No pending invitations</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingInvitations.map(inv => (
                <div key={inv.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited by {inv.invited_by_name} as <span className="capitalize">{inv.role}</span>
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${ROLE_COLORS[inv.role] || ROLE_COLORS.viewer}`}>
                    {inv.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showInvite && (
        <InviteUserModal
          orgId={org.id}
          teams={teams}
          onClose={() => setShowInvite(false)}
          onSaved={loadData}
        />
      )}

      {editingUser && (
        <EditUserModal
          targetUser={editingUser}
          currentUser={currentUser}
          orgId={org.id}
          onClose={() => setEditingUser(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}