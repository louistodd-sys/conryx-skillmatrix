import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

const STATUSES = ['scheduled','completed','minutes_approved'];

export default function ManagementReviewFormModal({ org, review, onClose, onSaved }) {
  const [form, setForm] = useState(review ? { ...review } : {
    meeting_date: '', chair_name: '', attendees: [], kpi_summary: '', audit_summary: '',
    nc_summary: '', customer_feedback: '', actions: '', next_meeting_date: '', status: 'scheduled',
  });
  const [attendeeInput, setAttendeeInput] = useState((review?.attendees || []).join(', '));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, attendees: attendeeInput.split(',').map(a => a.trim()).filter(Boolean), organisation_id: org.id };
    if (review?.id) await base44.entities.BRCManagementReview.update(review.id, payload);
    else await base44.entities.BRCManagementReview.create(payload);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-card-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold font-jakarta">{review ? 'Edit Management Review' : 'New Management Review'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meeting Date *</label>
              <Input type="date" className="mt-1" value={form.meeting_date} onChange={e => set('meeting_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chair / Facilitator *</label>
            <Input className="mt-1" value={form.chair_name} onChange={e => set('chair_name', e.target.value)} placeholder="Name" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attendees (comma-separated)</label>
            <Input className="mt-1" value={attendeeInput} onChange={e => setAttendeeInput(e.target.value)} placeholder="John Smith, Jane Doe…" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">KPI Summary</label>
            <textarea className="mt-1 w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.kpi_summary || ''} onChange={e => set('kpi_summary', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Audit Results Summary</label>
            <textarea className="mt-1 w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.audit_summary || ''} onChange={e => set('audit_summary', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">NC / CAPA Summary</label>
            <textarea className="mt-1 w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.nc_summary || ''} onChange={e => set('nc_summary', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions / Decisions</label>
            <textarea className="mt-1 w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.actions || ''} onChange={e => set('actions', e.target.value)} placeholder="Key actions agreed…" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Next Meeting Date</label>
            <Input type="date" className="mt-1" value={form.next_meeting_date || ''} onChange={e => set('next_meeting_date', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.meeting_date || !form.chair_name}>
            {saving ? 'Saving…' : 'Save Review'}
          </Button>
        </div>
      </div>
    </div>
  );
}