import { useState } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Bulk assessment: assess one skill across all team members at once.
 * Typical use-case: "Everyone just completed Manual Handling training."
 */
export default function BulkAssessmentModal({ skill, members, orgId, onClose, onSaved }) {
  const { user } = useOrganisation();
  const today = new Date().toISOString().split('T')[0];

  const [assessedDate, setAssessedDate] = useState(today);
  const [expiryDate, setExpiryDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [rows, setRows] = useState(() =>
    members.map(m => ({
      userId: m.user_id,
      userName: m.user_name || 'Unknown',
      proficiency: skill.scale_type === 'binary' ? 1 : 3,
      include: true,
    }))
  );
  const [saving, setSaving] = useState(false);

  const isBinary = skill.scale_type === 'binary';
  const levelOptions = isBinary
    ? [{ value: 0, label: 'Not Competent' }, { value: 1, label: 'Competent' }]
    : [
        { value: 0, label: '0 — Not Trained' },
        { value: 1, label: '1 — Awareness' },
        { value: 2, label: '2 — Working Knowledge' },
        { value: 3, label: '3 — Competent' },
        { value: 4, label: '4 — Expert' },
      ];

  const updateRow = (userId, field, value) => {
    setRows(prev => prev.map(r => r.userId === userId ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    // Validate: expiry date must be after assessed date
    if (expiryDate && expiryDate < assessedDate) {
      setDateError('Expiry date must be after the assessed date.');
      return;
    }
    setDateError('');

    setSaving(true);
    const included = rows.filter(r => r.include);
    await Promise.all(included.map(r =>
      apiClient.entities.SkillAssessment.create({
        organisation_id: orgId,
        user_id: r.userId,
        user_name: r.userName,
        skill_id: skill.id,
        skill_name: skill.name,
        proficiency_level: r.proficiency,
        assessed_date: assessedDate,
        expiry_date: expiryDate || null,
        assessed_by_user_id: user?.id,
        assessed_by_name: user?.full_name,
      })
    ));

    // Audit log
    await apiClient.entities.AuditLogEntry.create({
      organisation_id: orgId,
      actor_user_id: user?.id,
      actor_display: user?.full_name,
      action: 'skill.bulk_assessed',
      target_type: 'skill',
      target_id: skill.id,
      target_display: skill.name,
      detail: JSON.stringify({ count: included.length, assessed_date: assessedDate }),
    });

    setSaving(false);
    onSaved();
    onClose();
  };

  const includedCount = rows.filter(r => r.include).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold">Bulk Assess — {skill.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assess multiple team members on this skill at once
            </p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        {/* Shared date fields */}
        <div className="px-5 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex flex-wrap gap-4">
            <div>
              <Label className="text-xs">Assessed Date <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={assessedDate}
                onChange={e => { setAssessedDate(e.target.value); setDateError(''); }}
                className="mt-1 w-40"
              />
            </div>
            {skill.requires_expiry && (
              <div>
                <Label className="text-xs">Expiry Date <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={e => { setExpiryDate(e.target.value); setDateError(''); }}
                  required
                  className={`mt-1 w-40 ${dateError ? 'border-destructive' : ''}`}
                />
              </div>
            )}
          </div>
          {dateError && <p className="text-xs text-destructive mt-2">{dateError}</p>}
        </div>

        {/* Per-member rows */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-card border-b border-border">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={rows.every(r => r.include)}
                    onChange={e => setRows(prev => prev.map(r => ({ ...r, include: e.target.checked })))}
                    className="rounded"
                  />
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Proficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(row => (
                <tr key={row.userId} className={`${!row.include ? 'opacity-40' : ''} hover:bg-muted/30 transition-colors`}>
                  <td className="px-5 py-2.5">
                    <input
                      type="checkbox"
                      checked={row.include}
                      onChange={e => updateRow(row.userId, 'include', e.target.checked)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-sm font-medium">{row.userName}</td>
                  <td className="px-4 py-2.5">
                    <select
                      className="h-8 rounded border border-input bg-background px-2 text-sm"
                      value={row.proficiency}
                      onChange={e => updateRow(row.userId, 'proficiency', parseInt(e.target.value))}
                      disabled={!row.include}
                    >
                      {levelOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground">{includedCount} of {rows.length} members will be assessed</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving || includedCount === 0 || (skill.requires_expiry && !expiryDate)}
            >
              {saving
                ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving...</>
                : <><Save className="w-4 h-4 mr-1.5" /> Save {includedCount} Assessments</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
