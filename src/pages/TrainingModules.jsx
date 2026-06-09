import { useState, useEffect, useCallback } from 'react';
import { Plus, BookOpen, Archive, Edit2, ChevronDown, ChevronUp, Lock, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import TrainingModuleForm from '@/components/TrainingModuleForm';
import TaskListView from '@/components/TaskListView';
import UpgradePromptModal from '@/components/UpgradePromptModal';

const PROFICIENCY_LABELS = ['Not Trained', 'Awareness', 'Working Knowledge', 'Competent', 'Expert'];

export default function TrainingModules() {
  const { org, user } = useOrganisation();
  const tier = org?.subscription_tier || 'free';
  const isAllowed = tier === 'essential' || tier === 'professional';
  const isAdmin = user?.role === 'admin';

  const [modules, setModules] = useState([]);
  const [completions, setCompletions] = useState({});
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [upgradePrompt, setUpgradePrompt] = useState(null);

  const orgId = org?.id;

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      // Load skills for dropdowns
      const { data: skillsData } = await supabase
        .from('skills')
        .select('id, name, scale_type')
        .eq('organisation_id', orgId)
        .eq('status', 'active')
        .order('name', { ascending: true });
      setSkills(skillsData || []);

      // Load modules + completions via edge function
      const { data: fnData } = await supabase.functions.invoke('get-training-modules');
      if (fnData) {
        // Enrich modules with skill names
        const skillMap = Object.fromEntries((skillsData || []).map(s => [s.id, s.name]));
        const enriched = (fnData.modules || []).map(m => ({
          ...m,
          skill_name: skillMap[m.skill_id] || '',
        }));
        setModules(enriched);
        setCompletions(fnData.completions || {});
      }
    } catch (_) {
      // silently fail
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    if (isAllowed) loadData();
    else setLoading(false);
  }, [isAllowed, loadData]);

  const handleSave = async (formData) => {
    if (editingModule) {
      // Update
      await supabase
        .from('training_modules')
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq('id', editingModule.id);
    } else {
      // Create
      await supabase.from('training_modules').insert({
        ...formData,
        organisation_id: orgId,
        created_by: user?.id,
      });
    }
    await loadData();
  };

  const handleArchive = async (moduleId) => {
    if (!confirm('Archive this module? It will no longer be visible to team members.')) return;
    await supabase
      .from('training_modules')
      .update({ status: 'archived' })
      .eq('id', moduleId);
    setModules(prev => prev.filter(m => m.id !== moduleId));
    if (expandedId === moduleId) setExpandedId(null);
  };

  const handleTaskToggle = async (moduleId, taskIndex, completed) => {
    try {
      const { data } = await supabase.functions.invoke('complete-training-task', {
        body: { module_id: moduleId, task_index: taskIndex, completed },
      });
      if (data) {
        // Refresh completions for this module
        const { data: fnData } = await supabase.functions.invoke('get-training-modules');
        if (fnData) {
          setCompletions(fnData.completions || {});
        }
      }
    } catch (err) {
      alert(err?.message || 'Could not update task.');
    }
  };

  const openNew = () => {
    setEditingModule(null);
    setFormOpen(true);
  };

  const openEdit = (mod) => {
    setEditingModule(mod);
    setFormOpen(true);
  };

  // Free tier gate
  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Training Modules</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Create structured training modules with task checklists linked to skills.
          When all tasks are complete, the skills matrix updates automatically.
        </p>
        <Button
          onClick={() => setUpgradePrompt({
            target: 'Essential',
            message: 'Training materials require Essential or Professional plan.',
            unlocks: ['Training modules with task checklists', 'Auto-update skills matrix on completion', 'Evidence file uploads', 'Gap analysis reports', 'CSV export'],
          })}
          className="gap-2"
        >
          <Zap className="w-4 h-4" />
          Upgrade to Essential
        </Button>
        {upgradePrompt && (
          <UpgradePromptModal prompt={upgradePrompt} onClose={() => setUpgradePrompt(null)} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Training Modules</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Structured training with task checklists — complete all tasks to auto-update the skills matrix.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" />
            New Module
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          Loading…
        </div>
      ) : modules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No training modules yet.</p>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={openNew} className="mt-3 gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Create your first module
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map(mod => {
            const completion = completions[mod.id] || null;
            const totalTasks = Array.isArray(mod.tasks) ? mod.tasks.length : 0;
            const completedCount = Array.isArray(completion?.completed_tasks)
              ? completion.completed_tasks.length
              : 0;
            const isComplete = totalTasks > 0 && completedCount >= totalTasks;
            const isExpanded = expandedId === mod.id;

            return (
              <div
                key={mod.id}
                className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
              >
                {/* Card header / summary row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : mod.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold truncate">{mod.name}</h3>
                      {mod.skill_name && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary shrink-0">
                          {mod.skill_name}
                        </span>
                      )}
                      {isComplete && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 shrink-0">
                          Complete
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {completedCount}/{totalTasks} tasks
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Awards: {PROFICIENCY_LABELS[mod.on_completion_level] ?? mod.on_completion_level}
                      </span>
                      {/* Mini progress bar */}
                      {totalTasks > 0 && (
                        <div className="flex-1 max-w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isComplete ? 'bg-green-500' : 'bg-primary'}`}
                            style={{ width: `${Math.round((completedCount / totalTasks) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => { e.stopPropagation(); openEdit(mod); }}
                          className="h-8 w-8 p-0"
                          title="Edit module"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => { e.stopPropagation(); handleArchive(mod.id); }}
                          className="h-8 w-8 p-0"
                          title="Archive module"
                        >
                          <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </>
                    )}
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>
                </div>

                {/* Expanded task list */}
                {isExpanded && (
                  <div className="border-t border-border px-5 py-5">
                    <TaskListView
                      module={mod}
                      completion={completion}
                      onTaskToggle={(taskIndex, completed) => handleTaskToggle(mod.id, taskIndex, completed)}
                      isPrintMode={false}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      <TrainingModuleForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingModule(null); }}
        onSave={handleSave}
        module={editingModule}
        skills={skills}
      />
    </div>
  );
}
