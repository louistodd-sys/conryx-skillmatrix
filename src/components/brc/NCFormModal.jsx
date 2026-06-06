import { useState } from 'react';
import { apiClient } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SOURCES = ['internal_audit','external_audit','customer_complaint','supplier_issue','routine_check','incident'];
const SEVERITIES = ['observation','minor','major','critical'];
const STATUSES = ['open','under_investigation','capa_raised','closed','overdue'];

export default function NCFormModal({ org, nc, clause, onClose, onSaved }) {
  const clauseTitle = clause ? `${clause.clause_number ? `Clause ${clause.clause_number} — ` : ''}${clause.title || ''}` : '';
  const [form, setForm] = useState(nc ? { ...nc } : {
    ref_number: '', title: clauseTitle, source: 'internal_audit', severity: 'minor', status: 'open',
    raised_date: new Date().toISOString().split('T')[0], due_date: '', description: '', immediate_action: '', root_cause: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const handleSave = async () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.raised_date) errs.raised_date = 'Raised date is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { ...form, organisation_id: org.id };
      let saved;
      if (nc?.id) {
        saved = await apiClient.entities.BRCNonConformance.update(nc.id, payload);
      } else {
        saved = await apiClient.entities.BRCNonConformance.create(payload);
        if (clause?.id && saved?.id) {
          await apiClient.entities.BRCClauseEvidenceLink.create({
            organisation_id: org.id,
            clause_id: clause.id,
            linked_entity_type: 'non_conformance',
            linked_entity_id: saved.id,
          });
        }
      }
      toast.success(nc ? 'Non-conformance updated' : 'Non-conformance raised');
      onSaved();
    } catch {
      toast.error('Failed to save non-conformance');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-card-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold font-jakarta">{nc ? 'Edit Non-Conformance' : 'Raise Non-Conformance'}</h2>
          <button onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ref Number</label>
              <Input className="mt-1" value={form.ref_number || ''} onChange={e => set('ref_number', e.target.value)} placeholder="NC-001" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Raised Date *</label>
              <Input type="date" className={`mt-1 ${errors.raised_date ? 'border-destructive' : ''}`} value={form.raised_date} onChange={e => set('raised_date', e.target.value)} />
              {errors.raised_date && <p className="text-xs text-destructive mt-1">{errors.raised_date}</p>}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title *</label>
            <Input className={`mt-1 ${errors.title ? 'border-destructive' : ''}`} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Brief description of NC" />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Source</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.source} onChange={e => set('source', e.target.value)}>
                {SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Severity</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.severity} onChange={e => set('severity', e.target.value)}>
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</label>
              <Input type="date" className="mt-1" value={form.due_date || ''} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned To</label>
            <Input className="mt-1" value={form.assigned_to_name || ''} onChange={e => set('assigned_to_name', e.target.value)} placeholder="Name" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</label>
            <textarea className="mt-1 w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="Detailed description…" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Immediate Action</label>
            <textarea className="mt-1 w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.immediate_action || ''} onChange={e => set('immediate_action', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Root Cause</label>
            <textarea className="mt-1 w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.root_cause || ''} onChange={e => set('root_cause', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Saving…</> : 'Save NC'}
          </Button>
        </div>
      </div>
    </div>
  );
}
