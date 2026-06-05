-- =============================================================================
-- 0001_initial_schema.sql
-- Full DDL for all 26 tables in dependency order
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Shared trigger function: keep updated_at current
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 1. organisations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organisations (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  -- core
  name                        text        NOT NULL,
  slug                        text,
  logo_url                    text,
  timezone                    text        NOT NULL DEFAULT 'Europe/London',
  locale                      text        NOT NULL DEFAULT 'en-GB',

  -- notifications / prefs
  notify_users_on_expiry      boolean     NOT NULL DEFAULT false,
  weekly_digest_enabled       boolean     NOT NULL DEFAULT true,

  -- onboarding
  onboarding_completed        boolean     NOT NULL DEFAULT false,
  onboarding_step             integer     NOT NULL DEFAULT 1,

  -- skills matrix subscription
  subscription_tier           text        NOT NULL DEFAULT 'free'
                                CHECK (subscription_tier IN ('free','essential','professional')),
  billing_interval            text        NOT NULL DEFAULT 'monthly'
                                CHECK (billing_interval IN ('monthly','annual')),
  stripe_customer_id          text,
  stripe_subscription_id      text,
  stripe_subscription_status  text,
  current_period_end          text,
  trial_end_date              text,
  trial_email_sent            boolean     NOT NULL DEFAULT false,

  -- modules
  modules                     text[]      NOT NULL DEFAULT ARRAY['skills_matrix'],

  -- brc config
  brc_standard                text
                                CHECK (brc_standard IN (
                                  'brcgs_packaging','brcgs_food','brcgs_storage',
                                  'brcgs_agents_brokers','brcgs_consumer_products'
                                )),
  brc_audit_target_date       text,
  brc_module_enabled_at       text,

  -- brc subscription
  brc_subscription_status     text
                                CHECK (brc_subscription_status IN (
                                  'trialing','active','canceled','past_due'
                                )),
  brc_stripe_subscription_id  text,
  brc_billing_interval        text        NOT NULL DEFAULT 'monthly'
                                CHECK (brc_billing_interval IN ('monthly','annual')),
  brc_current_period_end      text,
  brc_trial_end_date          text,

  -- cached readiness score
  brc_readiness_score         jsonb
);

CREATE TRIGGER trg_organisations_updated_at
  BEFORE UPDATE ON organisations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. brc_clauses  (global seed data — no organisation FK)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brc_clauses (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  standard              text        NOT NULL
                          CHECK (standard IN (
                            'brcgs_packaging','brcgs_food','brcgs_storage',
                            'brcgs_agents_brokers','brcgs_consumer_products'
                          )),
  issue_number          text        NOT NULL,
  clause_number         text        NOT NULL,
  parent_clause_number  text,
  title                 text        NOT NULL,
  description           text        NOT NULL,
  evidence_requirement  text        NOT NULL,
  is_fundamental        boolean     NOT NULL DEFAULT false,
  display_order         integer     NOT NULL DEFAULT 0
);

CREATE TRIGGER trg_brc_clauses_updated_at
  BEFORE UPDATE ON brc_clauses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. users  (PK = auth.users FK)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id                uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  organisation_id   uuid        REFERENCES organisations(id) ON DELETE CASCADE,
  email             text        NOT NULL,
  full_name         text        NOT NULL DEFAULT '',
  role              text        NOT NULL DEFAULT 'viewer'
                      CHECK (role IN ('admin','manager','viewer')),
  status            text        NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','pending','inactive'))
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 4a. teams
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  description      text,
  manager_ids      text[]      NOT NULL DEFAULT ARRAY[]::text[],
  display_order    integer     NOT NULL DEFAULT 0
);

CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 4b. skill_categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_categories (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  colour           text,
  display_order    integer     NOT NULL DEFAULT 0
);

CREATE TRIGGER trg_skill_categories_updated_at
  BEFORE UPDATE ON skill_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 4c. invitations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invitations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  organisation_id     uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  email               text        NOT NULL,
  role                text        NOT NULL
                        CHECK (role IN ('admin','manager','viewer')),
  invited_by_user_id  uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  invited_by_name     text,
  team_ids            text[]      NOT NULL DEFAULT ARRAY[]::text[],
  status              text        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','revoked','expired'))
);

CREATE TRIGGER trg_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. skills
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  organisation_id      uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  category_id          uuid        REFERENCES skill_categories(id) ON DELETE SET NULL,
  name                 text        NOT NULL,
  description          text,
  scale_type           text        NOT NULL DEFAULT 'binary'
                         CHECK (scale_type IN ('binary','levelled')),
  requires_expiry      boolean     NOT NULL DEFAULT false,
  expiry_warning_days  integer[]   NOT NULL DEFAULT ARRAY[30,60,90],
  status               text        NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','archived')),
  display_order        integer     NOT NULL DEFAULT 0
);

