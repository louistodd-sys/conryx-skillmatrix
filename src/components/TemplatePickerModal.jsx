import { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { industryTemplates } from '@/lib/industryTemplates';

export default function TemplatePickerModal({ orgId, existingCategories, onClose, onImported }) {
  const [selected, setSelected] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!selected) return;
    setImporting(true);
    const template = industryTemplates.find(t => t.id === selected);

    for (const cat of template.categories) {
      let existing = existingCategories.find(c => c.name === cat.name);
      if (!existing) {
        existing = await apiClient.entities.SkillCategory.create({
          organisation_id: orgId,
          name: cat.name,
          colour: cat.colour,
          display_order: existingCategories.length,
        });
      }

      const skillsToCreate = cat.skills.map(s => ({
        organisation_id: orgId,
        category_id: existing.id,
        name: s.name,
        scale_type: s.scale_type,
        requires_expiry: s.requires_expiry,
        expiry_warning_days: [30, 60, 90],
        status: 'active',
      }));

      await apiClient.entities.Skill.bulkCreate(skillsToCreate);
    }

    setImporting(false);
    onImported();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Industry Starter Templates</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted-foreground mb-4">Choose a template to quickly populate your skills library. You can edit or remove any skills afterwards.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {industryTemplates.map(t => (
              <button
                key={t.id}
                className={`text-left p-4 rounded-lg border-2 transition-all ${selected === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}`}
                onClick={() => setSelected(t.id)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-sm font-semibold">{t.name}</span>
                  {selected === t.id && <Check className="w-4 h-4 text-primary ml-auto" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t.categories.length} categories, {t.categories.reduce((sum, c) => sum + c.skills.length, 0)} skills
                </p>
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={!selected || importing}>
            {importing ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Importing...</> : 'Import Template'}
          </Button>
        </div>
      </div>
    </div>
  );
}