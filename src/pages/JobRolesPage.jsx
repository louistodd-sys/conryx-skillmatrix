import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Briefcase, ChevronDown, ChevronRight, X, Check, Loader2 } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import Breadcrumb from '@/components/Breadcrumb';

// ─── Create / Edit modal ──────────────────────────────────────────────────────
function JobRoleModal({ role, orgId, onClose, onSaved }) {
  const [name, setName]               = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [skills, setSkills]           = useState([]);
  const [categories, setCategories]   = useState([]);
  const [selected, setSelected]       = useState(new Set());
  const [minProf, setMinProf]         = useState({});
  const [existingSkills, setExistingSkills] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.entities.Skill.filter({ organisation_id: orgId, status: 'active' }),
      apiClient.entities.SkillCategory.filter({ organisation_id: orgId }),
      role ? apiClient.entities.SkillTemplateSkill.filter({ template_id: role.id }) : Promise.resolve([]),
    ]).then(([s, c, ts]) => {
      setSkills(s);
      setCategories(c.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      setExistingSkills(ts);
      const sel = new Set(ts.map(t => t.skill_id));
      setSelected(sel);
      const profs = {};
      ts.forEach(t => { profs[t.skill_id] = t.minimum_proficiency || 1; });
      setMinProf(profs);
      setLoading(false);
    });
  }, [orgId, role?.id]);

  const toggle = (skillId) => {
    const next = new Set(selected);
    if (next.has(skillId)) {
      next.delete(skillId);
    } else {
      next.add(skillId);
      if (!minProf[skillId]) setMinProf(p => ({ ...p, [skillId]: 1 }));
    }
    setSelected(next);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let template;
      if (role) {
        template = await apiClient.entities.SkillTemplate.update(role.id, {
          name: name.trim(),
          description: description.trim() || null,
        });
        await Promise.all(existingSkills.map(ts => apiClient.entities.SkillTemplateSkill.delete(ts.id)));
      } else {
        template = await apiClient.entities.SkillTemplate.create({
          organisation_id: orgId,
          name: name.trim(),
          description: description.trim() || null,
        });
      }
      const toCreate = [...selected].map(skillId => ({
        template_id: template.id,
        organisation_id: orgId,
        skill_id: skillId,
        minimum_proficiency: minProf[skillId] || 1,
      }));
      if (toCreate.length > 0) {
        await apiClient.entities.SkillTemplateSkill.bulkCreate(toCreate);
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const grouped = categories
    .map(cat => ({ ...cat, skills: skills.filter(s => s.category_id === cat.id) }))
    .filter(g => g.skills.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-lg mx-4 max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold">{role ? 'Edit Job Role' : 'New Job Role Template'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="text-sm font-medium">Role Name <span className="text-destructive">*</span></label>
            <input
              className="w-full mt-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Production Operator"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal text-xs">(optional)</span></label>
            <textarea
              className="w-full mt-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this role"
            />
          </div>

          {/* Skills */}
          <div>
            <label className="text-sm font-medium">Required Skills</label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              Tick each skill required for this role and set the minimum proficiency expected.
            </p>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading skills…
              </div>
            ) : (
              grouped.map(cat => (
                <div key={cat.id} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.colour || '#6B7280' }} />
                    <span className="text-sm font-semibold text-foreground">{cat.name}</span>
                  </div>
                  <div className="space-y-1 ml-4">
                    {cat.skills.map(skill => (
                      <div key={skill.id} className="flex items-center gap-3 py-1">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer shrink-0 transition-colors ${selected.has(skill.id) ? 'bg-primary border-primary' : 'border-border hover:border-muted-foreground'}`}
                          onClick={() => toggle(skill.id)}
                        >
                          {selected.has(skill.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span className="text-sm flex-1 cursor-pointer" onClick={() => toggle(skill.id)}>{skill.name}</span>
                        {selected.has(skill.id) && skill.scale_type !== 'binary' && (
                          <select
                            className="h-7 text-xs rounded border border-input bg-background px-2 shrink-0"
                            value={minProf[skill.id] || 1}
                            onChange={e => setMinProf(p => ({ ...p, [skill.id]: Number(e.target.value) }))}
                          >
                            <option value={1}>Min: 1 – Awareness</option>
                            <option value={2}>Min: 2 – Working Knowledge</option>
                            <option value={3}>Min: 3 – Competent</option>
                            <option value={4}>Min: 4 – Expert</option>
                          </select>
                        )}
                        {selected.has(skill.id) && skill.scale_type === 'binary' && (
                          <span className="text-xs text-muted-foreground shrink-0">Competent required</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-between items-center px-5 py-4 border-t border-border shrink-0">
          <span className="text-xs text-muted-foreground">{selected.size} skill{selected.size !== 1 ? 's' : ''} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : 'Save Role'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function JobRolesPage() {
  const { org, user } = useOrganisation();
  const [templates, setTemplates]         = useState([]);
  const [templateSkills, setTemplateSkills] = useState([]);
  const [skills, setSkills]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showModal, setShowModal]         = useState(false);
  const [editingRole, setEditingRole]     = useState(null);
  const [expanded, setExpanded]           = useState(new Set());
  const [deleting, setDeleting]           = useState(null);

  useEffect(() => { if (org) loadData(); }, [org]);

  async function loadData() {
    const [t, ts, s] = await Promise.all([
      apiClient.entities.SkillTemplate.filter({ organisation_id: org.id }),
      apiClient.entities.SkillTemplateSkill.filter({ organisation_id: org.id }),
      apiClient.entities.Skill.filter({ organisation_id: org.id, status: 'active' }),
    ]);
    setTemplates(t.sort((a, b) => a.name.localeCompare(b.name)));
    setTemplateSkills(ts);
    setSkills(s);
    setLoading(false);
  }

  const handleDelete = async (id) => {
    setDeleting(id);
    await apiClient.entities.SkillTemplate.delete(id);
    setDeleting(null);
    loadData();
  };

  const toggleExpand = (id) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  if (loading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Teams', href: '/teams' }, { label: 'Job Roles' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Job Role Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define skill requirements by role. Apply a template to a team to instantly populate its required skills.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => { setEditingRole(null); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> New Role
          </Button>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-base font-semibold text-foreground">No job roles yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Create role templates (e.g. "Production Operator") to speed up team configuration — apply one template and all required skills are pre-set.
          </p>
          {canManage && (
            <Button className="mt-5" onClick={() => { setEditingRole(null); setShowModal(true); }}>
              <Plus className="w-4 h-4 mr-1.5" /> Create First Role
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
          {templates.map(tmpl => {
            const tSkills = templateSkills.filter(ts => ts.template_id === tmpl.id);
            const isOpen  = expanded.has(tmpl.id);
            return (
              <div key={tmpl.id}>
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Briefcase className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{tmpl.name}</p>
                    {tmpl.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{tmpl.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{tSkills.length} skill{tSkills.length !== 1 ? 's' : ''}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                      onClick={() => toggleExpand(tmpl.id)}
                      aria-label={isOpen ? 'Collapse' : 'Expand'}
                    >
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {canManage && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { setEditingRole(tmpl); setShowModal(true); }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          disabled={deleting === tmpl.id}
                          onClick={() => handleDelete(tmpl.id)}
                        >
                          {deleting === tmpl.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="px-5 pb-4 bg-muted/20">
                    {tSkills.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No skills assigned to this role yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {tSkills.map(ts => {
                          const skill = skills.find(s => s.id === ts.skill_id);
                          if (!skill) return null;
                          return (
                            <span key={ts.id} className="inline-flex items-center gap-1.5 bg-background border border-border px-2.5 py-1 rounded-md text-xs">
                              <span className="font-medium text-foreground">{skill.name}</span>
                              <span className="text-muted-foreground">
                                {skill.scale_type === 'binary' ? '(competent)' : `min ${ts.minimum_proficiency}`}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <JobRoleModal
          role={editingRole}
          orgId={org.id}
          onClose={() => setShowModal(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
