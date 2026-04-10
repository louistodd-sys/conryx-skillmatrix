import { useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function SkillFormModal({ skill, categories, orgId, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: skill?.name || '',
    description: skill?.description || '',
    category_id: skill?.category_id || categories[0]?.id || '',
    scale_type: skill?.scale_type || 'binary',
    requires_expiry: skill?.requires_expiry || false,
    expiry_warning_days: skill?.expiry_warning_days || [30, 60, 90],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (skill) {
      await base44.entities.Skill.update(skill.id, form);
    } else {
      await base44.entities.Skill.create({ ...form, organisation_id: orgId, status: 'active' });
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">{skill ? 'Edit Skill' : 'Add Skill'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <Label>Skill Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="mt-1" />
          </div>
          <div>
            <Label>Category <span className="text-destructive">*</span></Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1"
              value={form.category_id}
              onChange={e => setForm({ ...form, category_id: e.target.value })}
              required
            >
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Description</Label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 resize-none"
              rows={3}
              maxLength={500}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description (max 500 chars)"
            />
          </div>
          <div>
            <Label>Proficiency Scale</Label>
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${form.scale_type === 'binary' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                onClick={() => setForm({ ...form, scale_type: 'binary' })}
              >
                Binary (Yes/No)
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${form.scale_type === 'levelled' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                onClick={() => setForm({ ...form, scale_type: 'levelled' })}
              >
                Levelled (0–4)
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Requires Expiry Date</Label>
              <p className="text-xs text-muted-foreground">Assessors must enter an expiry date</p>
            </div>
            <Switch checked={form.requires_expiry} onCheckedChange={v => setForm({ ...form, requires_expiry: v })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : skill ? 'Update Skill' : 'Add Skill'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}