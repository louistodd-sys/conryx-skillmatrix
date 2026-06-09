-- =============================================================================
-- 0008_training_modules.sql
-- Training modules and task completions tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- training_modules: org-created, linked to a skill
-- ---------------------------------------------------------------------------
CREATE TABLE training_modules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  skill_id            uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  name                text NOT NULL,
  description         text,
  tasks               jsonb NOT NULL DEFAULT '[]',
  -- tasks format: [{title: text, description: text}]
  on_completion_level integer NOT NULL DEFAULT 1 CHECK (on_completion_level BETWEEN 0 AND 4),
  created_by          uuid REFERENCES users(id),
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_training_modules_updated_at
  BEFORE UPDATE ON training_modules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- task_completions: per-user progress on a module
-- ---------------------------------------------------------------------------
CREATE TABLE task_completions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id         uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  module_id               uuid NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  user_id                 uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_tasks         jsonb NOT NULL DEFAULT '[]',
  -- completed_tasks format: [{task_index: int, completed_date: text}]
  completed_at            timestamptz,
  resulting_assessment_id uuid REFERENCES skill_assessments(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE(module_id, user_id)
);

CREATE TRIGGER trg_task_completions_updated_at
  BEFORE UPDATE ON task_completions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON training_modules
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON task_completions
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));
