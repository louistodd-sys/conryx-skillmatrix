import { useState, useEffect } from 'react';
import { X, Check, Briefcase } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import { Button } from '@/components/ui/button';

export default function ManageRequiredSkillsModal({ teamId, orgId, existingReqSkills, onClose, onSaved }) {
  const [skills, setSkills]         = useState([]);
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates]   = useState([]);
  const [templateSkills, setTemplateSkills] = useState([]);
  const [selected, setSelected]     = useState(new Set(existingReqSkills.filter(r => r.is_required).map(r => r.skill_id)));
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.entities.Skill.filter({ organisation_id: orgId, status: 'active' }),
      apiClient.entities.SkillCategory.filter({ organisation_id: orgId }),
      apiClient.entities.SkillTemplate.filter({ organisation_id: orgId }),
      apiClient.entities.SkillTemplateSkill.filter({ organisation_id: orgId }),
    ]).then(([s, c, t, ts]) => {
      setSkills(s);
      setCategories(c.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      setTemplates(t.sort((a, b) => a.name.localeCompare(b.name)));
      setTemplateSkills(ts);
    });
  }, [orgId]);

  const toggle = (skillId) => {
    const next = new Set(selected);
    if (next.has(skillId)) next.delete(skillId);
    else next.add(skillId);
    setSelected(next);
  };

  const applyTemplate = () => {
    if (!selectedTemplate) return;
    const tmplSkills = templateSkills.filter(ts => ts.template_id === selectedTemplate);
    const next = new Set(selected);
    tmplSkills.forEach(ts => next.add(ts.skill_id));
    setSelected(next);
    setSelectedTemplate('');
  };

  const handleSave = async () => {
    setSaving(true);
    await Promise.all(existingReqSkills.map(r => apiClient.entities.TeamRequiredSkill.delete(r.id)));
    const toCreate = [...selected].map(skillId => ({
      organisation_id: orgId,
      team_id: teamId,
      skill_id: skillId,
      is_required: true,
      minimum_proficiency: 1,
    }));
    if (toCreate.length > 0) {
      await apiClient.entities.TeamRequiredSkill.bulkCreate(toCreate);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  const grouped = categories
    .map(cat => ({ ...cat, skills: skills.filter(s => s.category_id === cat.id) }))
    .filter(g => g.skills.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold">Required Skills for Team</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Apply template banner */}
          {templates.length > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-semibold text-primary">Load from Job Role Template</span>
              </div>
              <div className="flex gap-2">
                <select
                  className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm"
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(e.target.value)}
                >
                  <option value="">Select a template…</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={applyTemplate}
                  disabled={!selectedTemplate}
                  className="shrink-0"
                >
                  Apply
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Adds the template's skills to your current selection — you can still customise after.</p>
            </div>
          )}

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