CREATE TRIGGER trg_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. team_members
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_members (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  organisation_id   uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  team_id           uuid        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_email        text,
  user_name         text,
  is_managed_member boolean     NOT NULL DEFAULT false
);

CREATE TRIGGER trg_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. team_required_skills
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_required_skills (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  organisation_id      uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  team_id              uuid        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  skill_id             uuid        NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  is_required          boolean     NOT NULL DEFAULT true,
  minimum_proficiency  integer     NOT NULL DEFAULT 1
);

CREATE TRIGGER trg_team_required_skills_updated_at
  BEFORE UPDATE ON team_required_skills
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. skill_assessments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_assessments (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  organisation_id     uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id             uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name           text,
  skill_id            uuid        NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  skill_name          text,
  proficiency_level   integer     NOT NULL,
  assessed_date       text        NOT NULL,
  expiry_date         text,
  notes               text,
  assessed_by_user_id uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  assessed_by_name    text
);

CREATE TRIGGER trg_skill_assessments_updated_at
  BEFORE UPDATE ON skill_assessments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 9. notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type             text        NOT NULL
                     CHECK (type IN ('expiry_warning','expiry_digest','invite_accepted','system')),
  title            text        NOT NULL,
  body             text        NOT NULL,
  link             text,
  read_at          text
);

CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. audit_log_entries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log_entries (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  actor_user_id    uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  actor_display    text,
  action           text        NOT NULL,
  target_type      text,
  target_id        text,
  target_display   text,
  detail           text
);

CREATE TRIGGER trg_audit_log_entries_updated_at
  BEFORE UPDATE ON audit_log_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 11. brc_clause_statuses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brc_clause_statuses (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  organisation_id     uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  clause_id           uuid        NOT NULL REFERENCES brc_clauses(id) ON DELETE CASCADE,
  status              text        NOT NULL DEFAULT 'not_started'
                        CHECK (status IN (
                          'not_started','in_progress','evidence_attached','ready','needs_review'
                        )),
  rag                 text
                        CHECK (rag IN ('red','amber','green')),
  last_reviewed_date  text,
  last_reviewed_by    uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  notes               text,
  evidence_count      integer     NOT NULL DEFAULT 0
);

CREATE TRIGGER trg_brc_clause_statuses_updated_at
  BEFORE UPDATE ON brc_clause_statuses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 12. brc_clause_evidence_links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brc_clause_evidence_links (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  organisation_id     uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  clause_id           uuid        NOT NULL REFERENCES brc_clauses(id) ON DELETE CASCADE,
  linked_entity_type  text        NOT NULL
                        CHECK (linked_entity_type IN (
                          'skill_assessment','document_version','non_conformance','capa',
                          'internal_audit','management_review','supplier_record',
                          'calibration_record','complaint_record','glass_register_item',
                          'pest_control_visit','organisation_logo'
                        )),
  linked_entity_id    text        NOT NULL,
  linked_by_user_id   uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notes               text
);

CREATE TRIGGER trg_brc_clause_evidence_links_updated_at
  BEFORE UPDATE ON brc_clause_evidence_links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 13. brc_documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brc_documents (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  organisation_id         uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title                   text        NOT NULL,
  doc_type                text        NOT NULL
                            CHECK (doc_type IN (
                              'procedure','policy','work_instruction','form',
                              'record_template','external_standard'
                            )),
  doc_reference           text,
  owner_user_id           uuid        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  approver_user_id        uuid        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  current_version_number  text        NOT NULL DEFAULT '0.1',
  status                  text        NOT NULL DEFAULT 'draft'
                            CHECK (status IN (
                              'draft','under_review','approved','superseded','retired'
                            )),
  next_review_date        text,
  review_interval_months  integer     NOT NULL DEFAULT 12,
  brc_clause_refs         text[]      NOT NULL DEFAULT ARRAY[]::text[],
  description             text
);

CREATE TRIGGER trg_brc_documents_updated_at
  BEFORE UPDATE ON brc_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 14. brc_non_conformances
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brc_non_conformances (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  organisation_id      uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  ref_number           text,
  title                text        NOT NULL,
  source               text        NOT NULL DEFAULT 'internal_audit'
                         CHECK (source IN (
                           'internal_audit','external_audit','customer_complaint',
                           'supplier_issue','routine_check','incident'
                         )),
  severity             text        NOT NULL DEFAULT 'minor'
                         CHECK (severity IN ('observation','minor','major','critical')),
  status               text        NOT NULL DEFAULT 'open'
                         CHECK (status IN (
                           'open','under_investigation','capa_raised','closed','overdue'
                         )),
  clause_refs          text[]      NOT NULL DEFAULT ARRAY[]::text[],
  raised_date          text        NOT NULL,
  due_date             text,
  closed_date          text,
  raised_by_user_id    uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  raised_by_name       text,
  assigned_to_user_id  uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to_name     text,
  audit_id             uuid,       -- FK added after brc_audits is created below
  description          text,
  immediate_action     text,
  root_cause           text
);

