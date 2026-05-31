import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

const CATEGORIES = ['quality','contamination','labelling','delivery','service','other'];
const SEVERITIES = ['low','medium','high','critical'];
const STATUSES = ['new','investigating','resolved','closed'];

export default function ComplaintFormModal({ org, complaint, onClose, onSaved }) {
  const [form, setForm] = useState(complaint ? { ...complaint } : {
    ref_number: '', customer_name: '', complaint_date: new Date().toISOString().split('T')[0],
    category: 'quality', severity: 'medium', description: '', product_ref: '', status: 'new',
    root_cause: '', corrective_action: '', assigned_to_name: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, organisation_id: org.id };
    if (complaint?.id) await base44.entities.BRCComplaint.update(complaint.id, payload);
    else await base44.entities.BRCComplaint.create(payload);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-card-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold font-jakarta">{complaint ? 'Edit Complaint' : 'Log Complaint'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ref</label>
              <Input className="mt-1" value={form.ref_number || ''} onChange={e => set('ref_number', e.target.value)} placeholder="COMP-001" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date *</label>
              <Input type="date" className="mt-1" value={form.complaint_date} onChange={e => set('complaint_date', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer *</label>
            <Input className="mt-1" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="Customer name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned To</label>
              <Input className="mt-1" value={form.assigned_to_name || ''} onChange={e => set('assigned_to_name', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product / Batch Ref</label>
            <Input className="mt-1" value={form.product_ref || ''} onChange={e => set('product_ref', e.target.value)} placeholder="e.g. Batch 2024-0123" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description *</label>
            <textarea className="mt-1 w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the complaint…" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Root Cause</label>
            <textarea className="mt-1 w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.root_cause || ''} onChange={e => set('root_cause', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Corrective Action</label>
            <textarea className="mt-1 w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.corrective_action || ''} onChange={e => set('corrective_action', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.customer_name || !form.description}>
            {saving ? 'Saving…' : 'Save Complaint'}
          </Button>
        </div>
      </div>
    </div>
  );
}