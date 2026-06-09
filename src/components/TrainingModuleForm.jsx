import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PROFICIENCY_OPTIONS = [
  { value: 0, label: '0 — Not Trained' },
  { value: 1, label: '1 — Awareness' },
  { value: 2, label: '2 — Working Knowledge' },
  { value: 3, label: '3 — Competent' },
  { value: 4, label: '4 — Expert' },
];

export default function TrainingModuleForm({ open, onClose, onSave, module, skills }) {
  const isEdit = !!module;
  const [form, setForm] = useState({
    name: '',
    description: '',
    skill_id: '',
    on_completion_level: 1,
    tasks: [],
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (module) {
      setForm({
        name: module.name || '',
        description: module.description || '',
        skill_id: module.skill_id || '',
        on_completion_level: module.on_completion_level ?? 1,
        tasks: Array.isArray(module.tasks) ? module.tasks.map(t => ({ ...t })) : [],
      });
    } else {
      setForm({ name: '', description: '', skill_id: '', on_completion_level: 1, tasks: [] });
    }
    setErrors({});
  }, [module, open]);

  if (!open) return null;

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Module name is required.';
    if (!form.skill_id) e.skill_id = 'Please select a linked skill.';
    form.tasks.forEach((task, i) => {
      if (!task.title?.trim()) e[`task_${i}`] = 'Task title is required.';
    });
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        tasks: form.tasks.map(t => ({ title: t.title.trim(), description: t.description?.trim() || '' })),
      });
      onClose();
    } catch (err) {
      setErrors({ submit: err?.message || 'Failed to save. Please try again.' });
    }
    setSaving(false);
  };

  const addTask = () => {
    setForm(f => ({ ...f, tasks: [...f.tasks, { title: '', description: '' }] }));
  };

  const removeTask = (index) => {
    setForm(f => ({ ...f, tasks: f.tasks.filter((_, i) => i !== index) }));
  };

  const moveTask = (index, direction) => {
    const tasks = [...form.tasks];
    const target = index + direction;
    if (target < 0 || target >= tasks.length) return;
    [tasks[index], tasks[target]] = [tasks[target], tasks[index]];
    setForm(f => ({ ...f, tasks }));
  };

  const updateTask = (index, field, value) => {
    setForm(f => {
      const tasks = f.tasks.map((t, i) => i === index ? { ...t, [field]: value } : t);
      return { ...f, tasks };
    });
    if (field === 'title' && errors[`task_${index}`]) {
      setErrors(prev => { const e = { ...prev }; delete e[`task_${index}`]; return e; });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-card rounded-xl border border-border shadow-xl w-full max-w-lg mx-4 my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">
            {isEdit ? 'Edit Training Module' : 'New Training Module'}
          </h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <Label>Module Name <span className="text-destructive">*</span></Label>
            <Input
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(prev => ({ ...prev, name: undefined })); }}
              placeholder="e.g. Manual Handling Certification"
              className={`mt-1 ${errors.name ? 'border-destructive' : ''}`}
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <Label>Description <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of what this module covers"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Linked skill */}
          <div>
            <Label>Linked Skill <span className="text-destructive">*</span></Label>
            <select
              value={form.skill_id}
              onChange={e => { setForm(f => ({ ...f, skill_id: e.target.value })); setErrors(prev => ({ ...prev, skill_id: undefined })); }}
              className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-ring ${errors.skill_id ? 'border-destructive' : ''}`}
            >
              <option value="">Select a skill…</option>
              {(skills || []).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.skill_id && <p className="text-xs text-destructive mt-1">{errors.skill_id}</p>}
          </div>

          {/* Proficiency level on completion */}
          <div>
            <Label>Proficiency Level Awarded on Completion</Label>
            <select
              value={form.on_completion_level}
              onChange={e => setForm(f => ({ ...f, on_completion_level: Number(e.target.value) }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {PROFICIENCY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Task list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Tasks <span className="text-muted-foreground text-xs font-normal">({form.tasks.length} task{form.tasks.length !== 1 ? 's' : ''})</span></Label>
              <Button type="button" variant="outline" size="sm" onClick={addTask} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" />
                Add Task
              </Button>
            </div>

            {form.tasks.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No tasks yet. Add at least one task.</p>
            )}

            <div className="space-y-3">
              {form.tasks.map((task, index) => (
                <div key={index} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground w-5 shrink-0">
                      {index + 1}.
                    </span>
                    <Input
                      value={task.title}
                      onChange={e => updateTask(index, 'title', e.target.value)}
                      placeholder="Task title (required)"
                      className={`flex-1 h-8 text-sm ${errors[`task_${index}`] ? 'border-destructive' : ''}`}
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveTask(index, -1)}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-30"
                        title="Move up"
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTask(index, 1)}
                        disabled={index === form.tasks.length - 1}
                        className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-30"
                        title="Move down"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTask(index)}
                        className="p-1 rounded hover:bg-destructive/10 transition-colors"
                        title="Remove task"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                  {errors[`task_${index}`] && (
                    <p className="text-xs text-destructive ml-7">{errors[`task_${index}`]}</p>
                  )}
                  <textarea
                    value={task.description}
                    onChange={e => updateTask(index, 'description', e.target.value)}
                    placeholder="Task description (optional)"
                    rows={1}
                    className="w-full ml-7 rounded-md border border-input bg-background px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    style={{ width: 'calc(100% - 1.75rem)' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {errors.submit && (
            <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              {errors.submit}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update Module' : 'Create Module'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
