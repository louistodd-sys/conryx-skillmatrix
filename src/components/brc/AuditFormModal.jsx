import { useState } from 'react';
import { apiClient } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AUDIT_TYPES = ['internal', 'third_party', 'regulatory', 'supplier'];
const STATUSES = ['planned', 'in_progress', 'completed', 'overdue'];
const RATINGS = ['satisfactory', 'minor_issues', 'major_issues', 'critical'];

export default function AuditFormModal({ org, audit, onClose, onSaved }) {
  const [form, setForm] = useState(audit ? { ...audit } : {
    title: '', audit_type: 'internal', scheduled_date: '', lead_auditor_name: '', scope: '',
    status: 'planned', overall_rating: '', summary: '', nc_count: 0,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const handleSave = async () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.scheduled_date) errs.scheduled_date = 'Scheduled date is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { ...form, organisation_id: org.id };
      if (audit?.id) await apiClient.entities.BRCAudit.update(audit.id, payload);
      else await apiClient.entities.BRCAudit.create(payload);
      toast.success(audit ? 'Audit updated' : 'Audit created');
      onSaved();
    } catch {
      toast.error('Failed to save audit');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-card-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold font-jakarta">{audit ? 'Edit Audit' : 'New Internal Audit'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title *</label>
            <Input className={`mt-1 ${errors.title ? 'border-destructive' : ''}`} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Annual Internal Audit 2026" />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.audit_type} onChange={e => set('audit_type', e.target.value)}>
                {AUDIT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scheduled Date *</label>
              <Input type="date" className={`mt-1 ${errors.scheduled_date ? 'border-destructive' : ''}`} value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} />
              {errors.scheduled_date && <p className="text-xs text-destructive mt-1">{errors.scheduled_date}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Completed Date</label>
              <Input type="date" className="mt-1" value={form.completed_date || ''} onChange={e => set('completed_date', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lead Auditor</label>
            <Input className="mt-1" value={form.lead_auditor_name || ''} onChange={e => set('lead_auditor_name', e.target.value)} placeholder="Name" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scope / Areas</label>
            <textarea className="mt-1 w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.scope || ''} onChange={e => set('scope', e.target.value)} placeholder="Areas and clauses covered…" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overall Rating</label>
            <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.overall_rating || ''} onChange={e => set('overall_rating', e.target.value)}>
              <option value="">—</option>
              {RATINGS.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Summary / Findings</label>
            <textarea className="mt-1 w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.summary || ''} onChange={e => set('summary', e.target.value)} placeholder="Key findings and observations…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Saving…</> : 'Save Audit'}
          </Button>
        </div>
      </div>
    </div>
  );
}