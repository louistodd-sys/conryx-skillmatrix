import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

const ITEM_TYPES = ['glass','hard_plastic','brittle_metal','ceramic','other'];
const RISK_LEVELS = ['low','medium','high'];
const STATUSES = ['ok','damaged','replaced','removed'];

export default function GlassItemFormModal({ org, item, onClose, onSaved }) {
  const [form, setForm] = useState(item ? { ...item } : {
    item_description: '', item_type: 'glass', location: '', risk_level: 'medium',
    last_checked_date: '', next_check_date: '', check_frequency_months: 1,
    status: 'ok', notes: '', checked_by: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, organisation_id: org.id };
    if (item?.id) await base44.entities.BRCGlassItem.update(item.id, payload);
    else await base44.entities.BRCGlassItem.create(payload);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-card-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold font-jakarta">{item ? 'Edit Item' : 'Add to Glass Register'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description *</label>
            <Input className="mt-1" value={form.item_description} onChange={e => set('item_description', e.target.value)} placeholder="e.g. Overhead fluorescent light cover" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.item_type} onChange={e => set('item_type', e.target.value)}>
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Risk Level</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.risk_level} onChange={e => set('risk_level', e.target.value)}>
                {RISK_LEVELS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location</label>
            <Input className="mt-1" value={form.location || ''} onChange={e => set('location', e.target.value)} placeholder="e.g. Production Hall A, Line 2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Check Frequency (months)</label>
              <Input type="number" min={1} className="mt-1" value={form.check_frequency_months} onChange={e => set('check_frequency_months', parseInt(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Checked</label>
              <Input type="date" className="mt-1" value={form.last_checked_date || ''} onChange={e => set('last_checked_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Next Check</label>
              <Input type="date" className="mt-1" value={form.next_check_date || ''} onChange={e => set('next_check_date', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Checked By</label>
            <Input className="mt-1" value={form.checked_by || ''} onChange={e => set('checked_by', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</label>
            <textarea className="mt-1 w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.item_description}>
            {saving ? 'Saving…' : 'Save Item'}
          </Button>
        </div>
      </div>
    </div>
  );
}