/**
 * upload-evidence
 * Validates mime type, file size, per-org quota, creates evidence_files record.
 * File is already uploaded to Supabase Storage by the client.
 */
import { corsHeaders } from '../_shared/cors.ts'
import { getUser, adminClient } from '../_shared/auth.ts'

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
])

const ALLOWED_EXTENSIONS = new Set(['pdf','png','jpg','jpeg','webp','docx','xlsx','csv','txt'])

const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25 MB

// Quota limits in bytes per tier
const QUOTA_BYTES: Record<string, number> = {
  free:         100  * 1024 * 1024,
  essential:    5    * 1024 * 1024 * 1024,
  professional: 50   * 1024 * 1024 * 1024,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const user = await getUser(req)
    const orgId = user.organisation_id
    if (!orgId) {
      return new Response(JSON.stringify({ error: 'No organisation' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { file_url, file_name, mime_type, size_bytes, linked_entity_type, linked_entity_id, description, tags } = body

    if (!file_url || !file_name || !mime_type || !size_bytes) {
      return new Response(JSON.stringify({ error: 'Missing required fields: file_url, file_name, mime_type, size_bytes' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.has(mime_type)) {
      return new Response(JSON.stringify({ error: `File type not allowed. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}` }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate extension
    const ext = (file_name.split('.').pop() || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return new Response(JSON.stringify({ error: `File extension .${ext} not allowed.` }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate size
    if (size_bytes > MAX_FILE_BYTES) {
      return new Response(JSON.stringify({ error: 'File exceeds 25 MB limit.' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = adminClient()

    // Quota check
    const { data: org, error: orgError } = await admin
      .from('organisations')
      .select('subscription_tier')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: 'Organisation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const tier = org.subscription_tier || 'free'
    const quotaBytes = QUOTA_BYTES[tier] ?? QUOTA_BYTES.free

    const { data: existingFiles } = await admin
      .from('evidence_files')
      .select('size_bytes')
      .eq('organisation_id', orgId)
      .eq('is_redacted', false)

    const usedBytes = (existingFiles || []).reduce((sum: number, f: any) => sum + (f.size_bytes || 0), 0)

    if (usedBytes + size_bytes > quotaBytes) {
      const usedMB = (usedBytes / (1024 * 1024)).toFixed(1)
      const quotaMB = (quotaBytes / (1024 * 1024)).toFixed(0)
      return new Response(JSON.stringify({
        error: `Storage quota exceeded. Used: ${usedMB} MB of ${quotaMB} MB. Upgrade your plan for more storage.`,
        code: 'quota_exceeded',
      }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Create evidence_files record
    const { data: record, error: insertError } = await admin
      .from('evidence_files')
      .insert({
        organisation_id:      orgId,
        uploaded_by_user_id:  user.id,
        uploaded_by_name:     user.full_name || user.email,
        file_url,
        file_name,
        mime_type,
        size_bytes,
        linked_entity_type:   linked_entity_type || null,
        linked_entity_id:     linked_entity_id   || null,
        description:          description        || null,
        tags:                 Array.isArray(tags) ? tags : [],
        is_redacted:          false,
      })
      .select()
      .single()

    if (insertError) throw new Error(insertError.message)

    // Audit log (best-effort)
    await admin.from('audit_log_entries').insert({
      organisation_id: orgId,
      actor_user_id:   user.id,
      actor_display:   user.full_name || user.email,
      action:          'evidence_uploaded',
      target_type:     'evidence_file',
      target_id:       record.id,
      target_display:  file_name,
      detail: JSON.stringify({ linked_entity_type, linked_entity_id, size_bytes }),
    }).then(() => {}).catch(() => {})

    return new Response(JSON.stringify({ id: record.id, file_url: record.file_url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
