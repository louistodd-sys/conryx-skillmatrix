import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, BookOpen } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/EmptyState';
import SkillFormModal from '@/components/SkillFormModal';
import CategoryFormModal from '@/components/CategoryFormModal';
import TemplatePickerModal from '@/components/TemplatePickerModal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function SkillsLibrary() {
  const { org } = useOrganisation();
  const [skills, setSkills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (org) loadData();
  }, [org]);

  async function loadData() {
    const [s, c] = await Promise.all([
      base44.entities.Skill.filter({ organisation_id: org.id }),
      base44.entities.SkillCategory.filter({ organisation_id: org.id }),
    ]);
    setSkills(s);
    setCategories(c.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    setLoading(false);
  }

  const filtered = skills
    .filter(s => filterStatus === 'all' || s.status === filterStatus)
    .filter(s => filterCategory === 'all' || s.category_id === filterCategory)
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  const handleArchive = async (skill) => {
    await base44.entities.Skill.update(skill.id, {
      status: skill.status === 'active' ? 'archived' : 'active'
    });
    loadData();
  };

  const handleDelete = async (skill) => {
    await base44.entities.Skill.delete(skill.id);
    setConfirmDelete(null);
    loadData();
  };

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || 'Uncategorised';
  const getCategoryColour = (id) => categories.find(c => c.id === id)?.colour || '#6B7280';

  if (loading) {
    return <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Skills Library</h1>
          <p className="text-sm text-muted-foreground mt-1">{skills.length} skills across {categories.length} categories</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowCategoryForm(true)}>Manage Categories</Button>
          <Button variant="outline" onClick={() => setShowTemplates(true)}>Templates</Button>
          <Button onClick={() => { setEditingSkill(null); setShowSkillForm(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Skill
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search skills..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* Skills Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No skills found"
          description={skills.length === 0 ? "Your skills library is empty. Add your first skill or use an industry template." : "No skills match your filters."}
          actionLabel={skills.length === 0 ? "Add Skill" : undefined}
          onAction={skills.length === 0 ? () => setShowSkillForm(true) : undefined}
          secondaryLabel={skills.length === 0 ? "Use a Template" : undefined}
          onSecondary={skills.length === 0 ? () => setShowTemplates(true) : undefined}
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Skill Name</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Category</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Scale</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Expiry</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(skill => (
                  <tr key={skill.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{skill.name}</p>
                      {skill.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{skill.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColour(skill.category_id) }} />
                        {getCategoryName(skill.category_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{skill.scale_type}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{skill.requires_expiry ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleArchive(skill)}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                          skill.status === 'active'
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                        }`}
                        title={skill.status === 'active' ? 'Click to deactivate' : 'Click to activate'}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${skill.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {skill.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingSkill(skill); setShowSkillForm(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>

                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirmDelete(skill)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showSkillForm && (
        <SkillFormModal
          skill={editingSkill}
          categories={categories}
          orgId={org.id}
          onClose={() => { setShowSkillForm(false); setEditingSkill(null); }}
          onSaved={loadData}
        />
      )}
      {showCategoryForm && (
        <CategoryFormModal
          categories={categories}
          orgId={org.id}
          onClose={() => setShowCategoryForm(false)}
          onSaved={loadData}
        />
      )}
      {showTemplates && (
        <TemplatePickerModal
          orgId={org.id}
          existingCategories={categories}
          onClose={() => setShowTemplates(false)}
          onImported={loadData}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Skill"
          description={`"${confirmDelete.name}" will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}