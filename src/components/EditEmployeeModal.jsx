import { useState } from 'react';
import { X, Loader2, UserCog } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Edit the display name and email of a managed employee.
 * Updates every TeamMember and SkillAssessment record for the given user_id
 * so the denormalised name stays consistent across the app.
 */
export default function EditEmployeeModal({ userId, currentName, currentEmail, orgId, onClose, onSaved }) {
  const { user } = useOrganisation();
  const [form, setForm] = useState({
    name:  currentName  || '',
    email: currentEmail || '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Full name is required.'); return; }
    setError('');
    setSaving(true);

    try {
      const newName  = form.name.trim();
      const newEmail = form.email.trim() || null;

      // Update every TeamMember record for this person
      const memberships = await apiClient.entities.TeamMember.filter({ organisation_id: orgId, user_id: userId });
      await Promise.all(memberships.map(m =>
        apiClient.entities.TeamMember.update(m.id, { user_name: newName, user_email: newEmail })
      ));

      // Keep denormalised user_name on assessments in sync
      const assessments = await apiClient.entities.SkillAssessment.filter({ organisation_id: orgId, user_id: userId });
      await Promise.all(assessments.map(a =>
        apiClient.entities.SkillAssessment.update(a.id, { user_name: newName })
      ));

      await apiClient.entities.AuditLogEntry.create({
        organisation_id: orgId,
        actor_user_id:   user?.id,
        actor_display:   user?.full_name,
        action:          'member.updated',
        target_type:     'member',
        target_id:       userId,
        target_display:  newName,
        detail: JSON.stringify({ previous_name: currentName, previous_email: currentEmail }),
      }).catch(() => {});

      onSaved();
      onClose();
    } catch (_) {
      setError('Failed to update employee. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-card rounded-xl border border-border shadow-xl w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <UserCog className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold">Edit Employee</h2>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <Label>Full Name <span className="text-destructive">*</span></Label>
            <Input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="mt-1"
              placeholder="Jane Smith"
              required
            />
          </div>

          <div>
            <Label>
              Email{' '}
              <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="mt-1"
              placeholder="jane.smith@example.com"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</>
                : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
