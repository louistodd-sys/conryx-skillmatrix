import { useState } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PRESET_COLOURS = ['#DC2626', '#D97706', '#16A34A', '#2563EB', '#7C3AED', '#DB2777', '#0891B2', '#6B7280'];

export default function CategoryFormModal({ categories, orgId, onClose, onSaved }) {
  const [items, setItems] = useState(categories.map(c => ({ ...c })));
  const [newName, setNewName] = useState('');
  const [newColour, setNewColour] = useState(PRESET_COLOURS[0]);
  const [saving, setSaving] = useState(false);

  const addCategory = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await base44.entities.SkillCategory.create({
      organisation_id: orgId,
      name: newName.trim(),
      colour: newColour,
      display_order: items.length,
    });
    setNewName('');
    onSaved();
    setSaving(false);
    const updated = await base44.entities.SkillCategory.filter({ organisation_id: orgId });
    setItems(updated.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
  };

  const deleteCategory = async (cat) => {
    if (!confirm(`Delete category "${cat.name}"? Skills in this category must be reassigned first.`)) return;
    await base44.entities.SkillCategory.delete(cat.id);
    setItems(items.filter(c => c.id !== cat.id));
    onSaved();
  };

  const updateColour = async (cat, colour) => {
    await base44.entities.SkillCategory.update(cat.id, { colour });
    setItems(items.map(c => c.id === cat.id ? { ...c, colour } : c));
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold">Manage Categories</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {items.map(cat => (
            <div key={cat.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.colour || '#6B7280' }} />
              <span className="flex-1 text-sm font-medium">{cat.name}</span>
              <div className="flex gap-1">
                {PRESET_COLOURS.map(c => (
                  <button
                    key={c}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${cat.colour === c ? 'border-foreground scale-125' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => updateColour(cat, c)}
                  />
                ))}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCategory(cat)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-5 shrink-0">
          <div className="flex gap-2">
            <Input placeholder="New category name" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1" />
            <div className="flex gap-1 items-center">
              {PRESET_COLOURS.slice(0, 4).map(c => (
                <button
                  key={c}
                  className={`w-5 h-5 rounded-full border-2 ${newColour === c ? 'border-foreground' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewColour(c)}
                />
              ))}
            </div>
            <Button onClick={addCategory} disabled={saving || !newName.trim()} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}