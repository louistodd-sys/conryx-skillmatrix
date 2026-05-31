import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

const STATUSES = ['open','in_progress','completed','verified','overdue'];

export default function CAPAFormModal({ org, capa, onClose, onSaved }) {
  const [form, setForm] = useState(capa ? { ...capa } : {
    ref_number: '', nc_ref: '', title: '', corrective_action: '', preventive_action: '',
    responsible_name: '', raised_date: new Date().toISOString().split('T')[0], due_date: '',
    completed_date: '', status: 'open', effectiveness_review: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, organisation_id: org.id };
    if (capa?.id) await base44.entities.BRCCAPA.update(capa.id, payload);
    else await base44.entities.BRCCAPA.create(payload);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-card-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold font-jakarta">{capa ? 'Edit CAPA' : 'New CAPA'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ref</label>
              <Input className="mt-1" value={form.ref_number || ''} onChange={e => set('ref_number', e.target.value)} placeholder="CAPA-001" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">NC Reference</label>
              <Input className="mt-1" value={form.nc_ref || ''} onChange={e => set('nc_ref', e.target.value)} placeholder="NC-001" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title *</label>
            <Input className="mt-1" value={form.title} onChange={e => set('title', e.target.value)} placeholder="CAPA title" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Responsible</label>
              <Input className="mt-1" value={form.responsible_name || ''} onChange={e => set('responsible_name', e.target.value)} placeholder="Name" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Raised</label>
              <Input type="date" className="mt-1" value={form.raised_date} onChange={e => set('raised_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due</label>
              <Input type="date" className="mt-1" value={form.due_date || ''} onChange={e => set('due_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Completed</label>
              <Input type="date" className="mt-1" value={form.completed_date || ''} onChange={e => set('completed_date', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Corrective Action</label>
            <textarea className="mt-1 w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.corrective_action || ''} onChange={e => set('corrective_action', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preventive Action</label>
            <textarea className="mt-1 w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.preventive_action || ''} onChange={e => set('preventive_action', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Effectiveness Review</label>
            <textarea className="mt-1 w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.effectiveness_review || ''} onChange={e => set('effectiveness_review', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.title}>
            {saving ? 'Saving…' : 'Save CAPA'}
          </Button>
        </div>
      </div>
    </div>
  );
}