CREATE TRIGGER trg_brc_non_conformances_updated_at
  BEFORE UPDATE ON brc_non_conformances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 15. brc_capas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brc_capas (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  organisation_id       uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  ref_number            text,
  nc_id                 uuid        REFERENCES brc_non_conformances(id) ON DELETE SET NULL,
  nc_ref                text,
  title                 text        NOT NULL,
  corrective_action     text,
  preventive_action     text,
  responsible_user_id   uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  responsible_name      text,
  raised_date           text        NOT NULL,
  due_date              text,
  completed_date        text,
  status                text        NOT NULL DEFAULT 'open'
                          CHECK (status IN (
                            'open','in_progress','completed','verified','overdue'
                          )),
  effectiveness_review  text,
  clause_refs           text[]      NOT NULL DEFAULT ARRAY[]::text[]
);

CREATE TRIGGER trg_brc_capas_updated_at
  BEFORE UPDATE ON brc_capas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 16. brc_audits
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brc_audits (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  organisation_id    uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title              text        NOT NULL,
  audit_type         text        NOT NULL DEFAULT 'internal'
                       CHECK (audit_type IN ('internal','third_party','regulatory','supplier')),
  scheduled_date     text        NOT NULL,
  completed_date     text,
  lead_auditor_id    uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  lead_auditor_name  text,
  scope              text,
  status             text        NOT NULL DEFAULT 'planned'
                       CHECK (status IN ('planned','in_progress','completed','overdue')),
  overall_rating     text
                       CHECK (overall_rating IN (
                         'satisfactory','minor_issues','major_issues','critical'
                       )),
  summary            text,
  clause_refs        text[]      NOT NULL DEFAULT ARRAY[]::text[],
  nc_count           integer     NOT NULL DEFAULT 0,
  next_audit_date    text
);

CREATE TRIGGER trg_brc_audits_updated_at
  BEFORE UPDATE ON brc_audits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Now that brc_audits exists, add the FK from brc_non_conformances.audit_id
ALTER TABLE brc_non_conformances
  ADD CONSTRAINT fk_nc_audit_id
  FOREIGN KEY (audit_id) REFERENCES brc_audits(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 17. brc_document_versions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brc_document_versions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  organisation_id       uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  document_id           uuid        NOT NULL REFERENCES brc_documents(id) ON DELETE CASCADE,
  version_number        text        NOT NULL,
  evidence_file_id      uuid,       -- FK added after evidence_files is created below
  change_summary        text        NOT NULL,
  created_by_user_id    uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  approved_by_user_id   uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  approved_date         text,
  superseded_date       text
);

CREATE TRIGGER trg_brc_document_versions_updated_at
  BEFORE UPDATE ON brc_document_versions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 18. evidence_files
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evidence_files (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  organisation_id      uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  uploaded_by_user_id  uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  uploaded_by_name     text,
  file_url             text        NOT NULL,
  file_name            text        NOT NULL,
  mime_type            text        NOT NULL,
  size_bytes           bigint      NOT NULL,
  linked_entity_type   text
                         CHECK (linked_entity_type IN (
                           'skill_assessment','document_version','non_conformance','capa',
                           'internal_audit','management_review','supplier_record',
                           'calibration_record','complaint_record','glass_register_item',
                           'pest_control_visit','organisation_logo'
                         )),
  linked_entity_id     text,
  description          text,
  tags                 text[]      NOT NULL DEFAULT ARRAY[]::text[],
  retention_until      text,
  is_redacted          boolean     NOT NULL DEFAULT false,
  redacted_reason      text
);

