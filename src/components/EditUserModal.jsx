import { useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function EditUserModal({ targetUser, currentUser, orgId, onClose, onSaved }) {
  const [role, setRole] = useState(targetUser.role || 'viewer');
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isSelf = currentUser?.id === targetUser.id;

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe ? null : null; // can't updateMe for others
    // Update user role via entity update
    await base44.entities.User.update(targetUser.id, { role });
    setSaving(false);
    onSaved();
    onClose();
  };

  const handleRemove = async () => {
    setRemoving(true);
    // Remove from all teams
    const memberships = await base44.entities.TeamMember.filter({ organisation_id: orgId, user_id: targetUser.id });
    await Promise.all(memberships.map(m => base44.entities.TeamMember.delete(m.id)));
    // Remove org association
    await base44.entities.User.update(targetUser.id, { organisation_id: null, role: 'viewer' });
    setRemoving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold">Edit User</h2>
            <p className="text-xs text-muted-foreground">{targetUser.full_name} — {targetUser.email}</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        {!confirmRemove ? (
          <div className="p-5 space-y-5">
            <div>
              <Label>Role</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1"
                value={role}
                onChange={e => setRole(e.target.value)}
                disabled={isSelf}
              >
                <option value="viewer">Viewer — Read only, can see their own skills</option>
                <option value="manager">Manager — Can manage team assessments</option>
                <option value="admin">Admin — Full access to everything</option>
              </select>
              {isSelf && <p className="text-xs text-muted-foreground mt-1">You cannot change your own role.</p>}
            </div>

            <div className="flex justify-between items-center pt-2">
              {!isSelf && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 text-sm"
                  onClick={() => setConfirmRemove(true)}
                >
                  Remove from Organisation
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || isSelf}>
                  {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</> : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Remove {targetUser.full_name}?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This will remove them from all teams and revoke their access. Their historical assessment data will be preserved.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmRemove(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleRemove} disabled={removing}>
                {removing ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Removing…</> : 'Yes, Remove'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}