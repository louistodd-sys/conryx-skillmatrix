import { useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RAGBadge from '@/components/RAGBadge';
import { getProficiencyLabel } from '@/lib/ragUtils';

export default function AssessmentModal({ userId, userName, skill, existingAssessment, orgId, onClose, onSaved }) {
  const { user } = useOrganisation();
  const [form, setForm] = useState({
    proficiency_level: existingAssessment?.proficiency_level != null ? Number(existingAssessment.proficiency_level) : (skill.scale_type === 'binary' ? 1 : 3),
    assessed_date: existingAssessment?.assessed_date || new Date().toISOString().split('T')[0],
    expiry_date: existingAssessment?.expiry_date || '',
    notes: existingAssessment?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const assessment = await base44.entities.SkillAssessment.create({
      organisation_id: orgId,
      user_id: userId,
      user_name: userName,
      skill_id: skill.id,
      skill_name: skill.name,
      proficiency_level: form.proficiency_level,
      assessed_date: form.assessed_date,
      expiry_date: form.expiry_date || null,
      notes: form.notes || null,
      assessed_by_user_id: user?.id,
      assessed_by_name: user?.full_name,
    });

    // Write audit log entry for every assessment
    await base44.entities.AuditLogEntry.create({
      organisation_id: orgId,
      actor_user_id: user?.id,
      actor_display: user?.full_name,
      action: 'skill.assessed',
      target_type: 'user',
      target_id: userId,
      target_display: userName,
      detail: JSON.stringify({
        skill_id: skill.id,
        skill_name: skill.name,
        proficiency_level: form.proficiency_level,
        proficiency_label: getProficiencyLabel(form.proficiency_level, skill.scale_type),
        assessed_date: form.assessed_date,
        expiry_date: form.expiry_date || null,
      }),
    }).catch(() => {}); // Non-blocking — don't fail the assessment if audit fails

    setSaving(false);
    onSaved();
    onClose();
  };

  const isBinary = skill.scale_type === 'binary';
  const levelOptions = isBinary
    ? [
        { value: 0, label: 'Not Competent' },
        { value: 1, label: 'Competent' },
      ]
    : [
        { value: 0, label: '0 — Not Trained' },
        { value: 1, label: '1 — Awareness' },
        { value: 2, label: '2 — Working Knowledge' },
        { value: 3, label: '3 — Competent' },
        { value: 4, label: '4 — Expert' },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => e.target === e.currentTarget && onClose()}>
      <div
        className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold">Assess Skill</h2>
            <p className="text-xs text-muted-foreground">{userName} — {skill.name}</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        {existingAssessment && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            Current:{' '}
            <span className="font-medium text-foreground">
              {getProficiencyLabel(existingAssessment.proficiency_level, skill.scale_type)}
            </span>
            {existingAssessment.assessed_date && <> — Assessed {existingAssessment.assessed_date}</>}
            {existingAssessment.expiry_date    && <> — Expires {existingAssessment.expiry_date}</>}
            {existingAssessment.assessed_by_name && <> — by {existingAssessment.assessed_by_name}</>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Proficiency level */}
          <div>
            <Label>Proficiency Level <span className="text-destructive">*</span></Label>
            <div className="space-y-1.5 mt-2">
              {levelOptions.map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer group" onClick={() => setForm(f => ({ ...f, proficiency_level: opt.value }))}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${form.proficiency_level === opt.value ? 'border-primary bg-primary' : 'border-border group-hover:border-muted-foreground'}`}>
                    {form.proficiency_level === opt.value && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                  </div>
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Assessed date */}
          <div>
            <Label>Assessed Date <span className="text-destructive">*</span></Label>
            <Input
              type="date"
              value={form.assessed_date}
              onChange={e => setForm({ ...form, assessed_date: e.target.value })}
              required
              className="mt-1"
            />
          </div>

          {/* Expiry date — always optional; recommended label when skill has expiry */}
          <div>
            <Label>
              Expiry Date{' '}
              <span className="text-muted-foreground text-xs font-normal">
                {skill.requires_expiry ? '(recommended)' : '(optional)'}
              </span>
            </Label>
            <Input
              type="date"
              value={form.expiry_date}
              onChange={e => setForm({ ...form, expiry_date: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Notes */}
          <div>
            <Label>Notes <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              maxLength={300}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes (max 300 characters)"
            />
            {form.notes.length > 250 && (
              <p className="text-xs text-muted-foreground text-right">{300 - form.notes.length} remaining</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save Assessment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}