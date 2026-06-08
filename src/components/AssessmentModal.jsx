import { useState } from 'react';
import { X, Ban } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getProficiencyLabel } from '@/lib/ragUtils';

export default function AssessmentModal({ userId, userName, skill, existingAssessment, orgId, onClose, onSaved }) {
  const { user } = useOrganisation();
  const [notRequired, setNotRequired] = useState(false);
  const [form, setForm] = useState({
    proficiency_level: existingAssessment?.proficiency_level != null ? Number(existingAssessment.proficiency_level) : (skill.scale_type === 'binary' ? 1 : 3),
    assessed_date: existingAssessment?.assessed_date || new Date().toISOString().split('T')[0],
    expiry_date: existingAssessment?.expiry_date || (
      skill.requires_expiry
        ? (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().split('T')[0]; })()
        : ''
    ),
    notes: existingAssessment?.notes || '',
    assessed_by_name: existingAssessment?.assessed_by_name || user?.full_name || '',
  });
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);

    if (notRequired) {
      // Clear the assessment — cell returns to "Not Required" grey
      if (existingAssessment) {
        await apiClient.entities.SkillAssessment.delete(existingAssessment.id);
      }
      await apiClient.entities.AuditLogEntry.create({
        organisation_id: orgId,
        actor_user_id: user?.id,
        actor_display: user?.full_name,
        action: 'skill.cleared',
        target_type: 'user',
        target_id: userId,
        target_display: userName,
        detail: JSON.stringify({ skill_id: skill.id, skill_name: skill.name }),
      }).catch(() => {});
      setSaving(false);
      onSaved(null);
      onClose();
      return;
    }

    if (form.expiry_date && form.expiry_date < form.assessed_date) {
      setDateError('Expiry date must be after the assessed date.');
      setSaving(false);
      return;
    }
    setDateError('');

    let assessment;
    if (existingAssessment) {
      assessment = await apiClient.entities.SkillAssessment.update(existingAssessment.id, {
        proficiency_level: form.proficiency_level,
        assessed_date: form.assessed_date,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
        assessed_by_user_id: user?.id,
        assessed_by_name: form.assessed_by_name || user?.full_name,
      });
    } else {
      assessment = await apiClient.entities.SkillAssessment.create({
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
        assessed_by_name: form.assessed_by_name || user?.full_name,
      });
    }

    await apiClient.entities.AuditLogEntry.create({
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
    }).catch(() => {});

    setSaving(false);
    onSaved(assessment);
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
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 cursor-pointer group ${notRequired ? 'opacity-40 pointer-events-none' : ''}`}
                  onClick={() => !notRequired && setForm(f => ({ ...f, proficiency_level: opt.value }))}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${!notRequired && form.proficiency_level === opt.value ? 'border-primary bg-primary' : 'border-border group-hover:border-muted-foreground'}`}>
                    {!notRequired && form.proficiency_level === opt.value && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                  </div>
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}

              {/* Divider */}
              <div className="border-t border-border my-2" />

              {/* Not Required option */}
              <label
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setNotRequired(r => !r)}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${notRequired ? 'border-slate-500 bg-slate-500' : 'border-border group-hover:border-muted-foreground'}`}>
                  {notRequired && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <Ban className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">N/A — Not Required</span>
              </label>
            </div>

            {notRequired && (
              <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Selecting this will clear any existing assessment for this skill. The cell will show as "Not Required" (solid grey).
              </div>
            )}
          </div>

          {/* Date / notes — hidden when Not Required */}
          {!notRequired && (
            <>
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
                  onChange={e => { setForm({ ...form, expiry_date: e.target.value }); setDateError(''); }}
                  className={`mt-1 ${dateError ? 'border-destructive' : ''}`}
                />
                <div className="flex gap-2 mt-1.5">
                  {[['6mo', 6], ['1yr', 12], ['2yr', 24]].map(([label, months]) => (
                    <Button
                      key={label}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => {
                        const d = new Date(form.assessed_date || new Date());
                        d.setMonth(d.getMonth() + months);
                        setForm(f => ({ ...f, expiry_date: d.toISOString().split('T')[0] }));
                        setDateError('');
                      }}
                    >
                      +{label}
                    </Button>
                  ))}
                </div>
                {dateError && <p className="text-xs text-destructive mt-1">{dateError}</p>}
              </div>

              <div>
                <Label>Assessed By <span className="text-muted-foreground text-xs font-normal">(defaults to you)</span></Label>
                <Input
                  type="text"
                  value={form.assessed_by_name}
                  onChange={e => setForm({ ...form, assessed_by_name: e.target.value })}
                  placeholder={user?.full_name || 'Name of assessor'}
                  className="mt-1"
                />
              </div>

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
            </>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={saving}
              variant={notRequired ? 'outline' : 'default'}
            >
              {saving ? 'Saving…' : notRequired ? 'Clear Assessment' : 'Save Assessment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
