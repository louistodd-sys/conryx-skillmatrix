import { Printer, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PROFICIENCY_LABELS = ['Not Trained', 'Awareness', 'Working Knowledge', 'Competent', 'Expert'];

export default function TaskListView({ module, completion, onTaskToggle, isPrintMode }) {
  if (!module) return null;

  const tasks = Array.isArray(module.tasks) ? module.tasks : [];
  const completedTasks = Array.isArray(completion?.completed_tasks) ? completion.completed_tasks : [];
  const completedCount = completedTasks.length;
  const totalCount = tasks.length;
  const isComplete = totalCount > 0 && completedCount >= totalCount;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const isTaskDone = (index) => completedTasks.some(t => t.task_index === index);
  const getTaskDate = (index) => completedTasks.find(t => t.task_index === index)?.completed_date || null;

  return (
    <div className={`print-area ${isPrintMode ? 'block' : ''}`}>
      {/* Print styles */}
      {isPrintMode && (
        <style>{`
          @media print {
            body > * { display: none; }
            .print-area { display: block !important; }
          }
        `}</style>
      )}

      <div className="space-y-4">
        {/* Module header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{module.name}</h2>
            {module.skill_name && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mt-1">
                {module.skill_name}
              </span>
            )}
            {module.description && (
              <p className="text-sm text-muted-foreground mt-1.5">{module.description}</p>
            )}
          </div>
          {!isPrintMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="shrink-0 gap-1.5 print:hidden"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>{completedCount} of {totalCount} tasks complete</span>
            <span className="font-medium">{progressPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-green-500' : 'bg-primary'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Completion banner */}
        {isComplete && (
          <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Complete — Skills Matrix Updated</p>
              <p className="text-xs text-green-700 mt-0.5">
                Skill updated to <strong>{PROFICIENCY_LABELS[module.on_completion_level] || module.on_completion_level}</strong> on completion.
              </p>
            </div>
          </div>
        )}

        {/* Task list */}
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No tasks defined for this module.</p>
        ) : (
          <ol className="space-y-2">
            {tasks.map((task, index) => {
              const done = isTaskDone(index);
              const doneDate = getTaskDate(index);
              return (
                <li
                  key={index}
                  className={`flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors
                    ${done ? 'border-green-200 bg-green-50/50' : 'border-border bg-card'}
                  `}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    disabled={isPrintMode}
                    onClick={() => !isPrintMode && onTaskToggle && onTaskToggle(index, !done)}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                      ${done
                        ? 'bg-green-500 border-green-500'
                        : 'border-border hover:border-primary'
                      }
                      ${isPrintMode ? 'cursor-default' : 'cursor-pointer'}
                    `}
                    aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {done && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      <span className="text-muted-foreground mr-1.5">{index + 1}.</span>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className={`text-xs mt-0.5 ${done ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                        {task.description}
                      </p>
                    )}
                    {done && doneDate && (
                      <p className="text-xs text-muted-foreground/60 mt-1">Completed {doneDate}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
