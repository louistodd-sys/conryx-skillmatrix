import { useState } from 'react';
import { apiClient } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const VISIT_TYPES = ['routine','emergency','follow_up','annual_survey'];
const ACTIVITY_LEVELS = ['none','low','medium','high'];
const STATUSES = ['scheduled','completed','action_required'];

export default function PestControlFormModal({ org, visit, onClose, onSaved }) {
  const [form, setForm] = useState(visit ? { ...visit } : {
    contractor_name: '', visit_date: new Date().toISOString().split('T')[0], visit_type: 'routine',
    areas_inspected: [], findings: '', activity_level: 'none', treatments_applied: '',
    recommendations: '', next_visit_date: '', status: 'scheduled',
  });
  const [areasInput, setAreasInput] = useState((visit?.areas_inspected || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const handleSave = async () => {
    const errs = {};
    if (!form.contractor_name.trim()) errs.contractor_name = 'Contractor name is required';
    if (!form.visit_date) errs.visit_date = 'Visit date is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { ...form, areas_inspected: areasInput.split(',').map(a => a.trim()).filter(Boolean), organisation_id: org.id };
      if (visit?.id) await apiClient.entities.BRCPestControlVisit.update(visit.id, payload);
      else await apiClient.entities.BRCPestControlVisit.create(payload);
      toast.success(visit ? 'Visit updated' : 'Visit logged');
      onSaved();
    } catch {
      toast.error('Failed to save visit');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-card-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold font-jakarta">{visit ? 'Edit Visit' : 'Log Pest Control Visit'}</h2>
          <button onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contractor *</label>
            <Input className={`mt-1 ${errors.contractor_name ? 'border-destructive' : ''}`} value={form.contractor_name} onChange={e => set('contractor_name', e.target.value)} placeholder="Pest control company name" />
            {errors.contractor_name && <p className="text-xs text-destructive mt-1">{errors.contractor_name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Visit Date *</label>
              <Input type="date" className={`mt-1 ${errors.visit_date ? 'border-destructive' : ''}`} value={form.visit_date} onChange={e => set('visit_date', e.target.value)} />
              {errors.visit_date && <p className="text-xs text-destructive mt-1">{errors.visit_date}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Visit Type</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.visit_type} onChange={e => set('visit_type', e.target.value)}>
                {VISIT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activity Level</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.activity_level} onChange={e => set('activity_level', e.target.value)}>
                {ACTIVITY_LEVELS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Areas Inspected (comma-separated)</label>
            <Input className="mt-1" value={areasInput} onChange={e => setAreasInput(e.target.value)} placeholder="Production Hall, Warehouse, Canteen…" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Findings</label>
            <textarea className="mt-1 w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.findings || ''} onChange={e => set('findings', e.target.value)} placeholder="Observations and findings…" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Treatments Applied</label>
            <textarea className="mt-1 w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.treatments_applied || ''} onChange={e => set('treatments_applied', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recommendations</label>
            <textarea className="mt-1 w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.recommendations || ''} onChange={e => set('recommendations', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Next Visit Date</label>
            <Input type="date" className="mt-1" value={form.next_visit_date || ''} onChange={e => set('next_visit_date', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Saving…</> : 'Save Visit'}
          </Button>
        </div>
      </div>
    </div>
  );
}
