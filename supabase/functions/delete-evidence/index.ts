/**
 * delete-evidence
 * Soft-delete (redact) an EvidenceFile. Hard delete is forbidden for BRC audit trail integrity.
 * Permitted by: admin, original uploader, or quality_manager role.
 */
import { corsHeaders } from '../_shared/cors.ts'
import { getUser, adminClient } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const user = await getUser(req)
    const { evidence_file_id, reason } = await req.json()

    if (!evidence_file_id) {
      return new Response(JSON.stringify({ error: 'evidence_file_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const orgId = user.organisation_id
    if (!orgId) {
      return new Response(JSON.stringify({ error: 'No organisation' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = adminClient()

    // Fetch the record
    const { data: file, error: fetchError } = await admin
      .from('evidence_files')
      .select('*')
      .eq('id', evidence_file_id)
      .single()

    if (fetchError || !file) {
      return new Response(JSON.stringify({ error: 'Evidence file not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Tenant isolation
    if (file.organisation_id !== orgId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Already redacted
    if (file.is_redacted) {
      return new Response(JSON.stringify({ error: 'File is already redacted' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Permission check: admin, quality_manager, or original uploader
    const isAdmin          = user.role === 'admin'
    const isQualityManager = user.role === 'quality_manager'
    const isUploader       = file.uploaded_by_user_id === user.id

    if (!isAdmin && !isQualityManager && !isUploader) {
      return new Response(JSON.stringify({ error: 'Forbidden: insufficient permissions to redact evidence' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Soft delete
    await admin
      .from('evidence_files')
      .update({ is_redacted: true, redacted_reason: reason || 'Redacted by user' })
      .eq('id', evidence_file_id)

    // Audit log (best-effort)
    await admin.from('audit_log_entries').insert({
      organisation_id: orgId,
      actor_user_id:   user.id,
      actor_display:   user.full_name || user.email,
      action:          'evidence_redacted',
      target_type:     'evidence_file',
      target_id:       evidence_file_id,
      target_display:  file.file_name,
      detail: JSON.stringify({ reason: reason || 'Redacted by user' }),
    }).then(() => {}).catch(() => {})

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
