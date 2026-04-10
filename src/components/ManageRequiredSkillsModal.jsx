import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function ManageRequiredSkillsModal({ teamId, orgId, existingReqSkills, onClose, onSaved }) {
  const [skills, setSkills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(new Set(existingReqSkills.filter(r => r.is_required).map(r => r.skill_id)));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Skill.filter({ organisation_id: orgId, status: 'active' }),
      base44.entities.SkillCategory.filter({ organisation_id: orgId }),
    ]).then(([s, c]) => {
      setSkills(s);
      setCategories(c);
    });
  }, [orgId]);

  const toggle = (skillId) => {
    const next = new Set(selected);
    if (next.has(skillId)) next.delete(skillId);
    else next.add(skillId);
    setSelected(next);
  };

  const handleSave = async () => {
    setSaving(true);
    // Delete existing
    await Promise.all(existingReqSkills.map(r => base44.entities.TeamRequiredSkill.delete(r.id)));
    // Create new
    const toCreate = [...selected].map(skillId => ({
      organisation_id: orgId,
      team_id: teamId,
      skill_id: skillId,
      is_required: true,
      minimum_proficiency: 1,
    }));
    if (toCreate.length > 0) {
      await base44.entities.TeamRequiredSkill.bulkCreate(toCreate);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  const grouped = categories.map(cat => ({
    ...cat,
    skills: skills.filter(s => s.category_id === cat.id),
  })).filter(g => g.skills.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold">Required Skills for Team</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-sm text-muted-foreground">Select which skills are required for this team. These will be used in gap analysis and compliance tracking.</p>
          {grouped.map(cat => (
            <div key={cat.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.colour || '#6B7280' }} />
                <span className="text-sm font-semibold text-foreground">{cat.name}</span>
              </div>
              <div className="space-y-1 ml-4">
                {cat.skills.map(skill => (
                  <label key={skill.id} className="flex items-center gap-3 py-1.5 cursor-pointer group" onClick={() => toggle(skill.id)}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selected.has(skill.id) ? 'bg-primary border-primary' : 'border-border group-hover:border-muted-foreground'}`}>
                      {selected.has(skill.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="text-sm text-foreground">{skill.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center px-5 py-4 border-t border-border shrink-0">
          <span className="text-xs text-muted-foreground">{selected.size} skills selected</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}