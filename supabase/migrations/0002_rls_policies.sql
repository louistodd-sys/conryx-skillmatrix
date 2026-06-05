-- =============================================================================
-- 0002_rls_policies.sql
-- Row Level Security policies for all tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- organisations
-- ---------------------------------------------------------------------------
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_org" ON organisations
  FOR ALL
  USING (id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- brc_clauses  (global seed data — read-only for all authenticated users)
-- ---------------------------------------------------------------------------
ALTER TABLE brc_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_all_authenticated" ON brc_clauses
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_in_org" ON public.users
  FOR SELECT
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "own_row" ON public.users
  FOR ALL
  USING (id = auth.uid());

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON teams
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- skill_categories
-- ---------------------------------------------------------------------------
ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON skill_categories
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- invitations
-- ---------------------------------------------------------------------------
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON invitations
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- skills
-- ---------------------------------------------------------------------------
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON skills
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- team_members
-- ---------------------------------------------------------------------------
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON team_members
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- team_required_skills
-- ---------------------------------------------------------------------------
ALTER TABLE team_required_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON team_required_skills
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- skill_assessments
-- ---------------------------------------------------------------------------
ALTER TABLE skill_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON skill_assessments
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON notifications
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- audit_log_entries
-- ---------------------------------------------------------------------------
ALTER TABLE audit_log_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON audit_log_entries
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- brc_clause_statuses
-- ---------------------------------------------------------------------------
ALTER TABLE brc_clause_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON brc_clause_statuses
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- brc_clause_evidence_links
-- ---------------------------------------------------------------------------
ALTER TABLE brc_clause_evidence_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON brc_clause_evidence_links
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- brc_documents
-- ---------------------------------------------------------------------------
ALTER TABLE brc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON brc_documents
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- brc_non_conformances
-- ---------------------------------------------------------------------------
ALTER TABLE brc_non_conformances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON brc_non_conformances
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- brc_capas
-- ---------------------------------------------------------------------------
ALTER TABLE brc_capas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON brc_capas
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- brc_audits
-- ---------------------------------------------------------------------------
ALTER TABLE brc_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON brc_audits
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- brc_document_versions
-- ---------------------------------------------------------------------------
ALTER TABLE brc_document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON brc_document_versions
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- evidence_files
-- ---------------------------------------------------------------------------
ALTER TABLE evidence_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON evidence_files
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- brc_suppliers
-- ---------------------------------------------------------------------------
ALTER TABLE brc_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON brc_suppliers
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- brc_calibration_records
-- ---------------------------------------------------------------------------
ALTER TABLE brc_calibration_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON brc_calibration_records
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- brc_complaints
-- ---------------------------------------------------------------------------
ALTER TABLE brc_complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON brc_complaints
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- brc_management_reviews
-- ---------------------------------------------------------------------------
ALTER TABLE brc_management_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON brc_management_reviews
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- brc_glass_items
-- ---------------------------------------------------------------------------
ALTER TABLE brc_glass_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON brc_glass_items
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- brc_pest_control_visits
-- ---------------------------------------------------------------------------
ALTER TABLE brc_pest_control_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON brc_pest_control_visits
  FOR ALL
  USING (organisation_id = (SELECT organisation_id FROM public.users WHERE id = auth.uid()));
