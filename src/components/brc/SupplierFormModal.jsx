import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

const CATEGORIES = ['raw_material','packaging','service','logistics','utilities','other'];
const STATUSES = ['approved','conditional','unapproved','suspended','under_review'];
const METHODS = ['questionnaire','audit','certificate_review','third_party_cert','historical_performance'];
const RISKS = ['low','medium','high','critical'];

export default function SupplierFormModal({ org, supplier, onClose, onSaved }) {
  const [form, setForm] = useState(supplier ? { ...supplier } : {
    name: '', supplier_code: '', category: 'raw_material', approval_status: 'under_review',
    approval_method: 'questionnaire', risk_rating: 'medium', contact_name: '', contact_email: '',
    country: 'UK', last_review_date: '', next_review_date: '', notes: '', certifications: [],
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, organisation_id: org.id };
    if (supplier?.id) await base44.entities.BRCSupplier.update(supplier.id, payload);
    else await base44.entities.BRCSupplier.create(payload);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-card-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold font-jakarta">{supplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name *</label>
              <Input className="mt-1" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Supplier name" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Code</label>
              <Input className="mt-1" value={form.supplier_code || ''} onChange={e => set('supplier_code', e.target.value)} placeholder="SUP-001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Risk Rating</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.risk_rating} onChange={e => set('risk_rating', e.target.value)}>
                {RISKS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Approval Status</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.approval_status} onChange={e => set('approval_status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Approval Method</label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.approval_method} onChange={e => set('approval_method', e.target.value)}>
                {METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Name</label>
              <Input className="mt-1" value={form.contact_name || ''} onChange={e => set('contact_name', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Country</label>
              <Input className="mt-1" value={form.country || ''} onChange={e => set('country', e.target.value)} placeholder="UK" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Review</label>
              <Input type="date" className="mt-1" value={form.last_review_date || ''} onChange={e => set('last_review_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Next Review</label>
              <Input type="date" className="mt-1" value={form.next_review_date || ''} onChange={e => set('next_review_date', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</label>
            <textarea className="mt-1 w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.name}>
            {saving ? 'Saving…' : 'Save Supplier'}
          </Button>
        </div>
      </div>
    </div>
  );
}