CREATE TRIGGER trg_evidence_files_updated_at
  BEFORE UPDATE ON evidence_files
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Now that evidence_files exists, add the FK from brc_document_versions.evidence_file_id
ALTER TABLE brc_document_versions
  ADD CONSTRAINT fk_docver_evidence_file_id
  FOREIGN KEY (evidence_file_id) REFERENCES evidence_files(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 19. brc_suppliers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brc_suppliers (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  organisation_id   uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  supplier_code     text,
  category          text        NOT NULL DEFAULT 'raw_material'
                      CHECK (category IN (
                        'raw_material','packaging','service','logistics','utilities','other'
                      )),
  approval_status   text        NOT NULL DEFAULT 'under_review'
                      CHECK (approval_status IN (
                        'approved','conditional','unapproved','suspended','under_review'
                      )),
  approval_method   text
                      CHECK (approval_method IN (
                        'questionnaire','audit','certificate_review',
                        'third_party_cert','historical_performance'
                      )),
  last_review_date  text,
  next_review_date  text,
  contact_name      text,
  contact_email     text,
  country           text,
  certifications    text[]      NOT NULL DEFAULT ARRAY[]::text[],
  risk_rating       text        NOT NULL DEFAULT 'medium'
                      CHECK (risk_rating IN ('low','medium','high','critical')),
  notes             text
);

CREATE TRIGGER trg_brc_suppliers_updated_at
  BEFORE UPDATE ON brc_suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 20. brc_calibration_records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brc_calibration_records (
  id                           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now(),

  organisation_id              uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  equipment_name               text        NOT NULL,
  equipment_id                 text        NOT NULL,
  location                     text,
  calibration_type             text        NOT NULL DEFAULT 'external'
                                 CHECK (calibration_type IN ('internal','external','in-situ')),
  last_calibration_date        text        NOT NULL,
  next_calibration_date        text        NOT NULL,
  calibration_interval_months  integer     NOT NULL DEFAULT 12,
  status                       text        NOT NULL DEFAULT 'in_calibration'
                                 CHECK (status IN (
                                   'in_calibration','due_soon','overdue','out_of_service'
                                 )),
  performed_by                 text,
  certificate_ref              text,
  result                       text
                                 CHECK (result IN ('pass','fail','adjusted')),
  notes                        text,
  clause_refs                  text[]      NOT NULL DEFAULT ARRAY[]::text[]
);

CREATE TRIGGER trg_brc_calibration_records_updated_at
  BEFORE UPDATE ON brc_calibration_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 21. brc_complaints
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brc_complaints (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  organisation_id     uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  ref_number          text,
  customer_name       text        NOT NULL,
  complaint_date      text        NOT NULL,
  category            text        NOT NULL DEFAULT 'quality'
                        CHECK (category IN (
                          'quality','contamination','labelling','delivery','service','other'
                        )),
  severity            text        NOT NULL DEFAULT 'medium'
                        CHECK (severity IN ('low','medium','high','critical')),
  description         text        NOT NULL,
  product_ref         text,
  status              text        NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new','investigating','resolved','closed')),
  root_cause          text,
  corrective_action   text,
  response_sent_date  text,
  closed_date         text,
  capa_id             uuid        REFERENCES brc_capas(id) ON DELETE SET NULL,
  assigned_to_name    text
);

CREATE TRIGGER trg_brc_complaints_updated_at
  BEFORE UPDATE ON brc_complaints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 22. brc_management_reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brc_management_reviews (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  organisation_id   uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  meeting_date      text        NOT NULL,
  chair_name        text        NOT NULL,
  attendees         text[]      NOT NULL DEFAULT ARRAY[]::text[],
  agenda_items      text[]      NOT NULL DEFAULT ARRAY[]::text[],
  kpi_summary       text,
  audit_summary     text,
  nc_summary        text,
  customer_feedback text,
  actions           text,
  next_meeting_date text,
  status            text        NOT NULL DEFAULT 'scheduled'
                      CHECK (status IN ('scheduled','completed','minutes_approved')),
  minutes_url       text
);

CREATE TRIGGER trg_brc_management_reviews_updated_at
  BEFORE UPDATE ON brc_management_reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 23. brc_glass_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brc_glass_items (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  organisation_id        uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  item_description       text        NOT NULL,
  item_type              text        NOT NULL DEFAULT 'glass'
                           CHECK (item_type IN (
                             'glass','hard_plastic','brittle_metal','ceramic','other'
                           )),
  location               text        NOT NULL,
  risk_level             text        NOT NULL DEFAULT 'medium'
                           CHECK (risk_level IN ('low','medium','high')),
  last_checked_date      text,
  next_check_date        text,
  check_frequency_months integer     NOT NULL DEFAULT 1,
  status                 text        NOT NULL DEFAULT 'ok'
                           CHECK (status IN ('ok','damaged','replaced','removed')),
  notes                  text,
  checked_by             text
);

CREATE TRIGGER trg_brc_glass_items_updated_at
  BEFORE UPDATE ON brc_glass_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 24. brc_pest_control_visits
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brc_pest_control_visits (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  organisation_id     uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  contractor_name     text        NOT NULL,
  visit_date          text        NOT NULL,
  visit_type          text        NOT NULL DEFAULT 'routine'
                        CHECK (visit_type IN (
                          'routine','emergency','follow_up','annual_survey'
                        )),
  areas_inspected     text[]      NOT NULL DEFAULT ARRAY[]::text[],
  findings            text,
  activity_level      text        NOT NULL DEFAULT 'none'
                        CHECK (activity_level IN ('none','low','medium','high')),
  treatments_applied  text,
  recommendations     text,
  next_visit_date     text,
  status              text        NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled','completed','action_required')),
  report_url          text
);

CREATE TRIGGER trg_brc_pest_control_visits_updated_at
  BEFORE UPDATE ON brc_pest_control_visits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
