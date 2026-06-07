import { useState } from 'react';
import { X, Loader2, UserPlus } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useTierCheck from '@/hooks/useTierCheck';
import UpgradePromptModal from '@/components/UpgradePromptModal';

/**
 * Creates a managed Member record (no app login required).
 * The member is immediately available in the skills matrix.
 * HR/admin can optionally invite them later to give app access.
 */
export default function AddEmployeeModal({ orgId, teams, preselectedTeamId, onClose, onSaved }) {
  const { user } = useOrganisation();
  const { checkLimit, upgradePrompt, clearPrompt } = useTierCheck();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    job_title: '',
  });
  const [selectedTeams, setSelectedTeams] = useState(preselectedTeamId ? [preselectedTeamId] : []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (selectedTeams.length === 0) {
      setError('Assign the employee to at least one team.');
      return;
    }
    setError('');

    // Check tier limit before proceeding
    const allowed = await checkLimit('employee');
    if (!allowed) return;

    setSaving(true);

    try {
      const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`;

      // Generate a stable ID client-side — no separate entity needed.
      // This ID is stored in TeamMember.user_id and used as the assessment key.
      const memberId = crypto.randomUUID();

      // Create TeamMember entries for each selected team
      await Promise.all(selectedTeams.map(teamId =>
        apiClient.entities.TeamMember.create({
          organisation_id: orgId,
          team_id: teamId,
          user_id: memberId,
          user_name: fullName,
          user_email: form.email.trim() || null,
          is_managed_member: true,
        })
      ));

      // Audit log
      await apiClient.entities.AuditLogEntry.create({
        organisation_id: orgId,
        actor_user_id: user?.id,
        actor_display: user?.full_name,
        action: 'member.created',
        target_type: 'member',
        target_id: memberId,
        target_display: fullName,
        detail: JSON.stringify({ email: form.email || null, job_title: form.job_title || null }),
      });

      onSaved();
      onClose();
    } catch (err) {
      setError('Failed to create employee. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleTeam = (teamId) => {
    setSelectedTeams(prev =>
      prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]
    );
  };

  return (
    <>
    {upgradePrompt && <UpgradePromptModal prompt={upgradePrompt} onClose={clearPrompt} />}
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <div>
              <h2 className="text-base font-semibold">Add Employee</h2>
              <p className="text-xs text-muted-foreground">No app login required — HR manages their record</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.first_name}
                onChange={e => setForm({ ...form, first_name: e.target.value })}
                className="mt-1"
                placeholder="Jane"
                required
              />
            </div>
            <div>
              <Label>Last Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.last_name}
                onChange={e => setForm({ ...form, last_name: e.target.value })}
                className="mt-1"
                placeholder="Smith"
                required
              />
            </div>
          </div>

          <div>
            <Label>Email <span className="text-muted-foreground text-xs font-normal">(optional — needed only if you want to invite them later)</span></Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="mt-1"
              placeholder="jane.smith@example.com"
            />
          </div>

          <div>
            <Label>Job Title <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
            <Input
              value={form.job_title}
              onChange={e => setForm({ ...form, job_title: e.target.value })}
              className="mt-1"
              placeholder="Production Operative"
            />
          </div>

          {teams.length > 0 && (
            <div>
              <Label>Assign to Teams <span className="text-destructive">*</span></Label>
              <div className="space-y-1.5 mt-2 max-h-40 overflow-y-auto border border-input rounded-md p-2">
                {teams.map(t => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={selectedTeams.includes(t.id)}
                      onChange={() => toggleTeam(t.id)}
                      className="rounded border-border"
                    />
                    <span className="text-sm">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
            This employee will appear in the skills matrix immediately. You can assess their skills straight away.
            If they need app access, invite them separately from the Users page.
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Adding...</>
                : <><UserPlus className="w-4 h-4 mr-1.5" /> Add Employee</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}