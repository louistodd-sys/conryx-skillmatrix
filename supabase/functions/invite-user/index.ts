/**
 * invite-user
 * Sends a Supabase invite email to a new user so they can set a password
 * and immediately join the organisation.
 *
 * Receives: { email: string, role?: string }
 * Returns:  { user: object }
 *
 * By pre-creating the public.users row with organisation_id here, the invitee
 * lands on the main app (not onboarding) when they first sign in.
 */
import { corsHeaders } from '../_shared/cors.ts'
import { getUser, adminClient } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const caller = await getUser(req)

    if (!caller.organisation_id) {
      return new Response(JSON.stringify({ error: 'Caller has no organisation' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (caller.role !== 'admin' && caller.role !== 'manager') {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, role = 'viewer' } = await req.json()

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = adminClient()
    const normalizedEmail = email.trim().toLowerCase()

    // Check if an auth user with this email already exists
    const { data: { users: existingUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existing = existingUsers?.find(u => u.email?.toLowerCase() === normalizedEmail)

    let invitedUserId: string

    if (existing) {
      invitedUserId = existing.id
    } else {
      // Send a Supabase invite — creates the auth user + sends magic-link invite email
      const { data, error } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo: `${Deno.env.get('SITE_URL') ?? ''}/`,
        data: { invited_by_organisation_id: caller.organisation_id },
      })
      if (error) throw new Error(error.message)
      invitedUserId = data.user.id
    }

    // Pre-create (or update) the users row so the invitee joins the right org
    // on first sign-in instead of landing on the onboarding wizard.
    const { error: upsertError } = await admin
      .from('users')
      .upsert(
        {
          id: invitedUserId,
          email: normalizedEmail,
          organisation_id: caller.organisation_id,
          role: ['admin', 'manager', 'viewer'].includes(role) ? role : 'viewer',
          status: 'active',
        },
        { onConflict: 'id', ignoreDuplicates: false }
      )

    if (upsertError) throw new Error(`Failed to set user organisation: ${upsertError.message}`)

    return new Response(JSON.stringify({ user: { id: invitedUserId, email: normalizedEmail } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
