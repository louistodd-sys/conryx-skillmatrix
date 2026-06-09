/**
 * complete-training-task
 * Tick or untick a task in a training module for the current user.
 * If all tasks are completed, auto-upserts a skill_assessments row and logs to audit.
 */
import { corsHeaders } from '../_shared/cors.ts'
import { getUser, adminClient } from '../_shared/auth.ts'

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

    const { module_id, task_index, completed } = await req.json()

    if (module_id == null || task_index == null || completed == null) {
      return new Response(JSON.stringify({ error: 'module_id, task_index, and completed are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = adminClient()

    // Load the module and verify org ownership
    const { data: module, error: moduleError } = await admin
      .from('training_modules')
      .select('*')
      .eq('id', module_id)
      .single()

    if (moduleError || !module) {
      return new Response(JSON.stringify({ error: 'Training module not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (module.organisation_id !== orgId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const totalTasks: number = Array.isArray(module.tasks) ? module.tasks.length : 0

    // Load existing completion row
    const { data: existingCompletion } = await admin
      .from('task_completions')
      .select('*')
      .eq('module_id', module_id)
      .eq('user_id', user.id)
      .single()

    let completedTasks: Array<{ task_index: number; completed_date: string }> =
      Array.isArray(existingCompletion?.completed_tasks) ? existingCompletion.completed_tasks : []

    if (completed) {
      // Add task if not already present
      const alreadyDone = completedTasks.some((t) => t.task_index === task_index)
      if (!alreadyDone) {
        completedTasks = [
          ...completedTasks,
          { task_index, completed_date: new Date().toISOString().split('T')[0] },
        ]
      }
    } else {
      // Remove the task
      completedTasks = completedTasks.filter((t) => t.task_index !== task_index)
    }

    const completedCount = completedTasks.length
    const isComplete = totalTasks > 0 && completedCount >= totalTasks

    // Determine completed_at
    const wasComplete = !!existingCompletion?.completed_at
    let completedAt: string | null = existingCompletion?.completed_at || null
    let resultingAssessmentId: string | null = existingCompletion?.resulting_assessment_id || null

    if (isComplete && !wasComplete) {
      completedAt = new Date().toISOString()

      // Upsert skill_assessments row
      const assessedDate = new Date().toISOString().split('T')[0]
      const assessorName = user.full_name || user.email || 'Unknown'

      const { data: assessment, error: assessmentError } = await admin
        .from('skill_assessments')
        .upsert(
          {
            organisation_id: orgId,
            user_id: user.id,
            skill_id: module.skill_id,
            proficiency_level: module.on_completion_level,
            assessed_date: assessedDate,
            notes: `Completed via training module: ${module.name}`,
            assessed_by_user_id: user.id,
            assessed_by_name: assessorName,
          },
          { onConflict: 'organisation_id,user_id,skill_id', ignoreDuplicates: false }
        )
        .select()
        .single()

      if (!assessmentError && assessment) {
        resultingAssessmentId = assessment.id
      }

      // Audit log (best-effort)
      await admin.from('audit_log_entries').insert({
        organisation_id: orgId,
        actor_user_id: user.id,
        actor_display: assessorName,
        action: 'training_module_completed',
        target_type: 'training_module',
        target_id: module_id,
        target_display: module.name,
        detail: JSON.stringify({ module_name: module.name, skill_id: module.skill_id }),
      }).then(() => {}).catch(() => {})
    } else if (!isComplete && wasComplete) {
      // Unticked back to incomplete
      completedAt = null
    }

    // Upsert task_completions
    const upsertData: any = {
      organisation_id: orgId,
      module_id,
      user_id: user.id,
      completed_tasks: completedTasks,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    }
    if (resultingAssessmentId) {
      upsertData.resulting_assessment_id = resultingAssessmentId
    }

    if (existingCompletion) {
      await admin
        .from('task_completions')
        .update(upsertData)
        .eq('id', existingCompletion.id)
    } else {
      await admin.from('task_completions').insert(upsertData)
    }

    return new Response(
      JSON.stringify({ success: true, completed_count: completedCount, total_count: totalTasks, is_complete: isComplete }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
