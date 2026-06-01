import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CAL_TYPES = ['internal','external','in-situ'];
const STATUSES = ['in_calibration','due_soon','overdue','out_of_service'];
const RESULTS = ['pass','fail','adjusted'];

export default function CalibrationFormModal({ org, record, onClose, onSaved }) {
  const [form, setForm] = useState(record ? { ...record } : {
    equipment_name: '', equipment_id: '', location: '', calibration_type: 'external',
    last_calibration_date: '', next_calibration_date: '', calibration_interval_months: 12,
    status: 'in_calibration', performed_by: '', certificate_ref: '', result: 'pass', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const handleSave = async () => {
    const errs = {};
    if (!form.equipment_name.trim()) errs.equipment_name = 'Equipment name is required';
    if (!form.equipment_id.trim()) errs.equipment_id = 'Equipment ID is required';
    if (!form.last_calibration_date) errs.last_calibration_date = 'Last calibration date is required';
    if (!form.next_calibration_date) errs.next_calibration_date = 'Next due date is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { ...form, organisation_id: org.id };
      if (record?.id) await base44.entities.BRCCalibrationRecord.update(record.id, payload);
      else await base44.entities.BRCCalibrationRecord.create(payload);
      toast.success(record ? 'Calibration record updated' : 'Equipment added');
      onSaved();
    } catch {
      toast.error('Failed to save calibration record');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-card-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold font-jakarta">{record ? 'Edit Calibration Record' : 'Add Equipment'}</h2>
          <button onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipment Name *</label>
              <Input className={`mt-1 ${errors.equipment_name ? 'border-destructive' : ''}`} value={form.equipment_name} onChange={e => set('equipment_name', e.target.value)} placeholder="e.g. Weighing Scale" />
              {errors.equipment_name && <p className="text-xs text-destructive mt-1">{errors.equipment_name}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipment ID *</label>
              <Input className={`mt-1 ${errors.equipment_id ? 'border-destructive' : ''}`} value={form.equipment_id} onChange={e => set('equipment_id', e.target.value)} placeholder="EQ-001" />
              {errors.equipment_id && <p className="text-xs text-destructive mt-1">{errors.equipment_id}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location</label>
              <Input className="mt-1" value={form.location || ''} onChange={e => set('location', e.target.value)} placeholder="Production Line 1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.calibration_type} onChange={e => set('calibration_type', e.target.value)}>
                {CAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Calibration *</label>
              <Input type="date" className={`mt-1 ${errors.last_calibration_date ? 'border-destructive' : ''}`} value={form.last_calibration_date} onChange={e => set('last_calibration_date', e.target.value)} />
              {errors.last_calibration_date && <p className="text-xs text-destructive mt-1">{errors.last_calibration_date}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Next Due *</label>
              <Input type="date" className={`mt-1 ${errors.next_calibration_date ? 'border-destructive' : ''}`} value={form.next_calibration_date} onChange={e => set('next_calibration_date', e.target.value)} />
              {errors.next_calibration_date && <p className="text-xs text-destructive mt-1">{errors.next_calibration_date}</p>}
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Result</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.result} onChange={e => set('result', e.target.value)}>
                {RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Performed By</label>
              <Input className="mt-1" value={form.performed_by || ''} onChange={e => set('performed_by', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Certificate Ref</label>
              <Input className="mt-1" value={form.certificate_ref || ''} onChange={e => set('certificate_ref', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</label>
            <textarea className="mt-1 w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Saving…</> : 'Save Record'}
          </Button>
        </div>
      </div>
    </div>
  );
}
