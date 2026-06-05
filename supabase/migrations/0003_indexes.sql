-- =============================================================================
-- 0003_indexes.sql
-- Indexes on FK and commonly filtered columns
-- =============================================================================

-- users
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_organisation_id ON public.users (organisation_id);

-- teams
CREATE INDEX IF NOT EXISTS idx_teams_organisation_id ON teams (organisation_id);

-- skill_categories
CREATE INDEX IF NOT EXISTS idx_skill_categories_organisation_id ON skill_categories (organisation_id);

-- invitations
CREATE INDEX IF NOT EXISTS idx_invitations_organisation_id ON invitations (organisation_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations (email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations (status);

-- skills
CREATE INDEX IF NOT EXISTS idx_skills_organisation_id ON skills (organisation_id);
CREATE INDEX IF NOT EXISTS idx_skills_category_id ON skills (category_id);

-- team_members
CREATE INDEX IF NOT EXISTS idx_team_members_organisation_id ON team_members (organisation_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members (user_id);

-- team_required_skills
CREATE INDEX IF NOT EXISTS idx_team_required_skills_organisation_id ON team_required_skills (organisation_id);
CREATE INDEX IF NOT EXISTS idx_team_required_skills_team_id ON team_required_skills (team_id);
CREATE INDEX IF NOT EXISTS idx_team_required_skills_skill_id ON team_required_skills (skill_id);

-- skill_assessments
CREATE INDEX IF NOT EXISTS idx_skill_assessments_organisation_id ON skill_assessments (organisation_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_user_id ON skill_assessments (user_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_skill_id ON skill_assessments (skill_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_organisation_id ON notifications (organisation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications (read_at);

-- audit_log_entries
CREATE INDEX IF NOT EXISTS idx_audit_log_entries_organisation_id ON audit_log_entries (organisation_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entries_actor_user_id ON audit_log_entries (actor_user_id);

-- brc_clause_statuses
CREATE INDEX IF NOT EXISTS idx_brc_clause_statuses_organisation_id ON brc_clause_statuses (organisation_id);
CREATE INDEX IF NOT EXISTS idx_brc_clause_statuses_clause_id ON brc_clause_statuses (clause_id);

-- brc_clause_evidence_links
CREATE INDEX IF NOT EXISTS idx_brc_clause_evidence_links_organisation_id ON brc_clause_evidence_links (organisation_id);
CREATE INDEX IF NOT EXISTS idx_brc_clause_evidence_links_clause_id ON brc_clause_evidence_links (clause_id);

-- brc_documents
CREATE INDEX IF NOT EXISTS idx_brc_documents_organisation_id ON brc_documents (organisation_id);
CREATE INDEX IF NOT EXISTS idx_brc_documents_owner_user_id ON brc_documents (owner_user_id);

-- brc_non_conformances
CREATE INDEX IF NOT EXISTS idx_brc_non_conformances_organisation_id ON brc_non_conformances (organisation_id);
CREATE INDEX IF NOT EXISTS idx_brc_non_conformances_status ON brc_non_conformances (status);
CREATE INDEX IF NOT EXISTS idx_brc_non_conformances_audit_id ON brc_non_conformances (audit_id);

-- brc_capas
CREATE INDEX IF NOT EXISTS idx_brc_capas_organisation_id ON brc_capas (organisation_id);
CREATE INDEX IF NOT EXISTS idx_brc_capas_nc_id ON brc_capas (nc_id);

-- brc_audits
CREATE INDEX IF NOT EXISTS idx_brc_audits_organisation_id ON brc_audits (organisation_id);

-- brc_document_versions
CREATE INDEX IF NOT EXISTS idx_brc_document_versions_organisation_id ON brc_document_versions (organisation_id);
CREATE INDEX IF NOT EXISTS idx_brc_document_versions_document_id ON brc_document_versions (document_id);

-- evidence_files
CREATE INDEX IF NOT EXISTS idx_evidence_files_organisation_id ON evidence_files (organisation_id);
CREATE INDEX IF NOT EXISTS idx_evidence_files_uploaded_by_user_id ON evidence_files (uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_files_linked_entity ON evidence_files (linked_entity_type, linked_entity_id);

-- brc_suppliers
CREATE INDEX IF NOT EXISTS idx_brc_suppliers_organisation_id ON brc_suppliers (organisation_id);

-- brc_calibration_records
CREATE INDEX IF NOT EXISTS idx_brc_calibration_records_organisation_id ON brc_calibration_records (organisation_id);

-- brc_complaints
CREATE INDEX IF NOT EXISTS idx_brc_complaints_organisation_id ON brc_complaints (organisation_id);
CREATE INDEX IF NOT EXISTS idx_brc_complaints_status ON brc_complaints (status);

-- brc_management_reviews
CREATE INDEX IF NOT EXISTS idx_brc_management_reviews_organisation_id ON brc_management_reviews (organisation_id);

-- brc_glass_items
CREATE INDEX IF NOT EXISTS idx_brc_glass_items_organisation_id ON brc_glass_items (organisation_id);

-- brc_pest_control_visits
CREATE INDEX IF NOT EXISTS idx_brc_pest_control_visits_organisation_id ON brc_pest_control_visits (organisation_id);
