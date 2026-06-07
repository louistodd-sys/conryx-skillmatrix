import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AddMemberModal({ teamId, orgId, existingMemberIds, onClose, onSaved }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.entities.User.filter({ organisation_id: orgId }).then(setUsers).catch(() => {});
  }, [orgId]);

  const available = users.filter(u =>
    !existingMemberIds.includes(u.id) &&
    (!u.status || u.status === 'active') &&
    (!search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const addUser = async (user) => {
    setAdding(user.id);
    setError('');
    try {
      await apiClient.entities.TeamMember.create({
        organisation_id: orgId,
        team_id: teamId,
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        is_managed_member: false,
      });
      setAdding(null);
      onSaved();
      onClose();
    } catch (err) {
      setError('Failed to add member — please try again.');
      setAdding(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md mx-4 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold">Add Team Member</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        {error && (
          <p className="px-5 py-2 text-sm text-destructive bg-destructive/5 border-b border-border">{error}</p>
        )}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {available.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No users available to add</p>
          ) : (
            available.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  {(u.full_name || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Button size="sm" onClick={() => addUser(u)} disabled={adding === u.id}>
                  {adding === u.id ? 'Adding...' : 'Add'}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}