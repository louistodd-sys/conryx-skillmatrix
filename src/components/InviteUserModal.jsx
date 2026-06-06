import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useTierCheck from '@/hooks/useTierCheck';
import UpgradePromptModal from '@/components/UpgradePromptModal';

export default function InviteUserModal({ orgId, teams, onClose, onSaved }) {
  const { user } = useOrganisation();
  const { checkLimit, upgradePrompt, clearPrompt } = useTierCheck();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Check tier limit for manager or admin seat before inviting
    if (role === 'manager' || role === 'admin') {
      const limitType = role === 'admin' ? 'admin_seat' : 'manager_seat';
      const allowed = await checkLimit(limitType);
      if (!allowed) return;
    }

    setSending(true);

    // Create invitation record
    await apiClient.entities.Invitation.create({
      organisation_id: orgId,
      email: email.trim(),
      role,
      invited_by_user_id: user?.id,
      invited_by_name: user?.full_name,
      team_ids: selectedTeams,
      status: 'pending',
    });

    // Actually invite the user via base44
    await apiClient.users.inviteUser(email.trim(), role === 'admin' ? 'admin' : 'user');

    setSending(false);
    onSaved();
    onClose();
  };

  const toggleTeam = (teamId) => {
    setSelectedTeams(prev => prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]);
  };

  return (
    <>
    {upgradePrompt && <UpgradePromptModal prompt={upgradePrompt} onClose={clearPrompt} />}
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Invite User</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <Label>Email Address <span className="text-destructive">*</span></Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1" placeholder="colleague@example.com" />
          </div>
          <div>
            <Label>Role</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1" value={role} onChange={e => setRole(e.target.value)}>
              <option value="viewer">Viewer (read-only)</option>
              <option value="manager">Manager (manage teams)</option>
              {user?.role === 'admin' && <option value="admin">Admin (full access)</option>}
            </select>
          </div>
          {teams.length > 0 && (
            <div>
              <Label>Assign to Teams</Label>
              <div className="space-y-1.5 mt-2 max-h-40 overflow-y-auto">
                {teams.map(t => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedTeams.includes(t.id)} onChange={() => toggleTeam(t.id)} className="rounded border-border" />
                    <span className="text-sm">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={sending}>
              {sending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Sending...</> : 'Send Invite'}
            </Button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}