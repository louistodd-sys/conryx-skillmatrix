import { supabase } from '@/lib/supabaseClient'

function makeEntity(tableName) {
  return {
    async filter(conditions = {}) {
      let q = supabase.from(tableName).select('*')
      Object.entries(conditions).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          q = q.in(k, v)
        } else {
          q = q.eq(k, v)
        }
      })
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    async create(fields) {
      const { data, error } = await supabase
        .from(tableName)
        .insert(fields)
        .select()
        .single()
      if (error) throw error
      return data
    },
    async update(id, fields) {
      const { data, error } = await supabase
        .from(tableName)
        .update(fields)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id)
      if (error) throw error
    },
    async list(orderField = 'created_at', ascending = true, limit = 1000) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order(orderField, { ascending })
        .limit(limit)
      if (error) throw error
      return data ?? []
    },
    async get(id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    async bulkCreate(records) {
      if (!records || records.length === 0) return []
      const { data, error } = await supabase
        .from(tableName)
        .insert(records)
        .select()
      if (error) throw error
      return data ?? []
    },
  }
}

export const entities = {
  Organisation: makeEntity('organisations'),
  User: makeEntity('users'),
  Team: makeEntity('teams'),
  TeamMember: makeEntity('team_members'),
  Skill: makeEntity('skills'),
  SkillCategory: makeEntity('skill_categories'),
  SkillAssessment: makeEntity('skill_assessments'),
  TeamRequiredSkill: makeEntity('team_required_skills'),
  Invitation: makeEntity('invitations'),
  Notification: makeEntity('notifications'),
  AuditLogEntry: makeEntity('audit_log_entries'),
  EvidenceFile: makeEntity('evidence_files'),
  BRCAudit: makeEntity('brc_audits'),
  BRCClause: makeEntity('brc_clauses'),
  BRCClauseStatus: makeEntity('brc_clause_statuses'),
  BRCClauseEvidenceLink: makeEntity('brc_clause_evidence_links'),
  BRCNonConformance: makeEntity('brc_non_conformances'),
  BRCCAPA: makeEntity('brc_capas'),
  BRCComplaint: makeEntity('brc_complaints'),
  BRCSupplier: makeEntity('brc_suppliers'),
  BRCCalibrationRecord: makeEntity('brc_calibration_records'),
  BRCManagementReview: makeEntity('brc_management_reviews'),
  BRCGlassItem: makeEntity('brc_glass_items'),
  BRCPestControlVisit: makeEntity('brc_pest_control_visits'),
  BRCDocument: makeEntity('brc_documents'),
  BRCDocumentVersion: makeEntity('brc_document_versions'),
  SkillTemplate: makeEntity('skill_templates'),
  SkillTemplateSkill: makeEntity('skill_template_skills'),
  TrainingModule: makeEntity('training_modules'),
  TaskCompletion: makeEntity('task_completions'),
}
